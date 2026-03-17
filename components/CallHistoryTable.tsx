'use client'

import { useEffect, useState } from 'react'
import { CallHistoryImportExport } from './CallHistoryImportExport'

interface CallHistoryRecord {
  id: string
  timestamp: string
  no: string
  list_type: string
  company_name: string
  phone: string
  address: string
  operator_name: string
  date: string
  start_time: string
  end_time: string
  responder: string
  gender: string
  progress: string
  note: string
  operator: string
  created_at: string
  updated_at: string
}

interface CallHistoryTableProps {
  listType: string
  customerNo: string
}

export function CallHistoryTable({ listType, customerNo }: CallHistoryTableProps) {
  const [records, setRecords] = useState<CallHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // 架電履歴を取得
  const loadCallHistory = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/call-history?list_type=${encodeURIComponent(listType)}&no=${encodeURIComponent(customerNo)}`
      )

      if (!response.ok) {
        throw new Error('データ取得失敗')
      }

      const data = await response.json()
      setRecords(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCallHistory()
  }, [listType, customerNo])

  if (isLoading) {
    return <div className="text-center py-4">読み込み中...</div>
  }

  return (
    <div className="space-y-4">
      {/* インポート・エクスポート機能 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">架電履歴</h3>
        <CallHistoryImportExport listType={listType} onImportComplete={loadCallHistory} />
      </div>

      {/* エラーメッセージ */}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* テーブル */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* ヘッダー（固定） */}
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-left border-b">担当者</th>
                <th className="px-2 py-2 text-left border-b">対応日</th>
                <th className="px-2 py-2 text-left border-b">開始</th>
                <th className="px-2 py-2 text-left border-b">終了</th>
                <th className="px-2 py-2 text-left border-b">対応者</th>
                <th className="px-2 py-2 text-left border-b">性別</th>
                <th className="px-2 py-2 text-left border-b">進捗</th>
                <th className="px-2 py-2 text-left border-b">メモ</th>
                <th className="px-2 py-2 text-left border-b">操作</th>
              </tr>
            </thead>

            {/* ボディ（スクロール対応） */}
            <tbody className="max-h-96 overflow-y-auto block">
              {records.length === 0 ? (
                <tr className="w-full">
                  <td colSpan={9} className="px-2 py-4 text-center text-gray-500">
                    履歴がありません
                  </td>
                </tr>
              ) : (
                records.slice(0, 5).map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">{record.operator_name}</td>
                    <td className="px-2 py-2">{record.date}</td>
                    <td className="px-2 py-2">{record.start_time}</td>
                    <td className="px-2 py-2">{record.end_time}</td>
                    <td className="px-2 py-2">{record.responder}</td>
                    <td className="px-2 py-2">{record.gender}</td>
                    <td className="px-2 py-2">{record.progress}</td>
                    <td className="px-2 py-2 truncate max-w-xs">{record.note}</td>
                    <td className="px-2 py-2">
                      <button className="text-blue-600 hover:underline text-xs">編集</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="text-sm text-gray-600">
        {records.length > 0 && `全 ${records.length} 件中 最新 5 件を表示`}
      </div>
    </div>
  )
}
