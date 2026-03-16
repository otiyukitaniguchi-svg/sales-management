'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import LoginScreen from '@/components/LoginScreen'
import NavigationBar from '@/components/NavigationBar'
import Sidebar from '@/components/Sidebar'
import CustomerDetail from '@/components/CustomerDetail'

export default function Home() {
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const currentList = useAppStore((state) => state.currentList)
  const listData = useAppStore((state) => state.listData)
  const setListData = useAppStore((state) => state.setListData)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)

  // ブラウザキャッシュを自動クリアする機能
  useEffect(() => {
    const clearBrowserCache = async () => {
      try {
        // Service Worker キャッシュをクリア
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        }

        // IndexedDB をクリア
        if ('indexedDB' in window) {
          const dbs = await indexedDB.databases()
          dbs.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name)
            }
          })
        }
      } catch (error) {
        console.error('Failed to clear browser cache:', error)
      }
    }

    // ページロード時にキャッシュをクリア
    clearBrowserCache()
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) }
      catch (e) { localStorage.removeItem('user') }
    }
  }, [setUser])

  useEffect(() => {
    if (user && currentList) { loadListData(currentList) }
  }, [user, currentList])

  const loadListData = async (listId: string) => {
    try {
      const result = await ApiClient.getListData(listId)
      if (result.success && result.data) {
        // No.順でソート（昇順）
        const sortedData = [...result.data].sort((a, b) => {
          const noA = parseInt(a.no || '0', 10)
          const noB = parseInt(b.no || '0', 10)
          return noA - noB
        })
        setListData(listId, sortedData)
      }
    } catch (error) { console.error('Failed to load list data:', error) }
  }

  if (!user) return <LoginScreen />

  const hasData = listData[currentList]?.length > 0

  return (
    <div className="flex flex-col h-screen">
      <NavigationBar onImport={() => setIsImportModalOpen(true)} onSearch={() => setIsSearchModalOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto bg-white">
          {hasData ? (
            <CustomerDetail />
          ) : (
            <div className="text-center text-gray-500 mt-20">
              <h2 className="text-2xl font-bold mb-4">AnyPro</h2>
              <p>Supabase + Next.js 版</p>
              <p className="mt-4 text-lg">左のサイドバーからリストを選択してください</p>
            </div>
          )}
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">データインポート</h2>
            <p className="mb-4">インポート機能は開発中です</p>
            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 bg-gray-500 text-white rounded">閉じる</button>
          </div>
        </div>
      )}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">検索</h2>
            <p className="mb-4">検索機能は開発中です</p>
            <button onClick={() => setIsSearchModalOpen(false)} className="px-4 py-2 bg-gray-500 text-white rounded">閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
