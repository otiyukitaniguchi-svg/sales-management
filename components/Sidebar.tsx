'use client'

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

  const handleListClick = (listId: 'list1' | 'list2' | 'list3') => {
    setCurrentList(listId)
  }

  return (
    <div className="w-[120px] bg-[#d0d0d0] border-r border-gray-600 overflow-y-auto flex flex-col">
      {Object.entries(LIST_NAMES).map(([listId, listName]) => {
        const isActive = currentList === listId
        const count = listData[listId as keyof typeof listData]?.length || 0

        return (
          <div
            key={listId}
            onClick={() => handleListClick(listId as 'list1' | 'list2' | 'list3')}
            className={`
              px-4 py-3 text-base cursor-pointer border-b border-gray-600
              ${isActive ? 'bg-white font-bold' : 'bg-[#e0e0e0] hover:bg-gray-300'}
            `}
          >
            <div>{listName}</div>
            <div className="text-xs text-gray-600 mt-1">{count}件</div>
          </div>
        )
      })}
    </div>
  )
}
