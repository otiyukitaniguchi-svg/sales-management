'use client'

import { useAppStore } from '@/lib/store'

export default function SearchListSelect({ value, onChange, disabled = false }: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const lists = useAppStore((state) => state.lists)
  const groups = new Map<string, typeof lists>()
  for (const list of lists) {
    const group = list.group_name || ''
    groups.set(group, [...(groups.get(group) || []), list])
  }

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0">
      <span className="shrink-0">検索対象</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}
        className="border border-gray-300 rounded px-2 py-1 bg-white max-w-64 min-w-0 disabled:opacity-50">
        <option value="">全リスト</option>
        {value && !lists.some((list) => list.slug === value) && <option value={value}>選択したリスト（一覧にありません）</option>}
        {Array.from(groups, ([group, items]) => (
          <optgroup key={group} label={group || '未分類'}>
            {items.map((list) => <option key={list.slug} value={list.slug}>{list.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
