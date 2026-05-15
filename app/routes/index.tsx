import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import ResultCards from '../islands/ResultCards'

export default createRoute(async (c) => {
  const kv: KVNamespace = (c.env as any).DEETS_KV
  const catsJson = kv ? await kv.get('categories') : null
  const categories: string[] = catsJson
    ? (JSON.parse(catsJson) as string[])
    : ['dev']

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">get-url-deets</span>
          <a href="/" class="nav-link active">Home</a>
          <a href="/categories" class="nav-link">Categories</a>
          <a href="/settings" class="nav-link">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <ResultCards categories={categories} />
      </div>
    </div>
  ) as any
})
