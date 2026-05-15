import { Hono } from 'hono'
import { getEntries } from '../../lib/kv'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.get(async (c) => {
  const kv = c.env.DEETS_KV
  if (!kv) return c.json({ entries: [] })

  const category = c.req.query('category')
  if (!category) return c.json({ error: 'category query param required' }, 400)

  const entries = await getEntries(kv, category)
  return c.json({ entries })
})

export default app
