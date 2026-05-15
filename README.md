# Deets — URL curator with AI summaries

Paste a list of URLs, get back AI-generated summaries, tags, and stack-fit analysis. Built for [Cloudflare Workers](https://workers.cloudflare.com/) with [HonoX](https://honox.dev/) and [Workers AI](https://developers.cloudflare.com/workers-ai/).

## How it works

1. **Paste URLs** — paste a block of URLs (with or without name labels like `00:38 - onBeacon : https://onbeacon.ai`)
2. **AI processing** — the app fetches each page and uses Llama 4 Scout to generate a 2-sentence summary and relevant tags
3. **Stack fit** — optionally describe your dev container/stack; the AI evaluates each tool as COMPLEMENT, REPLACE, ENHANCE, or NO_FIT
4. **Refine & export** — edit tags inline, then export for [start.me](https://start.me) or copy all results

## Pages

| Route | Description |
|---|---|
| `/` | URL input, processing, results |
| `/categories` | Manage categories and per-category tag lists that guide AI tagging |
| `/settings` | Describe your dev stack for stack-fit evaluation |

## Data flow

```
URL input → parser.ts (parse named/unnamed URLs)
         → fetchPageText (strip HTML from each URL)
         → summarizeAndTag (LLM → summary + tags)
         → evaluateStackFit (optional LLM → verdict)
         → results displayed as cards with editable tags
         → export to start.me format
```

Categories, tags, and stack descriptions are persisted in Cloudflare KV.

## Develop

```sh
npm install
npm run dev
```

## Deploy

```sh
npm run deploy
```

Requires a Cloudflare account with Workers AI enabled and a KV namespace named `DEETS_KV`.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Local dev server with HonoX |
| `npm run build` | Build for production |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run test` | Run tests (vitest) |
| `npm run cf-typegen` | Sync Worker bindings types |
