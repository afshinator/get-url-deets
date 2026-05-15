import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.post(async (c) => {
  const kv = c.env.DEETS_KV
  if (!kv) return c.json({ ok: false, error: 'Storage unavailable' }, 503)

  const body = await c.req.json<{ category: string; tag: string }>()
  const { category, tag } = body

  const trimmed = tag.trim()
  if (!trimmed) return c.json({ ok: false, error: 'Tag is required' }, 400)

  const tagsJson = await kv.get(`tags:${category}`)
  const tags: string[] = tagsJson ? JSON.parse(tagsJson) : []

  if (tags.includes(trimmed)) return c.json({ ok: true })

  tags.push(trimmed)
  await kv.put(`tags:${category}`, JSON.stringify(tags))
  return c.json({ ok: true })
})

export default app
