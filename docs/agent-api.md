# Dev Memory Ledger — Agent API Reference

## Overview

Dev Memory Ledger is a project knowledge base that stores lessons learned,
architectural decisions, debugging knowledge, and antipattern analysis. It exposes
a set of tools through two interfaces:

1. **MCP Server** (primary) — seven tools via Model Context Protocol for Claude Code,
   Cursor, Windsurf, and any MCP-compatible agent
2. **HTTP API** (fallback) — four Supabase Edge Function endpoints for direct REST access

Both interfaces share the same backend: Supabase Postgres + pgvector embeddings +
Gemini AI for generation and classification.

---

## MCP Server

The MCP server (`mcp/server.ts`) is a workspace-agnostic wrapper that forwards
tool calls to Supabase Edge Functions. It uses stdio transport, which is universal
across all MCP clients.

### Tools

| Tool | Purpose | Read-only | Idempotent |
|------|---------|-----------|------------|
| `devmem_list_projects` | Discover available projects and their slugs | Yes | Yes |
| `devmem_search` | Search the knowledge base (question / error / antipattern modes) | Yes | Yes |
| `devmem_save_lesson` | Save a structured lesson from a code change or bug fix | No | No |
| `devmem_save_note` | Save a personal note, guideline, standard, or decision | No | No |
| `devmem_summarize` | Summarize lessons and improvements over a time period | Yes | Yes |
| `devmem_attach` | Attach a workspace to a project (writes `.devmemory.json`) | No | Yes |
| `devmem_create_project` | Create a new project in the ledger | No | No |

### Global Setup

Register the MCP server once in your agent's global settings so it's available
from any workspace.

**Claude Code** (`~/.claude.json` or user settings):
```json
{
  "mcpServers": {
    "dev-memory-ledger": {
      "command": "cmd",
      "args": ["/c", "npx", "tsx", "D:/PROJECTS/HACKATHON/mcp/server.ts"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

> **Note:** On macOS/Linux, use `"command": "npx", "args": ["tsx", "/path/to/mcp/server.ts"]`
> instead of the `cmd /c` wrapper.

**Per-repo** (`.mcp.json` at project root — gitignored):
```json
{
  "mcpServers": {
    "dev-memory-ledger": {
      "command": "cmd",
      "args": ["/c", "npx", "tsx", "D:/PROJECTS/HACKATHON/mcp/server.ts"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "DEVMEM_PROJECT_SLUG": "my-project"
      }
    }
  }
}
```

Adding `DEVMEM_PROJECT_SLUG` to the env block auto-resolves the project slug
without needing `.devmemory.json` or `devmem_attach`.

### Workspace Attachment

The server auto-resolves which project to use via a layered resolution chain:

| Priority | Source | Persistence | How it's set |
|----------|--------|-------------|--------------|
| 1 | `project_slug` in tool args | Per-call | Manual override |
| 2 | In-memory cache | Session only | Cached from prior calls or `devmem_attach` |
| 3 | `DEVMEM_PROJECT_SLUG` env var | Permanent (per-repo) | Added to `.mcp.json` env block |
| 4 | `.devmemory.json` in workspace root | Permanent (committed) | Written by `devmem_attach` |

If nothing resolves, the server lists available projects and prompts the agent
to call `devmem_attach` or pass `project_slug` explicitly.

**`.devmemory.json` format** (safe to commit — no secrets):
```json
{
  "devmem_project_slug": "my-project"
}
```

### Multi-Agent Compatibility

| Agent | Config Location |
|-------|----------------|
| Claude Code | `~/.claude.json` (global) or `.mcp.json` (per-repo) |
| Cursor | `.cursor/mcp.json` (same format) |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` (same format) |

### Authentication

**Hackathon demo (current):** The MCP server sends the Supabase anon key as both
`apikey` and `Authorization: Bearer` headers, matching `supabase-js` behavior.
Single-user, local-only — not intended for public exposure.

**Production (documented, not implemented):**
- Supabase Auth OAuth 2.1 with dynamic client registration and browser login
- User-scoped JWTs with short-lived access tokens
- Separate scopes per tool (`devmem.read`, `devmem.write`)
- RLS enforces per-project access; HTTPS only; no tokens in logs

---

## HTTP API Reference

All endpoints accept POST with JSON body. Base URL: `SUPABASE_URL/functions/v1/`.

### Project Resolution

Every endpoint accepts either `project_id` (UUID) or `project_slug` (text) to
identify the target project. When both are provided, `project_id` takes precedence.

All responses include:
```json
{ "project": { "id": "uuid", "slug": "string", "name": "string" } }
```

### Intent Routing

| User Intent | Endpoint | Mode |
|-------------|----------|------|
| Knowledge question | `POST /search` | `question` |
| Debug an error | `POST /search` | `error` |
| Review antipatterns | `POST /search` | `antipattern` |
| Record a code change | `POST /create-lesson-from-change` | — |
| Save a note/guideline | `POST /save-note` | — |
| Summarize a time period | `POST /summarize-period` | — |

---

### POST `/functions/v1/search`

Search the project knowledge base with mode-specific behavior.

**Request:**
```json
{
  "project_slug": "my-project",
  "query": "How do we handle database migrations?",
  "mode": "question"
}
```

