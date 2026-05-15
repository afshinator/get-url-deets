import { describe, it, expect } from 'vitest'
import type { UrlEntry } from '../../app/lib/types'

function entry(overrides: Partial<UrlEntry> = {}): UrlEntry {
  return {
    name: 'TestTool',
    url: 'https://test.dev',
    summary: 'A test tool.',
    category: 'dev',
    tags: ['testing'],
    ...overrides,
  }
}

function mockKv(data = new Map<string, string>()): KVNamespace {
  return {
    get: async (key: string) => data.get(key) ?? null,
    put: async (key: string, value: string) => { data.set(key, value) },
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true }),
    getWithMetadata: async () => ({ value: null, metadata: null }),
  } as KVNamespace
}

import { saveEntry, getEntries } from '../../app/lib/kv'

describe('saveEntry', () => {
  it('saves entry JSON under entry:{url} key', async () => {
    const data = new Map<string, string>()
    const kv = mockKv(data)
    const e = entry({ url: 'https://a.dev', name: 'Alpha' })

    await saveEntry(kv, e)

    const saved = JSON.parse(data.get('entry:https://a.dev')!)
    expect(saved.name).toBe('Alpha')
  })

  it('appends URL to by-category:{cat} index', async () => {
    const data = new Map<string, string>()
    const kv = mockKv(data)
    const e = entry({ url: 'https://a.dev', category: 'dev' })

    await saveEntry(kv, e)

    const urls = JSON.parse(data.get('by-category:dev')!)
    expect(urls).toContain('https://a.dev')
  })

  it('does not duplicate URLs in index', async () => {
    const data = new Map<string, string>()
    data.set('by-category:dev', JSON.stringify(['https://a.dev']))
    const kv = mockKv(data)
    const e = entry({ url: 'https://a.dev', category: 'dev' })

    await saveEntry(kv, e)

    const urls = JSON.parse(data.get('by-category:dev')!)
    const aCount = urls.filter((u: string) => u === 'https://a.dev').length
    expect(aCount).toBe(1)
  })

  it('caps index at 200 entries', async () => {
    const data = new Map<string, string>()
    const existing = Array.from({ length: 200 }, (_, i) => `https://u${i}.dev`)
    data.set('by-category:dev', JSON.stringify(existing))
    const kv = mockKv(data)
    const e = entry({ url: 'https://new.dev', category: 'dev' })

    await saveEntry(kv, e)

    const urls = JSON.parse(data.get('by-category:dev')!)
    expect(urls.length).toBe(200)
    expect(urls[0]).toBe('https://new.dev')
  })
})

describe('getEntries', () => {
  it('returns empty array for unknown category', async () => {
    const kv = mockKv()
    const entries = await getEntries(kv, 'unknown')
    expect(entries).toEqual([])
  })

  it('returns entries sorted by name', async () => {
    const data = new Map<string, string>()
    data.set('by-category:dev', JSON.stringify(['https://c.dev', 'https://a.dev', 'https://b.dev']))
    data.set('entry:https://c.dev', JSON.stringify(entry({ url: 'https://c.dev', name: 'Charlie' })))
    data.set('entry:https://a.dev', JSON.stringify(entry({ url: 'https://a.dev', name: 'Alpha' })))
    data.set('entry:https://b.dev', JSON.stringify(entry({ url: 'https://b.dev', name: 'Bravo' })))
    const kv = mockKv(data)

    const entries = await getEntries(kv, 'dev')
    expect(entries.map(e => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })
})
