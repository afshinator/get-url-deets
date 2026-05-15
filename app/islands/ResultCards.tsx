import { useState, useCallback, useRef } from 'hono/jsx'
import type { UrlEntry } from '../lib/types'
import { parseUrls } from '../lib/parser'
import { formatExport } from '../lib/export'

export function isRetryableFailure(entry: UrlEntry): boolean {
  return (
    !!entry.stackFit &&
    entry.stackFit.verdict === 'FAILED'
  )
}

interface Props {
  categories: string[]
  initialData?: UrlEntry[]
}

export default function ResultCards({ categories, initialData }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'dev')
  const [checkStackFit, setCheckStackFit] = useState(false)
  const [results, setResults] = useState<UrlEntry[]>(initialData ?? [])
  const [pendingUrls, setPendingUrls] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const allDone = pendingUrls.size === 0 && results.length > 0
  const retryableCount = results.filter(isRetryableFailure).length

  const handleProcess = useCallback(async () => {
    if (!text.trim()) return
    abortRef.current?.abort()
    setResults([])
    setError('')

    const parsed = parseUrls(text)
    if (parsed.length === 0) {
      setError('No URLs found in text.')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setPendingUrls(new Set(parsed.map(p => p.url)))

    for (const { name, url } of parsed) {
      if (controller.signal.aborted) break
      try {
        const resp = await fetch('/api/process-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, name, category, checkStackFit }),
          signal: controller.signal,
        })
        const entry = await resp.json() as UrlEntry
        setResults(prev => [...prev, entry])
      } catch (err: any) {
        if (err?.name === 'AbortError') break
        setResults(prev => [
          ...prev,
          {
            name: name || url,
            url,
            summary: 'Failed to process URL. Check your connection and try again.',
            category,
            tags: [],
          },
        ])
      } finally {
        setPendingUrls(prev => {
          const next = new Set(prev)
          next.delete(url)
          return next
        })
      }
    }
  }, [text, category, checkStackFit])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setPendingUrls(new Set())
  }, [])

  const handleRetryFailed = useCallback(async () => {
    const failed = results.reduce<{ index: number; entry: UrlEntry }[]>((acc, entry, i) => {
      if (isRetryableFailure(entry)) acc.push({ index: i, entry })
      return acc
    }, [])
    if (failed.length === 0) return

    setRetrying(true)

    for (const { index, entry } of failed) {
      try {
        const resp = await fetch('/api/process-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: entry.url, name: entry.name, category: entry.category, checkStackFit: true }),
        })
        const updated = await resp.json() as UrlEntry
        if (updated.stackFit) {
          setResults(prev => {
            const next = [...prev]
            next[index] = { ...next[index], stackFit: updated.stackFit }
            return next
          })
        }
      } catch { /* keep existing fallback */ }
    }

    setRetrying(false)
  }, [results])

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
    const tag = t.trim()
    setResults(prev => {
      const next = [...prev]
      next[index] = { ...next[index], tags: [...next[index].tags, tag] }
      return next
    })
    fetch('/api/categories/add-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, tag }),
    }).catch(() => {})
  }, [category])

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
        <div style="display: flex; justify-content: flex-end; gap: 8px;" class="mt-8">
          <button class="btn" onClick={handleProcess} disabled={pendingUrls.size > 0 || !text.trim()}>
            {pendingUrls.size > 0 ? `Processing ${pendingUrls.size} remaining...` : 'Process URLs'}
          </button>
          {pendingUrls.size > 0 && (
            <button class="btn-cancel" onClick={handleCancel}>Cancel</button>
          )}
          {allDone && retryableCount > 0 && (
            <button class="btn btn-ghost" onClick={handleRetryFailed} disabled={retrying}>
              {retrying ? `Retrying ${retryableCount} failed...` : `Retry ${retryableCount} failed evaluation${retryableCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div class="card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.1);">
          <span style="color: var(--danger); font-size: 14px;">{error}</span>
        </div>
      )}

      {/* Results — each card appears as its URL finishes */}
      {(results.length > 0 || pendingUrls.size > 0) && (
        <div>
          <label class="label-text mb-8">
            Results ({results.length} URL{results.length !== 1 ? 's' : ''})
            {pendingUrls.size > 0 && (
              <span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">
                — {pendingUrls.size} processing...
              </span>
            )}
          </label>

          {results.map((entry, i) => (
            <div class="card card-animate" key={entry.url + i}>
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

          {/* Pending cards — show skeleton while processing */}
          {pendingUrls.size > 0 && null}

          {/* Export — only show when all done */}
          {allDone && (
            <div class="mt-16">
              <details>
                <summary style="cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted);">
                  Export for start.me
                </summary>
                <div class="export-preview mt-8">{formatExport(results)}</div>
                <button class="btn mt-8" onClick={() => navigator.clipboard.writeText(formatExport(results))}>
                  Copy All
                </button>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
