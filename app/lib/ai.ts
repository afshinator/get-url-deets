interface AiEnv {
  AI: Ai
}

import { inferTypeTag } from './parser'

interface AiResult {
  summary: string
  tags: string[]
}

interface StackFitResult {
  verdict: 'COMPLEMENT' | 'REPLACE' | 'ENHANCE' | 'NO_FIT'
  explanation: string
}

export function extractJson(text: string): string | null {
  const cleaned = text.replace(/```[a-z]*\n([\s\S]*?)```/g, '$1')

  let start = -1
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') { start = i; break }
  }
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]

    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return cleaned.slice(start, i + 1)
    }
  }

  return null
}

function tryParseJson(raw: string): any | null {
  try { return JSON.parse(raw) } catch { /* continue */ }

  // Fix trailing commas before ] or }
  const noTrailingCommas = raw.replace(/,(?=\s*[}\]])/g, '')
  try { return JSON.parse(noTrailingCommas) } catch { /* continue */ }

  return null
}

export function parseAiResult(text: string): AiResult {
  if (typeof text !== 'string') return { summary: 'No response from AI.', tags: [] }
  const json = extractJson(text)
  if (!json) return { summary: 'Could not generate summary.', tags: [] }

  const parsed = tryParseJson(json) as { summary?: string; tags?: string[] } | null
  if (!parsed) return { summary: 'Could not parse AI response.', tags: [] }

  return {
    summary: parsed.summary?.trim() ?? 'No summary available.',
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter(t => t && typeof t === 'string')
      : [],
  }
}

export function parseStackFitResult(text: string): StackFitResult | null {
  if (typeof text !== 'string') return null
  const json = extractJson(text)
  if (!json) return null

  const parsed = tryParseJson(json) as StackFitResult | null
  if (!parsed) return null

  return {
    verdict: parsed.verdict ?? 'NO_FIT',
    explanation: parsed.explanation ?? 'No explanation.',
  }
}

function diagnoseStackFitError(text: string): string {
  if (text.startsWith('AI error:')) return text
  if (text.startsWith('Unexpected AI response:')) return text
  if (!text) return 'AI returned an empty response. Try again.'
  const json = extractJson(text)
  if (!json) return `AI returned a response without JSON (${text.length} chars). Try again.`
  return 'AI returned JSON that could not be parsed. Try again.'
}

export function resolveStackFit(
  sf: StackFitResult | null,
  rawResponse?: string
): NonNullable<Exclude<{ verdict: string; explanation: string }, undefined>> {
  if (sf) return { verdict: sf.verdict, explanation: sf.explanation }
  if (rawResponse !== undefined) {
    return { verdict: 'FAILED', explanation: diagnoseStackFitError(rawResponse) }
  }
  return { verdict: 'FAILED', explanation: 'Could not evaluate stack fit. Try again.' }
}

export function filterTagsToPool(tags: string[], pool: string[]): string[] {
  return tags.filter(t => pool.includes(t))
}

function getResponseString(raw: any): string | undefined {
  if (raw?.response === undefined) return undefined
  if (typeof raw.response === 'string') return raw.response
  return undefined
}

export function parseRawStackFitResponse(raw: any): { result: StackFitResult | null; rawResponse: string } | null {
  if (raw?.errors?.[0]?.message) {
    return { result: null, rawResponse: `AI error: ${raw.errors[0].message}` }
  }

  // Workers AI may return .response as an object (structured output with tool_calls)
  if (raw?.response && typeof raw.response !== 'string') {
    const sr = raw.response as { verdict?: string; explanation?: string }
    if (sr.verdict || sr.explanation) {
      return { result: { verdict: (sr.verdict as StackFitResult['verdict']) ?? 'NO_FIT', explanation: sr.explanation ?? 'No explanation.' }, rawResponse: '' }
    }
  }

  const text = getResponseString(raw)
  if (text === undefined) {
    const shape = JSON.stringify(raw).slice(0, 300)
    return { result: null, rawResponse: shape ? `Unexpected AI response: ${shape}` : '' }
  }

  return { result: parseStackFitResult(text), rawResponse: text }
}

export function parseRawAiResponse(raw: any): AiResult & { error?: string } {
  if (raw?.errors?.[0]?.message) {
    return { summary: '', tags: [], error: `AI error: ${raw.errors[0].message}` }
  }

  // Workers AI may return .response as an object (structured output)
  if (raw?.response && typeof raw.response !== 'string') {
    const sr = raw.response as { summary?: string; tags?: string[] }
    if (sr.summary || sr.tags) {
      return {
        summary: (sr.summary ?? 'No summary available.').trim(),
        tags: Array.isArray(sr.tags) ? sr.tags.filter(t => t && typeof t === 'string') : [],
      }
    }
  }

  const text = getResponseString(raw)
  if (text === undefined) {
    const shape = JSON.stringify(raw).slice(0, 300)
    return { summary: shape ? `Unexpected AI response: ${shape}` : 'No response from AI.', tags: [] }
  }

  return { ...parseAiResult(text) }
}

const TYPE_TAGS = ['github', 'web site', 'web app']

export function enforceTypeTag(tags: string[], url: string): string[] {
  const hasType = tags.some(t => TYPE_TAGS.includes(t))
  if (hasType) return tags
  const inferred = inferTypeTag(url)
  if (inferred) return [...tags, inferred]
  return tags
}

export async function summarizeAndTag(
  env: AiEnv,
  pageText: string,
  category: string,
  availableTags: string[]
): Promise<AiResult> {
  const tagList = availableTags.join(', ')

  const prompt = `You are categorizing a software tool/product.

Category: ${category}
Available tags for this category: ${tagList}

Given the following page content about a tool, respond in JSON format:
{"summary": "2-3 sentences: what type of tool it is, who uses it, what specific problem it solves. Be concrete — mention technologies, workflows, or use cases visible on the page.", "tags": ["most_specific", "narrow", "general"]}

Assign up to 4 tags from the list. Order them from most specific/narrow to most general/broad. One tag MUST be a type tag indicating whether the tool is a "github", "web site", or "web app". If fewer than 4 are applicable, use fewer.

Page content:
${pageText.slice(0, 8000)}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
  })

  const result = parseRawAiResponse(response)
  if (result.error) return { summary: result.error, tags: [] }
  result.tags = filterTagsToPool(result.tags, availableTags).slice(0, 4)
  return result
}

export async function evaluateStackFit(
  env: AiEnv,
  pageText: string,
  stackDescription: string
): Promise<{ result: StackFitResult | null; rawResponse: string }> {
  if (!stackDescription.trim()) return { result: null, rawResponse: '' }

  const prompt = `You are evaluating whether a tool would fit into an existing development environment.

Current dev environment (tools, workflows, container setup):
"""
${stackDescription.slice(0, 2000)}
"""

Tool page content:
"""
${pageText.slice(0, 4000)}
"""

Respond in JSON:
{"verdict": "COMPLEMENT", "REPLACE", "ENHANCE", or "NO_FIT", "explanation": "1 sentence explaining why"}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
  })

  const result = parseRawStackFitResponse(response)
  if (!result) return { result: null, rawResponse: '' }
  return result
}

export async function fetchPageText(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Deets/1.0 (URL curator)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    })
    if (!resp.ok) return ''
    const html = await resp.text()
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return cleaned.slice(0, 10000)
  } catch {
    return ''
  }
}
