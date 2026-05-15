import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import { getEntries } from '../lib/kv'

export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV

  let grouped: { category: string; tag: string; entries: { name: string; url: string; summary: string }[] }[] = []

  if (kv) {
    const catsJson = await kv.get('categories')
    const catNames: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

    for (const cat of catNames) {
      const entries = await getEntries(kv, cat)
      const tagMap = new Map<string, typeof entries>()
      for (const e of entries) {
        const tags = e.tags.length > 0 ? e.tags : ['untagged']
        for (const tag of tags) {
          if (!tagMap.has(tag)) tagMap.set(tag, [])
          tagMap.get(tag)!.push(e)
        }
      }
      for (const [tag, items] of [...tagMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        grouped.push({
          category: cat,
          tag,
          entries: items.sort((a, b) => a.name.localeCompare(b.name)).map(e => ({
            name: e.name,
            url: e.url,
            summary: e.summary,
          })),
        })
      }
    }
  }

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">get-url-deets</span>
          <a href="/" class="nav-link">Home</a>
          <a href="/categories" class="nav-link">Categories</a>
          <a href="/library" class="nav-link active">Library</a>
          <a href="/settings" class="nav-link">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        {grouped.length === 0 ? (
          <div class="card">
            <p class="text-muted" style="margin: 0;">No saved entries yet. Process some URLs on the Home page to build your library.</p>
          </div>
        ) : (
          <div>
            {grouped.map(group => (
              <div key={`${group.category}:${group.tag}`} style="margin-bottom: 24px;">
                <div class="mb-8">
                  <span style="font-weight: 600; font-size: 14px;">{group.category}</span>
                  <span style="color: var(--text-muted); font-size: 12px; margin-left: 4px;">/</span>
                  <span class="tag" style="font-size: 13px;">{group.tag}</span>
                </div>
                {group.entries.map(e => (
                  <div class="card" key={e.url} style="padding: 10px 16px;">
                    <div>
                      <span style="font-weight: 600; font-size: 14px;">{e.name}</span>
                      <a href={e.url} class="url-link" target="_blank" rel="noopener">
                        {e.url}
                      </a>
                    </div>
                    <div class="summary-text" style="margin-top: 4px;">{e.summary}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) as any
})
