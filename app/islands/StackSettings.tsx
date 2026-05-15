import { useState } from 'hono/jsx'

interface Props {
  initialStack: string
  hasEntries?: boolean
}

export default function StackSettings({ initialStack, hasEntries }: Props) {
  const [stack, setStack] = useState(initialStack)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [wipeOpen, setWipeOpen] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState('')
  const [wipeBusy, setWipeBusy] = useState(false)
  const [wipeResult, setWipeResult] = useState('')

  const save = async () => {
    setSaved(false)
    setSaveError('')
    try {
      const resp = await fetch('/api/stack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: stack }),
      })
      const data = await resp.json() as { ok?: boolean; error?: string }
      if (!resp.ok || !data.ok) {
        setSaveError(data.error || 'Failed to save. Try again.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Failed to save. Try again.')
    }
  }

  const wipe = async () => {
    if (wipeConfirm !== 'DELETE') return
    setWipeBusy(true)
    setWipeResult('')
    try {
      const resp = await fetch('/api/admin/wipe-entries', { method: 'POST' })
      const data = await resp.json() as { ok?: boolean; deleted?: number; error?: string }
      if (!resp.ok || !data.ok) {
        setWipeResult(data.error || 'Wipe failed.')
      } else {
        setWipeResult(`Deleted ${data.deleted} entries.`)
        setWipeOpen(false)
        setWipeConfirm('')
      }
    } catch {
      setWipeResult('Failed to connect. Try again.')
    } finally {
      setWipeBusy(false)
    }
  }

  const closeWipe = () => {
    setWipeOpen(false)
    setWipeConfirm('')
    setWipeResult('')
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
          {saveError && <span style="color: var(--danger); font-size: 13px;">{saveError}</span>}
        </div>
      </div>

      {hasEntries && (
      <div class="card mt-16">
        <h3 style="margin: 0 0 4px; font-size: 16px; color: var(--text);">Data</h3>
        <p class="text-muted" style="margin: 0 0 12px;">
          Delete all saved library entries. Categories, tags, and stack description are preserved.
        </p>
        {!wipeOpen ? (
          <button class="btn btn-danger" onClick={() => setWipeOpen(true)}>Wipe Library Entries</button>
        ) : (
          <div style="background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px;">
            <p style="margin: 0 0 12px; font-size: 13px; color: var(--text-body);">
              This permanently deletes all saved URL entries and their library index. Categories, tags, and your stack description will not be affected.
            </p>
            <label class="label-text">Type <b>DELETE</b> to confirm</label>
            <div style="display: flex; gap: 8px;">
              <input
                class="input"
                style="width: 140px;"
                value={wipeConfirm}
                onChange={(e: Event) => setWipeConfirm((e.target as HTMLInputElement).value)}
                onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && wipe()}
                placeholder="DELETE"
              />
              <button class="btn btn-danger" onClick={wipe} disabled={wipeConfirm !== 'DELETE' || wipeBusy}>
                {wipeBusy ? 'Wiping...' : 'Delete All Entries'}
              </button>
              <button class="btn btn-ghost" onClick={closeWipe} disabled={wipeBusy}>Cancel</button>
            </div>
            {wipeResult && (
              <p style="margin: 10px 0 0; font-size: 13px; color: wipeResult.startsWith('Deleted') ? 'var(--success)' : 'var(--danger)';">
                {wipeResult}
              </p>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
