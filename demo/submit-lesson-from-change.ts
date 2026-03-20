#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Demo CLI: Submit a lesson from a code change.
 *
 * Usage:
 *   deno run --allow-net --allow-env --allow-read demo/submit-lesson-from-change.ts [project_slug]
 *
 * Reads SUPABASE_URL from environment or defaults to local dev.
 * Loads sample data from demo/sample-change.json.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321';

const samplePath = new URL('./sample-change.json', import.meta.url);
const sampleData = JSON.parse(await Deno.readTextFile(samplePath));

const projectSlug = Deno.args[0] ?? sampleData.project_slug;

const payload = {
  project_slug: projectSlug,
  diff_summary: sampleData.diff_summary,
  error_log: sampleData.error_log ?? undefined,
  notes: sampleData.notes ?? undefined,
  commit_message: sampleData.commit_message ?? undefined,
};

console.log(`\nSubmitting lesson to ${SUPABASE_URL}/functions/v1/create-lesson-from-change`);
console.log(`Project slug: ${projectSlug}\n`);

const res = await fetch(`${SUPABASE_URL}/functions/v1/create-lesson-from-change`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const body = await res.json();

if (!res.ok) {
  console.error(`Error (${res.status}):`, body);
  Deno.exit(1);
}

console.log('Lesson created successfully!');
console.log(`  ID:    ${body.lesson.id}`);
console.log(`  Title: ${body.lesson.title}`);
console.log(`  Tags:  ${(body.lesson.tags || []).join(', ')}`);
console.log(`\nFull response:\n${JSON.stringify(body, null, 2)}`);
