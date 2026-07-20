'use client'

import { useEffect, useState } from 'react'

interface IndustryItem {
  name: string
  count: number
}

export default function IndustryManagement() {
  const [items, setItems] = useState<IndustryItem[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/industries')
      const data = await res.json()
      if (data.success) {
        setItems(data.industries || [])
        setEdits({})
      } else {
        setError(data.message || '取得に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (name: string, value: string) => {
    setEdits((prev) => ({ ...prev, [name]: value }))
  }

  const pendingRenames = Object.entries(edits)
    .map(([oldName, newName]) => ({ oldName, newName: newName.trim() }))
    .filter((r) => r.newName && r.newName !== r.oldName)

  const handleApply = async () => {
    if (pendingRenames.length === 0) {
      setError('変更がありません')
      return
    }
    if (!confirm(`${pendingRenames.length}件の業種名を変更し、該当する全レコードに反映します。よろしいですか？`)) return

    setIsSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/industries/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renames: pendingRenames }),
      })
      const data = await res.json()
      if (data.success) {
        const total = (data.results || []).reduce((sum: number, r: any) => sum + (r.updatedCount || 0), 0)
        setMessage(`✓ ${pendingRenames.length}件の業種名を変更し、計${total}件のレコードに反映しました`)
        setTimeout(() => setMessage(''), 5000)
        load()
      } else {
        setError(data.message || '変更に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '変更中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          全レコードで使われている業種名の一覧です。名称を変更して「変更を反映」を押すと、該当する全レコードに一括反映されます。
        </p>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={isLoading || isSaving}
            className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 disabled:opacity-50"
          >
            再読み込み
          </button>
          <button
            onClick={handleApply}
            disabled={isSaving || pendingRenames.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '反映中...' : `変更を反映(${pendingRenames.length}件)`}
          </button>
        </div>
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">登録されている業種がありません</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-3 py-2 text-left">現在の業種名</th>
              <th className="border border-gray-300 px-3 py-2 text-center w-24">件数</th>
              <th className="border border-gray-300 px-3 py-2 text-left">変更後の名称</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const draft = edits[item.name] ?? item.name
              const isChanged = draft.trim() !== item.name && draft.trim() !== ''
              return (
                <tr key={item.name} className="bg-white">
                  <td className="border border-gray-300 px-3 py-2">{item.name}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">{item.count}件</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => handleChange(item.name, e.target.value)}
                      className={`w-full border px-2 py-1 rounded ${isChanged ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
