# Deets Blocker Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 blocking runtime bugs, add error handling across all islands and the API, and add TDD-based test coverage for parser, AI response parsing, and export logic.

**Architecture:** Three streams executed sequentially. Stream 1 (TDD lib layer) establishes tests for pure-logic functions. Stream 2 (SSR layer) applies trivial KV guards and a CSS fix. Stream 3 adds error states to all islands and per-URL error handling to the API process route.

**Tech Stack:** Vitest, hono/jsx, HonoX, Cloudflare Workers bindings (KV, AI)

---

## File Structure

```
<root>
├── vitest.config.ts              # NEW — test runner config
├── tests/
│   ├── lib/
│   │   ├── parser.test.ts        # NEW — parser tests
│   │   ├── ai.test.ts            # NEW — AI response parsing tests
│   │   └── export.test.ts        # NEW — export tests
├── app/
│   ├── lib/
│   │   ├── ai.ts                 # MODIFY — add fetch timeout
│   │   └── export.ts             # no change (already correct, tests verify)
│   ├── routes/
│   │   ├── categories.tsx        # MODIFY — KV guard
│   │   ├── settings.tsx          # MODIFY — KV guard
│   │   └── api/
│   │       └── process.ts        # MODIFY — per-URL try/catch
│   ├── islands/
│   │   ├── ResultCards.tsx       # MODIFY — error state, use lib export
│   │   ├── CategoriesManager.tsx # MODIFY — error state on save
│   │   └── StackSettings.tsx     # MODIFY — error state on save
│   └── style.css                 # MODIFY — add --success variable
└── package.json                  # MODIFY — add vitest dep + test script
```

---

### Task 1: Install vitest and configure test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Update `package.json` — add test script**

Add `"test": "vitest run"` to the `scripts` block. The full scripts block becomes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build --mode client && vite build",
    "deploy": "vite build --mode client && vite build && wrangler deploy --minify",
    "test": "vitest run",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings"
  }
}
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

```bash
npm test
```
Expected: `No test files found, exiting with code 0` or similar.

---

### Task 2: TDD — Parser tests

**Files:**
- Create: `tests/lib/parser.test.ts`

The parser (`app/lib/parser.ts`) is already correct. These tests confirm behavior.

- [ ] **Step 1: Write parser tests**

```ts
import { describe, it, expect } from 'vitest'
import { parseUrls } from '../../app/lib/parser'

describe('parseUrls', () => {
  it('parses timestamped URL lines', () => {
    const input = '00:38 - onBeacon : https://onbeacon.ai'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'onBeacon', url: 'https://onbeacon.ai' }])
  })

  it('strips ref= query params', () => {
    const input = '01:14 - Bruin : https://getbruin.com?ref=producthunt'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Bruin', url: 'https://getbruin.com' }])
  })

  it('strips trailing ? after ref removal', () => {
    const input = '01:14 - Bruin : https://getbruin.com?ref=producthunt&a=1'
    // ref=producthunt& gets stripped, leaving ?a=1 (keeps non-ref params)
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Bruin', url: 'https://getbruin.com?a=1' }])
  })

  it('handles bare URL lines (no timestamp prefix)', () => {
    const input = 'https://example.com'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: '', url: 'https://example.com' }])
  })

  it('returns empty array for empty input', () => {
    expect(parseUrls('')).toEqual([])
  })

  it('handles multi-digit timestamps', () => {
    const input = '123:45 - Tool : https://tool.dev'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Tool', url: 'https://tool.dev' }])
  })

  it('parses multiple lines', () => {
    const input = '00:38 - Foo : https://foo.dev\n01:14 - Bar : https://bar.dev'
    const result = parseUrls(input)
    expect(result).toEqual([
      { name: 'Foo', url: 'https://foo.dev' },
      { name: 'Bar', url: 'https://bar.dev' },
    ])
  })

  it('skips lines with no URL', () => {
    const input = '00:38 - NoURL here\n01:14 - HasURL : https://example.com'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'HasURL', url: 'https://example.com' }])
  })

  it('handles URL with query params besides ref', () => {
    const input = '00:05 - Thing : https://thing.com?a=1&ref=foo&b=2'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Thing', url: 'https://thing.com?a=1&b=2' }])
  })
})
```

- [ ] **Step 2: Run tests — all should pass (parser already correct)**

```bash
npx vitest run tests/lib/parser.test.ts
```
Expected: 9 passed

---

### Task 3: TDD — AI response parsing tests + fetch timeout fix

