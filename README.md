<div align="center">

<img src="public/favicon.svg" alt="Dev Memory Ledger" width="80" />

# Dev Memory Ledger

Local-first AI memory for your codebases — captures lessons from docs and commits,\
recalls them in your IDE, and tracks project health over time.

*by [@senaiverse](https://github.com/senaiverse)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](LICENSE)
[![Built with Supabase](https://img.shields.io/badge/Built%20with-Supabase-3fcf8e?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Powered by PowerSync](https://img.shields.io/badge/Powered%20by-PowerSync-blue?style=flat)](https://www.powersync.com)
[![MCP Ready](https://img.shields.io/badge/MCP-Ready-blueviolet?style=flat)](https://modelcontextprotocol.io)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-f97316?style=flat&logo=anthropic&logoColor=white)](https://claude.ai/code)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[Get Started](#quickstart) · [Features](#features) · [Architecture](#architecture) · [MCP Usage](#using-devmem-in-your-ide) · [PowerSync](#powersync--local-first)

</div>

---

## What It Looks Like

<details open>
<summary><strong>Lessons & Antipatterns</strong> — Browse lessons, filter by tag, see risk badges</summary>

```
┌──────────────────────────────────────────────────────────────┐
│  My Project                        [Synced ●] [Offline] [Ask]│
├─────────────────┬──────────────────┬─────────────────────────┤
│  Lessons (12)   │  Antipatterns (3)│  Timeline               │
├─────────────────┴──────────────────┴─────────────────────────┤
│  🔍 Search lessons...                     [Filter by tag ▾]  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Fix race condition in queue processor                  │   │
│  │ Problem: Shared state accessed without lock            │   │
│  │ Solution: Added mutex around worker.ts                 │   │
│  │ [concurrency] [bug-fix]              ⚠ Risk: high     │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Add retry logic for API timeouts                       │   │
│  │ Problem: Requests fail silently on network errors      │   │
│  │ [networking] [resilience]             ✓ Risk: none     │   │
│  └───────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

</details>

<details>
<summary><strong>Timeline & Focus Areas</strong> — AI-generated summaries with strong/weak analysis</summary>

```
┌───────────────────────────────────────────────────────────────┐
│  Timeline                                                     │
│                     [24h] [7d] [14d] [30d] [90d] [6mo] [1yr] │
│                                                               │
│  ┌─ Summary ──────────────────────────────────────────────┐  │
│  │ Over the past 30 days, the team focused on improving   │  │
│  │ test coverage and resolving concurrency issues. Three   │  │
│  │ high-risk antipatterns were identified and addressed... │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Focus Areas ──────────────────────────────────────────┐  │
│  │ Strong:          Testing ✓    Architecture ✓           │  │
│  │ Needs attention: Security ⚠   Observability ⚠         │  │
│  │                                                        │  │
│  │ Counts: Testing 8 · Security 1 · Performance 4        │  │
│  │         Architecture 6 · Observability 1               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Testing ──────────────────────────────────────────────┐  │
│  │ • Added integration tests for auth flow                │  │
│  │ • Fixed flaky CI tests by mocking timers               │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─ Follow-up ────────────────────────────────────────────┐  │
│  │ Consider adding security audit for the new API         │  │
│  │ endpoints introduced this month.                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

</details>

<details>
<summary><strong>Error Assistant</strong> — Paste an error, get context from past incidents</summary>

```
┌───────────────────────────────────────────────────────────────┐
│  Ask — My Project                                             │
│                                                               │
│  ┌─ Your question ────────────────────────────────────────┐  │
│  │ TypeError: Cannot read property 'status' of undefined  │  │
│  │ at processQueue (worker.ts:42)                         │  │
│  │ at async main (index.ts:15)                            │  │
│  └──────────────────────────────────────────────────[Ask]─┘  │
│                                                               │
│  ┌─ Answer ───────────────────────────────────────────────┐  │
│  │ This error was seen before in a race condition where   │  │
│  │ the queue processor accessed shared state before the   │  │
│  │ worker finished initializing. The fix was to add a     │  │
│  │ mutex lock around the shared state in worker.ts.       │  │
│  │                                                        │  │
│  │ Sources:                                               │  │
│  │  • "Fix race condition in queue processor"             │  │
│  │  • "Add worker initialization guard"                   │  │
│  │                                                        │  │
│  │ Suggested steps:                                       │  │
│  │  1. Check if worker.ts:42 accesses shared state       │  │
│  │  2. Add null check or await initialization             │  │
│  │  3. Consider adding a mutex lock                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

</details>

<details>
<summary><strong>MCP in Claude Code</strong> — Use DevMem tools directly from your IDE</summary>

```
┌─ Claude Code ─────────────────────────────────────────────────┐
│                                                               │
│  You: Have we seen this error before?                         │
│       TypeError: Cannot read property 'status' of undefined   │
│                                                               │
│  Claude: I'll search your project's knowledge base.           │
│                                                               │
│  ┌─ Tool call: devmem_search ────────────────────────────┐   │
│  │ query: "TypeError: Cannot read property 'status'..."   │   │
│  │ mode: "error"                                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Claude: Yes — this matches a known issue. A race condition   │
│  in the queue processor was fixed by adding a mutex lock.     │
│  See lesson: "Fix race condition in queue processor"          │
│                                                               │
│  Would you like me to save the current fix as a new lesson?   │
│                                                               │
│  You: Yes, save it.                                           │
│                                                               │
│  ┌─ Tool call: devmem_save_lesson ───────────────────────┐   │
│  │ commit_message: "fix: add null guard in worker.ts"     │   │
│  │ diff_summary: "Added optional chaining for status..."  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                               │
│  Claude: Lesson saved: "Add null guard for worker status"     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

</details>

> [!NOTE]
> These are text representations of the actual UI. Replace with screenshots once available — drop images into `docs/screenshots/` and reference them here.

---

## Why It Exists

**The problem:**

- Knowledge is scattered across commits, docs, Slack threads, and post-mortems — impossible to search when you need it
- The same bugs keep resurfacing because fixes aren't captured in a structured, searchable form
- Architectural decisions live in someone's head and vanish when they change teams

**Dev Memory Ledger fixes this:**

- **Import docs** and auto-extract structured lessons with Gemini AI
- **Ask "Have we seen this before?"** and get RAG-powered answers from your project history
- **Auto-detect antipatterns** and get AI-generated refactor suggestions
- **Track improvement trends** with timeline summaries and focus area analysis across Testing, Security, Performance, and more
- **Works offline** via PowerSync local-first sync and **integrates into any IDE** via MCP

---

## Features

- **Error Assistant** — Paste a stack trace and see matching past incidents, root causes, and fixes from your knowledge base.
- **Antipattern Radar** — Every lesson is auto-classified for risk level. Browse flagged patterns and get AI refactor suggestions.
- **Timeline & Focus Areas** — Summarize improvements over 24h to 1yr. See which areas (Testing, Security, Performance...) are strong or need attention.
- **Lesson Composer** — Generate structured lessons from any imported document on demand.
- **Offline Briefcase** — Pin projects for offline use. PowerSync keeps a local SQLite copy that syncs when reconnected.
- **DevMem MCP Server** — 7 tools accessible from Claude Code, Cursor, or any MCP-compatible agent. Attach any repo to a project once, then work without context switching.
- **Doc Ingestion Pipeline** — Upload docs, watch real-time chunking progress, and auto-extract searchable knowledge.

---

## Architecture

```
Browser (React 19 + shadcn/ui)
  ↕  SQL queries + reactive hooks
PowerSync SDK (local SQLite via wa-sqlite)
  ↕  Sync stream (logical replication)
PowerSync Service
  ↕
Supabase Postgres + pgvector (384-dim)
  ↕
Edge Functions (12 endpoints)                 MCP Server (7 tools, stdio)
  search · create-lesson · save-note             ↕
  summarize-period · generate-lessons          Claude Code / Cursor / Windsurf
  ingest-doc · process-ingest-job
  classify-lessons · embed-lesson
  delete-document · list-documents
  dev-token
```

- **Frontend** — React 19 with shadcn/ui components. All reads and writes go through PowerSync's local SQLite first, then sync to Postgres.
- **PowerSync** — Bidirectional sync via logical replication. Four tables (projects, lessons, questions, ingest_jobs) stay available offline.
- **Supabase** — Postgres with pgvector for 384-dim embeddings (HNSW cosine index), Storage for document uploads, Edge Functions for all AI and data operations.
- **AI** — Gemini 2.5 Flash for lesson extraction, summarization, antipattern classification, and RAG answers. Supabase.ai `gte-small` for embeddings.
- **MCP Server** — 7 tools over stdio JSON-RPC. Workspace-agnostic with auto-resolving project slugs via `.devmemory.json` or env vars.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript 5.9, Tailwind CSS v4, shadcn/ui |
| Local-first sync | PowerSync Web SDK, wa-sqlite |
| Backend | Supabase Postgres, pgvector (384-dim HNSW), Edge Functions (Deno) |
| AI | Google Gemini 2.5 Flash (generation + classification), Supabase.ai `gte-small` (embeddings) |
| Agent integration | MCP server (stdio transport), Claude Skills |
| Storage | Supabase Storage (`doc-uploads` bucket) |

---

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [PowerSync account](https://www.powersync.com) (free tier works)

### Setup

**1. Clone and install**

```bash
git clone <repo-url> dev-memory-ledger
cd dev-memory-ledger
npm install
```

**2. Configure environment**

```bash
cp .env.local.example .env.local
```

Fill in the following variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_POWERSYNC_URL` | PowerSync instance URL |
| `POWERSYNC_JWT_SECRET` | Secret for signing PowerSync JWTs |

**3. Start the database**

```bash
supabase start
supabase db push
```

This applies all 11 migrations — creating tables, pgvector indexes, PowerSync publication, and storage bucket.

**4. Deploy Edge Functions**

```bash
supabase functions deploy --no-verify-jwt
```

**5. Run the app**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**6. (Optional) Start the MCP server**

```bash
npm run mcp:dev
```

> [!IMPORTANT]
> Steps 1–5 are enough to run the full demo locally. The MCP server (step 6) is only needed if you want to use DevMem tools from Claude Code or another MCP-compatible agent.

---

## Using DevMem in Your IDE

The MCP server exposes 7 tools that any MCP-compatible agent can use. Add it to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "dev-memory-ledger": {
      "command": "npx",
      "args": ["tsx", "/path/to/dev-memory-ledger/mcp/server.ts"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

Once configured, the agent can use DevMem tools directly:

```
> "Attach this repo to Dev Memory project my-project."
> "Have we seen this error before? TypeError: Cannot read property 'status' of undefined"
> "Save this fix as a lesson."
> "Summarize improvements in the last 30 days."
```

After calling `devmem_attach` once, a `.devmemory.json` file is written to your workspace root. All subsequent calls auto-resolve the project — no slug needed.

### MCP Tools Reference

| Tool | Description |
|------|-------------|
| `devmem_list_projects` | Discover available projects and their slugs |
| `devmem_search` | RAG search — question, error, or antipattern mode |
| `devmem_save_lesson` | Save a structured lesson from a code change or bug fix |
| `devmem_save_note` | Save a note, guideline, standard, or decision |
| `devmem_summarize` | Summarize improvements over a time period |
| `devmem_attach` | Attach the current workspace to a project |
| `devmem_create_project` | Create a new project in the ledger |

> [!TIP]
> If the project doesn't exist yet, use `devmem_create_project` to create it first, then `devmem_attach` to link your workspace. See [docs/agent-api.md](docs/agent-api.md) for the full API reference.

---

## PowerSync & Local-First

This section explains how Dev Memory Ledger uses PowerSync for true local-first operation — not just caching.

### What's Synced

Four tables are replicated to the browser via Postgres logical replication:

| Table | Content |
|-------|---------|
| `projects` | Project names, slugs, descriptions |
| `lessons` | Structured lessons with tags, risk levels, antipattern metadata |
| `questions` | Q&A history with sources |
| `ingest_jobs` | Document ingestion queue with real-time progress |

### Why Local-First, Not Just Caching

- **Reads hit local SQLite first.** Every `useQuery()` call runs against the local wa-sqlite database — zero network latency.
- **Writes go local first, then sync.** New data is written to local SQLite immediately and synced to Postgres in the background.
- **Full offline support.** The app works completely disconnected. Browse lessons, review antipatterns, view past Q&A — all from local data.
- **Conflict resolution is automatic.** PowerSync handles bidirectional sync and conflict resolution transparently.

### Offline Briefcase

Pin a project to your "Offline Briefcase" to explicitly mark it as offline-ready:

1. Open a project and click the **Offline** pin button
2. A connection indicator shows **Synced** (green) or **Offline** (amber pulse)
3. When offline, a banner confirms the project is pinned for offline use

### How to Demo Offline Mode

1. Open the app and navigate to a project
2. Pin it using the Offline button
3. Disconnect your network (DevTools → Network → Offline, or disable Wi-Fi)
4. Browse lessons, view antipatterns, check timeline — everything works
5. Reconnect — changes sync automatically

> [!NOTE]
> PowerSync schema is defined in [`src/powersync/schema.ts`](src/powersync/schema.ts). The connector that handles auth and sync is in [`src/powersync/connector.ts`](src/powersync/connector.ts).

---

## Project Structure

```
dev-memory-ledger/
├── src/
│   ├── routes/            # Page components (React Router v7)
│   ├── components/        # UI organized by feature area
│   │   ├── lessons/       # Lesson cards, tab content, composer
│   │   ├── antipatterns/  # Antipattern tab, detail views
│   │   ├── timeline/      # Timeline selector, focus areas
│   │   ├── questions/     # Ask page, Q&A display
│   │   ├── knowledge/     # Document table, import flow
│   │   └── ui/            # shadcn/ui primitives
│   ├── hooks/             # Data hooks (use-lessons, use-search, etc.)
│   ├── services/          # API service layer
│   ├── powersync/         # Schema, connector, provider
│   └── types/             # Shared TypeScript interfaces
├── supabase/
│   ├── functions/         # 12 Edge Functions + _shared/ utilities
│   └── migrations/        # 11 SQL migrations
├── mcp/                   # MCP server (7 tools, stdio transport)
├── docs/                  # Agent API reference
└── demo/                  # CLI demo scripts (Deno)
```
