import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import ResultCards from '../islands/ResultCards'
import { getEntries } from '../lib/kv'
import type { UrlEntry } from '../lib/types'

export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const catsJson = kv ? await kv.get('categories') : null
  const categories: string[] = catsJson
    ? (JSON.parse(catsJson) as string[])
    : ['dev']

  let initialData: UrlEntry[] = []
  if (kv) {
    const all: UrlEntry[] = []
    for (const cat of categories) {
      const entries = await getEntries(kv, cat)
      all.push(...entries)
    }
    initialData = all.sort((a, b) => a.name.localeCompare(b.name))
  }

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">get-url-deets</span>
          <a href="/" class="nav-link active">Home</a>
          <a href="/categories" class="nav-link">Categories</a>
          <a href="/library" class="nav-link">Library</a>
          <a href="/settings" class="nav-link">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <ResultCards categories={categories} initialData={initialData} />
      </div>
    </div>
  ) as any
})
