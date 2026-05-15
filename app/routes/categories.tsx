import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import CategoriesManager from '../islands/CategoriesManager'

export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const catsJson = kv ? await kv.get('categories') : null
  const names: string[] = catsJson ? JSON.parse(catsJson) : ['dev']

  const tagsEntries = kv
    ? await Promise.all(
        names.map(async (name) => {
          const tagsJson = await kv.get(`tags:${name}`)
          return { name, tags: tagsJson ? (JSON.parse(tagsJson) as string[]) : [] }
        })
      )
    : names.map(name => ({ name, tags: [] as string[] }))

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">get-url-deets</span>
          <a href="/" class="nav-link">Home</a>
          <a href="/categories" class="nav-link active">Categories</a>
          <a href="/settings" class="nav-link">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <CategoriesManager initialCategories={tagsEntries} />
      </div>
    </div>
  ) as any
})
