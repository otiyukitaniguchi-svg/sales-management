'use client'

import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { ApiClient } from '@/lib/api-client'
import { ListDefinition, FrontendCustomerRecord } from '@/lib/types'

export default function ListManagement() {
  const [lists, setLists] = useState<ListDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [newListName, setNewListName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [importTargetId, setImportTargetId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState('')

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [recordMgmtId, setRecordMgmtId] = useState<string | null>(null)
  const [recordQuery, setRecordQuery] = useState('')
  const [recordResults, setRecordResults] = useState<any[]>([])
  const [recordSearching, setRecordSearching] = useState(false)
  const [recordError, setRecordError] = useState('')

  const loadLists = async () => {
    setIsLoading(true)
    try {
      const result = await ApiClient.listLists()
      if (result.success && result.data) {
        setLists(result.data)
      } else {
        setError(result.message || 'リストの取得に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  const handleCreate = async () => {
    if (!newListName.trim()) {
      setError('リスト名を入力してください')
      return
    }
    setError('')
    const result = await ApiClient.createList(newListName.trim())
    if (result.success && result.data) {
      setMessage(`✓ 「${result.data.name}」を作成しました。続けてCSV/TSVをインポートできます`)
      setTimeout(() => setMessage(''), 5000)
      setNewListName('')
      setIsCreating(false)
      setImportTargetId(result.data.id)
      await loadLists()
    } else {
      setError(result.message || '作成に失敗しました')
    }
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    const result = await ApiClient.renameList(id, renameValue.trim())
    if (result.success) {
      setRenamingId(null)
      loadLists()
    } else {
      setError(result.message || '名称変更に失敗しました')
    }
  }

  const handleDelete = async (list: ListDefinition) => {
    const precheck = await ApiClient.deleteList(list.id, false)
    const count = precheck.customerCount ?? 0
    if (!confirm(`「${list.name}」を削除します。${count}件のデータが削除されます。よろしいですか？`)) return
    const result = await ApiClient.deleteList(list.id, true)
    if (result.success) {
      setMessage('✓ リストを削除しました')
      setTimeout(() => setMessage(''), 3000)
      loadLists()
    } else {
      setError(result.message || '削除に失敗しました')
    }
  }

  const toggleRecordMgmt = (list: ListDefinition) => {
    setRecordMgmtId((current) => (current === list.id ? null : list.id))
    setRecordQuery('')
    setRecordResults([])
    setRecordError('')
  }

  const handleRecordSearch = async (list: ListDefinition) => {
    setRecordSearching(true)
    setRecordError('')
    try {
      const result = await ApiClient.searchListRecords(list.slug, recordQuery.trim())
      if (result.success) {
        setRecordResults(result.records || [])
        if ((result.records || []).length === 0) {
          setRecordError('該当するレコードが見つかりません')
        }
      } else {
        setRecordResults([])
        setRecordError(result.message || '検索に失敗しました')
      }
    } catch (e: any) {
      setRecordResults([])
      setRecordError(e.message || '検索中にエラーが発生しました')
    } finally {
      setRecordSearching(false)
    }
  }

  const handleDeleteRecord = async (list: ListDefinition, record: any) => {
    if (
      !confirm(
        `No.${record.no}「${record.companyName || '(企業名未入力)'}」を削除します。紐づく架電履歴も含めて完全に削除され、元に戻せません。よろしいですか？`
      )
    ) {
      return
    }
    try {
      const result = await ApiClient.deleteRecord(list.slug, record.no)
      if (result.success) {
        setRecordResults((prev) => prev.filter((r) => r.no !== record.no))
        setMessage(`✓ No.${record.no} を削除しました(架電履歴${result.deletedHistoryCount ?? 0}件を含む)`)
        setTimeout(() => setMessage(''), 4000)
      } else {
        setRecordError(result.message || '削除に失敗しました')
      }
    } catch (e: any) {
      setRecordError(e.message || '削除中にエラーが発生しました')
    }
  }

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= lists.length) return

    const reordered = [...lists]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]

    const previous = lists
    setLists(reordered) // 楽観的に即反映し、失敗したら元に戻す

    const result = await ApiClient.reorderLists(reordered.map((l) => l.id))
    if (!result.success) {
      setLists(previous)
      setError(result.message || '並び替えに失敗しました')
    }
  }

  const handleImportFile = async (listId: string, file: File) => {
    setImportProgress('ファイルを読み込み中...')
    setError('')
    try {
      const text = await file.text()
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: file.name.endsWith('.tsv') ? '\t' : undefined,
      })

      const records: FrontendCustomerRecord[] = (parsed.data || [])
        // 企業名・住所など何かしら値がある行だけを対象にする(完全な空行を除外)。
        // Noが空欄の行はサーバー側で全リスト共通の連番を自動採番する
        .filter((row) => Object.values(row).some((v) => (v || '').trim()))
        .map((row) => ({
          no: row.no,
          companyKana: row.companyKana,
          companyName: row.companyName,
          fixedNo: row.fixedNo,
          otherContact: row.otherContact,
          zipCode: row.zipCode,
          addressKana: row.addressKana,
          address: row.address,
          repKana: row.repKana,
          repName: row.repName,
          staffKana: row.staffKana,
          staffName: row.staffName,
          email: row.email,
          industry: row.industry,
          memo: row.memo,
          sales: row.sales,
          software: row.software,
          decision: row.decision,
          subsidy: row.subsidy,
          accountant: row.accountant,
          established: row.established,
          recallDate: row.recallDate,
          recallTime: row.recallTime,
        }))

      if (records.length === 0) {
        setImportProgress('✗ インポート可能なデータが見つかりませんでした')
        return
      }

      // Vercelのサーバーレス関数はリクエストボディが4.5MBを超えると
      // アプリのコードに届く前にプラットフォーム側で413エラー(非JSON)を返してしまう。
      // 大きなCSVでも安全に送れるよう、JSON化したサイズを見ながら複数リクエストに分割する。
      const MAX_BATCH_BYTES = 3_000_000 // 4.5MB上限に対して余裕を持たせる
      const batches: FrontendCustomerRecord[][] = []
      let currentBatch: FrontendCustomerRecord[] = []
      let currentBytes = 0
      for (const record of records) {
        const recordBytes = JSON.stringify(record).length
        if (currentBatch.length > 0 && currentBytes + recordBytes > MAX_BATCH_BYTES) {
          batches.push(currentBatch)
          currentBatch = []
          currentBytes = 0
        }
        currentBatch.push(record)
        currentBytes += recordBytes
      }
      if (currentBatch.length > 0) batches.push(currentBatch)

      let insertedCount = 0
      let autoNumberedCount = 0
      for (let i = 0; i < batches.length; i++) {
        if (batches.length > 1) {
          setImportProgress(`インポート中... (${i + 1}/${batches.length}件のバッチ)`)
        }
        const result: any = await ApiClient.importData(listId, batches[i], 'append')
        if (!result.success) {
          setImportProgress(`✗ ${result.message || 'インポートに失敗しました'}（${insertedCount}件まで登録済み）`)
          loadLists()
          return
        }
        insertedCount += result.insertedCount ?? batches[i].length
        autoNumberedCount += result.autoNumberedCount ?? 0
      }

      const autoNote = autoNumberedCount > 0 ? `(うちNo自動採番${autoNumberedCount}件)` : ''
      setImportProgress(`✓ ${insertedCount}件をインポートしました${autoNote}`)
      loadLists()
    } catch (e: any) {
      setImportProgress(`✗ エラー: ${e.message || '不明なエラー'}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          onClick={() => {
            setIsCreating((v) => !v)
            setError('')
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
        >
          {isCreating ? 'キャンセル' : '+ 新規リスト作成'}
        </button>
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isCreating && (
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-bold mb-1">リスト名</label>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              placeholder="例: 〇〇県リスト"
            />
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600"
          >
            作成
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-200">
              <th className="border border-gray-300 px-3 py-2 text-center w-20">並び替え</th>
              <th className="border border-gray-300 px-3 py-2 text-left">リスト名</th>
              <th className="border border-gray-300 px-3 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list, index) => (
              <tr key={list.id} className="bg-white">
                <td className="border border-gray-300 px-3 py-2">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      title="上へ移動"
                      className="px-2 py-1 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMove(index, 1)}
                      disabled={index === lists.length - 1}
                      title="下へ移動"
                      className="px-2 py-1 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  {renamingId === list.id ? (
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-full border border-gray-300 px-2 py-1 rounded"
                    />
                  ) : (
                    list.name
                  )}
                </td>
                <td className="border border-gray-300 px-3 py-2">
                  <div className="flex flex-col gap-2 items-center">
                    <div className="flex gap-2">
                      {renamingId === list.id ? (
                        <>
                          <button
                            onClick={() => handleRename(list.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm font-bold hover:bg-green-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="px-3 py-1 bg-gray-400 text-white rounded text-sm font-bold hover:bg-gray-500"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setRenamingId(list.id)
                              setRenameValue(list.name)
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600"
                          >
                            名称変更
                          </button>
                          <button
                            onClick={() => setImportTargetId(importTargetId === list.id ? null : list.id)}
                            className="px-3 py-1 bg-purple-500 text-white rounded text-sm font-bold hover:bg-purple-600"
                          >
                            インポート
                          </button>
                          <button
                            onClick={() => toggleRecordMgmt(list)}
                            className="px-3 py-1 bg-orange-500 text-white rounded text-sm font-bold hover:bg-orange-600"
                          >
                            🗑 レコード削除
                          </button>
                          <button
                            onClick={() => handleDelete(list)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                    {recordMgmtId === list.id && (
                      <div className="border-t border-gray-200 pt-2 w-full">
                        <div className="flex gap-2 items-center justify-center">
                          <input
                            type="text"
                            value={recordQuery}
                            onChange={(e) => setRecordQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRecordSearch(list)
                            }}
                            placeholder="Noまたは企業名で検索"
                            className="border border-gray-300 px-2 py-1 rounded text-sm w-56"
                          />
                          <button
                            onClick={() => handleRecordSearch(list)}
                            disabled={recordSearching}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
                          >
                            {recordSearching ? '検索中...' : '検索'}
                          </button>
                        </div>
                        {recordError && <p className="text-xs text-red-600 mt-1">{recordError}</p>}
                        {recordResults.length > 0 && (
                          <table className="w-full border-collapse border border-gray-200 mt-2 text-sm">
                            <thead>
                              <tr className="bg-orange-100">
                                <th className="border border-gray-200 px-2 py-1">No</th>
                                <th className="border border-gray-200 px-2 py-1">企業名</th>
                                <th className="border border-gray-200 px-2 py-1">住所</th>
                                <th className="border border-gray-200 px-2 py-1">担当者</th>
                                <th className="border border-gray-200 px-2 py-1">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recordResults.map((r) => (
                                <tr key={r.no} className="bg-white">
                                  <td className="border border-gray-200 px-2 py-1">{r.no}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-left">{r.companyName || '-'}</td>
                                  <td className="border border-gray-200 px-2 py-1 text-left">{r.address || '-'}</td>
                                  <td className="border border-gray-200 px-2 py-1">{r.staffName || r.repName || '-'}</td>
                                  <td className="border border-gray-200 px-2 py-1">
                                    <button
                                      onClick={() => handleDeleteRecord(list, r)}
                                      className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
                                    >
                                      削除
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                    {importTargetId === list.id && (
                      <div className="border-t border-gray-200 pt-2 w-full text-center">
                        <input
                          type="file"
                          accept=".csv,.tsv,.txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImportFile(list.slug, file)
                          }}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          先頭行にno,companyName,fixedNo,address等の英字列名が必要です(noを空欄にすると自動採番されます)
                        </p>
                        {importProgress && <p className="text-sm font-bold mt-1">{importProgress}</p>}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
