interface AiEnv {
  AI: Ai
}

interface AiResult {
  summary: string
  tags: string[]
}

interface StackFitResult {
  verdict: 'COMPLEMENT' | 'REPLACE' | 'ENHANCE' | 'NO_FIT'
  explanation: string
}

export function parseAiResult(text: string): AiResult {
  if (typeof text !== 'string') return { summary: 'No response from AI.', tags: [] }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { summary: 'Could not generate summary.', tags: [] }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { summary?: string; tags?: string[] }
    return {
      summary: parsed.summary?.trim() ?? 'No summary available.',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter(t => t && typeof t === 'string')
        : [],
    }
  } catch {
    return { summary: text.slice(0, 300), tags: [] }
  }
}

export function parseStackFitResult(text: string): StackFitResult | null {
  if (typeof text !== 'string') return null
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as StackFitResult
    return {
      verdict: parsed.verdict ?? 'NO_FIT',
      explanation: parsed.explanation ?? 'No explanation.',
    }
  } catch {
    return null
  }
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
{"summary": "2 sentences explaining what this tool does", "tags": ["tag1", "tag2"]}

Page content:
${pageText.slice(0, 8000)}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
  })

  const raw = response as any
  const text = typeof raw?.response === 'string' ? raw.response : ''
  return parseAiResult(text)
}

export async function evaluateStackFit(
  env: AiEnv,
  pageText: string,
  stackDescription: string
): Promise<StackFitResult | null> {
  if (!stackDescription.trim()) return null

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
{"verdict": "COMPLEMENT" | "REPLACE" | "ENHANCE" | "NO_FIT", "explanation": "1 sentence explaining why"}`

  const response = await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 256,
  })

  const raw = response as any
  const text = typeof raw?.response === 'string' ? raw.response : ''
  return parseStackFitResult(text)
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