**Modes:**
| Mode | Behavior |
|------|----------|
| `question` (default) | Standard RAG search, returns natural language answer |
| `error` | Wider search with tag boosting (+0.15 for bug/incident/error/crash tags) |
| `antipattern` | Fetches risky lessons, re-ranks by severity (high: +0.3, medium: +0.2, low: +0.1) |

**Response:**
```json
{
  "answer": "string",
  "sources": [{ "type": "lesson", "id": "uuid", "title": "string" }],
  "question_id": "uuid",
  "project": { "id": "uuid", "slug": "string", "name": "string" },
  "similar_lessons": [{ "lesson_id": "uuid", "title": "string", "reason": "string" }],
  "suggested_steps": ["string"]
}
```

`similar_lessons` and `suggested_steps` are present only in `error` and `antipattern` modes.

---

### POST `/functions/v1/create-lesson-from-change`

Create a structured lesson from a code change, bug fix, or architectural decision.
Gemini extracts title, problem, root cause, solution, recommendation, and tags.

**Request:**
```json
{
  "project_slug": "my-project",
  "commit_message": "fix: resolve race condition in queue processor",
  "diff_summary": "Added mutex lock around shared state access in worker.ts",
  "error_log": "Error: Cannot read property 'status' of undefined",
  "notes": "Queue processor was accessing shared state without synchronization"
}
```

At least one of `diff_summary`, `error_log`, or `notes` is required.
Always include `commit_message` — it anchors the AI extraction.

**Response:**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "string",
    "problem": "string",
    "root_cause": "string",
    "solution": "string",
    "recommendation": "string",
    "tags": ["string"],
    "risk_level": "none|low|medium|high",
    "antipattern_name": "string|null",
    "antipattern_reason": "string|null"
  },
  "project": { "id": "uuid", "slug": "string", "name": "string" }
}
```

---

### POST `/functions/v1/save-note`

Save a personal note, guideline, standard, or decision. Uses light AI structuring
that stays faithful to the input — no fabrication.

**Request:**
```json
{
  "project_slug": "my-project",
  "title": "Planning Standards",
  "content": "All plans must follow TDD, DRY, modular, KISS principles...",
  "category": "team-standards"
}
```

Only `content` is required. `title` and `category` are optional.

**Response:** Same shape as `create-lesson-from-change` with `source_type: "note"`.

---

### POST `/functions/v1/summarize-period`

Generate a thematic summary of lessons recorded within a time window.
Results are cached for 24 hours (use `force_refresh: true` to bypass).

**Request:**
```json
{
  "project_slug": "my-project",
  "from": "2026-01-01T00:00:00Z",
  "to": "2026-03-31T23:59:59Z",
  "force_refresh": false
}
```

**Response:**
```json
{
  "summary": "During Q1 2026, the team focused on...",
  "themes": {
    "Testing": ["Added integration tests for auth flow"],
    "Performance": ["Optimized database queries reducing p95 by 40%"]
  },
  "follow_up": "Consider adding load testing for the new API endpoints.",
  "focusAreas": {
    "strong": ["Testing", "Architecture"],
    "weak": ["Security"],
    "counts": { "Testing": 5, "Security": 1, "Architecture": 4 }
  },
  "cached": false,
  "project": { "id": "uuid", "slug": "string", "name": "string" }
}
```

Returns a static "no lessons" response without calling Gemini when no lessons
exist in the window.

---

## Demo CLI Scripts

Deno scripts for testing the HTTP API directly. Requires a running Supabase instance.

```bash
export SUPABASE_URL=https://your-project.supabase.co

# Search
deno run --allow-net --allow-env demo/search-from-cli.ts my-project "How does auth work?"
deno run --allow-net --allow-env demo/search-from-cli.ts my-project "TypeError: x" error
deno run --allow-net --allow-env demo/search-from-cli.ts my-project "What antipatterns?" antipattern

# Submit a lesson
deno run --allow-net --allow-env --allow-read demo/submit-lesson-from-change.ts my-project
```

---

## Architecture

```
Any Repo (e.g., GEZANA-APP/)
  │
  │  .devmemory.json  <- { "devmem_project_slug": "my-project" }
  │
  ▼
Agent (Claude Code / Cursor / Windsurf)
  │  MCP stdio (JSON-RPC)
  ▼
MCP Server (mcp/server.ts)
  │  resolveProjectSlug():
  │    1. tool args → 2. cache → 3. env var → 4. .devmemory.json → 5. error + list
  │  HTTP POST + apikey + Bearer
  ▼
Supabase Edge Functions
  │  Gemini AI + pgvector + antipattern classification
  ▼
Supabase Postgres (lessons, questions, document_chunks, period_summaries)
```

| Component | Detail |
|-----------|--------|
| Embeddings | 384-dim vectors via Supabase.ai `gte-small` |
| LLM | Google Gemini 2.5 Flash |
| Antipattern classification | Automatic on lesson/note creation (non-fatal) |
| Tag boosting | Error mode: +0.15 for bug/incident/error/crash tags |
| Risk weights | Antipattern mode: high +0.3, medium +0.2, low +0.1 |
| Timeline caching | `period_summaries` table, 24h TTL, `force_refresh` bypass |
| Focus areas | Tag-to-theme mapping (7 themes), strong/weak classification |
| Hallucination guard | All lesson IDs validated against the actual fetched set |
