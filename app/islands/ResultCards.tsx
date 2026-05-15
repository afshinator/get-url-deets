import { useState, useCallback } from 'hono/jsx'
import type { UrlEntry } from '../lib/types'
import { parseUrls } from '../lib/parser'
import { formatExport } from '../lib/export'

interface Props {
  categories: string[]
}

export default function ResultCards({ categories }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'dev')
  const [checkStackFit, setCheckStackFit] = useState(false)
  const [results, setResults] = useState<UrlEntry[]>([])
  const [pendingUrls, setPendingUrls] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const allDone = pendingUrls.size === 0 && results.length > 0

  const handleProcess = useCallback(async () => {
    if (!text.trim()) return
    setResults([])
    setError('')

    const parsed = parseUrls(text)
    if (parsed.length === 0) {
      setError('No URLs found in text.')
      return
    }

    setPendingUrls(new Set(parsed.map(p => p.url)))

    for (const { name, url } of parsed) {
      try {
        const resp = await fetch('/api/process-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, name, category, checkStackFit }),
        })
        const entry = await resp.json() as UrlEntry
        setResults(prev => [...prev, entry])
      } catch {
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
          <button class="btn" onClick={handleProcess} disabled={pendingUrls.size > 0 || !text.trim()}>
            {pendingUrls.size > 0 ? `Processing ${pendingUrls.size} remaining...` : 'Process URLs'}
          </button>
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
