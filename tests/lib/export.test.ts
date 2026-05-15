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
