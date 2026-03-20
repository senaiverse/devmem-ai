# DevMem AI — Demo Video Script

**Target length: 2 minutes**
**Format: Screen recording with voiceover**
**Tip: Record at 1920x1080, dark mode, clean browser (no bookmarks bar)**

---

## SCENE 1: Hook (10s)

**Screen:** Title card or text overlay
**Voiceover:**
> "Developers lose institutional knowledge every day — scattered across commits, docs, and Slack threads. DevMem AI fixes that."

---

## SCENE 2: Projects Dashboard (10s)

**Screen:** Open app → Projects page (shows project cards with stats)
**Voiceover:**
> "DevMem AI is a local-first knowledge base for your codebases. Each project tracks lessons, antipatterns, and Q&A history."

**Action:** Click into a project to show stats cards (Lessons, Questions, Documents).

---

## SCENE 3: Import Documents (20s)

**Screen:** Click "Docs" dropdown → "Import Documents"
**Voiceover:**
> "Start by importing your docs — architecture decisions, runbooks, changelogs. Drag and drop, pick a category, and watch the AI process them in real time."

**Action:**
1. Select a category (e.g., "architecture")
2. Drag-drop a markdown file
3. Show the progress bar moving from 0% → 100%
4. Click "Back to Project" → show updated document count in stats

---

## SCENE 4: Browse Lessons (15s)

**Screen:** Lessons tab with card grid
**Voiceover:**
> "The AI extracts structured lessons automatically — each with a problem, solution, recommendation, and tags. Search and filter to find what you need."

**Action:**
1. Show lesson cards with tags and risk badges
2. Type "security" in the search bar → filtered results
3. Click a lesson card → centered dialog opens with full details

---

## SCENE 5: Antipattern Radar (15s)

**Screen:** Switch to Antipatterns tab
**Voiceover:**
> "Every lesson is auto-classified for risk. The antipattern radar surfaces high-risk patterns so your team can address them before they become problems."

**Action:** Show "High Risk" section with red badges, scroll through items.

---

## SCENE 6: Timeline (10s)

**Screen:** Switch to Timeline tab → select "30d"
**Voiceover:**
> "The timeline gives you an AI-generated summary of your team's progress — which areas are strong, which need attention."

**Action:** Show the summary text, Focus Areas badges (strong/needs attention), and category breakdowns.

---

## SCENE 7: Ask a Question (15s)

**Screen:** Click "Ask" button → Ask page
**Voiceover:**
> "Ask any question about your project. The RAG engine searches lessons and documents, then generates an answer with cited sources."

**Action:**
1. Type a question (e.g., "What authentication issues have we seen?")
2. Click "Ask" → show the AI answer appearing with source references
3. Show Q&A history below — click an older entry to open its detail dialog

---

## SCENE 8: MCP / IDE Integration (15s)

**Screen:** Switch to terminal with Claude Code open
**Voiceover:**
> "DevMem AI also works directly in your IDE via the Model Context Protocol. Search your knowledge base, save lessons from code changes — all without leaving the terminal."

**Action:**
1. Type: "search devmem for authentication lessons"
2. Show `devmem_search` MCP tool call → structured table response
3. Briefly show: "save a note about our deployment process" → `devmem_save_note` call

---

## SCENE 9: Offline Mode (10s)

**Screen:** Back in the web app
**Voiceover:**
> "And because it's built on PowerSync, everything works offline. Pin a project, disconnect, and keep working. Changes sync automatically when you're back online."

**Action:**
1. Click "Offline" pin button → green "Synced" indicator
2. Open DevTools → toggle Network to Offline
3. Browse lessons — still works (amber "Offline" indicator visible)
4. Re-enable network → syncs

---

## SCENE 10: Closing (5s)

**Screen:** Title card with logo
**Voiceover:**
> "DevMem AI — local-first AI memory for your codebases. Built with PowerSync and Supabase."

**Show:** GitHub link, PowerSync badge, Supabase badge.

---

## Recording Tips

- Use a clean browser profile (no extensions, no bookmarks bar)
- Dark mode looks best on video
- Keep mouse movements deliberate and slow
- Pause 1-2 seconds after each action so viewers can follow
- Record voiceover separately if possible (cleaner audio)
- Use OBS Studio or Loom for screen recording
- Export at 1080p, upload to YouTube as unlisted
