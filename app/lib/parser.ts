export interface ParsedUrl {
  name: string
  url: string
}

const LINE_RE = /^\s*(?:\d+:)?\d+\s*-\s*(.+?)\s*:\s*(https?:\/\/\S+)/

export function parseUrls(text: string): ParsedUrl[] {
  if (typeof text !== 'string') return []
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
