'use client'

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'

interface DuplicateGroup {
  companyName: string
  suggestedPrimaryId: string
  records: Array<Record<string, any>>
  mergedPreview: Record<string, any>
  totalCallHistoryCount: number
}

const PREVIEW_FIELDS: Array<[string, string]> = [
  ['company_name', '企業名'],
  ['fixed_no', '固定電話'],
  ['other_contact', 'その他連絡先'],
  ['address', '住所'],
  ['rep_name', '代表者'],
  ['staff_name', '担当者'],
  ['email', 'メール'],
]

export default function DuplicateMerge() {
  const lists = useAppStore((state) => state.lists)
  const listName = (slug: string) => lists.find((l) => l.slug === slug)?.name || slug
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mergingKey, setMergingKey] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.getDuplicates()
      if (result.success && result.data) {
        setGroups(result.data)
      } else {
        setError(result.message || '検出に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '検出中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleMerge = async (group: DuplicateGroup) => {
    const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== group.suggestedPrimaryId)
    if (!confirm(`「${group.companyName}」の${group.records.length}件を1件に統合します。よろしいですか？`)) return

    setMergingKey(group.companyName)
    setError('')
    const result: any = await ApiClient.mergeDuplicates(group.suggestedPrimaryId, duplicateIds)
    setMergingKey(null)
    if (result.success) {
      const historyNote = result.reassignedHistoryCount > 0
        ? `(架電履歴${result.reassignedHistoryCount}件も引き継ぎました)`
        : ''
      setMessage(`✓ 「${group.companyName}」を統合しました${historyNote}`)
      setTimeout(() => setMessage(''), 4000)
      setGroups((prev) => prev.filter((g) => g.companyName !== group.companyName))
    } else {
      setError(result.message || '統合に失敗しました')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">同一の企業名で複数レコードが存在するものを検出しています(自動では統合されません)</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
        >
          再検出
        </button>
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <p className="text-gray-500">検出中...</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">重複候補は見つかりませんでした</p>
      ) : (
        groups.map((group) => (
          <div key={group.companyName} className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">
                {group.companyName}({group.records.length}件)
                {group.totalCallHistoryCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    架電履歴 計{group.totalCallHistoryCount}件も統合されます
                  </span>
                )}
              </h3>
              <button
                onClick={() => handleMerge(group)}
                disabled={mergingKey === group.companyName}
                className="px-4 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {mergingKey === group.companyName ? '統合中...' : 'この内容で統合を実行'}
              </button>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-sm mb-3">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-2 py-1 text-left">リスト/No</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">架電履歴</th>
                  {PREVIEW_FIELDS.map(([, label]) => (
                    <th key={label} className="border border-gray-300 px-2 py-1 text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.records.map((r) => (
                  <tr key={r.id} className={r.id === group.suggestedPrimaryId ? 'bg-yellow-100' : 'bg-white'}>
                    <td className="border border-gray-300 px-2 py-1">
                      {listName(r.list_slug)} / {r.no}
                      {r.id === group.suggestedPrimaryId && <span className="ml-1 text-xs text-orange-600 font-bold">(主レコード)</span>}
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-gray-700">{r.callHistoryCount}件</td>
                    {PREVIEW_FIELDS.map(([field]) => (
                      <td key={field} className="border border-gray-300 px-2 py-1 text-gray-700">
                        {r[field] || <span className="text-gray-300">(空欄)</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-green-50 font-bold">
                  <td className="border border-gray-300 px-2 py-1">統合後</td>
                  <td className="border border-gray-300 px-2 py-1 text-green-700">{group.totalCallHistoryCount}件</td>
                  {PREVIEW_FIELDS.map(([field]) => (
                    <td key={field} className="border border-gray-300 px-2 py-1 text-green-700">
                      {group.mergedPreview[field] || <span className="text-gray-300">(空欄)</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
