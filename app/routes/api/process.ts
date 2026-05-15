import { Hono } from 'hono'
import { parseUrls } from '../../lib/parser'
import { summarizeAndTag, evaluateStackFit, fetchPageText, resolveStackFit } from '../../lib/ai'
import type { UrlEntry } from '../../lib/types'

type Env = {
  AI: Ai
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.post(async (c) => {
  const body = await c.req.json<{
    text: string
    category: string
    checkStackFit?: boolean
  }>()
  const { text, category, checkStackFit } = body

  const parsed = parseUrls(text)
  if (parsed.length === 0) {
    return c.json({ error: 'No URLs found in text' }, 400)
  }

  const kv = c.env.DEETS_KV
  const tagsJson = kv ? await kv.get(`tags:${category}`) : null
  const availableTags: string[] = tagsJson ? JSON.parse(tagsJson) : []

  const stackDescription = checkStackFit && kv
    ? (await kv.get('stack-description')) ?? ''
    : ''

  const results: UrlEntry[] = []

  for (const { name, url } of parsed) {
    try {
      const pageText = await fetchPageText(url)

      const { summary, tags } = await summarizeAndTag(
        c.env,
        pageText,
        category,
        availableTags
      )

      const resolvedName = name || url

      let stackFit: UrlEntry['stackFit']
      if (checkStackFit) {
        if (stackDescription) {
          const { result: sf, rawResponse } = await evaluateStackFit(c.env, pageText, stackDescription)
          stackFit = resolveStackFit(sf, rawResponse)
        } else {
          stackFit = { verdict: 'NO_FIT', explanation: 'No stack description saved — add one in Settings.' }
        }
      }

      results.push({ name: resolvedName, url, summary, category, tags, stackFit })
    } catch (err) {
      results.push({
        name: name || url,
        url,
        summary: `Error processing: ${err instanceof Error ? err.message : 'Unknown error'}`,
        category,
        tags: [],
      })
    }
  }

  return c.json({ results })
})

export default app
