# Deets — URL Curation & Categorization App

## Overview

A web app for pasting lists of URLs (from YouTube descriptions, etc.), automatically fetching each page, generating a 2-sentence AI summary, evaluating whether the tool would fit in the user's existing dev stack, categorizing and tagging each URL, and exporting the results for entry into start.me. Eventually aims to replace the start.me subscription entirely.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: HonoX (Hono's full-stack framework with file-based routing, island architecture)
- **Frontend**: JSX (React-like, via HonoX)
- **AI**: Cloudflare Workers AI (for summarization + tagging)
- **Storage**: Cloudflare KV (URLs keyed by URL string)
- **CSS**: Custom CSS with light/dark mode (no framework in v1)
- **Patterns**: Functional, pure functions, avoid useEffect

## Pages / Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Paste URLs, process, review results, export for start.me |
| `/categories` | **Categories** | Manage categories and their per-category tags |
| `/settings` | **Settings** | Configure stack description, light/dark mode, AI prompt |

## Data Model

### KV Store

**Key**: The URL itself (normalized).  
**Value** (`UrlEntry`):

```ts
interface UrlEntry {
  name: string        // from paste label or scraped page title
  url: string         // normalized URL
  summary: string     // 2-sentence AI-generated summary
  stackFit?: string   // AI evaluation: complement, replace, enhance, or no-fit + explanation (only if stack fit was requested)
  category: string    // the one main category (e.g. "dev")
  tags: string[]      // multiple tags from category's tag pool
  createdAt: number   // unix timestamp
}
```

**Key prefix for category listing**: `by-category:{category}` → set of URL keys.

**Key prefix for categories config**:
- `categories` → JSON list of category names
- `tags:{category}` → JSON array of tags for that category
- `stack-description` → user's plain-text description of their dev container/tooling (for stack fit analysis)

### Category / Tag Model

```
Category: "dev"
  Tags: ["ai-coding", "data-pipeline", "open-source", "monitoring", "deployment", "testing", "database", "frontend", "api"]

Category: "ai-tools"
  Tags: ["llm", "rag", "agent", "embedding", "fine-tuning", "prompt", "vector-db", "evaluation"]

Category: "gardening"
  Tags: ["soil", "seeds", "tools", "composting"]
```

## UI Flow

### Home Page (`/`)

1. **Batch category picker** — dropdown + "+ New" button to pick/create the category for this batch of URLs
2. **Stack fit checkbox** — "Check if each tool fits my stack" toggle (uses the container description from Settings)
3. **Paste textarea** — dashed border, user pastes timestamped URLs (e.g. `00:38 - onBeacon : https://onbeacon.ai`). Parser extracts name and URL, discards timestamps.
4. **Process button** — triggers Workers AI pipeline for each URL
5. **Results cards** — animate into view via `fadeSlideIn` as each URL finishes processing
   - Name + URL on same line
   - 2-sentence summary (14px, good contrast in dark mode)
   - Stack fit verdict (if checkbox was on): badge showing complement/replace/enhance/no-fit + 1-line explanation
   - Auto-generated tags as removable chips (× to delete)
   - "+" button to add more tags from the category's tag pool
   - Processing state shows spinner + status text (e.g. "Summarizing...", "Evaluating stack fit...")
6. **Export** — collapsible `<details>` section
   - Each entry formatted as name / url / description (triple-line blocks for easy copy into start.me)
   - Stack fit result included (if available) as a note below the description
   - "Copy All" button
   - No category header (all URLs in batch share same category)

### Categories Page (`/categories`)

- List all categories with tag counts per row
- Expand per-category tag editor (removable chips + add input)
- Add/delete categories
- Tags saved per category, fed into AI prompt

### Settings Page (`/settings`)

- **My Stack** — textarea where user pastes a description (several paragraphs) of their Docker container contents: installed tools, LLMs, repos, workflows. This text is fed to the AI as context when evaluating whether a new tool would fit.
- **Light/dark mode toggle** — switch between themes
- **Default category** — (post-v1) pre-select a category for new batches
- **AI prompt customization** — (post-v1) edit the prompt template

## AI Pipeline (Workers AI)

For each URL in a batch:

1. **Fetch** — GET the page content (`fetch`)
2. **Extract** — pull text content from the page. For GitHub repos, extract README text.
3. **Summarize + Tag** — send to Workers AI with a prompt that includes the category + available tags:
   > "Category: dev. Tags: ai-coding, data-pipeline, open-source, monitoring... Summarize this tool in 2 sentences. Then assign matching tags."
4. **Stack Fit** (if checkbox was on) — send a second prompt to Workers AI with the container description from Settings:
   > "Here is my current dev environment: [stack-description from KV]. Given this tool's page content: [extracted text], would this tool complement, replace, or enhance anything in my stack, or is it a no-fit? Explain in 1 sentence. Answer with a single verdict label (COMPLEMENT / REPLACE / ENHANCE / NO-FIT) followed by a brief explanation."
5. **Parse response** — extract 2-sentence summary + tag list (step 3), and stack fit verdict + explanation (step 4)
6. **Save** — write to KV (ephemeral in v1)

Processing is done per-URL, cards stream in as each completes.

## Data Parsing

Input format (raw paste):
```
00:38 - onBeacon : https://onbeacon.ai
01:14 - Bruin : https://getbruin.com?ref=producthunt
```

Regex extracts: timestamp (discarded), name (before colon), URL (after colon).  
Fallback: if page has no clear name in paste, fetch page and use `<title>` tag.

## Export Format (start.me)

```
onBeacon
https://onbeacon.ai
AI-powered platform for monitoring proximity beacons...

Bruin
https://getbruin.com
Open-source data pipeline platform...
Stack: COMPLEMENT — would replace your current manual pipeline, integrates with your existing DB tools
```

Manual: copy name → paste in start.me title, copy URL → paste in URL field, copy description → paste in notes.

**"Copy All" button**: Copies the entire export block to clipboard (all entries concatenated). User then manually copies each line block into start.me one at a time.

## v1 vs Post-v1

### v1 (this spec)
- Manual paste → AI process (summary + tagging + optional stack fit) → manual copy into start.me
- Settings page: stack description textarea, light/dark mode toggle
- No persistence of processed URLs — each session is ephemeral. URLs are processed and shown, export is copied, page refresh clears state.
- Focus: paste, process, review, export in one flow. No saved history, no category pages yet.
- KV storage is wired and ready but only used for categories/tags config and stack description in v1.

### Post-v1
- Category pages (`/dev`, `/ai-law`, etc.) showing all saved URLs
- Browser automation (Playwright/harness) to auto-enter into start.me
- Eventually replace start.me entirely — Deets becomes the curated link hub
- Settings page with AI prompt customization
- Tag filtering, search, saved session history

## Design Decisions

- **Flat tags** (not hierarchical) — one category per URL, multiple tags for cross-cutting labels
- **Tags per category** — each category has its own tag pool, AI picks from it
- **Stack fit is opt-in per batch** — checkbox on home page. User defines their container description in Settings. AI compares each tool against this description.
- **Two Workers AI calls per URL** (when stack fit is on) — summarization first, then stack fit evaluation. Done sequentially for each URL.
- **KV over D1 for v1** — simpler, faster to ship, good enough for per-category lookups
- **HonoX** — island architecture means minimal JS on client, no React SPA complexity
- **No useEffect** — use event handlers and signals/state from HonoX patterns instead

## UI Notes

- Dark mode default with light/dark toggle in nav
- Card animations (fadeSlideIn staggered) for delight during processing
- Removable tag chips on result cards
- Collapsible export section (not a big button)
