import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.get(async (c) => {
  const catsJson = await c.env.DEETS_KV.get('categories')
  const categoryNames: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const categories = await Promise.all(
    categoryNames.map(async (name) => {
      const tagsJson = await c.env.DEETS_KV.get(`tags:${name}`)
      const tags: string[] = tagsJson ? JSON.parse(tagsJson) : []
      return { name, tags }
    })
  )

  return c.json({ categories })
})

app.put(async (c) => {
  const kv = c.env.DEETS_KV
  if (!kv) return c.json({ ok: false, error: 'Storage unavailable' }, 503)

  const body = await c.req.json<{ categories: { name: string; tags: string[] }[] }>()

  const names = body.categories.map(c => c.name)
  await kv.put('categories', JSON.stringify(names))

  for (const cat of body.categories) {
    await kv.put(`tags:${cat.name}`, JSON.stringify(cat.tags))
  }

  return c.json({ ok: true })
})

export default app
