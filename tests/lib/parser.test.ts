import { describe, it, expect } from 'vitest'
import { parseUrls, normalizeUrl } from '../../app/lib/parser'

describe('normalizeUrl', () => {
  it('strips trailing slash from path', () => {
    expect(normalizeUrl('https://onbeacon.ai/')).toBe('https://onbeacon.ai')
  })

  it('keeps URL without trailing slash as-is', () => {
    expect(normalizeUrl('https://onbeacon.ai')).toBe('https://onbeacon.ai')
  })

  it('preserves root path', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('keeps path after domain', () => {
    expect(normalizeUrl('https://example.com/docs/')).toBe('https://example.com/docs')
    expect(normalizeUrl('https://example.com/docs')).toBe('https://example.com/docs')
  })

  it('strips ref= query param', () => {
    expect(normalizeUrl('https://example.com?ref=producthunt')).toBe('https://example.com')
  })

  it('keeps non-tracking query params', () => {
    expect(normalizeUrl('https://example.com?a=1&b=2')).toBe('https://example.com?a=1&b=2')
  })

  it('strips ref= and keeps other params', () => {
    expect(normalizeUrl('https://example.com?ref=foo&a=1')).toBe('https://example.com?a=1')
  })

  it('strips trailing ? after param removal', () => {
    expect(normalizeUrl('https://example.com?ref=foo')).toBe('https://example.com')
  })

  it('normalizes URL with trailing slash AND ref param', () => {
    expect(normalizeUrl('https://onbeacon.ai/?ref=producthunt')).toBe('https://onbeacon.ai')
  })
})

describe('parseUrls', () => {
  it('parses timestamped URL lines', () => {
    const input = '00:38 - onBeacon : https://onbeacon.ai'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'onBeacon', url: 'https://onbeacon.ai' }])
  })

  it('strips ref= query params', () => {
    const input = '01:14 - Bruin : https://getbruin.com?ref=producthunt'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Bruin', url: 'https://getbruin.com' }])
  })

  it('strips trailing ? after ref removal', () => {
    const input = '01:14 - Bruin : https://getbruin.com?ref=producthunt&a=1'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Bruin', url: 'https://getbruin.com?a=1' }])
  })

  it('normalizes trailing slash in parsed URLs', () => {
    const input = '00:38 - onBeacon : https://onbeacon.ai/'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'onBeacon', url: 'https://onbeacon.ai' }])
  })

  it('handles bare URL lines (no timestamp prefix)', () => {
    const input = 'https://example.com'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: '', url: 'https://example.com' }])
  })

  it('returns empty array for empty input', () => {
    expect(parseUrls('')).toEqual([])
  })

  it('handles multi-digit timestamps', () => {
    const input = '123:45 - Tool : https://tool.dev'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Tool', url: 'https://tool.dev' }])
  })

  it('parses multiple lines', () => {
    const input = '00:38 - Foo : https://foo.dev\n01:14 - Bar : https://bar.dev'
    const result = parseUrls(input)
    expect(result).toEqual([
      { name: 'Foo', url: 'https://foo.dev' },
      { name: 'Bar', url: 'https://bar.dev' },
    ])
  })

  it('skips lines with no URL', () => {
    const input = '00:38 - NoURL here\n01:14 - HasURL : https://example.com'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'HasURL', url: 'https://example.com' }])
  })

  it('handles URL with query params besides ref', () => {
    const input = '00:05 - Thing : https://thing.com?a=1&ref=foo&b=2'
    const result = parseUrls(input)
    expect(result).toEqual([{ name: 'Thing', url: 'https://thing.com?a=1&b=2' }])
  })
})
