/**
 * Dev Memory Ledger — MCP Server
 *
 * Workspace-agnostic MCP wrapper over the Dev Memory Ledger Supabase Edge Functions.
 * Exposes seven tools via stdio transport for use with Claude Code, Cursor,
 * Windsurf, or any MCP-compatible agent.
 *
 * Tools: devmem_list_projects, devmem_search, devmem_save_lesson,
 * devmem_save_note, devmem_summarize, devmem_attach, devmem_create_project.
 *
 * Project slug resolution chain (highest priority first):
 * 1. Explicit `project_slug` in tool args
 * 2. In-memory cache (session-scoped)
 * 3. `DEVMEM_PROJECT_SLUG` env var (from .mcp.json env block)
 * 4. `.devmemory.json` in workspace root (written by devmem_attach)
 *
 * Auth: Uses SUPABASE_ANON_KEY for both apikey and Bearer headers,
 * matching supabase-js behavior. For hackathon demo only — in production,
 * replace with Supabase Auth OAuth 2.1 user-scoped tokens.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListRootsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration — populated by the agent runtime from .mcp.json env block
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  process.stderr.write(
    "[dev-memory-ledger] FATAL: SUPABASE_ANON_KEY is not set.\n" +
    "Configure it in .mcp.json env block or export it as an environment variable.\n",
  );
  process.exit(1);
}

/** Request timeout in milliseconds (30 seconds). */
const FETCH_TIMEOUT_MS = 30_000;

// Startup diagnostic log (stderr so it doesn't interfere with stdio JSON-RPC)
process.stderr.write(
  `[dev-memory-ledger] Starting MCP server\n` +
  `[dev-memory-ledger] SUPABASE_URL: ${SUPABASE_URL}\n` +
  `[dev-memory-ledger] SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY.slice(0, 8)}...\n`,
);

// ---------------------------------------------------------------------------
// Shared auth headers
// ---------------------------------------------------------------------------

const AUTH_HEADERS: Record<string, string> = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface EdgeFunctionError {
  error: string;
}

interface PostgRestError {
  message: string;
  code: string;
}

/**
 * Calls a Supabase Edge Function endpoint with auth headers and timeout.
 * Throws on HTTP errors, network failures, or timeout.
 */
async function callEdgeFunction<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${SUPABASE_URL}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADERS },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorBody = (await response.json()) as EdgeFunctionError;
      errorMessage = errorBody.error ?? `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(`Edge Function ${path} failed: ${errorMessage}`);
  }

  return (await response.json()) as T;
}

/**
 * Queries the Supabase PostgREST REST API (GET) with auth headers and timeout.
 * Parses PostgREST error JSON for actionable messages.
 */
async function queryRestApi<T>(path: string): Promise<T> {
  const url = `${SUPABASE_URL}${path}`;

  const response = await fetch(url, {
    method: "GET",
    headers: AUTH_HEADERS,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorBody = (await response.json()) as PostgRestError;
      if (errorBody.message) {
        errorMessage = `${errorBody.message} (${errorBody.code})`;
      }
    } catch {
      // Use the default HTTP status message
    }
    throw new Error(`REST API ${path} failed: ${errorMessage}`);
  }

  return (await response.json()) as T;
}

/**
 * Inserts a row via the Supabase PostgREST REST API (POST) with auth headers.
 * Uses `Prefer: return=representation` to return the created row(s).
 * Parses unique constraint violations (code 23505) into user-friendly messages.
 */
async function postRestApi<T>(tablePath: string, body: Record<string, unknown>): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${tablePath}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...AUTH_HEADERS,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const err = (await response.json()) as PostgRestError;
      if (err.code === "23505") {
        errorMessage = `Already exists: ${(err as PostgRestError & { details?: string }).details || err.message}`;
      } else {
        errorMessage = err.message || errorMessage;
      }
    } catch {
      // Use the default HTTP status message
    }
    throw new Error(`REST API POST ${tablePath} failed: ${errorMessage}`);
  }

  return (await response.json()) as T;
}

/**
 * Wraps an error message with a recovery hint when a project slug is not found.
 */
function enrichErrorMessage(message: string): string {
  if (message.includes("Project not found")) {
    return `${message}. Call devmem_list_projects to see available project slugs.`;
  }
  return message;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "dev-memory-ledger",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Workspace detection & slug resolution
// ---------------------------------------------------------------------------

/** Name of the workspace config file written by devmem_attach. */
const DEVMEMORY_FILE = ".devmemory.json";

/** In-memory cache for the resolved project slug (session-scoped). */
let cachedSlug: string | null = null;

/**
 * Resolves the workspace root directory using MCP `roots/list` protocol.
 * Falls back to `process.cwd()` if the client doesn't support roots or
 * returns no `file://` URIs.
 */
