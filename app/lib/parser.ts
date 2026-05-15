export interface ParsedUrl {
  name: string
  url: string
}

const LINE_RE = /^\s*(?:\d+:)?\d+\s*-\s*(.+?)\s*:\s*(https?:\/\/\S+)/

export function normalizeUrl(url: string): string {
  let u = url.replace(/ref=[^&\s]*&?/g, '')
  u = u.replace(/[?&]$/, '')
  u = u.replace(/\/$/, '')
  return u
}

export function parseUrls(text: string): ParsedUrl[] {
  if (typeof text !== 'string') return []
  const lines = text.split('\n')
  const results: ParsedUrl[] = []

  for (const line of lines) {
    const match = line.match(LINE_RE)
    if (match) {
      const url = normalizeUrl(match[2])
      results.push({ name: match[1].trim(), url })
    } else {
      const plainUrl = line.match(/https?:\/\/\S+/)
      if (plainUrl) {
        results.push({ name: '', url: normalizeUrl(plainUrl[0]) })
      }
    }
  }

  return results
}
