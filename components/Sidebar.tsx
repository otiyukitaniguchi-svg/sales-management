'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import AdminDashboard from './AdminDashboard'
import VisitResultFeed from './VisitResultFeed'
import CreateRecordModal from './CreateRecordModal'

export default function Sidebar() {
  const currentList = useAppStore((state) => state.currentList)
  const setCurrentList = useAppStore((state) => state.setCurrentList)
  const listData = useAppStore((state) => state.listData)
  const lists = useAppStore((state) => state.lists)
  const user = useAppStore((state) => state.user)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [showVisitFeed, setShowVisitFeed] = useState(false)
  const [showCreateRecord, setShowCreateRecord] = useState(false)
  // 架電リストは最初は畳んでおき、クリックすると個別のリストが一覧表示される
  const [isListsExpanded, setIsListsExpanded] = useState(false)

  const isAdmin = user?.role === 'admin'

  const setIsReportMode = useAppStore((state) => state.setIsReportMode)
  const isSearchMode = useAppStore((state) => state.isSearchMode)
  const clearSearch = useAppStore((state) => state.clearSearch)
  const setCurrentListIndex = useAppStore((state) => state.setCurrentListIndex)

  const isLoading = useAppStore((state) => state.isLoading)
  const isReportMode = useAppStore((state) => state.isReportMode)
  const handleListClick = (listId: string) => {
    if (isLoading) return
    // 検索モード中は検索を解除してからリスト切替
    if (isSearchMode) {
      clearSearch()
    }
    setCurrentListIndex(0)
    setIsReportMode(false)
    setCurrentList(listId)
  }

  if (showAdminDashboard && isAdmin) {
    return <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
  }

  if (showVisitFeed) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-white h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">訪問結果共有</h2>
          <button
            onClick={() => setShowVisitFeed(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
          >
            ← 戻る
          </button>
        </div>
        <VisitResultFeed />
      </div>
    )
  }

  return (
    <div className="w-[160px] bg-[#d0d0d0] border-r border-gray-600 overflow-y-auto flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div
          onClick={() => setIsListsExpanded((v) => !v)}
          className="px-3 py-2.5 cursor-pointer border-b border-gray-600 bg-[#c0c0c0] hover:bg-[#b5b5b5] flex items-center justify-between"
        >
          <span className="text-sm font-bold leading-snug break-words">📋 架電リスト</span>
          <span className="text-xs">{isListsExpanded ? '▲' : '▼'}</span>
        </div>
        {isListsExpanded &&
          lists.map((list) => {
            const isActive = currentList === list.slug
            const count = listData[list.slug]?.length || 0

            return (
              <div
                key={list.slug}
                onClick={() => handleListClick(list.slug)}
                className={`
                  px-3 py-2.5 pl-5 cursor-pointer border-b border-gray-600
                  ${isActive ? 'bg-white font-bold' : 'bg-[#e0e0e0] hover:bg-gray-300'}
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="text-sm leading-snug break-words">{list.name}</div>
                <div className="text-xs text-gray-600 mt-1">{count}件</div>
              </div>
            )
          })}
      </div>
      <button
        onClick={() => !isLoading && setShowCreateRecord(true)}
        disabled={isLoading}
        className="px-2 py-2.5 text-sm font-bold border-t border-gray-600 bg-yellow-300 hover:bg-yellow-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed leading-snug break-words"
      >
        📝 新規レコード
      </button>
      <button
        onClick={() => !isLoading && setShowVisitFeed(true)}
        disabled={isLoading}
        className="px-2 py-2.5 text-sm font-bold border-t border-gray-600 bg-green-300 hover:bg-green-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed leading-snug break-words"
      >
        📢 訪問結果
      </button>
      {showCreateRecord && <CreateRecordModal onClose={() => setShowCreateRecord(false)} />}
      {isAdmin && (
        <button
          onClick={() => !isLoading && setShowAdminDashboard(true)}
          disabled={isLoading}
          className="px-2 py-2.5 text-sm font-bold border-t border-gray-600 bg-blue-300 hover:bg-blue-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed leading-snug break-words"
        >
          管理者
        </button>
      )}
    </div>
  )
}
