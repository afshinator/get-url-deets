import { describe, it, expect } from 'vitest'
import { parseAiResult, parseStackFitResult, extractJson, resolveStackFit } from '../../app/lib/ai'

describe('extractJson', () => {
  it('extracts JSON from plain text', () => {
    const text = '{"summary": "hi", "tags": ["a"]}'
    expect(extractJson(text)).toBe('{"summary": "hi", "tags": ["a"]}')
  })

  it('extracts JSON with text before it', () => {
    const text = 'Here is the JSON response: {"summary": "hi", "tags": ["a"]}'
    expect(extractJson(text)).toBe('{"summary": "hi", "tags": ["a"]}')
  })

  it('extracts JSON from markdown code fence with preamble', () => {
    const text = 'Here is the JSON response:\n```json\n{"summary": "hi", "tags": ["a"]}\n```'
    expect(extractJson(text)).toBe('{"summary": "hi", "tags": ["a"]}')
  })

  it('extracts JSON when text with braces follows the JSON', () => {
    const text = '{"summary": "hi", "tags": ["a"]}\nKey points: {better testing}, {CI integration}'
    const json = extractJson(text)
    expect(json).toBe('{"summary": "hi", "tags": ["a"]}')
  })

  it('returns null when no JSON found', () => {
    expect(extractJson('Just some random text.')).toBeNull()
  })

  it('extracts JSON with escaped quotes in string', () => {
    const text = '{"summary": "A \\"quoted\\" tool.", "tags": ["a"]}'
    expect(extractJson(text)).toBe('{"summary": "A \\"quoted\\" tool.", "tags": ["a"]}')
  })

  it('extracts nested JSON', () => {
    const text = '{"verdict": "COMPLEMENT", "explanation": "Fits with {existing} tools."}'
    expect(extractJson(text)).toBe('{"verdict": "COMPLEMENT", "explanation": "Fits with {existing} tools."}')
  })
})

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

  it('handles LLM preamble with markdown code fence', () => {
    const text = 'Here is the JSON response:\n```json\n{"summary": "A tool for API testing.", "tags": ["ai-testing"]}\n```'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A tool for API testing.')
    expect(result.tags).toEqual(['ai-testing'])
  })

  it('handles trailing comma in JSON (common LLM mistake)', () => {
    const text = '{"summary": "A tool.", "tags": ["tag1", "tag2"],}'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A tool.')
    expect(result.tags).toEqual(['tag1', 'tag2'])
  })

  it('handles extra text with braces after JSON', () => {
    const text = '{"summary": "A tool.", "tags": ["tag1"]} Key points: {better testing}, {CI integration}'
    const result = parseAiResult(text)
    expect(result.summary).toBe('A tool.')
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

  it('does not leak raw LLM text on parse failure', () => {
    const text = 'Here is the JSON response: ```\n{broken json\n'
    const result = parseAiResult(text)
    expect(result.summary).not.toContain('Here is the JSON response')
    expect(result.summary).not.toContain('```')
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

  it('parses verdict with text preamble', () => {
    const text = 'Based on analysis:\n{"verdict": "ENHANCE", "explanation": "Speeds up existing pipeline."}'
    const result = parseStackFitResult(text)
    expect(result).toEqual({
      verdict: 'ENHANCE',
      explanation: 'Speeds up existing pipeline.',
    })
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

describe('resolveStackFit', () => {
  it('returns the AI result when it succeeds', () => {
    const result = resolveStackFit({ verdict: 'COMPLEMENT', explanation: 'Fits well.' })
    expect(result).toEqual({ verdict: 'COMPLEMENT', explanation: 'Fits well.' })
  })

  it('diagnoses empty response', () => {
    const result = resolveStackFit(null, '')
    expect(result.verdict).toBe('FAILED')
    expect(result.explanation).toContain('empty response')
  })

  it('diagnoses no-JSON response', () => {
    const result = resolveStackFit(null, 'Here is some rambling text with no curly braces.')
    expect(result.verdict).toBe('FAILED')
    expect(result.explanation).toContain('without JSON')
  })

  it('diagnoses parse failure when JSON present but broken', () => {
    const result = resolveStackFit(null, '{"verdict": "ENHANCE", "explanation": "text with "unescaped" inner quotes"}')
    expect(result.verdict).toBe('FAILED')
    expect(result.explanation).toContain('could not be parsed')
  })

  it('falls back when no raw response provided', () => {
    const result = resolveStackFit(null)
    expect(result).toEqual({ verdict: 'FAILED', explanation: 'Could not evaluate stack fit. Try again.' })
  })
})
