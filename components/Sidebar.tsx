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
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminError, setAdminError] = useState('')

  const ADMIN_PASSWORD = 'admin123' // 本来はSupabaseの環境変数から取得すべき

  const setIsReportMode = useAppStore((state) => state.setIsReportMode)

  const handleListClick = (listId: 'list1' | 'list2' | 'list3') => {
    setIsReportMode(false)
    setCurrentList(listId)
  }

  const handleAdminLogin = () => {
    // パスワードの前後空白を削除して比較
    if (adminPassword.trim() === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true)
      setIsAdminModalOpen(false)
      setAdminPassword('')
      setAdminError('')
    } else {
      setAdminError('パスワードが正しくありません')
      setAdminPassword('')
    }
  }

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false)
    setAdminPassword('')
    setAdminError('')
  }

  if (isAdminAuthenticated) {
    return <AdminDashboard onLogout={handleAdminLogout} />
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
              `}
            >
              <div className="whitespace-nowrap">{listName}</div>
              <div className="text-sm text-gray-600 mt-1">{count}件</div>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => setIsAdminModalOpen(true)}
        className="px-4 py-3 text-lg font-bold border-t border-gray-600 bg-blue-300 hover:bg-blue-400 cursor-pointer"
      >
        管理者
      </button>

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-6">管理者ログイン</h2>
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">パスワード</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="パスワードを入力"
              />
            </div>
            {adminError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {adminError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAdminModalOpen(false)
                  setAdminPassword('')
                  setAdminError('')
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdminLogin}
                className="px-4 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600"
              >
                ログイン
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
