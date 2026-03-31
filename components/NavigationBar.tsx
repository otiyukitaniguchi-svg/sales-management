'use client'


import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'

interface NavigationBarProps {
  onImport: () => void
  onSearch: () => void
}

export default function NavigationBar({ onImport, onSearch }: NavigationBarProps) {
  const user = useAppStore((state) => state.user)
  const currentList = useAppStore((state) => state.currentList)
  const currentListIndex = useAppStore((state) => state.currentListIndex)
  const setCurrentListIndex = useAppStore((state) => state.setCurrentListIndex)
  const listData = useAppStore((state) => state.listData)
  const isSearchMode = useAppStore((state) => state.isSearchMode)
  const searchResults = useAppStore((state) => state.searchResults)
  const searchResultIndex = useAppStore((state) => state.searchResultIndex)
  const setSearchResultIndex = useAppStore((state) => state.setSearchResultIndex)
  const setIsLoading = useAppStore((state) => state.setIsLoading)
  const setListData = useAppStore((state) => state.setListData)
  const [jumpNo, setJumpNo] = useState('')

  const currentData = isSearchMode ? searchResults : listData[currentList]
  const currentIndex = isSearchMode ? searchResultIndex : currentListIndex
  const totalCount = currentData?.length || 0

  const handleJumpToNo = () => {
    if (!jumpNo.trim()) return
    const targetNo = jumpNo.trim()
    const foundIndex = currentData?.findIndex((record: any) => String(record.no) === targetNo)
    if (foundIndex !== undefined && foundIndex >= 0) {
      if (isSearchMode) {
        setSearchResultIndex(foundIndex)
      } else {
        setCurrentListIndex(foundIndex)
      }
      setJumpNo('')
    } else {
      alert(`No. ${targetNo} が見つかりません`)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      if (isSearchMode) {
        setSearchResultIndex(currentIndex - 1)
      } else {
        setCurrentListIndex(currentIndex - 1)
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      if (isSearchMode) {
        setSearchResultIndex(currentIndex + 1)
      } else {
        setCurrentListIndex(currentIndex + 1)
      }
    }
  }

  const handleReload = async () => {
    setIsLoading(true)
    try {
      const result = await ApiClient.getListData(currentList)
      if (result.success && result.data) {
        setListData(currentList, result.data)
        alert('データを再読み込みしました')
      } else {
        alert('エラー: ' + (result.message || '不明なエラー'))
      }
    } catch (error: any) {
      alert('再読み込みエラー: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-300 border-b border-gray-600 px-3 py-2 flex items-center gap-2">
      <button
        onClick={handlePrevious}
        disabled={currentIndex === 0}
        className="w-9 h-9 border border-gray-600 bg-gradient-to-b from-white to-gray-200 cursor-pointer flex items-center justify-center text-lg rounded hover:from-gray-200 hover:to-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ◀
      </button>

      <button
        onClick={handleNext}
        disabled={currentIndex >= totalCount - 1}
        className="w-9 h-9 border border-gray-600 bg-gradient-to-b from-white to-gray-200 cursor-pointer flex items-center justify-center text-lg rounded hover:from-gray-200 hover:to-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶
      </button>

      <div className="px-3 text-lg font-bold">
        {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}
      </div>

      <input
        type="text"
        placeholder="No. を入力"
        value={jumpNo}
        onChange={(e) => setJumpNo(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleJumpToNo()}
        className="px-3 py-2 border border-gray-600 rounded text-lg ml-2 w-24"
      />

      <button
        onClick={handleJumpToNo}
        className="px-4 py-2 border border-gray-600 bg-gradient-to-b from-white to-gray-200 cursor-pointer rounded text-lg font-bold hover:from-gray-200 hover:to-gray-300"
      >
        移動
      </button>



      <div className="ml-auto text-lg">
        ログイン中: <span className="font-bold">{user?.display_name}</span>
      </div>
    </div>
  )
}
