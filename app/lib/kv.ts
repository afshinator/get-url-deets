import type { UrlEntry } from './types'

export async function saveEntry(kv: KVNamespace, entry: UrlEntry) {
  await kv.put(`entry:${entry.url}`, JSON.stringify(entry))

  const indexKey = `by-category:${entry.category}`
  const indexJson = await kv.get(indexKey)
  const urls: string[] = indexJson ? JSON.parse(indexJson) : []
  if (!urls.includes(entry.url)) {
    urls.unshift(entry.url)
    if (urls.length > 200) urls.length = 200
    await kv.put(indexKey, JSON.stringify(urls))
  }
}

export async function getEntries(kv: KVNamespace, category: string): Promise<UrlEntry[]> {
  const indexJson = await kv.get(`by-category:${category}`)
  if (!indexJson) return []
  const urls: string[] = JSON.parse(indexJson)
  const entries: UrlEntry[] = []
  for (const url of urls) {
    const json = await kv.get(`entry:${url}`)
    if (json) entries.push(JSON.parse(json) as UrlEntry)
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  return entries
}
