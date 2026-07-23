'use client'

import { useState } from 'react'
import { ApiClient } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'

type Field = 'address' | 'fixed_no' | 'company_name'
type PhoneField = 'fixed_no' | 'other_contact'

interface Change {
  id: string
  // 電話番号セクションのみ、変更対象が固定番号かその他連絡先かを個別に持つ
  field?: PhoneField
  listSlug: string
  no: string
  companyName: string
  oldValue: string
  newValue: string
}

const PHONE_FIELD_LABEL: Record<PhoneField, string> = {
  fixed_no: '固定番号',
  other_contact: 'その他連絡先',
}

const SECTIONS: Array<{ field: Field; icon: string; title: string; label: string }> = [
  { field: 'address', icon: '📍', title: '住所', label: '住所' },
  { field: 'fixed_no', icon: '📞', title: '電話番号', label: '電話番号' },
  { field: 'company_name', icon: '🏢', title: '企業名', label: '企業名' },
]

function ChangeTable({
  changes,
  selected,
  onToggle,
  onToggleAll,
  listName,
  showFieldColumn,
}: {
  changes: Change[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  listName: (slug: string) => string
  showFieldColumn?: boolean
}) {
  return (
    <table className="w-full border-collapse border border-gray-300 text-sm">
      <thead>
        <tr className="bg-gray-200">
          <th className="border border-gray-300 px-2 py-1 w-10">
            <input
              type="checkbox"
              checked={changes.length > 0 && selected.size === changes.length}
              onChange={onToggleAll}
            />
          </th>
          <th className="border border-gray-300 px-2 py-1 text-left">リスト/No</th>
          <th className="border border-gray-300 px-2 py-1 text-left">企業名</th>
          {showFieldColumn && <th className="border border-gray-300 px-2 py-1 text-left">項目</th>}
          <th className="border border-gray-300 px-2 py-1 text-left">変更前</th>
          <th className="border border-gray-300 px-2 py-1 text-left">変更後</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={`${c.id}-${c.field || ''}`} className="bg-white">
            <td className="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox" checked={selected.has(changeKey(c))} onChange={() => onToggle(changeKey(c))} />
            </td>
            <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">
              {listName(c.listSlug)} / {c.no}
            </td>
            <td className="border border-gray-300 px-2 py-1">{c.companyName || '-'}</td>
            {showFieldColumn && (
              <td className="border border-gray-300 px-2 py-1 whitespace-nowrap text-gray-600">
                {c.field ? PHONE_FIELD_LABEL[c.field] : '-'}
              </td>
            )}
            <td className="border border-gray-300 px-2 py-1 text-gray-500">{c.oldValue}</td>
            <td className="border border-gray-300 px-2 py-1 text-green-700 font-bold">{c.newValue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// 電話番号セクションは同じレコードがfixed_no/other_contactの両方で変更対象になり得るため、
// id単独ではなくid+fieldでキーを作る(idだけだと2件が同じ選択状態として衝突してしまう)
function changeKey(c: Change): string {
  return c.field ? `${c.id}:${c.field}` : c.id
}

export default function DataCleanup() {
  const lists = useAppStore((state) => state.lists)
  const listName = (slug: string) => lists.find((l) => l.slug === slug)?.name || slug

  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [changesByField, setChangesByField] = useState<Record<Field, Change[]>>({
    address: [],
    fixed_no: [],
    company_name: [],
  })
  const [selectedByField, setSelectedByField] = useState<Record<Field, Set<string>>>({
    address: new Set(),
    fixed_no: new Set(),
    company_name: new Set(),
  })
  const [applyingField, setApplyingField] = useState<Field | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.previewDataCleanup()
      if (result.success) {
        setScannedCount(result.scannedCount || 0)
        const nextChanges: Record<Field, Change[]> = {
          address: result.addressChanges || [],
          fixed_no: result.phoneChanges || [],
          company_name: result.companyNameChanges || [],
        }
        setChangesByField(nextChanges)
        setSelectedByField({
          address: new Set(nextChanges.address.map(changeKey)),
          fixed_no: new Set(nextChanges.fixed_no.map(changeKey)),
          company_name: new Set(nextChanges.company_name.map(changeKey)),
        })
        setHasLoaded(true)
      } else {
        setError(result.message || '検出に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '検出中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const toggle = (field: Field, key: string) => {
    setSelectedByField((prev) => {
      const next = new Set(prev[field])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...prev, [field]: next }
    })
  }

  const toggleAll = (field: Field) => {
    setSelectedByField((prev) => {
      const changes = changesByField[field]
      const isAllSelected = prev[field].size === changes.length
      return { ...prev, [field]: isAllSelected ? new Set() : new Set(changes.map(changeKey)) }
    })
  }

  const apply = async (field: Field, label: string) => {
    const selected = selectedByField[field]
    if (selected.size === 0) return
    if (!confirm(`選択した${selected.size}件の${label}を変更します。よろしいですか？`)) return

    setApplyingField(field)
    setError('')
    try {
      const items = changesByField[field]
        .filter((c) => selected.has(changeKey(c)))
        .map((c) => ({ id: c.id, field: c.field || field }))
      const result = await ApiClient.applyDataCleanup(items)
      if (result.success) {
        setMessage(`✓ ${label}を${result.updatedCount ?? 0}件更新しました${result.failedCount ? `(失敗${result.failedCount}件)` : ''}`)
        setTimeout(() => setMessage(''), 5000)
        setChangesByField((prev) => ({ ...prev, [field]: prev[field].filter((c) => !selected.has(changeKey(c))) }))
        setSelectedByField((prev) => ({ ...prev, [field]: new Set() }))
      } else {
        setError(result.message || '反映に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '反映中にエラーが発生しました')
    } finally {
      setApplyingField(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-sm">
        全レコードを走査し、企業名(空白の削除・全角英数記号の半角化)・住所(空白の削除・全角英数記号の半角化・
        丁目/番地/号の表記統一)・電話番号(固定番号とその他連絡先の両方が対象。先頭0の補完・ハイフン付与)の
        修正候補を検出します。自動では反映されません。内容を確認し、チェックを外したい行があれば外してから
        「反映」ボタンを押してください。
      </div>

      <div>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '検出中...' : hasLoaded ? '再検出' : '修正候補を検出する'}
        </button>
        {hasLoaded && <span className="ml-3 text-sm text-gray-600">{scannedCount}件のレコードを走査しました</span>}
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {hasLoaded &&
        SECTIONS.map(({ field, icon, title, label }) => {
          const changes = changesByField[field]
          const selected = selectedByField[field]
          return (
            <div key={field}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">
                  {icon} {title}の修正候補({changes.length}件)
                </h3>
                {changes.length > 0 && (
                  <button
                    onClick={() => apply(field, label)}
                    disabled={applyingField === field || selected.size === 0}
                    className="px-4 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50"
                  >
                    {applyingField === field ? '反映中...' : `選択した${selected.size}件を反映`}
                  </button>
                )}
              </div>
              {changes.length === 0 ? (
                <p className="text-gray-500 text-sm">修正候補はありません</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <ChangeTable
                    changes={changes}
                    selected={selected}
                    onToggle={(key) => toggle(field, key)}
                    onToggleAll={() => toggleAll(field)}
                    listName={listName}
                    showFieldColumn={field === 'fixed_no'}
                  />
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
