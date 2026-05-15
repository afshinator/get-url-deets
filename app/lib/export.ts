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
