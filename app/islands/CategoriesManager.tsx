import { useState } from 'hono/jsx'

interface CategoryData {
  name: string
  tags: string[]
}

interface Props {
  initialCategories: CategoryData[]
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories)
  const [editing, setEditing] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
  const [saveError, setSaveError] = useState('')

  const save = async (cats: CategoryData[]) => {
    setSaveError('')
    try {
      const resp = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: cats }),
      })
      const data = await resp.json() as { ok?: boolean; error?: string }
      if (!resp.ok || !data.ok) {
        setSaveError(data.error || 'Failed to save categories. Try again.')
        return
      }
      setCategories(cats)
    } catch {
      setSaveError('Failed to save categories. Try again.')
    }
  }

  const addCategory = () => {
    const name = newCategory.trim()
    if (!name || categories.some(c => c.name === name)) return
    save([...categories, { name, tags: [] }])
    setNewCategory('')
  }

  const deleteCategory = (name: string) => {
    save(categories.filter(c => c.name !== name))
    if (editing === name) setEditing(null)
  }

  const addTag = (catName: string) => {
    const t = newTag.trim()
    if (!t) return
    const updated = categories.map(c =>
      c.name === catName && !c.tags.includes(t)
        ? { ...c, tags: [...c.tags, t] }
        : c
    )
    save(updated)
    setNewTag('')
  }

  const removeTag = (catName: string, tag: string) => {
    const updated = categories.map(c =>
      c.name === catName
        ? { ...c, tags: c.tags.filter(x => x !== tag) }
        : c
    )
    save(updated)
  }

  return (
    <div>
      <div class="card">
        <div class="mb-16">
          <h3 style="margin: 0 0 4px; font-size: 16px;">Categories & Tags</h3>
          <p class="text-muted" style="margin: 0;">Each category has its own set of tags. The AI picks from these when summarizing.</p>
        </div>

        {saveError && (
          <div class="mb-16" style="color: var(--danger); font-size: 13px;">
            {saveError}
          </div>
        )}

        <div class="flex-between gap-8 mb-16" style="display: flex;">
          <input
            class="input"
            style="flex: 1;"
            placeholder="New category name..."
            value={newCategory}
            onChange={(e: Event) => setNewCategory((e.target as HTMLInputElement).value)}
            onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addCategory()}
          />
          <button class="btn" onClick={addCategory}>+ Add Category</button>
        </div>

        {categories.map(cat => (
          <div key={cat.name}>
            <div class="cat-row">
              <div>
                <span style="font-weight: 600; font-size: 14px;">{cat.name}</span>
                <span class="badge-count">{cat.tags.length} tags</span>
              </div>
              <div class="gap-6" style="display: flex;">
                <button class="btn btn-ghost btn-sm" onClick={() => setEditing(editing === cat.name ? null : cat.name)}>
                  Edit Tags
                </button>
                <button class="btn btn-danger btn-sm" onClick={() => deleteCategory(cat.name)}>
                  Delete
                </button>
              </div>
            </div>

            {editing === cat.name && (
              <div style="padding: 12px 0 16px;">
                <div class="flex-wrap gap-6 mb-8" style="display: flex;">
                  {cat.tags.map(tag => (
                    <span class="tag" key={tag}>
                      {tag}
                      <span class="tag-remove" onClick={() => removeTag(cat.name, tag)}>×</span>
                    </span>
                  ))}
                  <input
                    class="input"
                    style="width: 120px; font-size: 12px; padding: 3px 8px;"
                    placeholder="+ add tag..."
                    value={editing === cat.name ? newTag : ''}
                    onChange={(e: Event) => setNewTag((e.target as HTMLInputElement).value)}
                    onKeyUp={(e: KeyboardEvent) => e.key === 'Enter' && addTag(cat.name)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
