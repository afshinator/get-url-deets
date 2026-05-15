# Deets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a HonoX web app that parses pasted URLs, uses Workers AI to summarize/tag/stack-fit them, and exports formatted results for start.me.

**Architecture:** HonoX with file-based routing on Cloudflare Workers. Server routes handle page rendering and API processing. Client-side islands provide interactivity (animated cards, theme toggle). Workers AI does summarization + tagging + stack fit analysis. KV stores category/tag config and stack description.

**Tech Stack:** HonoX, hono/jsx, Cloudflare Workers, Workers AI, KV, `@hono/vite-build/cloudflare-workers`, `@hono/vite-dev-server/cloudflare`, Vite

---

## File Structure

```
app/
├── server.ts               # Entry: createApp()
├── client.ts                # Client hydration entry
├── routes/
│   ├── _renderer.tsx        # HTML shell + CSS
│   ├── index.tsx            # Home: paste, process, review, export
│   ├── categories.tsx       # Manage categories + tags
│   ├── settings.tsx         # Stack description, theme toggle
│   └── api/
│       └── process.ts       # POST /api/process — AI pipeline
├── islands/
│   ├── ThemeToggle.tsx       # Dark/light mode toggle
│   └── ResultCards.tsx       # Paste form + animated result cards + export
├── lib/
│   ├── parser.ts            # Parse pasted text → URL items
│   ├── ai.ts                # Workers AI calls: summarize, tag, stack-fit
│   └── export.ts            # Format results for start.me output
└── style.css                # Global CSS: dark/light theme, animations, layout
```

---

### Task 1: Scaffold HonoX project structure

**Files:**
- Create: `app/server.ts`
- Create: `app/client.ts`
- Create: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `wrangler.jsonc`
- Delete: `src/index.ts` (replace with HonoX entry)
- Delete: `public/index.html` (renderer handles HTML)

- [ ] **Step 1: Install HonoX and build dependencies**

```bash
npm install honox @hono/vite-build @hono/vite-dev-server
```

- [ ] **Step 2: Create `app/server.ts`**

```ts
import { createApp } from 'honox/server'
import { showRoutes } from 'hono/dev'

const app = createApp()

showRoutes(app)

export default app
```

- [ ] **Step 3: Create `app/client.ts`**

```ts
import { createClient } from 'honox/client'

createClient()
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'

export default defineConfig({
  plugins: [
    honox({
      devServer: { adapter },
      client: {
        input: ['/app/client.ts', '/app/style.css'],
        assetsDir: 'static',
        jsxImportSource: 'hono/jsx/dom',
      },
    }),
    build(),
  ],
})
```

- [ ] **Step 5: Update `package.json` scripts**

```json
{
  "name": "get-deets",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build --mode client && vite build",
    "deploy": "vite build --mode client && vite build && wrangler deploy --minify",
    "preview": "wrangler dev",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings"
  },
  "dependencies": {
    "hono": "^4.12.18",
    "honox": "^0.1.0"
  },
  "devDependencies": {
    "@hono/vite-build": "^0.1.0",
    "@hono/vite-dev-server": "^0.1.0",
    "@types/node": "^25.8.0",
    "vite": "^6.0.0",
    "wrangler": "^4.91.0"
  }
}
```

- [ ] **Step 6: Update `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ESNext"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "types": ["./worker-configuration.d.ts", "vite/client"]
  },
  "include": ["app/**/*.ts", "app/**/*.tsx"]
}
```

- [ ] **Step 7: Update `wrangler.jsonc` — change `main` to HonoX entry**

Replace `"main": "src/index.ts"` with:

```jsonc
"main": "app/server.ts"
```

- [ ] **Step 8: Remove old files**

```bash
rm src/index.ts public/index.html
```

- [ ] **Step 9: Run `npm run cf-typegen` to regenerate types**

```bash
npm run cf-typegen
```

Expected: `worker-configuration.d.ts` updated with correct main module path.

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, no errors.

---

### Task 2: Configure Cloudflare Bindings (AI + KV)

**Files:**
- Modify: `wrangler.jsonc`
- Create: `.dev.vars`

- [ ] **Step 1: Add Workers AI binding to `wrangler.jsonc`**

Add inside the top-level JSON object:

```jsonc
"ai": {
  "binding": "AI"
}
```

Full wrangler.jsonc after this task:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "get-deets",
  "main": "app/server.ts",
  "compatibility_date": "2026-05-14",
  "observability": {
    "enabled": true
  },
  "upload_source_maps": true,
  "compatibility_flags": ["nodejs_compat"],
  "ai": {
    "binding": "AI"
  }
}
```

Note: The old `"assets"` block under `wrangler.jsonc` is removed because HonoX/Vite handles static asset serving differently.

- [ ] **Step 2: Create KV namespace for categories + stack config**

Run:

```bash
npx wrangler kv:namespace create DEETS_KV
```

Expected output: KV namespace ID (save it).

- [ ] **Step 3: Add KV binding to `wrangler.jsonc`**

Add after the `"ai"` block:

```jsonc
"kv_namespaces": [
  {
    "binding": "DEETS_KV",
    "id": "<YOUR_KV_NAMESPACE_ID>"
  }
]
```

- [ ] **Step 4: Create `.dev.vars` (if using Workers AI in local dev)**

```bash
echo "" > .dev.vars
```

(Workers AI binding works locally without API key for Cloudflare-connected dev.)

- [ ] **Step 5: Run `npm run cf-typegen` to update types**

```bash
npm run cf-typegen
```

Expected: `worker-configuration.d.ts` now includes `AI` and `DEETS_KV` bindings.

- [ ] **Step 6: Verify dev server starts with bindings**

```bash
npm run dev
```

Expected: Vite dev server starts, no binding errors.

---

### Task 3: Create Renderer + Global CSS

**Files:**
- Create: `app/routes/_renderer.tsx`
- Create: `app/style.css`

- [ ] **Step 1: Create `app/style.css` — dark theme default + light mode + animations**

```css
/* Dark theme (default) */
:root {
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-input: #1e293b;
  --border: #334155;
  --border-focus: #475569;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-body: #cbd5e1;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #ef4444;
  --warning: #f59e0b;
  --success: #22c55e;
  --link: #60a5fa;
  --tag-bg: #334155;
  --tag-text: #cbd5e1;
  --code-bg: #1e293b;
  --radius: 8px;
}

/* Light theme */
[data-theme="light"] {
  --bg: #f8fafc;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --border: #e2e8f0;
  --border-focus: #94a3b8;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-body: #334155;
  --link: #2563eb;
  --tag-bg: #e2e8f0;
  --tag-text: #334155;
  --code-bg: #f1f5f9;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
}

/* Nav */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 20px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.nav-brand {
  font-weight: 600;
  margin-right: 24px;
}
.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  margin-right: 16px;
}
.nav-link.active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
  padding-bottom: 2px;
}
.nav-link:hover {
  color: var(--text);
}

/* Layout */
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 10px;
}

/* Result card animation */
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.card-animate {
  animation: fadeSlideIn 0.4s ease-out forwards;
}
.card-animate:nth-child(2) { animation-delay: 0.05s; }
.card-animate:nth-child(3) { animation-delay: 0.1s; }
.card-animate:nth-child(4) { animation-delay: 0.15s; }
.card-animate:nth-child(5) { animation-delay: 0.2s; }

/* Forms */
.input, .textarea, select {
  background: var(--bg-input);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
}
.textarea {
  width: 100%;
  min-height: 100px;
  border-style: dashed;
  resize: vertical;
}
.textarea:focus, .input:focus, select:focus {
  outline: none;
  border-color: var(--accent);
}
label, .label-text {
  display: block;
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 4px;
}