**Files:**
- Create: `tests/lib/ai.test.ts`
- Modify: `app/lib/ai.ts:96-114` (fetchPageText)

- [ ] **Step 1: Write AI response parsing tests**

Since `summarizeAndTag` and `evaluateStackFit` depend on `env.AI.run()` (a Cloudflare binding not available in tests), extract the response-parsing logic into exported pure functions and test those.

First, open `app/lib/ai.ts` and extract two helpers. The full file after extraction is shown in Step 3. For now, write the tests against those helper signatures:

```ts
import { describe, it, expect } from 'vitest'
import { parseAiResult, parseStackFitResult } from '../../app/lib/ai'

describe('parseAiResult', () => {
  it('parses a valid JSON summary response', () => {
    const text = 'Here is the tool info: {"summary": "A tool that does things.", "tags": ["devtools", "cli"]}'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A tool that does things.')
    expect(result.tags).toEqual(['devtools', 'cli'])
  })

  it('parses JSON wrapped in markdown code fence', () => {
    const text = '```json\n{"summary": "A thing.", "tags": ["tag1"]}\n```'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A thing.')
    expect(result.tags).toEqual(['tag1'])
  })

  it('falls back when no JSON found', () => {
    const text = 'Just some random text with no JSON object.'
    const result = parseAiResult(text)
    expect(result.summary).toBe('Could not generate summary.')
    expect(result.tags).toEqual([])
  })

  it('handles empty response', () => {
    const result = parseAiResult('')
    expect(result.summary).toBe('Could not generate summary.')
    expect(result.tags).toEqual([])
  })

  it('filters non-string tags', () => {
    const text = '{"summary": "ok", "tags": ["valid", 123, null, "", "also-valid"]}'
    const result = parseAiResult(text)
    expect(result.tags).toEqual(['valid', 'also-valid'])
  })

  it('uses fallback for malformed JSON', () => {
    const text = '{"summary": "broken", "tags": ['
    const result = parseAiResult(text)
    expect(result.summary).toBe('{"summary": "broken", "tags": [')
    expect(result.tags).toEqual([])
  })
})

describe('parseStackFitResult', () => {
  it('parses a valid COMPLEMENT verdict', () => {
    const text = '{"verdict": "COMPLEMENT", "explanation": "It adds new monitoring capabilities."}'
    const result = parseStackFitResult(text)
    expect(result).toEqual({
      verdict: 'COMPLEMENT',
      explanation: 'It adds new monitoring capabilities.',
    })
  })

  it('parses a NO_FIT verdict', () => {
    const text = '{"verdict": "NO_FIT", "explanation": "Overlaps with existing tools."}'
    const result = parseStackFitResult(text)
    expect(result?.verdict).toBe('NO_FIT')
  })

  it('returns null for empty text', () => {
    expect(parseStackFitResult('')).toBeNull()
  })

  it('returns null when no JSON found', () => {
    expect(parseStackFitResult('just some text')).toBeNull()
  })

  it('defaults missing verdict to NO_FIT', () => {
    const text = '{"explanation": "some reason"}'
    const result = parseStackFitResult(text)
    expect(result).toEqual({
      verdict: 'NO_FIT',
      explanation: 'some reason',
    })
  })
})
```

- [ ] **Step 2: Run tests — should fail (helpers not exported yet)**

```bash
npx vitest run tests/lib/ai.test.ts
```
Expected: FAIL — `parseAiResult` and `parseStackFitResult` not exported

- [ ] **Step 3: Extract helpers in `app/lib/ai.ts` and export them**

The file needs two exported helpers extracted from the existing functions. Replace the current file content:

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

export function parseAiResult(text: string): AiResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { summary: 'Could not generate summary.', tags: [] }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }
    return {
      summary: parsed.summary?.trim() ?? 'No summary available.',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter(t => t && typeof t === 'string')
        : [],
    }
  } catch {
    return { summary: jsonMatch[0].slice(0, 300), tags: [] }
  }
}

export function parseStackFitResult(text: string): StackFitResult | null {
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
  return parseAiResult(text)
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
  return parseStackFitResult(text)
}

