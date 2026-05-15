# Deets — Roadmap

Consolidated future plans extracted from `docs/superpowers/specs/` and `docs/superpowers/research/`. Grouped into phases; order is approximate and should be re-prioritized during brainstorming.

---

## Phase 1 — Core Infrastructure

Unblock everything downstream.

- **URL persistence** — store processed `UrlEntry` records in KV by URL key
- **`by-category:*` index** — KV key prefix listing all saved URLs per category
- **`createdAt`** — timestamp each entry on save
- **Category pages** — routes like `/dev`, `/ai-law` showing all saved URLs for a category
- **Saved session history** — allow browsing past processing sessions

## Phase 2 — Quality of Life

Improve the current paste → process → export flow.

- **Card streaming (SSE)** — results appear live as each URL finishes, instead of all at once
- **Default category** — Settings option to pre-select a category for new batches
- **AI prompt customization** — Settings option to edit the prompt template used for summarization/tagging/stack-fit
- **Tag filtering & search** — filter results or saved entries by tag or free-text search

## Phase 3 — Start.me Automation

Bridge from Deets into start.me automatically.

- **CSV export** — generate a CSV with columns `title`, `URL`, `description` for start.me import
- **Playwright / browser-harness auto-upload** — automate the start.me CSV import flow: log in, navigate to import page, upload file
- **Backup: reverse-engineer extension API** — explore the Chrome extension's internal API for direct POST (fragile, not preferred)

## Phase 4 — Independence

Reduce and eventually eliminate the start.me dependency.

- **Visual bookmark manager** — replace start.me entirely with Deets as the curated link hub
- **Drag-and-drop organization** — reorder bookmarks within categories
- **Browser extension** — one-click save from any page
- **Link checker** — find broken links and duplicates across saved entries
- **AI auto-organize** — let the AI suggest category/tag assignments on save
- **Multiple pages** — separate pages for different topic areas

## Phase 5 — Polish & Scale

- **Rate limiting** — protect the API from abuse
- **Auth** — user accounts (blocking multi-user and sharing)
- **Custom themes/layouts** — beyond the existing dark/light toggle
- **Cloudflare dev adapter** — fix `wrangler dev` bindings for local development

---

## Reference

| Source | What |
|---|---|
| `specs/2026-05-14-deets-design.md` | Original design spec — post-v1 section, settings page post-v1 items |
| `specs/2026-05-15-deets-fixes-design.md` | Blocker fixes — out-of-scope items |
| `research/start-me-research.md` | Start.me API research — automation strategy, feature duplication estimates |
