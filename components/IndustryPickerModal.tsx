'use client'

import { useEffect, useState } from 'react'

interface IndustryPickerModalProps {
  onSelect: (name: string) => void
  onClose: () => void
}

interface IndustryItem {
  name: string
  count: number
}

export default function IndustryPickerModal({ onSelect, onClose }: IndustryPickerModalProps) {
  const [items, setItems] = useState<IndustryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/industries')
        const data = await res.json()
        if (data.success) setItems(data.industries || [])
      } catch (e) {
        console.error('Failed to load industries:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300">
          <h2 className="text-lg font-bold">業種カテゴリ一覧</h2>
          <button onClick={onClose} className="px-3 py-1 bg-gray-500 text-white rounded text-sm font-bold hover:bg-gray-600">
            閉じる
          </button>
        </div>
        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="業種名で絞り込み..."
            autoFocus
            className="w-full border border-gray-300 px-3 py-2 rounded text-sm"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8 text-sm">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              {items.length === 0 ? '登録されている業種がありません' : '該当する業種がありません'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <li
                  key={item.name}
                  onClick={() => onSelect(item.name)}
                  className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-blue-50"
                >
                  <span className="text-sm">{item.name}</span>
                  <span className="text-xs text-gray-400">{item.count}件</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
