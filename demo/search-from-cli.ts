#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Demo CLI: Search the knowledge base.
 *
 * Usage:
 *   deno run --allow-net --allow-env demo/search-from-cli.ts <project_slug> <query> [mode]
 *
 * Arguments:
 *   project_slug  - The project slug (e.g., "dev-memory-ledger")
 *   query         - The search query string
 *   mode          - Optional: "question" (default), "error", or "antipattern"
 *
 * Examples:
 *   deno run --allow-net --allow-env demo/search-from-cli.ts my-project "How do we handle auth?"
 *   deno run --allow-net --allow-env demo/search-from-cli.ts my-project "TypeError: cannot read property" error
 *   deno run --allow-net --allow-env demo/search-from-cli.ts my-project "What antipatterns exist?" antipattern
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';

const [projectSlug, query, mode] = Deno.args;

if (!projectSlug || !query) {
  console.error('Usage: search-from-cli.ts <project_slug> <query> [mode]');
  console.error('Modes: question (default), error, antipattern');
  Deno.exit(1);
}

const validModes = ['question', 'error', 'antipattern'];
const searchMode = mode && validModes.includes(mode) ? mode : 'question';

const payload = {
  project_slug: projectSlug,
  query,
  mode: searchMode,
};

console.log(`\nSearching ${SUPABASE_URL}/functions/v1/search`);
console.log(`Project: ${projectSlug} | Mode: ${searchMode}`);
console.log(`Query: "${query}"\n`);

const res = await fetch(`${SUPABASE_URL}/functions/v1/search`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json();

if (!res.ok) {
  console.error(`Error (${res.status}):`, body);
  Deno.exit(1);
}

console.log('--- Answer ---');
console.log(body.answer);

if (body.similar_lessons?.length) {
  console.log('\n--- Similar Lessons ---');
  for (const sl of body.similar_lessons) {
    console.log(`  [${sl.lesson_id}] ${sl.title}: ${sl.reason}`);
  }
}

if (body.suggested_steps?.length) {
  console.log('\n--- Suggested Steps ---');
  for (const [i, step] of body.suggested_steps.entries()) {
    console.log(`  ${i + 1}. ${step}`);
  }
}

if (body.sources?.length) {
  console.log(`\n--- Sources (${body.sources.length}) ---`);
  for (const s of body.sources) {
    console.log(`  [${s.type}] ${s.title || s.id}`);
  }
}

if (body.project) {
  console.log(`\n--- Project ---`);
  console.log(`  ${body.project.name} (${body.project.slug})`);
}