export async function fetchPageText(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Deets/1.0 (URL curator)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
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

- [ ] **Step 4: Run tests — should all pass**

```bash
npx vitest run tests/lib/ai.test.ts
```
Expected: 11 passed

---

### Task 4: TDD — Export tests + make ResultCards use lib export

**Files:**
- Create: `tests/lib/export.test.ts`
- Modify: `app/islands/ResultCards.tsx` (use `formatExport` from lib)

- [ ] **Step 1: Write export tests**

```ts
import { describe, it, expect } from 'vitest'
import { formatExport } from '../../app/lib/export'
import type { UrlEntry } from '../../app/lib/types'

function entry(overrides: Partial<UrlEntry> = {}): UrlEntry {
  return {
    name: 'TestTool',
    url: 'https://test.dev',
    summary: 'A test tool.',
    category: 'dev',
    tags: ['testing'],
    ...overrides,
  }
}

describe('formatExport', () => {
  it('formats a single entry without stackFit', () => {
    const result = formatExport([entry()])
    expect(result).toBe('TestTool\nhttps://test.dev\nA test tool.')
  })

  it('formats a single entry with stackFit', () => {
    const result = formatExport([
      entry({ stackFit: { verdict: 'COMPLEMENT', explanation: 'Fills a gap.' } }),
    ])
    expect(result).toBe(
      'TestTool\nhttps://test.dev\nA test tool.\nStack: COMPLEMENT — Fills a gap.'
    )
  })

  it('formats multiple entries separated by double newlines', () => {
    const result = formatExport([
      entry({ name: 'A', url: 'https://a.dev', summary: 'Summary A.' }),
      entry({ name: 'B', url: 'https://b.dev', summary: 'Summary B.' }),
    ])
    expect(result).toBe(
      'A\nhttps://a.dev\nSummary A.\n\nB\nhttps://b.dev\nSummary B.'
    )
  })

  it('returns empty string for empty array', () => {
    expect(formatExport([])).toBe('')
  })
})
```

- [ ] **Step 2: Run tests — should pass (export is already correct)**

```bash
npx vitest run tests/lib/export.test.ts
```
Expected: 4 passed

- [ ] **Step 3: Modify `ResultCards.tsx` to import and use `formatExport`**

Replace the inline `exportText` function and its usage. The changes are:

**Add import** (after line 2):
```ts
import { formatExport } from '../lib/export'
```

**Remove the inline `exportText`** (lines 51-58):
```ts
  const exportText = () =>
    results
      .map(r => {
        const lines = [r.name, r.url, r.summary]
        if (r.stackFit) lines.push(`Stack: ${r.stackFit.verdict} — ${r.stackFit.explanation}`)
        return lines.join('\n')
      })
      .join('\n\n')
```

**Replace references** to `exportText()` with `formatExport(results)`:
- Line 160: `<div class="export-preview mt-8">{formatExport(results)}</div>`
- Line 161: `onClick={() => navigator.clipboard.writeText(formatExport(results))}`

- [ ] **Step 4: Verify build still works**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 5: Fix CSS — add `--success` variable

**Files:**
- Modify: `app/style.css:1-19` (`:root` block)

- [ ] **Step 1: Add `--success` to `:root`**

Add after `--warning: #f59e0b;` on line 14:

```css
--success: #22c55e;
```

The `:root` block now has:

```css
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
  --radius: 8px;
}
```

No test needed (CSS variable).

---

### Task 6: Fix Categories page — KV guard

**Files:**
- Modify: `app/routes/categories.tsx:7-9`

- [ ] **Step 1: Add KV guard to categories route**

Replace lines 7-9:

```ts
  const kv: KVNamespace = (c.env as any).DEETS_KV
  const catsJson = await kv.get('categories')
  const names: string[] = catsJson ? JSON.parse(catsJson) : ['dev']
```

With:

```ts
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const catsJson = kv ? await kv.get('categories') : null
  const names: string[] = catsJson ? JSON.parse(catsJson) : ['dev']
```

- [ ] **Step 2: Handle missing tags gracefully when KV is unavailable**

The tags entries loop (lines 11-16) also calls `kv.get()`. Guard it:

```ts
  const tagsEntries = kv
    ? await Promise.all(
        names.map(async (name) => {
          const tagsJson = await kv.get(`tags:${name}`)
          return { name, tags: tagsJson ? (JSON.parse(tagsJson) as string[]) : [] }
        })
      )
    : names.map(name => ({ name, tags: [] as string[] }))
```

The final route handler body becomes:

```ts
export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const catsJson = kv ? await kv.get('categories') : null
  const names: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const tagsEntries = kv
    ? await Promise.all(
        names.map(async (name) => {
          const tagsJson = await kv.get(`tags:${name}`)
          return { name, tags: tagsJson ? (JSON.parse(tagsJson) as string[]) : [] }
        })
      )
    : names.map(name => ({ name, tags: [] as string[] }))

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">Deets</span>
          <a href="/" class="nav-link">Home</a>
          <a href="/categories" class="nav-link active">Categories</a>
          <a href="/settings" class="nav-link">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <CategoriesManager initialCategories={tagsEntries} />
      </div>
    </div>
  ) as any
})
```

---

### Task 7: Fix Settings page — KV guard

**Files:**
- Modify: `app/routes/settings.tsx:7-8`

- [ ] **Step 1: Add KV guard to settings route**

Replace lines 7-8:

```ts
  const kv: KVNamespace = (c.env as any).DEETS_KV
  const stackDescription = await kv.get('stack-description') ?? ''
```

With:

```ts
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const stackDescription = kv ? (await kv.get('stack-description') ?? '') : ''
```

---

### Task 8: API per-URL error handling

**Files:**
- Modify: `app/routes/api/process.ts:35-54`

- [ ] **Step 1: Wrap inner loop body in try/catch**

Replace lines 35-54:

```ts
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
```

With:

```ts
  for (const { name, url } of parsed) {
    try {
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
    } catch (err) {
      results.push({
        name: name || url,
        url,
        summary: `Error processing: ${err instanceof Error ? err.message : 'Unknown error'}`,
        category,
        tags: [],
      })
    }
  }
```

---

### Task 9: ResultCards island — error state

**Files:**
- Modify: `app/islands/ResultCards.tsx`

- [ ] **Step 1: Add error state**

Add after the existing `useState` declarations (after line 13):

```ts
  const [error, setError] = useState('')
```

- [ ] **Step 2: Update `handleProcess` to set error state**

Replace lines 15-31:

```ts
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
```

With:

```ts
  const handleProcess = useCallback(async () => {
    if (!text.trim()) return
    setProcessing(true)
    setResults([])
    setError('')

    try {
      const resp = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, checkStackFit }),
      })
      const data = await resp.json() as { error?: string; results?: UrlEntry[] }
      if (data.error) {
        setError(data.error)
        return
      }
      if (data.results) setResults(data.results)
    } catch {
      setError('Failed to process URLs. Check your connection and try again.')
    } finally {
      setProcessing(false)
    }
  }, [text, category, checkStackFit])
```

- [ ] **Step 3: Render error banner**

Add after the processing indicator block (after line 113), before the results section:

```tsx
      {error && (
        <div class="card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.1);">
          <span style="color: var(--danger); font-size: 14px;">{error}</span>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 10: CategoriesManager island — error state on save

**Files:**
- Modify: `app/islands/CategoriesManager.tsx`

- [ ] **Step 1: Add error state**

Add after line 16 (`const [newTag, setNewTag] = useState('')`):

```ts
  const [saveError, setSaveError] = useState('')
```

- [ ] **Step 2: Update save function — only update state on success**

Replace lines 18-25:

```ts
  const save = async (cats: CategoryData[]) => {
    await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: cats }),
    })
    setCategories(cats)
  }
