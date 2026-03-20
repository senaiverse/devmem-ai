/**
 * Dev Memory Ledger — MCP Server
 *
 * Thin MCP wrapper over the Dev Memory Ledger Supabase Edge Functions.
 * Exposes five tools (devmem_list_projects, devmem_search, devmem_save_lesson, devmem_save_note, devmem_summarize)
 * via stdio transport for use with Claude Code, Cursor, Windsurf, or any
 * MCP-compatible agent.
 *
 * Auth: Uses SUPABASE_ANON_KEY for both apikey and Bearer headers,
 * matching supabase-js behavior. For hackathon demo only — in production,
 * replace with Supabase Auth OAuth 2.1 user-scoped tokens.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
      "List all available projects in the Dev Memory Ledger. Call this FIRST to discover " +
      "which projects exist and get their slugs before using other devmem tools.",
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
      "Call devmem_list_projects first to get valid project slugs.",
    inputSchema: {
      project_slug: z.string().min(1).describe("Project slug from devmem_list_projects"),
      query: z.string().min(1).describe("The search query, error message, or stack trace"),
      mode: z
        .enum(["question", "error", "antipattern"])
        .optional()
        .describe("Search mode (default: 'question')"),
    },
  },
  async ({ project_slug, query, mode }) => {
    try {
      const result = await callEdgeFunction("/functions/v1/search", {
        project_slug,
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
      "Call devmem_list_projects first to get valid project slugs.",
    inputSchema: {
      project_slug: z.string().min(1).describe("Project slug from devmem_list_projects"),
      commit_message: z.string().min(1).optional().describe("Git commit message"),
      diff_summary: z.string().min(1).optional().describe("Description of the code change or truncated diff"),
      error_log: z.string().min(1).optional().describe("Error or stack trace that was fixed"),
      notes: z.string().min(1).optional().describe("Developer explanation of why the change was made"),
    },
  },
  async ({ project_slug, commit_message, diff_summary, error_log, notes }) => {
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
      const body: Record<string, unknown> = { project_slug };
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
      "Call devmem_list_projects first to get valid project slugs.",
    inputSchema: {
      project_slug: z.string().min(1).describe("Project slug from devmem_list_projects"),
      title: z.string().min(1).optional().describe("Title for the note (AI will generate one if omitted)"),
      content: z.string().min(1).describe("The note content — guidelines, standards, decisions, or any knowledge to preserve"),
      category: z.string().min(1).optional().describe("Optional category (e.g. 'planning', 'architecture', 'security')"),
    },
  },
  async ({ project_slug, title, content, category }) => {
    try {
      const body: Record<string, unknown> = { project_slug, content };
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
      "Call devmem_list_projects first to get valid project slugs.",
    inputSchema: {
      project_slug: z.string().min(1).describe("Project slug from devmem_list_projects"),
      from: z.string().min(1).describe("Start date in ISO 8601 format (e.g. '2025-01-01T00:00:00Z')"),
      to: z.string().min(1).describe("End date in ISO 8601 format (e.g. '2025-03-31T23:59:59Z')"),
      force_refresh: z.boolean().optional().describe("Bypass cache and regenerate summary (default: false)"),
    },
  },
  async ({ project_slug, from, to, force_refresh }) => {
    try {
      const result = await callEdgeFunction("/functions/v1/summarize-period", {
        project_slug,
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
