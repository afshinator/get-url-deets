import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.put(async (c) => {
  const kv = c.env.DEETS_KV
  if (!kv) return c.json({ ok: false, error: 'Storage unavailable' }, 503)

  const body = await c.req.json<{ description: string }>()
  await kv.put('stack-description', body.description)
  return c.json({ ok: true })
})

export default app