```

With:

```ts
  const save = async (cats: CategoryData[]) => {
    setSaveError('')
    try {
      const resp = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats }),
      })
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`)
      setCategories(cats)
    } catch {
      setSaveError('Failed to save categories. Try again.')
    }
  }
```

- [ ] **Step 3: Render error message**

Add after the `<h3>`/`<p>` description block (after line 66), before the "New category" input:

```tsx
        {saveError && (
          <div class="mb-16" style="color: var(--danger); font-size: 13px;">
            {saveError}
          </div>
        )}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 11: StackSettings island — error state on save

**Files:**
- Modify: `app/islands/StackSettings.tsx`

- [ ] **Step 1: Add error state and update save function**

Replace lines 8-19:

```ts
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
```

With:

```ts
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const save = async () => {
    setSaved(false)
    setSaveError('')
    try {
      const resp = await fetch('/api/stack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: stack }),
      })
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed to save. Try again.')
    }
  }
```

- [ ] **Step 2: Render error message**

Replace the "Saved!" line (line 36):

```tsx
          {saved && <span style="color: var(--success); font-size: 13px;">Saved!</span>}
```

With:

```tsx
          {saved && <span style="color: var(--success); font-size: 13px;">Saved!</span>}
          {saveError && <span style="color: var(--danger); font-size: 13px;">{saveError}</span>}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 12: Full verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Start dev server and verify pages load**

```bash
npm run dev
```
Expected: Dev server starts. Home, Categories, and Settings pages all render without errors.
