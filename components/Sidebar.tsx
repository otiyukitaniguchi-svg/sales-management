'use client'


import { useState } from 'react'
import { useAppStore } from '@/lib/store'

const LIST_NAMES = {
  list1: '新規リスト',
  list2: 'ハルエネリスト',
  list3: 'モバイルリスト',
} as const

export default function Sidebar() {
  const currentList = useAppStore((state) => state.currentList)
  const setCurrentList = useAppStore((state) => state.setCurrentList)
  const listData = useAppStore((state) => state.listData)
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

  const handleListClick = (listId: 'list1' | 'list2' | 'list3') => {
    setCurrentList(listId)
  }

  return (
    <div className="w-[160px] bg-[#d0d0d0] border-r border-gray-600 overflow-y-auto flex flex-col">
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
            `}
          >
            <div className="whitespace-nowrap">{listName}</div>
            <div className="text-sm text-gray-600 mt-1">{count}件</div>
          </div>
        )
      })}
      
      {/* 管理者メニュー */}
      <div className="mt-auto border-t border-gray-600">
        <button
          onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
          className="w-full px-4 py-3 text-lg font-bold text-gray-700 bg-[#c0c0c0] border-b border-gray-600 hover:bg-[#b0b0b0] cursor-pointer"
        >
          管理者 {isAdminMenuOpen ? '▼' : '▶'}
        </button>
        {isAdminMenuOpen && (
          <>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-400 border-b border-gray-600 bg-[#e0e0e0]">インポート</button>
            <button className="w-full px-4 py-2 text-sm text-left hover:bg-gray-400 bg-[#e0e0e0]">エクスポート</button>
          </>
        )}
      </div>
    </div>
  )
}
