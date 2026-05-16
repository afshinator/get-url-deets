# CLAUDE.md — get-url-deets (Deets)

## Project Overview

**Name:** get-url-deets (branded "Deets")
**Purpose:** URL curator — paste URLs, get AI-generated summaries, tags, and stack-fit verdicts; export to start.me
**Stack:** HonoX / Vite / Cloudflare Workers / Workers AI (Llama 4 Scout) / Cloudflare KV
**Repo:** https://github.com/afshinm/get-url-deets

---

## Running the Project

```bash
npm install

# Dev server (http://localhost:5173, uses local Cloudflare bindings via wrangler proxy)
npm run dev

# Build (must run client pass first, then worker pass — order matters)
npm run build

# Deploy to Cloudflare Workers
npm run deploy

# Tests
npm test

# Sync wrangler binding types after changing wrangler.jsonc
npm run cf-typegen
```

---

## Architecture

```
URL input → app/lib/parser.ts   (parse named/unnamed URLs, infer type tags)
          → app/lib/ai.ts       (fetchPageText → summarizeAndTag → evaluateStackFit)
          → app/lib/kv.ts       (persist entries + category indexes to DEETS_KV)
          → app/lib/export.ts   (format results for start.me export)
```

### Key files

| File | Role |
|---|---|
| [app/routes/index.tsx](app/routes/index.tsx) | Main page: URL input, processing, result cards |
| [app/routes/library.tsx](app/routes/library.tsx) | Saved library view |
| [app/routes/categories.tsx](app/routes/categories.tsx) | Manage categories and per-category tag pools |
| [app/routes/settings.tsx](app/routes/settings.tsx) | Stack description for stack-fit evaluation |
| [app/islands/ResultCards.tsx](app/islands/ResultCards.tsx) | Interactive result cards (client island) |
| [app/islands/CategoriesManager.tsx](app/islands/CategoriesManager.tsx) | Category/tag management (client island) |
| [app/lib/ai.ts](app/lib/ai.ts) | All AI logic: summarize, stack-fit, fetch page text |
| [app/lib/kv.ts](app/lib/kv.ts) | KV read/write for entries and category indexes |
| [app/lib/parser.ts](app/lib/parser.ts) | URL parsing, type-tag inference |
| [app/lib/types.ts](app/lib/types.ts) | Shared types (`UrlEntry`, etc.) |
| [wrangler.jsonc](wrangler.jsonc) | Cloudflare Worker config — bindings, KV namespaces |

### Cloudflare bindings (declared in wrangler.jsonc)

| Binding | Type | Purpose |
|---|---|---|
| `AI` | Workers AI | LLM calls (Llama 4 Scout) |
| `DEETS_KV` | KV namespace | Entries, category indexes, stack description |

### AI model

All inference goes through `@cf/meta/llama-4-scout-17b-16e-instruct` via `env.AI.run(...)`. Responses may come back as a string or as a structured object — `parseRawAiResponse` / `parseRawStackFitResponse` handle both shapes.

### Stack-fit verdicts

Four valid values: `COMPLEMENT`, `REPLACE`, `ENHANCE`, `NO_FIT`. A `FAILED` verdict is set locally when parsing fails — it is not returned by the LLM.

### KV key schema

- `entry:<normalized-url>` — serialized `UrlEntry`
- `by-category:<category>` — JSON array of normalized URLs (max 200, newest first)
- Stack description and category/tag config stored separately (see `kv.ts`)

---

## Tests

Tests live in `tests/` and run with vitest. AI parsing logic and KV helpers have unit test coverage — keep them updated when changing `ai.ts`, `kv.ts`, or `parser.ts`.

```bash
npm test
```

---

## Build quirks

The build is a two-pass Vite process: client assets first (`--mode client`), then the Worker bundle. The `npm run build` script handles this. Do not run just `vite build` without the mode flag.

---

## Off Limits

- Do not change the KV namespace ID in `wrangler.jsonc` without explicit permission — it points to the production namespace.
- Do not push directly to main or run `wrangler deploy` without asking first.
- Do not add new Cloudflare bindings without updating `worker-configuration.d.ts` via `npm run cf-typegen`.
