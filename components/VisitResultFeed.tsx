'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiClient } from '@/lib/api-client'
import { VisitResultFeedEntry } from '@/lib/types'

export default function VisitResultFeed() {
  const [entries, setEntries] = useState<VisitResultFeedEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchFeed = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.getVisitResultFeed()
      if (result.success) {
        setEntries(result.data || [])
      } else {
        setError(result.message || '取得に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  return (
    <div className="p-6 bg-white h-full overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">🎉 受注報告フィード</h2>
        <button
          onClick={fetchFeed}
          disabled={isLoading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {isLoading ? '更新中...' : '更新'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <div className="text-center py-10">読み込み中...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-gray-500">まだ受注報告がありません</div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="text-lg font-bold text-gray-900">{entry.companyName || '(企業名不明)'}</div>
                <div className="text-sm text-gray-500">{entry.listName}・No.{entry.no}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                <span>担当者: <span className="font-semibold">{entry.operator || '-'}</span></span>
                <span>応対者: <span className="font-semibold">{entry.responder || '-'}</span></span>
                <span>日時: <span className="font-semibold">{entry.date} {entry.startTime}</span></span>
              </div>
              {entry.note && (
                <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{entry.note}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
