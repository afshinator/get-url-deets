import { describe, it, expect } from 'vitest'
import { isRetryableFailure } from '../../app/islands/ResultCards'
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

describe('isRetryableFailure', () => {
  it('returns true for FAILED verdict — empty response', () => {
    const e = entry({ stackFit: { verdict: 'FAILED', explanation: 'AI returned an empty response (length 0). Try again.' } })
    expect(isRetryableFailure(e)).toBe(true)
  })

  it('returns true for FAILED verdict — no-JSON response', () => {
    const e = entry({ stackFit: { verdict: 'FAILED', explanation: 'AI returned a response without JSON (42 chars). The model may have misunderstood the prompt. Try again.' } })
    expect(isRetryableFailure(e)).toBe(true)
  })

  it('returns true for FAILED verdict — unparseable JSON', () => {
    const e = entry({ stackFit: { verdict: 'FAILED', explanation: 'AI returned JSON that could not be parsed. Try again.' } })
    expect(isRetryableFailure(e)).toBe(true)
  })

  it('returns true for FAILED verdict — generic fallback', () => {
    const e = entry({ stackFit: { verdict: 'FAILED', explanation: 'Could not evaluate stack fit. Try again.' } })
    expect(isRetryableFailure(e)).toBe(true)
  })

  it('returns false for NO_FIT verdict (no stack description — config issue)', () => {
    const e = entry({ stackFit: { verdict: 'NO_FIT', explanation: 'No stack description saved — add one in Settings.' } })
    expect(isRetryableFailure(e)).toBe(false)
  })

  it('returns false when stackFit is missing entirely', () => {
    const e = entry({ stackFit: undefined })
    expect(isRetryableFailure(e)).toBe(false)
  })

  it('returns false for successful COMPLEMENT verdict', () => {
    const e = entry({ stackFit: { verdict: 'COMPLEMENT', explanation: 'Fits well.' } } as any)
    expect(isRetryableFailure(e)).toBe(false)
  })

  it('returns false for successful REPLACE verdict', () => {
    const e = entry({ stackFit: { verdict: 'REPLACE', explanation: 'Replaces old tool.' } } as any)
    expect(isRetryableFailure(e)).toBe(false)
  })

  it('returns false for successful ENHANCE verdict', () => {
    const e = entry({ stackFit: { verdict: 'ENHANCE', explanation: 'Speeds up pipeline.' } } as any)
    expect(isRetryableFailure(e)).toBe(false)
  })
})
