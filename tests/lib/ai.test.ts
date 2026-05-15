import { describe, it, expect } from 'vitest'
import { parseAiResult, parseStackFitResult } from '../../app/lib/ai'

describe('parseAiResult', () => {
  it('parses a valid JSON summary response', () => {
    const text = 'Here is the tool info: {"summary": "A tool that does things.", "tags": ["devtools", "cli"]}'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A tool that does things.')
    expect(result.tags).toEqual(['devtools', 'cli'])
  })

  it('parses JSON wrapped in markdown code fence', () => {
    const text = '```json\n{"summary": "A thing.", "tags": ["tag1"]}\n```'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A thing.')
    expect(result.tags).toEqual(['tag1'])
  })

  it('falls back when no JSON found', () => {
    const text = 'Just some random text with no JSON object.'
    const result = parseAiResult(text)
    expect(result.summary).toBe('Could not generate summary.')
    expect(result.tags).toEqual([])
  })

  it('handles empty response', () => {
    const result = parseAiResult('')
    expect(result.summary).toBe('Could not generate summary.')
    expect(result.tags).toEqual([])
  })

  it('filters non-string tags', () => {
    const text = '{"summary": "ok", "tags": ["valid", 123, null, "", "also-valid"]}'
    const result = parseAiResult(text)
    expect(result.tags).toEqual(['valid', 'also-valid'])
  })

  it('uses fallback for malformed JSON', () => {
    const text = '{"summary": "broken", "tags": ["bad"}'
    const result = parseAiResult(text)
    expect(result.summary).toBe('{"summary": "broken", "tags": ["bad"}')
    expect(result.tags).toEqual([])
  })
})

describe('parseStackFitResult', () => {
  it('parses a valid COMPLEMENT verdict', () => {
    const text = '{"verdict": "COMPLEMENT", "explanation": "It adds new monitoring capabilities."}'
    const result = parseStackFitResult(text)
    expect(result).toEqual({
      verdict: 'COMPLEMENT',
      explanation: 'It adds new monitoring capabilities.',
    })
  })

  it('parses a NO_FIT verdict', () => {
    const text = '{"verdict": "NO_FIT", "explanation": "Overlaps with existing tools."}'
    const result = parseStackFitResult(text)
    expect(result?.verdict).toBe('NO_FIT')
  })

  it('returns null for empty text', () => {
    expect(parseStackFitResult('')).toBeNull()
  })

  it('returns null when no JSON found', () => {
    expect(parseStackFitResult('just some text')).toBeNull()
  })

  it('defaults missing verdict to NO_FIT', () => {
    const text = '{"explanation": "some reason"}'
    const result = parseStackFitResult(text)
    expect(result).toEqual({
      verdict: 'NO_FIT',
      explanation: 'some reason',
    })
  })
})
