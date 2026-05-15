import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import { getEntries } from '../lib/kv'

export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV

  let categories: { name: string; entries: { name: string; url: string; summary: string; tags: string[] }[] }[] = []

  if (kv) {
    const catsJson = await kv.get('categories')
    const catNames: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

    for (const cat of catNames) {
      const entries = await getEntries(kv, cat)
      if (entries.length === 0) continue
      categories.push({
        name: cat,
        entries: entries
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(e => ({
            name: e.name,
            url: e.url,
            summary: e.summary,
            tags: e.tags,
          })),
      })
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
        {categories.length === 0 ? (
          <div class="card">
            <p class="text-muted" style="margin: 0;">No saved entries yet. Process some URLs on the Home page to build your library.</p>
          </div>
        ) : (
          <div>
            {categories.map(cat => (
              <div key={cat.name} style="margin-bottom: 24px;">
                <div class="mb-8" style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-weight: 600; font-size: 15px;">{cat.name}</span>
                  <span class="badge-count">{cat.entries.length} entries</span>
                </div>
                {cat.entries.map(e => (
                  <div class="card" key={e.url} style="padding: 10px 16px;">
                    <div>
                      <span style="font-weight: 600; font-size: 14px;">{e.name}</span>
                      <a href={e.url} class="url-link" target="_blank" rel="noopener">
                        {e.url}
                      </a>
                    </div>
                    <div class="summary-text" style="margin-top: 4px;">{e.summary}</div>
                    {e.tags.length > 0 && (
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        {e.tags.map(tag => (
                          <span class="tag" key={tag}>{tag}</span>
                        ))}
                      </div>
                    )}
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
