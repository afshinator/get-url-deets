# Deets — Blocker Fixes Design

## Overview

Fix the 4 blocking bugs, add error handling across the UI layer, and add TDD-based test coverage for all testable pure-logic code (parser, AI response parsing, export). Three independent work streams, executed sequentially because Stream 3 depends on Streams 1 and 2.

## Stream 1: Lib Layer (TDD)

**Goal**: Add tests for all pure-logic functions, fix one bug in `fetchPageText`.

### 1a. Parser Tests (`app/lib/parser.ts`)

No logic changes — the parser is correct. Add tests for:

- Timestamp format: `00:38 - Tool Name : https://example.com` → `{ name: "Tool Name", url: "https://example.com" }`
- URL with `ref=` param: `...` → stripped
- URL with trailing `?`: `...&ref=x?` → stripped
- Bare URL line: `https://example.com` → `{ name: "", url: "https://example.com" }`
- Empty input → `[]`
- Multi-line mixed input
- Multi-digit timestamps: `123:45 - ...`

### 1b. AI Response Parsing Tests (`app/lib/ai.ts`)

Extract the JSON parsing logic into a testable helper (or test the full function with a mock AI). Test:

- Valid JSON response → correct summary and tags
- JSON wrapped in markdown code fence → still parsed
- Malformed JSON → fallback to text slice / empty tags
- Empty response text → fallback
- Stack fit: valid verdict + explanation → parsed correctly
- Stack fit: missing fields → defaults applied
- Stack fit: empty stack description → returns null

### 1c. Export Tests (`app/lib/export.ts`)

- Single entry without stackFit → 3 lines (name, url, summary)
- Single entry with stackFit → 4 lines
- Multiple entries → double-newline separated blocks
- Empty array → empty string

### 1d. Fix `fetchPageText` timeout

Add `AbortSignal.timeout(30000)` to the fetch call. No behavior change otherwise.

## Stream 2: SSR Layer (trivial guards)

**Goal**: Fix two runtime crashes and one missing CSS variable.

### 2a. CSS (`app/style.css`)

Add `--success: #22c55e;` to the `:root` block.

### 2b. Categories page guard (`app/routes/categories.tsx`)

Wrap KV access in null guard, matching the Home page pattern:

```
const catsJson = kv ? await kv.get('categories') : null
```

Fall back to `['dev']` with empty tags when KV is unavailable.

### 2c. Settings page guard (`app/routes/settings.tsx`)

```
const stackDescription = kv ? (await kv.get('stack-description') ?? '') : ''
```

## Stream 3: Error Handling

**Goal**: Every user-facing operation that calls an API handles failures gracefully.

### 3a. API per-URL try/catch (`app/routes/api/process.ts`)

Wrap the inner loop body in `try/catch`. On failure, push an entry with `error: "message"` and continue. Return partial results alongside any successful ones.

### 3b. Island error states

| Island | Fix |
|--------|-----|
| `ResultCards.tsx` | Add `error` state string. Show error banner above results. On API error (non-2xx, fetch failure, or response `error` field), display the message. |
| `CategoriesManager.tsx` | Save function: call API first, then update local state only on success. Show inline error on failure. |
| `StackSettings.tsx` | Check response status before showing "Saved!". Show error text on failure. |

### 3c. ResultCards uses `formatExport` from `lib/export.ts`

Remove the inline `exportText()` and import `formatExport` instead. This eliminates the dead-code problem and ensures a single source of truth for export formatting.

## Out of Scope

- Card streaming (SSE) — requires architectural changes, separate design pass
- Rate limiting / auth — post-v1
- URL persistence / `by-category:*` / `createdAt` — post-v1
- Cloudflare dev adapter restoration — needs `wrangler login`, separate workflow
