import { describe, it, expect } from 'vitest'

/**
 * Tests for the tag persistence logic.
 *
 * The POST /api/categories/add-tag endpoint:
 * - Accepts { category: string, tag: string }
 * - Reads existing tags for the category from KV
 * - Appends the new tag if not already present
 * - Deduplicates tags
 * - Writes back to KV
 *
 * These tests validate the pure logic without needing a running server.
 */

function addTagToCategory(
  existingTags: string[],
  newTag: string
): { tags: string[]; changed: boolean } {
  const trimmed = newTag.trim()
  if (!trimmed) return { tags: existingTags, changed: false }
  if (existingTags.includes(trimmed)) return { tags: existingTags, changed: false }
  return { tags: [...existingTags, trimmed], changed: true }
}

describe('addTagToCategory (pure logic for POST /api/categories/add-tag)', () => {
  it('adds a new tag to existing tags', () => {
    const result = addTagToCategory(['ai', 'testing'], 'monitoring')
    expect(result.tags).toEqual(['ai', 'testing', 'monitoring'])
    expect(result.changed).toBe(true)
  })

  it('does not duplicate an existing tag', () => {
    const result = addTagToCategory(['ai', 'testing'], 'ai')
    expect(result.tags).toEqual(['ai', 'testing'])
    expect(result.changed).toBe(false)
  })

  it('trims whitespace from tag', () => {
    const result = addTagToCategory(['ai'], '  monitoring  ')
    expect(result.tags).toEqual(['ai', 'monitoring'])
    expect(result.changed).toBe(true)
  })

  it('rejects empty tag', () => {
    const result = addTagToCategory(['ai'], '   ')
    expect(result.tags).toEqual(['ai'])
    expect(result.changed).toBe(false)
  })

  it('rejects empty string', () => {
    const result = addTagToCategory(['ai'], '')
    expect(result.tags).toEqual(['ai'])
    expect(result.changed).toBe(false)
  })

  it('works with empty existing tags', () => {
    const result = addTagToCategory([], 'new-tag')
    expect(result.tags).toEqual(['new-tag'])
    expect(result.changed).toBe(true)
  })
})
