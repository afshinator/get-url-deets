import { createRoute } from 'honox/factory'
import ThemeToggle from '../islands/ThemeToggle'
import StackSettings from '../islands/StackSettings'

export default createRoute(async (c) => {
  const kv: KVNamespace | undefined = (c.env as any)?.DEETS_KV
  const stackDescription = kv ? (await kv.get('stack-description') ?? '') : ''

  let hasEntries = false
  if (kv) {
    const list = await kv.list({ prefix: 'entry:', limit: 1 })
    hasEntries = list.keys.length > 0
  }

  return c.render(
    <div>
      <nav class="nav">
        <div>
          <span class="nav-brand">get-url-deets</span>
          <a href="/" class="nav-link">Home</a>
          <a href="/categories" class="nav-link">Categories</a>
          <a href="/library" class="nav-link">Library</a>
          <a href="/settings" class="nav-link active">Settings</a>
        </div>
        <ThemeToggle />
      </nav>
      <div class="container">
        <StackSettings initialStack={stackDescription} hasEntries={hasEntries} />
      </div>
    </div>
  ) as any
})
