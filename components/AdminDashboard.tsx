'use client'

import { useState } from 'react'
import ReportView from './ReportView'
import AccountManagement from './AccountManagement'
import ListManagement from './ListManagement'
import DuplicateMerge from './DuplicateMerge'
import CompanyLookup from './CompanyLookup'
import IndustryManagement from './IndustryManagement'
import DataCleanup from './DataCleanup'

interface AdminDashboardProps {
  onClose: () => void
}

type AdminMode = 'menu' | 'report' | 'accounts' | 'lists' | 'duplicates' | 'company-lookup' | 'industries' | 'cleanup'

const SCREENS: Record<Exclude<AdminMode, 'menu'>, { title: string; render: () => JSX.Element }> = {
  report: { title: '効果報告レポート', render: () => <ReportView /> },
  accounts: { title: 'アカウント管理', render: () => <AccountManagement /> },
  lists: { title: 'リスト管理(新規作成・インポート)', render: () => <ListManagement /> },
  duplicates: { title: '重複データ統合', render: () => <DuplicateMerge /> },
  'company-lookup': { title: '企業情報自動更新', render: () => <CompanyLookup /> },
  industries: { title: '業種名一覧', render: () => <IndustryManagement /> },
  cleanup: { title: 'データ一括修正(住所・電話番号)', render: () => <DataCleanup /> },
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [adminMode, setAdminMode] = useState<AdminMode>('menu')

  // メニュー画面
  if (adminMode === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center h-full overflow-y-auto bg-gradient-to-b from-blue-50 to-blue-100 p-4">
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
            <button
              onClick={() => setAdminMode('lists')}
              className="px-6 py-4 bg-purple-500 text-white rounded-lg font-bold text-lg hover:bg-purple-600 transition"
            >
              📋 リスト管理(新規作成・インポート)
            </button>
            <button
              onClick={() => setAdminMode('duplicates')}
              className="px-6 py-4 bg-orange-500 text-white rounded-lg font-bold text-lg hover:bg-orange-600 transition"
            >
              🔍 重複データ統合
            </button>
            <button
              onClick={() => setAdminMode('company-lookup')}
              className="px-6 py-4 bg-teal-500 text-white rounded-lg font-bold text-lg hover:bg-teal-600 transition"
            >
              🏢 企業情報自動更新
            </button>
            <button
              onClick={() => setAdminMode('industries')}
              className="px-6 py-4 bg-pink-500 text-white rounded-lg font-bold text-lg hover:bg-pink-600 transition"
            >
              🏭 業種名一覧
            </button>
            <button
              onClick={() => setAdminMode('cleanup')}
              className="px-6 py-4 bg-yellow-500 text-white rounded-lg font-bold text-lg hover:bg-yellow-600 transition"
            >
              🧹 データ一括修正(住所・電話番号)
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

  const screen = SCREENS[adminMode]

  return (
    <div className="flex flex-col gap-4 p-4 bg-white h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{screen.title}</h2>
        <button
          onClick={() => setAdminMode('menu')}
          className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
        >
          ← メニューに戻る
        </button>
      </div>
      {screen.render()}
    </div>
  )
}
