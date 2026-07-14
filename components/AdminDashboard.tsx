'use client'

import { useState } from 'react'
import ReportView from './ReportView'
import AccountManagement from './AccountManagement'

interface AdminDashboardProps {
  onClose: () => void
}

type AdminMode = 'menu' | 'report' | 'accounts'

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [adminMode, setAdminMode] = useState<AdminMode>('menu')

  // メニュー画面
  if (adminMode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">管理者メニュー</h1>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setAdminMode('report')}
              className="px-6 py-4 bg-blue-500 text-white rounded-lg font-bold text-lg hover:bg-blue-600 transition"
            >
              📊 効果報告レポート
            </button>
            <button
              onClick={() => setAdminMode('accounts')}
              className="px-6 py-4 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 transition"
            >
              👤 アカウント管理
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 px-6 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition"
          >
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  // アカウント管理画面
  if (adminMode === 'accounts') {
    return (
      <div className="flex flex-col gap-4 p-4 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">アカウント管理</h2>
          <button
            onClick={() => setAdminMode('menu')}
            className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
          >
            ← メニューに戻る
          </button>
        </div>
        <AccountManagement />
      </div>
    )
  }

  // レポート画面
  return (
    <div className="flex flex-col gap-4 p-4 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">効果報告レポート</h2>
        <button
          onClick={() => setAdminMode('menu')}
          className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
        >
          ← メニューに戻る
        </button>
      </div>
      <ReportView />
    </div>
  )
}