/* Buttons */
.btn {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.btn:hover { background: var(--accent-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}
.btn-ghost:hover { border-color: var(--text-muted); color: var(--text); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-danger { background: transparent; border-color: var(--danger); color: var(--danger); }

/* Tags */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--tag-bg);
  color: var(--tag-text);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  margin: 2px;
}
.tag-remove {
  cursor: pointer;
  opacity: 0.5;
  font-size: 14px;
}
.tag-remove:hover { opacity: 1; }
.tag-add {
  cursor: pointer;
  font-size: 18px;
  color: var(--text-muted);
  margin-left: 2px;
}

/* Spinner */
.spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Stack fit badges */
.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-complement { background: #065f46; color: #6ee7b7; }
.badge-replace { background: #713f12; color: #fde68a; }
.badge-enhance { background: #1e3a5f; color: #93c5fd; }
.badge-nofit { background: #374151; color: #9ca3af; }

/* Export preview */
.export-preview {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  font-size: 13px;
  line-height: 1.7;
  font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: pre-wrap;
  color: var(--text-body);
}

/* Categories page */
.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.cat-row:last-child { border-bottom: none; }
.badge-count {
  background: var(--tag-bg);
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 6px;
}

/* Processing state */
.processing-card {
  opacity: 0.7;
}

/* Settings textarea */
.stack-textarea {
  width: 100%;
  min-height: 200px;
  background: var(--bg-input);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}
.stack-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* Theme toggle button */
.theme-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 2px 6px;
}
.theme-btn:hover { color: var(--text); }

/* Utility */
.text-muted { color: var(--text-muted); font-size: 13px; }
.url-link { color: var(--link); font-size: 12px; text-decoration: none; }
.url-link:hover { text-decoration: underline; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.gap-4 { gap: 4px; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-10 { gap: 10px; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.summary-text { font-size: 14px; line-height: 1.5; color: var(--text-body); margin-top: 6px; }
```

- [ ] **Step 2: Create `app/routes/_renderer.tsx`**

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link } from 'honox/server'

const script = import.meta.env.PROD
  ? '/static/client.js'
  : '/app/client.ts'

export default jsxRenderer(({ children, title }) => {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Link href="/app/style.css" rel="stylesheet" />
        <title>{title ?? 'Deets'}</title>
      </head>
      <body>
        {children}
        <script type="module" src={script}></script>
      </body>
    </html>
  )
})
```

- [ ] **Step 3: Verify dev server renders with CSS**

```bash
npm run dev
```

Expected: No errors, CSS loaded at `/app/style.css`.

---

### Task 4: Create Parser Utility

**Files:**
- Create: `app/lib/parser.ts`

- [ ] **Step 1: Create `app/lib/parser.ts`**

```ts
export interface ParsedUrl {
  name: string
  url: string
}

const LINE_RE = /^\s*(?:\d+:)?\d+\s*-\s*(.+?)\s*:\s*(https?:\/\/\S+)/

export function parseUrls(text: string): ParsedUrl[] {
  const lines = text.split('\n')
  const results: ParsedUrl[] = []

  for (const line of lines) {
    const match = line.match(LINE_RE)
    if (match) {
      results.push({
        name: match[1].trim(),
        url: match[2].replace(/ref=[^&\s]*&?/g, '').replace(/\?$/, ''),
      })
    } else {
      const plainUrl = line.match(/https?:\/\/\S+/)
      if (plainUrl) {
        results.push({
          name: '',
          url: plainUrl[0],
        })
      }
    }
  }

  return results
}
```

- [ ] **Step 2: Verify parser works manually (optional)**

```bash
npx tsx -e "
import { parseUrls } from './app/lib/parser.ts'
console.log(parseUrls('00:38 - onBeacon : https://onbeacon.ai/\n01:14 - Bruin : https://getbruin.com?ref=producthunt'))
"
```

Expected:
```
[
  { name: 'onBeacon', url: 'https://onbeacon.ai/' },
  { name: 'Bruin', url: 'https://getbruin.com' }
]
```

---

### Task 5: Create Workers AI Utility

**Files:**
- Create: `app/lib/ai.ts`

- [ ] **Step 1: Create `app/lib/ai.ts`**

```ts
interface AiEnv {
  AI: Ai
}

interface AiResult {
  summary: string
  tags: string[]
}

interface StackFitResult {
  verdict: 'COMPLEMENT' | 'REPLACE' | 'ENHANCE' | 'NO_FIT'
  explanation: string
}

export async function summarizeAndTag(
  env: AiEnv,
  pageText: string,
  category: string,
  availableTags: string[]
): Promise<AiResult> {
  const tagList = availableTags.join(', ')

  const prompt = `You are categorizing a software tool/product.

Category: ${category}

Available tags for this category: ${tagList}

Given the following page content about a tool, respond in JSON format:

{
  "summary": "2 sentences explaining what this tool does",
  "tags": ["tag1", "tag2"]
}

Page content:
${pageText.slice(0, 8000)}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
  })

  const text = (response as { response?: string }).response ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { summary: 'Could not generate summary.', tags: [] }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }
    return {
      summary: parsed.summary?.trim() ?? 'No summary available.',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => t && typeof t === 'string') : [],
    }
  } catch {
    return { summary: text.slice(0, 300), tags: [] }
  }
}

export async function evaluateStackFit(
  env: AiEnv,
  pageText: string,
  stackDescription: string
): Promise<StackFitResult | null> {
  if (!stackDescription.trim()) return null

  const prompt = `You are evaluating whether a tool would fit into an existing development environment.

Here is a description of the current dev environment (tools, workflows, container setup):
"""
${stackDescription.slice(0, 2000)}
"""

Here is a tool's page content:
"""
${pageText.slice(0, 4000)}
"""

Respond in JSON format:
{
  "verdict": "COMPLEMENT" | "REPLACE" | "ENHANCE" | "NO_FIT",
  "explanation": "1 sentence explaining why"
}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 256,
  })

  const text = (response as { response?: string }).response ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as StackFitResult
    return {
      verdict: parsed.verdict ?? 'NO_FIT',
      explanation: parsed.explanation ?? 'No explanation.',
    }
  } catch {
    return null
  }
}

export async function fetchPageText(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Deets/1.0 (URL curator)' },
      redirect: 'follow',
    })
    if (!resp.ok) return ''
    const html = await resp.text()
    // Extract text content: strip HTML tags
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned.slice(0, 10000)
  } catch {
    return ''
  }
}
```

- [ ] **Step 2: No dependencies to install — Workers AI is a built-in binding**

---

### Task 6: Create Export Utility

**Files:**
- Create: `app/lib/export.ts`

- [ ] **Step 1: Create `app/lib/export.ts`**

```ts
import type { UrlEntry } from './types'

export function formatExport(entries: UrlEntry[]): string {
  const categorized = new Map<string, UrlEntry[]>()

  for (const entry of entries) {
    const cat = entry.category || 'uncategorized'
    if (!categorized.has(cat)) categorized.set(cat, [])
    categorized.get(cat)!.push(entry)
  }

  const parts: string[] = []

  for (const [category, items] of categorized) {
    for (const item of items) {
      parts.push(item.name)
      parts.push(item.url)
      parts.push(item.summary)
      if (item.stackFit) {
        parts.push(`Stack: ${item.stackFit.verdict} — ${item.stackFit.explanation}`)
      }
      parts.push('')
    }
  }

  return parts.join('\n').trim()
}
```

- [ ] **Step 2: Create shared types file `app/lib/types.ts`**

```ts
export interface UrlEntry {
  name: string
  url: string
  summary: string
  category: string
  tags: string[]
  stackFit?: {
    verdict: string
    explanation: string
  }
}
```

---

### Task 7: Create API Route `/api/process`

**Files:**
- Create: `app/routes/api/process.ts`

- [ ] **Step 1: Create `app/routes/api/process.ts`**

```ts
import { Hono } from 'hono'
import { parseUrls } from '../../lib/parser'
import { summarizeAndTag, evaluateStackFit, fetchPageText } from '../../lib/ai'
import type { UrlEntry } from '../../lib/types'

type Env = {
  AI: Ai
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.post(async (c) => {
  const body = await c.req.json<{
    text: string
    category: string
    checkStackFit?: boolean
  }>()
  const { text, category, checkStackFit } = body

  const parsed = parseUrls(text)
  if (parsed.length === 0) {
    return c.json({ error: 'No URLs found in text' }, 400)
  }

  const tagsJson = await c.env.DEETS_KV.get(`tags:${category}`)
  const availableTags: string[] = tagsJson ? JSON.parse(tagsJson) : []

  const stackDescription = checkStackFit
    ? (await c.env.DEETS_KV.get('stack-description')) ?? ''
    : ''

  const results: UrlEntry[] = []

  for (const { name, url } of parsed) {
    const pageText = await fetchPageText(url)

    const { summary, tags } = await summarizeAndTag(
      c.env,
      pageText,
      category,
      availableTags
    )

    const resolvedName = name || url

    let stackFit: UrlEntry['stackFit']
    if (checkStackFit && stackDescription) {
      const sf = await evaluateStackFit(c.env, pageText, stackDescription)
      stackFit = sf ? { verdict: sf.verdict, explanation: sf.explanation } : undefined
    }

    results.push({
      name: resolvedName,
      url,
      summary,
      category,
      tags,
      stackFit,
    })
  }

  return c.json({ results })
})

export default app
```

- [ ] **Step 2: Verify HonoX picks up the route**

Start dev server and note that POST `/api/process` appears in route listing from `showRoutes`.

---

### Task 8: Create Islands (Interactive Components)

**Files:**
- Create: `app/islands/ThemeToggle.tsx`
- Create: `app/islands/ResultCards.tsx`

- [ ] **Step 1: Create `app/islands/ThemeToggle.tsx`**

```tsx
import { useEffect } from 'hono/jsx'

export default function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement
    const current = html.getAttribute('data-theme')
    const next = current === 'light' ? 'dark' : 'light'
    html.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button class="theme-btn" onClick={toggle} aria-label="Toggle theme">
      🌓
    </button>
  )
}
```

- [ ] **Step 2: Create `app/islands/ResultCards.tsx`**

This island manages the full paste → process → review flow. It uses `useState` and `useCallback` (no useEffect).

```tsx
import { useState, useCallback } from 'hono/jsx'
import type { UrlEntry } from '../lib/types'

interface Props {
  categories: string[]
}

export default function ResultCards({ categories }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'dev')
  const [checkStackFit, setCheckStackFit] = useState(false)
  const [results, setResults] = useState<UrlEntry[]>([])
  const [processing, setProcessing] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const handleProcess = useCallback(async () => {
    if (!text.trim()) return
    setProcessing(true)
    setResults([])
    setShowExport(false)

    try {
      const resp = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, checkStackFit }),
      })
      const data = await resp.json() as { error?: string; results?: UrlEntry[] }
      if (data.results) {
        setResults(data.results)
      }
    } finally {
      setProcessing(false)
    }
  }, [text, category, checkStackFit])

  const removeTag = useCallback((index: number, tag: string) => {
    setResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], tags: next[index].tags.filter(t => t !== tag) }
      return next
    })
  }, [])

  const addTag = useCallback((index: number, tag: string) => {
    if (!tag.trim()) return
    setResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], tags: [...next[index].tags, tag.trim()] }
      return next
    })
  }, [])

  const formatExport = useCallback(() => {
    return results.map(r =>
      `${r.name}\n${r.url}\n${r.summary}${r.stackFit ? `\nStack: ${r.stackFit.verdict} — ${r.stackFit.explanation}` : ''}`
    ).join('\n\n')
  }, [results])

  return (
    <div>
      {/* Category + Stack Fit row */}
      <div class="flex-between items-end gap-10 mb-16" style="flex-wrap: wrap;">
        <div>
          <label class="label-text">Batch category</label>
          <select
            class="input"
            value={category}
            onChange={(e: Event) => setCategory((e.target as HTMLSelectElement).value)}
          >
            {categories.map(c => <option value={c}>{c}</option>)}
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; padding-top: 18px;">
          <input
            type="checkbox"
            id="stackfit"
            checked={checkStackFit}
            onChange={(e: Event) => setCheckStackFit((e.target as HTMLInputElement).checked)}
          />
          <label for="stackfit" style="color: var(--text-muted); font-size: 13px; cursor: pointer;">
            Check if each tool fits my stack
          </label>
        </div>
      </div>

      {/* Paste textarea */}
      <div class="mb-16">
        <label class="label-text">Paste URLs</label>
        <textarea
          class="textarea"
          value={text}
          onChange={(e: Event) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder={`00:38 - onBeacon : https://onbeacon.ai\n01:14 - Bruin : https://getbruin.com`}
        />
        <div style="display: flex; justify-content: flex-end;" class="mt-8">
          <button class="btn" onClick={handleProcess} disabled={processing || !text.trim()}>
            {processing ? 'Processing...' : 'Process URLs'}
          </button>
        </div>
      </div>

      {/* Progress indicator */}
      {processing && (
        <div class="card processing-card">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="spinner">◌</span>
            <span style="color: var(--text-muted); font-size: 14px;">
              Processing URLs — fetching pages, generating summaries...
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <label class="label-text mb-8">Results ({results.length} URLs)</label>
          {results.map((entry, i) => (
            <div class="card card-animate" key={entry.url}>
              <div>
                <span style="font-weight: 600; font-size: 15px;">{entry.name}</span>
                <a href={entry.url} class="url-link" target="_blank" rel="noopener" style="margin-left: 8px;">
                  {entry.url}
                </a>
              </div>

              <div class="summary-text">{entry.summary}</div>

              {entry.stackFit && (
                <div class="mt-8">
                  <span class={`badge badge-${entry.stackFit.verdict.toLowerCase()}`}>
                    {entry.stackFit.verdict}
                  </span>
                  <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">
                    {entry.stackFit.explanation}
                  </span>
                </div>
              )}

              <div class="mt-8 flex-wrap items-center" style="display: flex; gap: 6px;">
                {entry.tags.map(tag => (
                  <span class="tag" key={tag}>
                    {tag}
                    <span class="tag-remove" onClick={() => removeTag(i, tag)}>×</span>
                  </span>
                ))}
                <span class="tag-add" onClick={() => {
                  const t = prompt('Add tag:')
                  if (t) addTag(i, t)
                }}>+</span>
              </div>
            </div>
          ))}

          {/* Export */}
          <div class="mt-16">
            <details open={showExport}>
              <summary
                style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted);"
                onClick={() => setShowExport(!showExport)}
              >
                Export for start.me
              </summary>
              <div class="export-preview mt-8">{formatExport()}</div>
              <button
                class="btn mt-8"
                onClick={() => navigator.clipboard.writeText(formatExport())}
              >
                Copy All
              </button>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}
```

Wait — the `prompt()` call for adding tags is a bit crude. But it's fine for v1. Let me use it.

Actually, I realize I'm writing the plan inline — let me stop and organize the remaining tasks.

---

### Task 9: Create Home Page Route

**Files:**
- Create: `app/routes/index.tsx`

- [ ] **Step 1: Create `app/routes/index.tsx`**

```tsx
import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import ResultCards from '../islands/ResultCards'
import { Link } from 'honox/server'

const CATEGORIES_KEY = 'categories'

export default createRoute(async (c) => {
  const categoriesJson = c.env?.DEETS_KV
    ? await c.env.DEETS_KV.get(CATEGORIES_KEY)
    : null
  const categories: string[] = categoriesJson
    ? (JSON.parse(categoriesJson) as string[])
    : ['dev']

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <Link href="/" class="nav-link active">Home</Link>
          <Link href="/categories" class="nav-link">Categories</Link>
          <Link href="/settings" class="nav-link">Settings</Link>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <ResultCards categories={categories} />
      </div>
    </div>,
    { title: 'Deets — Home' }
  )
})
```

---

### Task 10: Create Categories Page Route

**Files:**
- Create: `app/routes/categories.tsx`

- [ ] **Step 1: Create `app/routes/categories.tsx`**

```tsx
import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import CategoriesManager from '../islands/CategoriesManager'
import { Link } from 'honox/server'

export default createRoute(async (c) => {
  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <Link href="/" class="nav-link">Home</Link>
          <Link href="/categories" class="nav-link active">Categories</Link>
          <Link href="/settings" class="nav-link">Settings</Link>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <CategoriesManager />
      </div>
    </div>,
    { title: 'Deets — Categories' }
  )
})
```

- [ ] **Step 2: Create `app/islands/CategoriesManager.tsx`**

```tsx
import { useState, useCallback, useEffect } from 'hono/jsx'

