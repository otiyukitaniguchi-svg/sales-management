'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import LoginScreen from '@/components/LoginScreen'
import NavigationBar from '@/components/NavigationBar'
import Sidebar from '@/components/Sidebar'

export default function Home() {
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const currentList = useAppStore((state) => state.currentList)
  const setListData = useAppStore((state) => state.setListData)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error('Failed to parse saved user:', e)
        localStorage.removeItem('user')
      }
    }
  }, [setUser])

  // Load initial data when user logs in
  useEffect(() => {
    if (user && currentList) {
      loadListData(currentList)
    }
  }, [user, currentList])

  const loadListData = async (listId: string) => {
    try {
      const result = await ApiClient.getListData(listId)
      if (result.success && result.data) {
        setListData(listId, result.data)
      }
    } catch (error) {
      console.error('Failed to load list data:', error)
    }
  }

  const handleImport = () => {
    setIsImportModalOpen(true)
  }

  const handleSearch = () => {
    setIsSearchModalOpen(true)
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="flex flex-col h-screen">
      <NavigationBar onImport={handleImport} onSearch={handleSearch} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-auto p-4 bg-white">
          <div className="text-center text-gray-500 mt-20">
            <h2 className="text-2xl font-bold mb-4">営業管理システム</h2>
            <p>Supabase + Next.js 版</p>
            <p className="mt-4 text-sm">
              左のサイドバーからリストを選択してください
            </p>
          </div>
        </div>
      </div>

      {/* Import Modal - Placeholder */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">データインポート</h2>
            <p className="mb-4">インポート機能は開発中です</p>
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* Search Modal - Placeholder */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">検索</h2>
            <p className="mb-4">検索機能は開発中です</p>
            <button
              onClick={() => setIsSearchModalOpen(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
