'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiClient } from '@/lib/api-client'
import { VisitResultFeedEntry } from '@/lib/types'

interface CompanyGroup {
  key: string
  listId: string
  listName: string
  no: string
  companyName: string
  entries: VisitResultFeedEntry[]
}

function groupByCompany(entries: VisitResultFeedEntry[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>()
  for (const entry of entries) {
    const key = `${entry.listId}__${entry.no}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        listId: entry.listId,
        listName: entry.listName,
        no: entry.no,
        companyName: entry.companyName,
        entries: [],
      }
      groups.set(key, group)
    }
    group.entries.push(entry)
  }
  // 各グループ内はAPIの時点で新しい順に並んでいるので、グループの並び順は
  // グループ内最新エントリ(先頭)のcreatedAtで新しい順にする
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.entries[0].createdAt).getTime() - new Date(a.entries[0].createdAt).getTime()
  )
}

export default function VisitResultFeed() {
  const [entries, setEntries] = useState<VisitResultFeedEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [noQuery, setNoQuery] = useState('')
  const [companyQuery, setCompanyQuery] = useState('')
  const [operatorQuery, setOperatorQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const fetchFeed = useCallback(async (
    filters?: { no?: string; companyName?: string; operator?: string },
    silent = false
  ) => {
    if (!silent) setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.getVisitResultFeed(filters)
      if (result.success) {
        setEntries(result.data || [])
      } else if (!silent) {
        // ポーリングでの一時的な通信エラーは画面を邪魔しないよう表示しない
        setError(result.message || '取得に失敗しました')
      }
    } catch (e: any) {
      if (!silent) setError(e.message || '取得中にエラーが発生しました')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  // 外勤アプリからの新着報告に素早く気づけるよう、開いている間は自動で再取得する
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeed({ no: noQuery, companyName: companyQuery, operator: operatorQuery }, true)
    }, 20000)
    return () => clearInterval(interval)
  }, [fetchFeed, noQuery, companyQuery, operatorQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFeed({ no: noQuery, companyName: companyQuery, operator: operatorQuery })
  }

  const handleClear = () => {
    setNoQuery('')
    setCompanyQuery('')
    setOperatorQuery('')
    fetchFeed()
  }

  const groups = groupByCompany(entries)

  return (
    <div className="p-6 bg-white h-full overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🎉 受注報告フィード</h2>
        <button
          onClick={() => fetchFeed({ no: noQuery, companyName: companyQuery, operator: operatorQuery })}
          disabled={isLoading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {isLoading ? '更新中...' : '更新'}
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          placeholder="No."
          value={noQuery}
          onChange={(e) => setNoQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-28"
        />
        <input
          type="text"
          placeholder="企業名"
          value={companyQuery}
          onChange={(e) => setCompanyQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 flex-1 min-w-[160px]"
        />
        <input
          type="text"
          placeholder="担当者"
          value={operatorQuery}
          onChange={(e) => setOperatorQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-40"
        />
        <button type="submit" className="px-4 py-2 rounded bg-gray-700 text-white font-bold">検索</button>
        <button type="button" onClick={handleClear} className="px-4 py-2 rounded bg-gray-200 text-gray-700">クリア</button>
      </form>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <div className="text-center py-10">読み込み中...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 text-gray-500">該当する受注報告がありません</div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const isExpanded = expandedKeys.has(group.key)
            return (
              <div key={group.key} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(group.key)}
                      aria-expanded={isExpanded}
                      className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <div className="text-lg font-bold text-gray-900">{group.companyName || '(企業名不明)'}</div>
                    <div className="text-sm text-gray-500">({group.entries.length}件)</div>
                  </div>
                  <div className="text-sm text-gray-500">{group.listName}・No.{group.no}</div>
                </div>
                {isExpanded && (
                  <div className="flex flex-col gap-2">
                    {group.entries.map((entry) => (
                      <div key={entry.id} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                          <span>{entry.source === 'field_mobile' ? '訪問者' : '担当者'}: <span className="font-semibold">{entry.operator || '-'}</span></span>
                          <span>応対者: <span className="font-semibold">{entry.responder || '-'}</span></span>
                          <span>日時: <span className="font-semibold">{entry.date} {entry.startTime}</span></span>
                          {entry.replyDate && <span>返答日: <span className="font-semibold">{entry.replyDate}</span></span>}
                        </div>
                        {entry.note && (
                          <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{entry.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
