# Start.me Research Notes

## Public API

**No public REST API exists.** Start.me does not offer any documented API for programmatically adding bookmarks. The old 2015 blog post about RSS/OPML endpoints has been marked "no longer accurate" since 2021.

## Import Options (programmatic-friendly)

| Method | Format | Automation Potential |
|--------|--------|----------------------|
| File upload | CSV (title, URL, description, widget, group) | **Best bet** — generate CSV, upload via browser |
| File upload | HTML bookmark file, TXT, XLS, ODS | Also viable |
| Browser extension | Chrome/Firefox/Edge "Bookmarker by start.me" | Reverse-engineer internal API (fragile) |
| Import from URL | scrapes a page for links | Not useful for our case |

<!-- Automation strategy moved to docs/roadmap.md (Phase 3) -->

## Start.me Feature Summary (for eventual duplication)

### Core features
- **Visual bookmark manager** — bookmarks displayed as visual cards/icons, organized into columns/widgets
- **Folder/Group organization** — bookmarks organized into groups within widgets, widgets on pages, multiple pages
- **Drag & drop** — rearrange everything by dragging
- **Tags** — tag bookmarks, though less emphasized than folder organization
- **Browser extensions** — one-click save, quick search

### Widgets (50+)
- Bookmarks widget (core)
- Notes, Tasks, Calendar
- RSS/News feeds
- Weather, Clock
- Charts, Financial (stock tickers)
- Embedded webpages/video
- Integration widgets (Google Analytics, AdSense, etc.)

### Polish features
- **Dark mode** + themes + custom backgrounds
- **AI** — suggest sites, clean up titles, auto-organize bookmarks
- **Link Checker** — find broken links and duplicates
- **Search** — from browser address bar
- **Import/Export** — browser bookmarks, CSV, HTML, OPML
- **Collaboration** — share pages publicly or with team, real-time editing
- **Multiple pages** — create many pages for different topics/contexts
- **Archived pages** — hide inactive pages without deleting

## Effort Estimate to Duplicate Core

| Feature | Effort |
|---------|--------|
| View bookmarks by category/page | Low (our app already in design) |
| Drag-and-drop reordering | Medium |
| Multiple pages with navigation | Medium |
| Browser extension for quick save | High |
| Full widget system (RSS, weather, etc.) | Very High |
| AI auto-organize | Medium (we already have Workers AI) |
| Link checker (broken + dupes) | Medium |
| Collaboration/sharing | Very High |
| Custom themes/layouts | Medium |

**Verdict**: Replicating the full start.me experience is a large project (months). However, replacing start.me *for your specific use case* (curated URL library organized by categories with tags and AI summaries) is much simpler and is essentially what Deets already is designed to be. The main missing piece in v1 is: (1) bookmark persistence with category pages, (2) browser extension for quick save, (3) drag-and-drop organization.

<!-- Phased recommendation moved to docs/roadmap.md -->
