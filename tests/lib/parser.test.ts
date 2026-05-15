import { describe, it, expect } from 'vitest'
import { parseUrls } from '../../app/lib/parser'

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
