import { useState } from 'hono/jsx'

interface Props {
  initialStack: string
}

export default function StackSettings({ initialStack }: Props) {
  const [stack, setStack] = useState(initialStack)
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
    </div>
  )
}
