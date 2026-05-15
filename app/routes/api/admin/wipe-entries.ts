import { Hono } from 'hono'

type Env = {
  DEETS_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

app.post(async (c) => {
  const kv = c.env.DEETS_KV
  if (!kv) return c.json({ ok: false, error: 'Storage unavailable' }, 503)

  let deleted = 0

  try {
    // Delete all entry:* keys
    let cursor: string | undefined
    let list: KVNamespaceListResult<{ name: string }>
    do {
      list = await kv.list({ prefix: 'entry:', cursor })
      for (const key of list.keys) {
        await kv.delete(key.name)
        deleted++
      }
      cursor = list.list_complete ? undefined : list.cursor
    } while (cursor)

    // Delete by-category:* index keys
    cursor = undefined
    do {
      list = await kv.list({ prefix: 'by-category:', cursor })
      for (const key of list.keys) {
        await kv.delete(key.name)
        deleted++
      }
      cursor = list.list_complete ? undefined : list.cursor
    } while (cursor)
  } catch (err) {
    return c.json({ ok: false, error: `Wipe failed: ${err instanceof Error ? err.message : 'Unknown error'}` }, 500)
  }

  return c.json({ ok: true, deleted })
})

export default app