async function getWorkspaceRoot(extra: { sendRequest: CallableFunction }): Promise<string> {
  const caps = server.server.getClientCapabilities();
  if (caps?.roots) {
    try {
      const { roots } = await extra.sendRequest(
        { method: "roots/list" },
        ListRootsResultSchema,
      );
      for (const root of roots) {
        if (root.uri.startsWith("file://")) {
          return fileURLToPath(root.uri);
        }
      }
    } catch {
      // Client may advertise roots but fail — fall through to cwd
    }
  }
  return process.cwd();
}

/**
 * Reads the `.devmemory.json` config file from the workspace root.
 * Returns the project slug if valid, null otherwise.
 */
function readDevMemoryConfig(workspaceRoot: string): string | null {
  try {
    const raw = readFileSync(join(workspaceRoot, DEVMEMORY_FILE), "utf-8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    return typeof config?.devmem_project_slug === "string"
      ? config.devmem_project_slug
      : null;
  } catch {
    // ENOENT (missing), SyntaxError (malformed), EACCES (permissions) — all return null
    return null;
  }
}

/**
 * Writes the `.devmemory.json` config file to the workspace root.
 * Throws on write errors (e.g. EACCES, EPERM).
 */
function writeDevMemoryConfig(workspaceRoot: string, slug: string): void {
  writeFileSync(
    join(workspaceRoot, DEVMEMORY_FILE),
    JSON.stringify({ devmem_project_slug: slug }, null, 2) + "\n",
    "utf-8",
  );
}

/**
 * Resolves the project slug from multiple sources in priority order:
 * 1. Explicit `inputSlug` from tool args (overrides all)
 * 2. In-memory cache (set by prior calls or devmem_attach)
 * 3. `DEVMEM_PROJECT_SLUG` env var (from `.mcp.json` env block)
 * 4. `.devmemory.json` in workspace root (written by devmem_attach)
 * 5. Error with project list (guides the agent to attach or pass slug)
 */
async function resolveProjectSlug(
  inputSlug: string | undefined,
  extra: { sendRequest: CallableFunction },
): Promise<string> {
  // 1. Explicit override from tool args
  if (inputSlug) {
    cachedSlug = inputSlug;
    return inputSlug;
  }

  // 2. In-memory cache
  if (cachedSlug) return cachedSlug;

  // 3. Environment variable (from .mcp.json env block)
  const envSlug = process.env.DEVMEM_PROJECT_SLUG;
  if (envSlug) {
    cachedSlug = envSlug;
    return envSlug;
  }

  // 4. .devmemory.json in workspace root
  const root = await getWorkspaceRoot(extra);
  const fileSlug = readDevMemoryConfig(root);
  if (fileSlug) {
    cachedSlug = fileSlug;
    return fileSlug;
  }

  // 5. Nothing found — list available projects for guidance
  const projects = await queryRestApi<ProjectRow[]>(
    "/rest/v1/projects?select=id,name,slug,description&order=name.asc",
  );

  if (projects.length === 0) {
    throw new Error(
      "No Dev Memory projects found. Create one with devmem_create_project first.",
    );
  }

  const list = projects
    .map(
      (p) =>
        `- **${p.name}** (slug: \`${p.slug}\`)${p.description ? ` — ${p.description}` : ""}`,
    )
    .join("\n");

  throw new Error(
    `No project attached to this workspace. Available projects:\n\n${list}\n\n` +
      "Call devmem_attach with the project slug to attach, or pass project_slug explicitly.",
  );
}

// ---------------------------------------------------------------------------
// Tool: devmem_list_projects
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

server.registerTool(
  "devmem_list_projects",
  {
    title: "List Dev Memory Projects",
    description:
      "List all available projects in the Dev Memory Ledger. " +
      "Use to discover project slugs for devmem_attach or manual overrides.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {},
  },
  async () => {
    try {
      const projects = await queryRestApi<ProjectRow[]>(
        "/rest/v1/projects?select=id,name,slug,description,created_at&order=name.asc",
      );

      if (projects.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No projects found. This may mean:\n" +
              "1. No projects exist yet — create one in the Dev Memory Ledger web UI.\n" +
              "2. RLS policy blocks anonymous reads — check Supabase dashboard for the projects table policy.",
          }],
        };
      }

      const summary = projects.map((p) =>
        `- **${p.name}** (slug: \`${p.slug}\`)${p.description ? ` — ${p.description}` : ""}`,
      ).join("\n");

      return {
        content: [{
          type: "text" as const,
          text: `Found ${projects.length} project(s):\n\n${summary}\n\nUse the \`slug\` value as \`project_slug\` in other devmem tools.`,
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${enrichErrorMessage((error as Error).message)}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_search
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_search",
  {
    title: "Search Dev Memory",
    description:
      "Search the project's development knowledge base. Supports three modes: " +
      "'question' for general knowledge queries, 'error' for debugging stack " +
      "traces/error messages, and 'antipattern' for code smell and tech debt analysis. " +
      "Auto-resolves from workspace config if project_slug is omitted.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      project_slug: z.string().min(1).optional().describe(
        "Project slug. Auto-resolved from workspace config if omitted.",
      ),
      query: z.string().min(1).describe("The search query, error message, or stack trace"),
      mode: z
        .enum(["question", "error", "antipattern"])
        .optional()
        .describe("Search mode (default: 'question')"),
    },
  },
  async ({ project_slug, query, mode }, extra) => {
    try {
      const resolvedSlug = await resolveProjectSlug(project_slug, extra);
      const result = await callEdgeFunction("/functions/v1/search", {
        project_slug: resolvedSlug,
        query,
        mode: mode ?? "question",
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${enrichErrorMessage((error as Error).message)}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_save_lesson
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_save_lesson",
  {
    title: "Save Development Lesson",
    description:
      "Save a development lesson from a code change, bug fix, or incident resolution. " +
      "The system uses Gemini AI to extract a structured lesson (title, problem, root cause, " +
      "solution, recommendation, tags) and automatically classifies it for antipatterns. " +
      "At least one of diff_summary, error_log, or notes is required. " +
      "Auto-resolves from workspace config if project_slug is omitted.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      project_slug: z.string().min(1).optional().describe(
        "Project slug. Auto-resolved from workspace config if omitted.",
      ),
      commit_message: z.string().min(1).optional().describe("Git commit message"),
      diff_summary: z.string().min(1).optional().describe("Description of the code change or truncated diff"),
      error_log: z.string().min(1).optional().describe("Error or stack trace that was fixed"),
      notes: z.string().min(1).optional().describe("Developer explanation of why the change was made"),
    },
  },
  async ({ project_slug, commit_message, diff_summary, error_log, notes }, extra) => {
    if (!diff_summary && !error_log && !notes) {
      return {
        content: [{
          type: "text" as const,
          text: "Error: At least one of diff_summary, error_log, or notes is required.",
        }],
        isError: true,
      };
    }

    try {
      const resolvedSlug = await resolveProjectSlug(project_slug, extra);
      const body: Record<string, unknown> = { project_slug: resolvedSlug };
      if (commit_message) body.commit_message = commit_message;
      if (diff_summary) body.diff_summary = diff_summary;
      if (error_log) body.error_log = error_log;
      if (notes) body.notes = notes;

      const result = await callEdgeFunction("/functions/v1/create-lesson-from-change", body);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${enrichErrorMessage((error as Error).message)}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_save_note
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_save_note",
  {
    title: "Save Development Note",
    description:
      "Save a personal note, guideline, standard, or design decision to the knowledge base. " +
      "Unlike devmem_save_lesson (for code changes/bug fixes), this tool is for human-written " +
      "knowledge: team standards, architectural decisions, meeting notes, best practices. " +
      "Uses light AI structuring that stays faithful to your input — no fabrication. " +
      "Auto-resolves from workspace config if project_slug is omitted.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      project_slug: z.string().min(1).optional().describe(
        "Project slug. Auto-resolved from workspace config if omitted.",
      ),
      title: z.string().min(1).optional().describe("Title for the note (AI will generate one if omitted)"),
      content: z.string().min(1).describe("The note content — guidelines, standards, decisions, or any knowledge to preserve"),
      category: z.string().min(1).optional().describe("Optional category (e.g. 'planning', 'architecture', 'security')"),
    },
  },
  async ({ project_slug, title, content, category }, extra) => {
    try {
      const resolvedSlug = await resolveProjectSlug(project_slug, extra);
      const body: Record<string, unknown> = { project_slug: resolvedSlug, content };
      if (title) body.title = title;
      if (category) body.category = category;

      const result = await callEdgeFunction("/functions/v1/save-note", body);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${enrichErrorMessage((error as Error).message)}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_summarize
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_summarize",
  {
    title: "Summarize Development Period",
    description:
      "Summarize development lessons and improvements recorded within a time period. " +
      "Returns thematic analysis grouped by category (Testing, Security, Performance, etc.) " +
      "with follow-up recommendations. " +
      "Auto-resolves from workspace config if project_slug is omitted.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      project_slug: z.string().min(1).optional().describe(
        "Project slug. Auto-resolved from workspace config if omitted.",
      ),
      from: z.string().min(1).describe("Start date in ISO 8601 format (e.g. '2025-01-01T00:00:00Z')"),
      to: z.string().min(1).describe("End date in ISO 8601 format (e.g. '2025-03-31T23:59:59Z')"),
      force_refresh: z.boolean().optional().describe("Bypass cache and regenerate summary (default: false)"),
    },
  },
  async ({ project_slug, from, to, force_refresh }, extra) => {
    try {
      const resolvedSlug = await resolveProjectSlug(project_slug, extra);
      const result = await callEdgeFunction("/functions/v1/summarize-period", {
        project_slug: resolvedSlug,
        from,
        to,
        ...(force_refresh ? { force_refresh: true } : {}),
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${enrichErrorMessage((error as Error).message)}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_attach
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_attach",
  {
    title: "Attach Workspace to Dev Memory Project",
    description:
      "Attach the current workspace to a Dev Memory project. Validates the slug exists, " +
      "writes .devmemory.json to the workspace root, and caches for this session. " +
      "All subsequent devmem tools will auto-resolve to this project.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      project_slug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+$/)
        .describe("Project slug to attach (from devmem_list_projects)"),
    },
  },
  async ({ project_slug }, extra) => {
    try {
      // Validate the slug exists
      const projects = await queryRestApi<ProjectRow[]>(
        `/rest/v1/projects?slug=eq.${encodeURIComponent(project_slug)}&select=id,name,slug`,
      );

      if (projects.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `Error: Project with slug "${project_slug}" not found. ` +
              "Call devmem_list_projects to see available slugs, " +
              "or devmem_create_project to create a new project.",
          }],
          isError: true,
        };
      }

      const project = projects[0];

      // Write .devmemory.json to workspace root
      const root = await getWorkspaceRoot(extra);
      const configPath = join(root, DEVMEMORY_FILE);

      try {
        writeDevMemoryConfig(root, project_slug);
      } catch (writeError) {
        const err = writeError as NodeJS.ErrnoException;
        return {
          content: [{
            type: "text" as const,
            text: `Error: Failed to write ${configPath}: ${err.code ?? err.message}. ` +
              "Check file system permissions. The slug has been cached for this session only.",
          }],
          isError: true,
        };
      }

      // Cache for this session
      cachedSlug = project_slug;

      return {
        content: [{
          type: "text" as const,
          text: `Attached workspace to project **${project.name}** (slug: \`${project.slug}\`).\n\n` +
            `Config written to: ${configPath}\n` +
            "All devmem tools will now auto-resolve to this project.",
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: devmem_create_project
// ---------------------------------------------------------------------------

server.registerTool(
  "devmem_create_project",
  {
    title: "Create Dev Memory Project",
    description:
      "Create a new Dev Memory Ledger project. Returns the created project with ID and slug. " +
      "Use devmem_list_projects to check if the project already exists before creating.",
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      name: z.string().min(1).describe("Display name (e.g., 'GEZANA App')"),
      slug: z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+$/)
        .describe("URL-safe identifier, lowercase with hyphens (e.g., 'gezana-app')"),
      description: z.string().optional().describe("Short project description"),
    },
  },
  async ({ name, slug, description }) => {
    try {
      const body: Record<string, unknown> = { name, slug };
      if (description) body.description = description;

      const rows = await postRestApi<ProjectRow[]>("projects", body);
      const project = rows[0];

      return {
        content: [{
          type: "text" as const,
          text: `Project created successfully:\n\n` +
            `- **Name**: ${project.name}\n` +
            `- **Slug**: \`${project.slug}\`\n` +
            `- **ID**: ${project.id}\n\n` +
            "Use devmem_attach to attach this workspace to the new project.",
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown() {
  process.stderr.write("[dev-memory-ledger] Shutting down...\n");
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------------------------------------------------------------------
// Start — stdio transport for agent communication
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("[dev-memory-ledger] MCP server ready\n");
