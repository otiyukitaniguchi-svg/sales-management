'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'

interface Candidate {
  houjinBangou: string
  name: string
  kana?: string
  zipCode?: string
  address?: string
}

export default function CompanyLookup() {
  const lists = useAppStore((state) => state.lists)

  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [notConfigured, setNotConfigured] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [selected, setSelected] = useState<Candidate | null>(null)
  const [targetListId, setTargetListId] = useState('')
  const [targetNo, setTargetNo] = useState('')
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editZip, setEditZip] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setIsSearching(true)
    setError('')
    setNotConfigured(false)
    setCandidates([])
    try {
      const result = await ApiClient.searchCompany(query.trim())
      if (result.success && result.data) {
        setCandidates(result.data)
      } else if ((result as any).message?.includes('HOUJIN_BANGOU_APP_ID')) {
        setNotConfigured(true)
      } else {
        setError(result.message || '検索に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '検索中にエラーが発生しました')
    } finally {
      setIsSearching(false)
    }
  }

  const selectCandidate = (c: Candidate) => {
    setSelected(c)
    setEditName(c.name)
    setEditAddress(c.address || '')
    setEditZip(c.zipCode || '')
  }

  const handleApply = async () => {
    if (!targetListId || !targetNo.trim()) {
      setError('適用先のリストとNo.を指定してください')
      return
    }
    setError('')
    const result = await ApiClient.applyCompanyInfo(targetListId, targetNo.trim(), {
      companyName: editName,
      address: editAddress,
      zipCode: editZip,
    })
    if (result.success) {
      setMessage(`✓ ${targetListId} / No.${targetNo} を更新しました`)
      setTimeout(() => setMessage(''), 4000)
      setSelected(null)
      setTargetNo('')
    } else {
      setError(result.message || '更新に失敗しました')
    }
  }

  if (notConfigured) {
    return (
      <div className="p-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
        <h3 className="font-bold text-lg mb-2">この機能はまだ使えません</h3>
        <p className="text-gray-700">
          国税庁「法人番号システムWeb-API」のアプリケーションIDが登録・設定されていません。
          https://www.houjin-bangou.nta.go.jp/webapi/ から無料でアプリケーションIDを取得し、
          Vercelの環境変数 <code className="bg-gray-200 px-1 rounded">HOUJIN_BANGOU_APP_ID</code> に設定すると使えるようになります。
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-600">
        国税庁の法人番号データベースから企業名で検索し、住所・正式名称を既存の顧客レコードに反映します(自動では更新されません)。
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="企業名を入力"
          className="flex-1 border border-gray-300 px-3 py-2 rounded"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 disabled:opacity-50"
        >
          {isSearching ? '検索中...' : '検索'}
        </button>
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {candidates.length > 0 && (
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-1 text-left">法人番号</th>
              <th className="border border-gray-300 px-2 py-1 text-left">名称</th>
              <th className="border border-gray-300 px-2 py-1 text-left">所在地</th>
              <th className="border border-gray-300 px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.houjinBangou} className="bg-white">
                <td className="border border-gray-300 px-2 py-1">{c.houjinBangou}</td>
                <td className="border border-gray-300 px-2 py-1">{c.name}</td>
                <td className="border border-gray-300 px-2 py-1">{c.zipCode} {c.address}</td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  <button
                    onClick={() => selectCandidate(c)}
                    className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-bold hover:bg-purple-600"
                  >
                    この企業を使う
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50 flex flex-col gap-3">
          <h3 className="font-bold">適用内容の確認・編集</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">正式名称</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">郵便番号</label>
              <input value={editZip} onChange={(e) => setEditZip(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">住所</label>
              <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">適用先リスト</label>
              <select value={targetListId} onChange={(e) => setTargetListId(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded">
                <option value="">選択してください</option>
                {lists.map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">適用先No.</label>
              <input value={targetNo} onChange={(e) => setTargetNo(e.target.value)} placeholder="例: 123" className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleApply} className="px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600">
              この内容で更新を実行
            </button>
            <button onClick={() => setSelected(null)} className="px-4 py-2 bg-gray-400 text-white rounded font-bold hover:bg-gray-500">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