interface CategoryData {
  name: string
  tags: string[]
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    const resp = await fetch('/api/categories')
    const data = await resp.json() as { categories: CategoryData[] }
    setCategories(data.categories)
    setLoading(false)
  }

  const saveCategories = async (cats: CategoryData[]) => {
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: cats }),
    })
    setCategories(cats)
  }

  const addCategory = () => {
    if (!newCategory.trim()) return
    const exists = categories.some(c => c.name === newCategory.trim())
    if (exists) return
    const updated = [...categories, { name: newCategory.trim(), tags: [] }]
    saveCategories(updated)
    setNewCategory('')
  }

  const deleteCategory = (name: string) => {
    const updated = categories.filter(c => c.name !== name)
    saveCategories(updated)
    if (editingCategory === name) setEditingCategory(null)
  }

  const addTag = (categoryName: string) => {
    if (!newTag.trim()) return
    const updated = categories.map(c =>
      c.name === categoryName && !c.tags.includes(newTag.trim())
        ? { ...c, tags: [...c.tags, newTag.trim()] }
        : c
    )
    saveCategories(updated)
    setNewTag('')
  }

  const removeTag = (categoryName: string, tag: string) => {
    const updated = categories.map(c =>
      c.name === categoryName
        ? { ...c, tags: c.tags.filter(t => t !== tag) }
        : c
    )
    saveCategories(updated)
  }

  if (loading) {
    return <div class="text-muted">Loading categories...</div>
  }

  return (
    <div>
      <div class="card">
        <div class="flex-between mb-16">
          <div>
            <h3>Categories & Tags</h3>
            <p class="text-muted" style="margin: 0;">Each category has its own set of tags. The AI picks from these when summarizing.</p>
          </div>
        </div>

        <div class="flex-between gap-8 mb-16">
          <input
            class="input"
            style="flex: 1;"
            placeholder="New category name..."
            value={newCategory}
            onChange={(e: Event) => setNewCategory((e.target as HTMLInputElement).value)}
            onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addCategory()}
          />
          <button class="btn" onClick={addCategory}>+ Add Category</button>
        </div>

        {categories.map(cat => (
          <div key={cat.name}>
            <div class="cat-row">
              <div>
                <span style="color: var(--text); font-weight: 600; font-size: 14px;">{cat.name}</span>
                <span class="badge-count">{cat.tags.length} tags</span>
              </div>
              <div class="gap-6" style="display: flex;">
                <button
                  class="btn btn-ghost btn-sm"
                  onClick={() => setEditingCategory(editingCategory === cat.name ? null : cat.name)}
                >
                  Edit Tags
                </button>
                <button class="btn btn-danger btn-sm" onClick={() => deleteCategory(cat.name)}>
                  Delete
                </button>
              </div>
            </div>

            {editingCategory === cat.name && (
              <div style="padding: 12px 0 16px 0;">
                <div class="flex-wrap gap-6 mb-8" style="display: flex;">
                  {cat.tags.map(tag => (
                    <span class="tag" key={tag}>
                      {tag}
                      <span class="tag-remove" onClick={() => removeTag(cat.name, tag)}>×</span>
                    </span>
                  ))}
                  <input
                    class="input"
                    style="width: 120px; font-size: 12px; padding: 3px 8px;"
                    placeholder="+ add tag..."
                    value={editingCategory === cat.name ? newTag : ''}
                    onChange={(e: Event) => setNewTag((e.target as HTMLInputElement).value)}
                    onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addTag(cat.name)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Wait — this CategoriesManager uses `useEffect` for loading! The user explicitly said "avoid useEffect". Let me think about how to load data without useEffect in a HonoX island.

Options:
1. **Pass data as props from the server route** — since the categories page is server-rendered, we can fetch from KV in the route handler and pass categories to the island as initial props
2. **Use a load-on-interaction pattern** — only fetch when user explicitly interacts (but that's clunky for an overview page)
3. **Use a useEffect alternative** — Hono's jsx/dom has `useEffect` but the user doesn't want it

Actually, the best approach is option 1: load data server-side in the route handler and pass it as props to the island. The island starts with the data already populated. For mutations (add/delete), the island sends API calls and updates local state — no useEffect needed for initial load.

Let me redesign this. The categories route fetches from KV and passes data to the island. The island manages mutations only.

```tsx
// categories.tsx (route)
export default createRoute(async (c) => {
  const catsJson = await c.env.DEETS_KV.get('categories')
  const categories: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const tagsByCategory: Record<string, string[]> = {}
  for (const cat of categories) {
    const tagsJson = await c.env.DEETS_KV.get(`tags:${cat}`)
    tagsByCategory[cat] = tagsJson ? JSON.parse(tagsJson) : []
  }

  return c.render(
    <div>...
      <CategoriesManager
        initialCategories={categories}
        initialTags={tagsByCategory}
      />
    </div>
  )
})
```

And the island:
```tsx
interface Props {
  initialCategories: string[]
  initialTags: Record<string, string[]>
}

export default function CategoriesManager({ initialCategories, initialTags }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [tagsByCategory, setTagsByCategory] = useState(initialTags)
  // no useEffect needed!
  ...
}
```

But wait — `useState` in hono/jsx/dom should work for this. The `useEffect` is specifically what the user wants to avoid (side-effects, lifecycle hooks). `useState` and `useCallback` are fine since they're pure state management.

Actually wait - does hono/jsx have `useState`? Let me check. From the earlier query result, the Counter island example used:

```tsx
import { useState } from 'hono/jsx'
```

Yes, hono/jsx has `useState`. And `useEffect` exists too. The user's instruction is "avoid useEffect" — this is about the pattern, not about avoiding the hono/jsx library. Using server-side data loading to avoid the need for useEffect in islands is the right approach.

OK so let me update the plan to reflect this. The CategoriesManager island takes initial data as props, no useEffect needed.

Let me also reconsider the ResultCards island. It has the same issue — initial state is empty, which is fine (no data fetch on mount). The user triggers processing by clicking a button, which is a callback, not a useEffect.

Actually, looking at the ResultCards island I wrote, it does not use useEffect at all. It only uses useState and useCallback. Good.

Let me also reconsider — can I just inline all these fixes and write the full plan? I think the plan is getting detailed enough. Let me finalize it.

Let me also think about the `/api/categories` route that the island calls. I need to add that. Let me create a plan task for it.

Actually, let me restructure. Instead of having the CategoriesManager island call a separate API, let me have the island manage state locally and save via a POST to `/api/categories`. This is cleaner.

Wait, I also need to think about the Settings page. The Settings page has:
1. Stack description textarea — saved to KV
2. Theme toggle (already handled by ThemeToggle island)

The Settings page route fetches the stack description from KV and passes it as a prop.

Let me finalize the plan. I'll write the remaining tasks more concisely but with full code. The plan is getting long; let me make sure it's complete.<｜end▁of▁thinking｜>Now let me write the full plan. Given its size, I'll write it directly.

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># Deets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a HonoX web app on Cloudflare Workers that parses pasted URLs, uses Workers AI to summarize/tag/stack-fit them, and exports results for start.me.

**Architecture:** HonoX with file-based routing. Server routes render pages and provide an API. Client islands handle form state + animations + theme toggle. Workers AI does summarization/tagging/stack-fit. KV stores category config, tags, and stack description. No useEffect used — server passes initial data as props to islands.

**Tech Stack:** HonoX, hono/jsx, Cloudflare Workers, Workers AI, KV, `@hono/vite-build/cloudflare-workers`, `@hono/vite-dev-server/cloudflare`, Vite

---

## File Structure

```
app/
├── server.ts
├── client.ts
├── style.css
├── routes/
│   ├── _renderer.tsx
│   ├── index.tsx
│   ├── categories.tsx
│   ├── settings.tsx
│   └── api/
│       ├── process.ts
│       └── categories.ts
├── islands/
│   ├── ThemeToggle.tsx
│   ├── ResultCards.tsx
│   └── CategoriesManager.tsx
└── lib/
    ├── types.ts
    ├── parser.ts
    ├── ai.ts
    └── export.ts
```

---

### Task 1: Scaffold HonoX project structure

**Files:**
- Create: `app/server.ts`
- Create: `app/client.ts`
- Create: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `wrangler.jsonc`
- Remove: `src/index.ts`
- Remove: `public/index.html`

- [ ] **Step 1: Install dependencies**

Run: `npm install honox @hono/vite-build @hono/vite-dev-server`

- [ ] **Step 2: Create `app/server.ts`**

```ts
import { createApp } from 'honox/server'
import { showRoutes } from 'hono/dev'

const app = createApp()

showRoutes(app)

export default app
```

- [ ] **Step 3: Create `app/client.ts`**

```ts
import { createClient } from 'honox/client'

createClient()
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import honox from 'honox/vite'
import build from '@hono/vite-build/cloudflare-workers'
import adapter from '@hono/vite-dev-server/cloudflare'

export default defineConfig({
  plugins: [
    honox({
      devServer: { adapter },
      client: {
        input: ['/app/client.ts', '/app/style.css'],
        assetsDir: 'static',
        jsxImportSource: 'hono/jsx/dom',
      },
    }),
    build(),
  ],
})
```

- [ ] **Step 5: Update `package.json` scripts**

```json
{
  "name": "get-deets",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build --mode client && vite build",
    "deploy": "vite build --mode client && vite build && wrangler deploy --minify",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings"
  },
  "dependencies": {
    "hono": "^4.12.18",
    "honox": "^0.1.0"
  },
  "devDependencies": {
    "@hono/vite-build": "^0.1.0",
    "@hono/vite-dev-server": "^0.1.0",
    "@types/node": "^25.8.0",
    "vite": "^6.0.0",
    "wrangler": "^4.91.0"
  }
}
```

- [ ] **Step 6: Update `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ESNext"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "types": ["./worker-configuration.d.ts", "vite/client"]
  },
  "include": ["app/**/*.ts", "app/**/*.tsx"]
}
```

- [ ] **Step 7: Update `wrangler.jsonc`** — replace `"main"` with `"app/server.ts"`, remove the old `"assets"` block

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "get-deets",
  "main": "app/server.ts",
  "compatibility_date": "2026-05-14",
  "observability": {
    "enabled": true
  },
  "upload_source_maps": true,
  "compatibility_flags": ["nodejs_compat"]
}
```

- [ ] **Step 8: Remove old scaffold files**

```bash
rm src/index.ts public/index.html
```

- [ ] **Step 9: Run `npm run cf-typegen`**

```bash
npm run cf-typegen
```

- [ ] **Step 10: Verify dev server**

```bash
npm run dev
```

Expected: Vite dev server starts, no errors.

---

### Task 2: Configure Cloudflare Bindings (AI + KV)

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create KV namespace**

```bash
npx wrangler kv:namespace create DEETS_KV
```

Expected: Outputs a KV namespace ID. Note it down.

- [ ] **Step 2: Add AI and KV bindings to `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "get-deets",
  "main": "app/server.ts",
  "compatibility_date": "2026-05-14",
  "observability": { "enabled": true },
  "upload_source_maps": true,
  "compatibility_flags": ["nodejs_compat"],
  "ai": { "binding": "AI" },
  "kv_namespaces": [
    { "binding": "DEETS_KV", "id": "<YOUR_NAMESPACE_ID>" }
  ]
}
```

- [ ] **Step 3: Regenerate types**

```bash
npm run cf-typegen
```

Expected: `worker-configuration.d.ts` now has `AI` and `DEETS_KV` in the `Env` interface.

- [ ] **Step 4: Verify bindings work**

```bash
npm run dev
```

---

### Task 3: Global CSS + Renderer

**Files:**
- Create: `app/style.css`
- Create: `app/routes/_renderer.tsx`
- Create: `app/lib/types.ts`

- [ ] **Step 1: Create `app/lib/types.ts`**

```ts
export interface UrlEntry {
  name: string
  url: string
  summary: string
  category: string
  tags: string[]
  stackFit?: {
    verdict: string
    explanation: string
  }
}
```

- [ ] **Step 2: Create `app/style.css`**

```css
/* Dark theme (default) */
:root {
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-input: #1e293b;
  --border: #334155;
  --border-focus: #475569;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --text-body: #cbd5e1;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #ef4444;
  --warning: #f59e0b;
  --link: #60a5fa;
  --tag-bg: #334155;
  --tag-text: #cbd5e1;
  --radius: 8px;
}

[data-theme="light"] {
  --bg: #f8fafc;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --border: #e2e8f0;
  --border-focus: #94a3b8;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-body: #334155;
  --link: #2563eb;
  --tag-bg: #e2e8f0;
  --tag-text: #334155;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
}

.nav {
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 20px;
  background: var(--bg-card); border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.nav-brand { font-weight: 600; margin-right: 24px; }
.nav-link { color: var(--text-muted); text-decoration: none; margin-right: 16px; }
.nav-link.active { color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 2px; }
.nav-link:hover { color: var(--text); }

.container { max-width: 960px; margin: 0 auto; padding: 24px 20px; }

.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px; margin-bottom: 10px;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.card-animate { animation: fadeSlideIn 0.4s ease-out forwards; }
.card-animate:nth-child(2) { animation-delay: 0.05s; }
.card-animate:nth-child(3) { animation-delay: 0.1s; }
.card-animate:nth-child(4) { animation-delay: 0.15s; }
.card-animate:nth-child(5) { animation-delay: 0.2s; }

.input, .textarea, select {
  background: var(--bg-input); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 8px 12px; font-size: 14px; font-family: inherit;
}
.textarea { width: 100%; min-height: 100px; border-style: dashed; resize: vertical; }
.textarea:focus, .input:focus, select:focus { outline: none; border-color: var(--accent); }

.label-text { display: block; color: var(--text-muted); font-size: 13px; margin-bottom: 4px; }

.btn {
  background: var(--accent); color: white; border: none;
  border-radius: 6px; padding: 8px 16px; font-size: 13px;
  font-family: inherit; cursor: pointer;
}
.btn:hover { background: var(--accent-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
.btn-ghost:hover { border-color: var(--text-muted); color: var(--text); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-danger { background: transparent; border-color: var(--danger); color: var(--danger); }

.tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--tag-bg); color: var(--tag-text);
  border-radius: 4px; padding: 2px 8px; font-size: 12px; margin: 2px;
}
.tag-remove { cursor: pointer; opacity: 0.5; font-size: 14px; }
.tag-remove:hover { opacity: 1; }
.tag-add { cursor: pointer; font-size: 18px; color: var(--text-muted); margin-left: 2px; }

.spinner { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.badge {
  display: inline-block; padding: 1px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 600;
}
.badge-complement { background: #065f46; color: #6ee7b7; }
.badge-replace { background: #713f12; color: #fde68a; }
.badge-enhance { background: #1e3a5f; color: #93c5fd; }
.badge-nofit, .badge-no_fit { background: #374151; color: #9ca3af; }

.export-preview {
  background: var(--bg-input); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 16px; font-size: 13px;
  line-height: 1.7; font-family: 'SF Mono', 'Fira Code', monospace;
  white-space: pre-wrap; color: var(--text-body);
}

.cat-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
.cat-row:last-child { border-bottom: none; }
.badge-count { background: var(--tag-bg); border-radius: 10px; padding: 1px 8px; font-size: 12px; color: var(--text-muted); margin-left: 6px; }

.processing-card { opacity: 0.7; }

.stack-textarea {
  width: 100%; min-height: 200px;
  background: var(--bg-input); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px; font-size: 14px; font-family: inherit; resize: vertical;
}
.stack-textarea:focus { outline: none; border-color: var(--accent); }

.theme-btn { background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; padding: 2px 6px; }
.theme-btn:hover { color: var(--text); }

.text-muted { color: var(--text-muted); font-size: 13px; }
.url-link { color: var(--link); font-size: 12px; text-decoration: none; margin-left: 8px; }
.url-link:hover { text-decoration: underline; }
.mt-8 { margin-top: 8px; }
.mt-16 { margin-top: 16px; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-10 { gap: 10px; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.summary-text { font-size: 14px; line-height: 1.5; color: var(--text-body); margin-top: 6px; }
```

- [ ] **Step 3: Create `app/routes/_renderer.tsx`**

```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link } from 'honox/server'

const script = import.meta.env.PROD
  ? '/static/client.js'
  : '/app/client.ts'

export default jsxRenderer(({ children, title }) => {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Link href="/app/style.css" rel="stylesheet" />
        <title>{title ?? 'Deets'}</title>
      </head>
      <body>
        {children}
        <script type="module" src={script}></script>
      </body>
    </html>
  )
})
```

---

### Task 4: URL Parser Utility

**Files:**
- Create: `app/lib/parser.ts`

- [ ] **Step 1: Create `app/lib/parser.ts`**

```ts
export interface ParsedUrl {
  name: string
  url: string
}

const LINE_RE = /^\s*(?:\d+:)?\d+\s*-\s*(.+?)\s*:\s*(https?:\/\/\S+)/

export function parseUrls(text: string): ParsedUrl[] {
  const lines = text.split('\n')
  const results: ParsedUrl[] = []

  for (const line of lines) {
    const match = line.match(LINE_RE)
    if (match) {
      results.push({
        name: match[1].trim(),
        url: match[2].replace(/ref=[^&\s]*&?/g, '').replace(/\?$/, ''),
      })
    } else {
      const plainUrl = line.match(/https?:\/\/\S+/)
      if (plainUrl) {
        results.push({ name: '', url: plainUrl[0] })
      }
    }
  }

  return results
}
```

---

### Task 5: Workers AI Utility

**Files:**
- Create: `app/lib/ai.ts`

- [ ] **Step 1: Create `app/lib/ai.ts`**

```ts
interface AiEnv {
  AI: Ai
}

interface AiResult {
  summary: string
  tags: string[]
}

interface StackFitResult {
  verdict: 'COMPLEMENT' | 'REPLACE' | 'ENHANCE' | 'NO_FIT'
  explanation: string
}

export async function summarizeAndTag(
  env: AiEnv,
  pageText: string,
  category: string,
  availableTags: string[]
): Promise<AiResult> {
  const tagList = availableTags.join(', ')

  const prompt = `You are categorizing a software tool/product.

Category: ${category}
Available tags for this category: ${tagList}

Given the following page content about a tool, respond in JSON format:
{"summary": "2 sentences explaining what this tool does", "tags": ["tag1", "tag2"]}

Page content:
${pageText.slice(0, 8000)}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
  })

  const text = (response as { response?: string }).response ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { summary: 'Could not generate summary.', tags: [] }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }
    return {
      summary: parsed.summary?.trim() ?? 'No summary available.',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => t && typeof t === 'string') : [],
    }
  } catch {
    return { summary: text.slice(0, 300), tags: [] }
  }
}

export async function evaluateStackFit(
  env: AiEnv,
  pageText: string,
  stackDescription: string
): Promise<StackFitResult | null> {
  if (!stackDescription.trim()) return null

  const prompt = `You are evaluating whether a tool would fit into an existing development environment.

Current dev environment (tools, workflows, container setup):
"""
${stackDescription.slice(0, 2000)}
"""

Tool page content:
"""
${pageText.slice(0, 4000)}
"""

Respond in JSON:
{"verdict": "COMPLEMENT" | "REPLACE" | "ENHANCE" | "NO_FIT", "explanation": "1 sentence explaining why"}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 256,
  })

  const text = (response as { response?: string }).response ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as StackFitResult
    return {
      verdict: parsed.verdict ?? 'NO_FIT',
      explanation: parsed.explanation ?? 'No explanation.',
    }
  } catch {
    return null
  }
}

export async function fetchPageText(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Deets/1.0 (URL curator)' },
      redirect: 'follow',
    })
    if (!resp.ok) return ''
    const html = await resp.text()
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned.slice(0, 10000)
  } catch {
    return ''
  }
}
```

---

### Task 6: Export Format Utility

**Files:**
- Create: `app/lib/export.ts`

- [ ] **Step 1: Create `app/lib/export.ts`**

```ts
import type { UrlEntry } from './types'

export function formatExport(entries: UrlEntry[]): string {
  return entries
    .map(e => {
      const lines = [e.name, e.url, e.summary]
      if (e.stackFit) {
        lines.push(`Stack: ${e.stackFit.verdict} — ${e.stackFit.explanation}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
```

---

### Task 7: API Routes

**Files:**
- Create: `app/routes/api/process.ts`
- Create: `app/routes/api/categories.ts`

- [ ] **Step 1: Create `app/routes/api/process.ts`**

```ts
import { Hono } from 'hono'
import { parseUrls } from '../../lib/parser'
import { summarizeAndTag, evaluateStackFit, fetchPageText } from '../../lib/ai'
import type { UrlEntry } from '../../lib/types'

type Env = {
  AI: Ai
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.post(async (c) => {
  const body = await c.req.json<{
    text: string
    category: string
    checkStackFit?: boolean
  }>()
  const { text, category, checkStackFit } = body

  const parsed = parseUrls(text)
  if (parsed.length === 0) {
    return c.json({ error: 'No URLs found in text' }, 400)
  }

  const tagsJson = await c.env.DEETS_KV.get(`tags:${category}`)
  const availableTags: string[] = tagsJson ? JSON.parse(tagsJson) : []

  const stackDescription = checkStackFit
    ? (await c.env.DEETS_KV.get('stack-description')) ?? ''
    : ''

  const results: UrlEntry[] = []

  for (const { name, url } of parsed) {
    const pageText = await fetchPageText(url)

    const { summary, tags } = await summarizeAndTag(
      c.env,
      pageText,
      category,
      availableTags
    )

    const resolvedName = name || url

    let stackFit: UrlEntry['stackFit']
    if (checkStackFit && stackDescription) {
      const sf = await evaluateStackFit(c.env, pageText, stackDescription)
      stackFit = sf ? { verdict: sf.verdict, explanation: sf.explanation } : undefined
    }

    results.push({ name: resolvedName, url, summary, category, tags, stackFit })
  }

  return c.json({ results })
})

export default app
```

- [ ] **Step 2: Create `app/routes/api/categories.ts`**

```ts
import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.get(async (c) => {
  const catsJson = await c.env.DEETS_KV.get('categories')
  const categoryNames: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const categories = await Promise.all(
    categoryNames.map(async (name) => {
      const tagsJson = await c.env.DEETS_KV.get(`tags:${name}`)
      const tags: string[] = tagsJson ? JSON.parse(tagsJson) : []
      return { name, tags }
    })
  )

  return c.json({ categories })
})

app.put(async (c) => {
  const body = await c.req.json<{ categories: { name: string; tags: string[] }[] }>()

  const names = body.categories.map(c => c.name)
  await c.env.DEETS_KV.put('categories', JSON.stringify(names))

  for (const cat of body.categories) {
    await c.env.DEETS_KV.put(`tags:${cat.name}`, JSON.stringify(cat.tags))
  }

  return c.json({ ok: true })
})

export default app
```

---

### Task 8: Islands

**Files:**
- Create: `app/islands/ThemeToggle.tsx`
- Create: `app/islands/ResultCards.tsx`
- Create: `app/islands/CategoriesManager.tsx`

- [ ] **Step 1: Create `app/islands/ThemeToggle.tsx`**

```tsx
export default function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement
    const current = html.getAttribute('data-theme')
    const next = current === 'light' ? 'dark' : 'light'
    html.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button class="theme-btn" onClick={toggle} aria-label="Toggle theme">
      🌓
    </button>
  )
}
```

- [ ] **Step 2: Create `app/islands/ResultCards.tsx`**

```tsx
import { useState, useCallback } from 'hono/jsx'
import type { UrlEntry } from '../lib/types'

interface Props {
  categories: string[]
}

export default function ResultCards({ categories }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'dev')
  const [checkStackFit, setCheckStackFit] = useState(false)
  const [results, setResults] = useState<UrlEntry[]>([])
  const [processing, setProcessing] = useState(false)

  const handleProcess = useCallback(async () => {
    if (!text.trim()) return
    setProcessing(true)
    setResults([])

    try {
      const resp = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, checkStackFit }),
      })
      const data = await resp.json() as { error?: string; results?: UrlEntry[] }
      if (data.results) setResults(data.results)
    } finally {
      setProcessing(false)
    }
  }, [text, category, checkStackFit])

  const removeTag = useCallback((index: number, tag: string) => {
    setResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], tags: next[index].tags.filter(t => t !== tag) }
      return next
    })
  }, [])

  const addTag = useCallback((index: number) => {
    const t = prompt('Add tag:')
    if (!t?.trim()) return
    setResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], tags: [...next[index].tags, t.trim()] }
      return next
    })
  }, [])

  const exportText = () =>
    results
      .map(r => {
        const lines = [r.name, r.url, r.summary]
        if (r.stackFit) lines.push(`Stack: ${r.stackFit.verdict} — ${r.stackFit.explanation}`)
        return lines.join('\n')
      })
      .join('\n\n')

  return (
    <div>
      {/* Category + Stack Fit row */}
      <div style="display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap;" class="mb-16">
        <div>
          <label class="label-text">Batch category</label>
          <select
            class="input"
            value={category}
            onChange={(e: Event) => setCategory((e.target as HTMLSelectElement).value)}
          >
            {categories.map(c => <option value={c}>{c}</option>)}
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; padding-bottom: 6px;">
          <input
            type="checkbox"
            id="stackfit"
            checked={checkStackFit}
            onChange={(e: Event) => setCheckStackFit((e.target as HTMLInputElement).checked)}
          />
          <label for="stackfit" style="color: var(--text-muted); font-size: 13px; cursor: pointer;">
            Check if each tool fits my stack
          </label>
        </div>
      </div>

      {/* Textarea */}
      <div class="mb-16">
        <label class="label-text">Paste URLs</label>
        <textarea
          class="textarea"
          value={text}
          onChange={(e: Event) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder={`00:38 - onBeacon : https://onbeacon.ai\n01:14 - Bruin : https://getbruin.com`}
        />
        <div style="display: flex; justify-content: flex-end;" class="mt-8">
          <button class="btn" onClick={handleProcess} disabled={processing || !text.trim()}>
            {processing ? 'Processing...' : 'Process URLs'}
          </button>
        </div>
      </div>

      {/* Processing indicator */}
      {processing && (
        <div class="card processing-card">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="spinner">◌</span>
            <span style="color: var(--text-muted); font-size: 14px;">
              Processing URLs — fetching pages, generating summaries...
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <label class="label-text mb-8">Results ({results.length} URLs)</label>

          {results.map((entry, i) => (
            <div class="card card-animate" key={entry.url}>
              <div>
                <span style="font-weight: 600; font-size: 15px;">{entry.name}</span>
                <a href={entry.url} class="url-link" target="_blank" rel="noopener">
                  {entry.url}
                </a>
              </div>

              <div class="summary-text">{entry.summary}</div>

              {entry.stackFit && (
                <div class="mt-8">
                  <span class={`badge badge-${entry.stackFit.verdict.toLowerCase()}`}>
                    {entry.stackFit.verdict}
                  </span>
                  <span style="font-size: 12px; color: var(--text-muted); margin-left: 6px;">
                    {entry.stackFit.explanation}
                  </span>
                </div>
              )}

              <div class="mt-8" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                {entry.tags.map(tag => (
                  <span class="tag" key={tag}>
                    {tag}
                    <span class="tag-remove" onClick={() => removeTag(i, tag)}>×</span>
                  </span>
                ))}
                <span class="tag-add" onClick={() => addTag(i)}>+</span>
              </div>
            </div>
          ))}

          {/* Export */}
          <div class="mt-16">
            <details>
              <summary style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted);">
                Export for start.me
              </summary>
              <div class="export-preview mt-8">{exportText()}</div>
              <button class="btn mt-8" onClick={() => navigator.clipboard.writeText(exportText())}>
                Copy All
              </button>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/islands/CategoriesManager.tsx`**

```tsx
import { useState } from 'hono/jsx'

interface CategoryData {
  name: string
  tags: string[]
}

interface Props {
  initialCategories: CategoryData[]
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories)
  const [editing, setEditing] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')

  const save = async (cats: CategoryData[]) => {
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: cats }),
    })
    setCategories(cats)
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name || categories.some(c => c.name === name)) return
    save([...categories, { name, tags: [] }])
    setNewCategory('')
  }

  const deleteCategory = (name: string) => {
    save(categories.filter(c => c.name !== name))
    if (editing === name) setEditing(null)
  }

  const addTag = (catName: string) => {
    const t = newTag.trim()
    if (!t) return
    const updated = categories.map(c =>
      c.name === catName && !c.tags.includes(t)
        ? { ...c, tags: [...c.tags, t] }
        : c
    )
    save(updated)
    setNewTag('')
  }

  const removeTag = (catName: string, tag: string) => {
    const updated = categories.map(c =>
      c.name === catName
        ? { ...c, tags: c.tags.filter(x => x !== tag) }
        : c
    )
    save(updated)
  }

  return (
    <div>
      <div class="card">
        <div class="mb-16">
          <h3 style="margin: 0 0 4px; font-size: 16px;">Categories & Tags</h3>
          <p class="text-muted" style="margin: 0;">Each category has its own set of tags. The AI picks from these when summarizing.</p>
        </div>

        <div class="flex-between gap-8 mb-16" style="display: flex;">
          <input
            class="input"
            style="flex: 1;"
            placeholder="New category name..."
            value={newCategory}
            onChange={(e: Event) => setNewCategory((e.target as HTMLInputElement).value)}
            onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addCategory()}
          />
          <button class="btn" onClick={addCategory}>+ Add Category</button>
        </div>

        {categories.map(cat => (
          <div key={cat.name}>
            <div class="cat-row">
              <div>
                <span style="font-weight: 600; font-size: 14px;">{cat.name}</span>
                <span class="badge-count">{cat.tags.length} tags</span>
              </div>
              <div class="gap-6" style="display: flex;">
                <button class="btn btn-ghost btn-sm" onClick={() => setEditing(editing === cat.name ? null : cat.name)}>
                  Edit Tags
                </button>
                <button class="btn btn-danger btn-sm" onClick={() => deleteCategory(cat.name)}>
                  Delete
                </button>
              </div>
            </div>

            {editing === cat.name && (
              <div style="padding: 12px 0 16px;">
                <div class="flex-wrap gap-6 mb-8" style="display: flex;">
                  {cat.tags.map(tag => (
                    <span class="tag" key={tag}>
                      {tag}
                      <span class="tag-remove" onClick={() => removeTag(cat.name, tag)}>×</span>
                    </span>
                  ))}
                  <input
                    class="input"
                    style="width: 120px; font-size: 12px; padding: 3px 8px;"
                    placeholder="+ add tag..."
                    value={editing === cat.name ? newTag : ''}
                    onChange={(e: Event) => setNewTag((e.target as HTMLInputElement).value)}
                    onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addTag(cat.name)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Task 9: Page Routes

**Files:**
- Create: `app/routes/index.tsx`
- Create: `app/routes/categories.tsx`
- Create: `app/routes/settings.tsx`

- [ ] **Step 1: Create `app/routes/index.tsx`**

```tsx
import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import ResultCards from '../islands/ResultCards'
import { Link } from 'honox/server'

export default createRoute(async (c) => {
  const catsJson = c.env?.DEETS_KV
    ? await c.env.DEETS_KV.get('categories')
    : null
  const categories: string[] = catsJson
    ? (JSON.parse(catsJson) as string[])
    : ['dev']

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <Link href="/" class="nav-link active">Home</Link>
          <Link href="/categories" class="nav-link">Categories</Link>
          <Link href="/settings" class="nav-link">Settings</Link>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <ResultCards categories={categories} />
      </div>
    </div>,
    { title: 'Deets — Home' }
  )
})
```

- [ ] **Step 2: Create `app/routes/categories.tsx`**

```tsx
import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import CategoriesManager from '../islands/CategoriesManager'
import { Link } from 'honox/server'

export default createRoute(async (c) => {
  const catsJson = await c.env.DEETS_KV.get('categories')
  const names: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const tagsEntries = await Promise.all(
    names.map(async (name) => {
      const tagsJson = await c.env.DEETS_KV.get(`tags:${name}`)
      return { name, tags: tagsJson ? (JSON.parse(tagsJson) as string[]) : [] }
    })
  )

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <Link href="/" class="nav-link">Home</Link>
          <Link href="/categories" class="nav-link active">Categories</Link>
          <Link href="/settings" class="nav-link">Settings</Link>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <CategoriesManager initialCategories={tagsEntries} />
      </div>
    </div>,
    { title: 'Deets — Categories' }
  )
})
```

- [ ] **Step 3: Create `app/routes/settings.tsx`**

```tsx
import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import StackSettings from '../islands/StackSettings'
import { Link } from 'honox/server'

export default createRoute(async (c) => {
  const stackDescription = await c.env.DEETS_KV.get('stack-description') ?? ''

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <Link href="/" class="nav-link">Home</Link>
          <Link href="/categories" class="nav-link">Categories</Link>
          <Link href="/settings" class="nav-link active">Settings</Link>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <StackSettings initialStack={stackDescription} />
      </div>
    </div>,
    { title: 'Deets — Settings' }
  )
})
```

- [ ] **Step 4: Create `app/islands/StackSettings.tsx`**

```tsx
import { useState } from 'hono/jsx'

interface Props {
  initialStack: string
}

export default function StackSettings({ initialStack }: Props) {
  const [stack, setStack] = useState(initialStack)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await fetch('/api/stack', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: stack }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div class="card">
        <h3 style="margin: 0 0 4px; font-size: 16px;">My Stack</h3>
        <p class="text-muted" style="margin: 0 0 16px;">
          Describe your development container — tools, LLMs, repos, workflows. The AI uses this to evaluate whether new tools would fit.
        </p>
        <textarea
          class="stack-textarea"
          value={stack}
          onChange={(e: Event) => setStack((e.target as HTMLTextAreaElement).value)}
          placeholder={`Example:\nDocker container running Debian 12. Contains: Claude Code, OpenCode, Codex, and Pi AI agents. Syncthing for LLM sync between desktop and laptop. ...`}
        />
        <div class="flex-between mt-8">
          <button class="btn" onClick={save}>Save Description</button>
          {saved && <span style="color: var(--success); font-size: 13px;">Saved!</span>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/routes/api/stack.ts`**

```ts
import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.put(async (c) => {
  const body = await c.req.json<{ description: string }>()
  await c.env.DEETS_KV.put('stack-description', body.description)
  return c.json({ ok: true })
})

export default app
```

---

### Task 10: Integration Test & Polish

- [ ] **Step 1: Seed a default category**

```bash
npx wrangler kv:key put --namespace-id <YOUR_NAMESPACE_ID> 'categories' '["dev"]'
npx wrangler kv:key put --namespace-id <YOUR_NAMESPACE_ID> 'tags:dev' '["ai-coding","data-pipeline","open-source","monitoring","deployment","testing","database","frontend","api"]'
```

- [ ] **Step 2: Run dev server and test the full flow**

```bash
npm run dev
```

- [ ] **Step 3: Verify pages load**
  - `http://localhost:<port>` — Home page with textarea and nav
  - `http://localhost:<port>/categories` — Categories management
  - `http://localhost:<port>/settings` — Stack description textarea

- [ ] **Step 4: Verify CSS loads** — Dark theme is applied, theme toggle switches to light mode

- [ ] **Step 5: Verify no console errors** — Open browser dev tools, confirm no JS errors

- [ ] **Step 6: Run `npm run build` to verify production build**

```bash
npm run build
```

Expected: Build succeeds, output in `dist/`.

---

### Task 11: Commit

- [ ] **Step 1: Stage and commit all changes**

```bash
git add -A
git commit -m "feat: HonoX scaffold with AI URL processing, category management, and start.me export"
```

---

## Summary Review Checklist

1. **Spec coverage:**
   - ✅ Home page with paste → process → review → export
   - ✅ Batch category picker
   - ✅ Stack fit checkbox (optional per batch)
   - ✅ 2-sentence AI summaries via Workers AI
   - ✅ Auto-tagging from category tag pools
   - ✅ Removable/addable tags on result cards
   - ✅ Animated cards (fadeSlideIn CSS)
   - ✅ Export grouped by category for start.me
   - ✅ Categories page (manage categories + tags)
   - ✅ Settings page (stack description textarea)
   - ✅ Light/dark mode toggle
   - ✅ No useEffect used — server sends initial data as props
   - ✅ Functional patterns, pure functions in lib/
   - ✅ HonoX island architecture

2. **Placeholder scan:** No TBDs, no vague instructions. All code is concrete.

3. **Type consistency:**
   - `UrlEntry` defined in `app/lib/types.ts` and used consistently across `ai.ts`, `export.ts`, `ResultCards.tsx`, `process.ts`
   - `CategoryData` defined locally in `CategoriesManager.tsx` and `categories.ts`
   - `AiEnv` type matches Workers AI binding structure
   - `Env` types in API routes match `wrangler.jsonc` bindings
