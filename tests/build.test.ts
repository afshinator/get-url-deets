import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const dist = resolve(__dirname, '..', 'dist')

describe('production build output', () => {
  beforeAll(() => {
    if (!existsSync(dist)) {
      throw new Error('dist/ not found. Run `npm run build` first.')
    }
  })

  it('produces dist/index.js (worker)', () => {
    expect(existsSync(resolve(dist, 'index.js'))).toBe(true)
    const size = readFileSync(resolve(dist, 'index.js')).length
    expect(size).toBeGreaterThan(1000)
  })

  it('produces dist/.vite/manifest.json', () => {
    expect(existsSync(resolve(dist, '.vite', 'manifest.json'))).toBe(true)
  })

  it('produces dist/static/style-*.css', () => {
    const files = readdirSync(resolve(dist, 'static'))
    const css = files.find(f => f.startsWith('style-') && f.endsWith('.css'))
    expect(css).toBeTruthy()
  })

  it('produces dist/static/client-*.js', () => {
    const files = readdirSync(resolve(dist, 'static'))
    const client = files.find(f => f.startsWith('client-') && f.endsWith('.js'))
    expect(client).toBeTruthy()
  })

  it('produces island bundles for each island component', () => {
    const files = readdirSync(resolve(dist, 'static'))
    const islands = ['ResultCards', 'CategoriesManager', 'StackSettings', 'ThemeToggle']
    for (const name of islands) {
      const found = files.find(f => f.startsWith(name) && f.endsWith('.js'))
      expect(found, `Missing island bundle for ${name}`).toBeTruthy()
    }
  })

  it('has honox-island runtime chunk', () => {
    const files = readdirSync(resolve(dist, 'static'))
    const runtime = files.find(f => f.startsWith('honox-island') && f.endsWith('.js'))
    expect(runtime).toBeTruthy()
  })

  it('has runtime chunk for island hydration', () => {
    const files = readdirSync(resolve(dist, 'static'))
    const runtime = files.find(f => f.startsWith('runtime-') && f.endsWith('.js'))
    expect(runtime).toBeTruthy()
  })
})

describe('manifest correctness', () => {
  let manifest: Record<string, any>

  beforeAll(() => {
    manifest = JSON.parse(
      readFileSync(resolve(dist, '.vite', 'manifest.json'), 'utf-8')
    )
  })

  it('maps app/style.css to static/style-*.css', () => {
    const entry = manifest['app/style.css']
    expect(entry).toBeTruthy()
    expect(entry.file).toMatch(/^static\/style-.+\.css$/)
  })

  it('maps app/client.ts to static/client-*.js', () => {
    const entry = manifest['app/client.ts']
    expect(entry).toBeTruthy()
    expect(entry.file).toMatch(/^static\/client-.+\.js$/)
  })

  it('maps each island to static/*.js with island import', () => {
    const islands = [
      'app/islands/ResultCards.tsx',
      'app/islands/CategoriesManager.tsx',
      'app/islands/StackSettings.tsx',
      'app/islands/ThemeToggle.tsx',
    ]
    for (const key of islands) {
      const entry = manifest[key]
      expect(entry, `Missing manifest entry for ${key}`).toBeTruthy()
      expect(entry.file).toMatch(/^static\/.+\.js$/)
      expect(entry.imports.some((imp: string) => /^_?honox-island-/.test(imp)),
        `Entry ${key} does not import honox-island runtime`).toBe(true)
    }
  })

  it('has no unresolved dev paths', () => {
    for (const [key, entry] of Object.entries(manifest)) {
      expect(entry.file, `Entry ${key} has no output file`).toBeTruthy()
      expect(entry.file).not.toMatch(/^app\//)
    }
  })
})
