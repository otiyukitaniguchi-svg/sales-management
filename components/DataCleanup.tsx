'use client'

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'

interface Change {
  id: string
  listSlug: string
  no: string
  companyName: string
  oldValue: string
  newValue: string
}

function ChangeTable({
  changes,
  selected,
  onToggle,
  onToggleAll,
  listName,
}: {
  changes: Change[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  listName: (slug: string) => string
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
          <th className="border border-gray-300 px-2 py-1 text-left">変更前</th>
          <th className="border border-gray-300 px-2 py-1 text-left">変更後</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={c.id} className="bg-white">
            <td className="border border-gray-300 px-2 py-1 text-center">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => onToggle(c.id)} />
            </td>
            <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">
              {listName(c.listSlug)} / {c.no}
            </td>
            <td className="border border-gray-300 px-2 py-1">{c.companyName || '-'}</td>
            <td className="border border-gray-300 px-2 py-1 text-gray-500">{c.oldValue}</td>
            <td className="border border-gray-300 px-2 py-1 text-green-700 font-bold">{c.newValue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DataCleanup() {
  const lists = useAppStore((state) => state.lists)
  const listName = (slug: string) => lists.find((l) => l.slug === slug)?.name || slug

  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [addressChanges, setAddressChanges] = useState<Change[]>([])
  const [phoneChanges, setPhoneChanges] = useState<Change[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Set<string>>(new Set())
  const [selectedPhone, setSelectedPhone] = useState<Set<string>>(new Set())
  const [isApplyingAddress, setIsApplyingAddress] = useState(false)
  const [isApplyingPhone, setIsApplyingPhone] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.previewDataCleanup()
      if (result.success) {
        setScannedCount(result.scannedCount || 0)
        setAddressChanges(result.addressChanges || [])
        setPhoneChanges(result.phoneChanges || [])
        setSelectedAddress(new Set((result.addressChanges || []).map((c: Change) => c.id)))
        setSelectedPhone(new Set((result.phoneChanges || []).map((c: Change) => c.id)))
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

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFn(next)
  }

  const toggleAll = (changes: Change[], set: Set<string>, setFn: (s: Set<string>) => void) => {
    setFn(set.size === changes.length ? new Set() : new Set(changes.map((c) => c.id)))
  }

  const applyAddress = async () => {
    if (selectedAddress.size === 0) return
    if (!confirm(`選択した${selectedAddress.size}件の住所を変更します。よろしいですか？`)) return
    setIsApplyingAddress(true)
    setError('')
    try {
      const items = Array.from(selectedAddress).map((id) => ({ id, field: 'address' as const }))
      const result = await ApiClient.applyDataCleanup(items)
      if (result.success) {
        setMessage(`✓ 住所を${result.updatedCount ?? 0}件更新しました${result.failedCount ? `(失敗${result.failedCount}件)` : ''}`)
        setTimeout(() => setMessage(''), 5000)
        setAddressChanges((prev) => prev.filter((c) => !selectedAddress.has(c.id)))
        setSelectedAddress(new Set())
      } else {
        setError(result.message || '反映に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '反映中にエラーが発生しました')
    } finally {
      setIsApplyingAddress(false)
    }
  }

  const applyPhone = async () => {
    if (selectedPhone.size === 0) return
    if (!confirm(`選択した${selectedPhone.size}件の電話番号を変更します。よろしいですか？`)) return
    setIsApplyingPhone(true)
    setError('')
    try {
      const items = Array.from(selectedPhone).map((id) => ({ id, field: 'fixed_no' as const }))
      const result = await ApiClient.applyDataCleanup(items)
      if (result.success) {
        setMessage(`✓ 電話番号を${result.updatedCount ?? 0}件更新しました${result.failedCount ? `(失敗${result.failedCount}件)` : ''}`)
        setTimeout(() => setMessage(''), 5000)
        setPhoneChanges((prev) => prev.filter((c) => !selectedPhone.has(c.id)))
        setSelectedPhone(new Set())
      } else {
        setError(result.message || '反映に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '反映中にエラーが発生しました')
    } finally {
      setIsApplyingPhone(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-sm">
        全レコードを走査し、住所(丁目・番地・号の表記統一)と固定番号(先頭0の補完・ハイフン付与)の
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

      {hasLoaded && (
        <>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">📍 住所の修正候補({addressChanges.length}件)</h3>
              {addressChanges.length > 0 && (
                <button
                  onClick={applyAddress}
                  disabled={isApplyingAddress || selectedAddress.size === 0}
                  className="px-4 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {isApplyingAddress ? '反映中...' : `選択した${selectedAddress.size}件を反映`}
                </button>
              )}
            </div>
            {addressChanges.length === 0 ? (
              <p className="text-gray-500 text-sm">修正候補はありません</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <ChangeTable
                  changes={addressChanges}
                  selected={selectedAddress}
                  onToggle={(id) => toggle(selectedAddress, setSelectedAddress, id)}
                  onToggleAll={() => toggleAll(addressChanges, selectedAddress, setSelectedAddress)}
                  listName={listName}
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">📞 電話番号の修正候補({phoneChanges.length}件)</h3>
              {phoneChanges.length > 0 && (
                <button
                  onClick={applyPhone}
                  disabled={isApplyingPhone || selectedPhone.size === 0}
                  className="px-4 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {isApplyingPhone ? '反映中...' : `選択した${selectedPhone.size}件を反映`}
                </button>
              )}
            </div>
            {phoneChanges.length === 0 ? (
              <p className="text-gray-500 text-sm">修正候補はありません</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <ChangeTable
                  changes={phoneChanges}
                  selected={selectedPhone}
                  onToggle={(id) => toggle(selectedPhone, setSelectedPhone, id)}
                  onToggleAll={() => toggleAll(phoneChanges, selectedPhone, setSelectedPhone)}
                  listName={listName}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
