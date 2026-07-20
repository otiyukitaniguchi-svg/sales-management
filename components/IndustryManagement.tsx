'use client'

import { useEffect, useMemo, useState } from 'react'

interface IndustryItem {
  name: string
  count: number
}

interface SimilarGroup {
  key: string
  items: IndustryItem[]
  totalCount: number
}

// 表記ゆれを吸収するための正規化(括弧・記号・「総合」等の装飾語を除去して比較する)
function normalizeIndustryKey(name: string): string {
  return name
    .replace(/[（）()「」『』\[\]【】]/g, '')
    .replace(/[・,、\s　]/g, '')
    .replace(/総合/g, '')
    .trim()
}

function buildSimilarGroups(items: IndustryItem[]): SimilarGroup[] {
  const groups: SimilarGroup[] = []
  const placed = new Set<string>()

  // 1. 正規化後に完全一致するものをグループ化(最も確度が高い)
  const byNormalized = new Map<string, IndustryItem[]>()
  for (const item of items) {
    const key = normalizeIndustryKey(item.name)
    if (!key) continue
    if (!byNormalized.has(key)) byNormalized.set(key, [])
    byNormalized.get(key)!.push(item)
  }
  for (const [key, group] of Array.from(byNormalized.entries())) {
    if (group.length > 1) {
      groups.push({ key, items: group, totalCount: group.reduce((s, i) => s + i.count, 0) })
      group.forEach((i) => placed.add(i.name))
    }
  }

  // 2. 残りのうち、正規化後に一方が他方を含むものをグループ化(緩い候補)。
  // "/"を含む複合タグ(例:「建設・建築 / 不動産」)は単純な部分文字列一致だと
  // 無関係な組み合わせまで巻き込んでしまうため対象から除外し、クラスタが大きく
  // なりすぎる/長さの差が大きすぎる組み合わせも無関係の寄せ集めとして除外する。
  const remaining = items.filter(
    (i) => !placed.has(i.name) && !i.name.includes('/') && normalizeIndustryKey(i.name).length >= 2
  )
  const used = new Set<string>()
  const MAX_CLUSTER_SIZE = 6
  const MAX_LENGTH_RATIO = 2.5
  for (let i = 0; i < remaining.length; i++) {
    if (used.has(remaining[i].name)) continue
    const a = normalizeIndustryKey(remaining[i].name)
    const cluster = [remaining[i]]
    for (let j = i + 1; j < remaining.length; j++) {
      if (used.has(remaining[j].name)) continue
      const b = normalizeIndustryKey(remaining[j].name)
      const isSubstring = a.includes(b) || b.includes(a)
      const ratio = Math.max(a.length, b.length) / Math.min(a.length, b.length)
      if (isSubstring && ratio <= MAX_LENGTH_RATIO) cluster.push(remaining[j])
    }
    if (cluster.length > 1 && cluster.length <= MAX_CLUSTER_SIZE) {
      cluster.forEach((c) => used.add(c.name))
      groups.push({ key: a, items: cluster, totalCount: cluster.reduce((s, i) => s + i.count, 0) })
    }
  }

  groups.sort((a, b) => b.totalCount - a.totalCount)
  return groups
}

export default function IndustryManagement() {
  const [items, setItems] = useState<IndustryItem[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [unifyDrafts, setUnifyDrafts] = useState<Record<string, string>>({})

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/industries')
      const data = await res.json()
      if (data.success) {
        setItems(data.industries || [])
        setEdits({})
        setUnifyDrafts({})
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

  const similarGroups = useMemo(() => buildSimilarGroups(items), [items])

  const handleChange = (name: string, value: string) => {
    setEdits((prev) => ({ ...prev, [name]: value }))
  }

  const getUnifyDraft = (group: SimilarGroup) => {
    if (unifyDrafts[group.key] !== undefined) return unifyDrafts[group.key]
    // 件数が最も多いものを既定の統一後名称にする
    return [...group.items].sort((a, b) => b.count - a.count)[0].name
  }

  const applyGroupUnify = (group: SimilarGroup) => {
    const target = getUnifyDraft(group).trim()
    if (!target) return
    setEdits((prev) => {
      const next = { ...prev }
      for (const item of group.items) {
        if (item.name !== target) next[item.name] = target
      }
      return next
    })
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

      {!isLoading && similarGroups.length > 0 && (
        <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50 flex flex-col gap-3">
          <h3 className="font-bold text-orange-800">
            🔍 類似候補({similarGroups.length}グループ) — 表記ゆれの可能性がある業種名をまとめて表示しています
          </h3>
          {similarGroups.map((group) => {
            const draft = getUnifyDraft(group)
            const alreadyQueued = group.items.every(
              (item) => item.name === draft || edits[item.name] === draft
            )
            return (
              <div key={group.key} className="bg-white border border-orange-200 rounded p-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span key={item.name} className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {item.name} <span className="text-gray-400 text-xs">({item.count}件)</span>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">統一後の名称:</span>
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setUnifyDrafts((prev) => ({ ...prev, [group.key]: e.target.value }))}
                    className="flex-1 border border-gray-300 px-2 py-1 rounded text-sm"
                  />
                  <button
                    onClick={() => applyGroupUnify(group)}
                    disabled={alreadyQueued}
                    className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {alreadyQueued ? '✓ 変更予定に追加済み' : 'このグループへ統一'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
