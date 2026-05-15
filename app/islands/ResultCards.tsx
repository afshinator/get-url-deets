import { useState, useCallback } from 'hono/jsx'
import type { UrlEntry } from '../lib/types'
import { formatExport } from '../lib/export'

interface Props {
  categories: string[]
}

export default function ResultCards({ categories }: Props) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'dev')
  const [checkStackFit, setCheckStackFit] = useState(false)
  const [results, setResults] = useState<UrlEntry[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

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

      {error && (
        <div class="card" style="border-color: var(--danger); background: rgba(239, 68, 68, 0.1);">
          <span style="color: var(--danger); font-size: 14px;">{error}</span>
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
              <div class="export-preview mt-8">{formatExport(results)}</div>
              <button class="btn mt-8" onClick={() => navigator.clipboard.writeText(formatExport(results))}>
                Copy All
              </button>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}
