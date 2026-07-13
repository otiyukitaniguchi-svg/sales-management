'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import AdminDashboard from './AdminDashboard'

const LIST_NAMES = {
  list1: '新規リスト',
  list2: 'ハルエネリスト',
  list3: 'モバイルリスト',
} as const

export default function Sidebar() {
  const currentList = useAppStore((state) => state.currentList)
  const setCurrentList = useAppStore((state) => state.setCurrentList)
  const listData = useAppStore((state) => state.listData)
  const user = useAppStore((state) => state.user)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)

  const isAdmin = user?.role === 'admin'

  const setIsReportMode = useAppStore((state) => state.setIsReportMode)
  const isSearchMode = useAppStore((state) => state.isSearchMode)
  const setSearchMode = useAppStore((state) => state.setSearchMode)
  const setSearchResults = useAppStore((state) => state.setSearchResults)
  const setSearchResultIndex = useAppStore((state) => state.setSearchResultIndex)
  const setCurrentListIndex = useAppStore((state) => state.setCurrentListIndex)

  const isLoading = useAppStore((state) => state.isLoading)
  const handleListClick = (listId: 'list1' | 'list2' | 'list3') => {
    if (isLoading) return
    // 検索モード中は検索を解除してからリスト切替
    if (isSearchMode) {
      setSearchMode(false)
      setSearchResults([])
      setSearchResultIndex(0)
    }
    setCurrentListIndex(0)
    setIsReportMode(false)
    setCurrentList(listId)
  }

  if (showAdminDashboard && isAdmin) {
    return <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
  }

  const isReportMode = useAppStore((state) => state.isReportMode)

  return (
    <div className="w-[160px] bg-[#d0d0d0] border-r border-gray-600 overflow-y-auto flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {Object.entries(LIST_NAMES).map(([listId, listName]) => {
          const isActive = currentList === listId
          const count = listData[listId as keyof typeof listData]?.length || 0

          return (
            <div
              key={listId}
              onClick={() => handleListClick(listId as 'list1' | 'list2' | 'list3')}
              className={`
                px-4 py-3 text-lg cursor-pointer border-b border-gray-600 whitespace-nowrap
                ${isActive ? 'bg-white font-bold' : 'bg-[#e0e0e0] hover:bg-gray-300'}
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="whitespace-nowrap">{listName}</div>
              <div className="text-sm text-gray-600 mt-1">{count}件</div>
            </div>
          )
        })}
      </div>
      {isAdmin && (
        <button
          onClick={() => !isLoading && setShowAdminDashboard(true)}
          disabled={isLoading}
          className="px-4 py-3 text-lg font-bold border-t border-gray-600 bg-blue-300 hover:bg-blue-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          管理者
        </button>
      )}
    </div>
  )
}
