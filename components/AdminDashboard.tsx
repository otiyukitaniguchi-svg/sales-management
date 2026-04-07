'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { FrontendCustomerRecord } from '@/lib/types'
import ReportView from './ReportView'

interface AdminDashboardProps {
  onLogout: () => void
}

const LIST_NAMES = {
  list1: '新規リスト',
  list2: 'ハルエネリスト',
  list3: 'モバイルリスト',
} as const

type AdminMode = 'menu' | 'report' | 'import'

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const listData = useAppStore((state) => state.listData)
  const setListData = useAppStore((state) => state.setListData)
  const [adminMode, setAdminMode] = useState<AdminMode>('menu')
  const [selectedList, setSelectedList] = useState<'list1' | 'list2' | 'list3'>('list1')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState('')

  // 全体集計
  const overallStats = useMemo(() => {
    let totalRecords = 0
    let totalCalls = 0
    let totalAppointments = 0
    let totalProspects = 0
    let totalOrders = 0
    let totalCallDuration = 0
    const progressCounts: Record<string, number> = {}

    Object.values(listData).forEach((records) => {
      records.forEach((record: FrontendCustomerRecord) => {
        totalRecords++
        const callHistory = record.callHistory || []
        totalCalls += callHistory.length

        callHistory.forEach((call: any) => {
          const progress = call.progress || '(未設定)'
          progressCounts[progress] = (progressCounts[progress] || 0) + 1

          if (call.progress === '受注' || call.progress === '前回受注') totalOrders++
          else if (call.progress?.includes('見込み')) totalProspects++
          else if (call.progress === '前回採択') totalAppointments++

          // 通話時間を秒単位で計算（簡易版）
          if (call.startTime && call.endTime) {
            const start = new Date(`2000-01-01T${call.startTime}`)
            const end = new Date(`2000-01-01T${call.endTime}`)
            totalCallDuration += (end.getTime() - start.getTime()) / 1000
          }
        })
      })
    })

    const callRate = totalRecords > 0 ? (totalCalls / totalRecords) * 100 : 0
    const appointmentRate = totalCalls > 0 ? (totalAppointments / totalCalls) * 100 : 0
    const prospectRate = totalCalls > 0 ? (totalProspects / totalCalls) * 100 : 0
    const orderRate = totalCalls > 0 ? (totalOrders / totalCalls) * 100 : 0
    const avgCallDuration = totalCalls > 0 ? totalCallDuration / totalCalls : 0
    const avgDailyCallCount = totalCalls > 0 ? (totalCalls / 43).toFixed(1) : 0

    return {
      totalRecords,
      totalCalls,
      totalAppointments,
      totalProspects,
      totalOrders,
      callRate: callRate.toFixed(1),
      appointmentRate: appointmentRate.toFixed(1),
      prospectRate: prospectRate.toFixed(1),
      orderRate: orderRate.toFixed(1),
      avgCallDuration: formatDuration(avgCallDuration),
      avgDailyCallCount,
      progressCounts,
    }
  }, [listData])

  // 選択リストの担当者別集計
  const staffStats = useMemo(() => {
    const stats: Record<string, {
      staffName: string
      totalCalls: number
      totalAppointments: number
      totalProspects: number
      totalOrders: number
      appointmentRate: number
      prospectRate: number
      orderRate: number
    }> = {}

    const records = listData[selectedList] || []
    records.forEach((record: FrontendCustomerRecord) => {
      const callHistory = record.callHistory || []
      callHistory.forEach((call: any) => {
        const operator = call.operator || '未定義'
        if (!stats[operator]) {
          stats[operator] = {
            staffName: operator,
            totalCalls: 0,
            totalAppointments: 0,
            totalProspects: 0,
            totalOrders: 0,
            appointmentRate: 0,
            prospectRate: 0,
            orderRate: 0,
          }
        }
        stats[operator].totalCalls++
        if (call.progress === '受注' || call.progress === '前回受注') stats[operator].totalOrders++
        else if (call.progress?.includes('見込み')) stats[operator].totalProspects++
        else if (call.progress === '前回採択') stats[operator].totalAppointments++
      })
    })

    Object.values(stats).forEach((stat) => {
      stat.appointmentRate = stat.totalCalls > 0 ? (stat.totalAppointments / stat.totalCalls) * 100 : 0
      stat.prospectRate = stat.totalCalls > 0 ? (stat.totalProspects / stat.totalCalls) * 100 : 0
      stat.orderRate = stat.totalCalls > 0 ? (stat.totalOrders / stat.totalCalls) * 100 : 0
    })

    return Object.values(stats)
  }, [listData, selectedList])

  const handleImportFile = async (file: File) => {
    setImportProgress('ファイルを読み込み中...')
    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())
      let importedCount = 0

      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length < 3) continue

        const [no, date, time, endTime, operator, responder, gender, progress, note] = parts
        if (!no || !date) continue

        const listKey = selectedList
        const records = listData[listKey] || []
        const recordIndex = records.findIndex((r: any) => String(r.no) === no.trim())

        if (recordIndex >= 0) {
          const record = records[recordIndex]
          const callHistory = record.callHistory || []
          callHistory.push({
            operator: operator?.trim() || '',
            date: date.trim(),
            startTime: time?.trim() || '',
            endTime: endTime?.trim() || '',
            responder: responder?.trim() || '',
            gender: gender?.trim() || '',
            progress: progress?.trim() || '',
            note: note?.trim() || '',
          })
          record.callHistory = callHistory
          importedCount++
        }
      }

      setImportProgress(`✓ ${importedCount}件のレコードをインポートしました`)
      setTimeout(() => setImportProgress(''), 3000)
    } catch (error) {
      setImportProgress(`✗ インポートエラー: ${error}`)
    }
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) return `${hours}時間${minutes}分`
    if (minutes > 0) return `${minutes}分${secs}秒`
    return `${secs}秒`
  }

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
              onClick={() => setAdminMode('import')}
              className="px-6 py-4 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 transition"
            >
              📥 架電履歴インポート
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-8 px-6 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition"
          >
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  // インポート画面
  if (adminMode === 'import') {
    return (
      <div className="flex flex-col gap-4 p-4 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">架電履歴インポート</h2>
          <button
            onClick={() => setAdminMode('menu')}
            className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
          >
            ← メニューに戻る
          </button>
        </div>

        <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50">
          <div className="text-center">
            <p className="text-lg font-bold mb-4">インポート対象リスト:</p>
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded text-lg mb-6"
            >
              <option value="list1">新規リスト</option>
              <option value="list2">ハルエネリスト</option>
              <option value="list3">モバイルリスト</option>
            </select>

            <div className="mt-6">
              <label className="block text-lg font-bold mb-4">
                TSV形式のファイルを選択してください
              </label>
              <input
                type="file"
                accept=".tsv,.txt,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setImportFile(file)
                    handleImportFile(file)
                  }
                }}
                className="block mx-auto px-4 py-2 border border-gray-300 rounded cursor-pointer"
              />
            </div>

            {importProgress && (
              <div className={`mt-6 p-4 rounded text-lg font-bold ${
                importProgress.includes('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {importProgress}
              </div>
            )}

            <div className="mt-8 p-4 bg-white rounded border border-gray-300 text-left">
              <p className="font-bold mb-2">ファイル形式:</p>
              <p className="text-sm text-gray-700">
                タブ区切り（TSV）形式で以下の順序で記入してください:<br/>
                No. | 対応日 | 開始時間 | 終了時間 | オペレーター | 対応者 | 性別 | 進捗 | コール履歴
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-8 px-6 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition"
        >
          ログアウト
        </button>
      </div>
    )
  }

  // レポート画面（新しいReportViewを表示）
  if (adminMode === 'report') {
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

  // デフォルトのダッシュボード（サマリー表示など）
  return (
    <div className="flex flex-col gap-4 p-4 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">管理者ダッシュボード</h2>
        <button
          onClick={() => setAdminMode('menu')}
          className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600"
        >
          ← メニューに戻る
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">リスト総件数</p>
          <p className="text-3xl font-bold text-blue-600">{overallStats.totalRecords}</p>
        </div>
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">総架電数</p>
          <p className="text-3xl font-bold text-green-600">{overallStats.totalCalls}</p>
        </div>
        <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">架電率</p>
          <p className="text-3xl font-bold text-purple-600">{overallStats.callRate}%</p>
        </div>
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">受注件数</p>
          <p className="text-3xl font-bold text-red-600">{overallStats.totalOrders}</p>
        </div>
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">アポ系合計</p>
          <p className="text-3xl font-bold text-orange-600">{overallStats.totalAppointments + overallStats.totalProspects}</p>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-indigo-50 border border-indigo-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">アポ率</p>
          <p className="text-2xl font-bold text-indigo-600">{overallStats.appointmentRate}%</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">日平均架電数</p>
          <p className="text-2xl font-bold text-cyan-600">{overallStats.avgDailyCallCount}</p>
        </div>
        <div className="bg-teal-50 border border-teal-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">平均通話時間</p>
          <p className="text-2xl font-bold text-teal-600">{overallStats.avgCallDuration}</p>
        </div>
        <div className="bg-pink-50 border border-pink-300 rounded-lg p-4">
          <p className="text-sm text-gray-600">見込み率</p>
          <p className="text-2xl font-bold text-pink-600">{overallStats.prospectRate}%</p>
        </div>
      </div>

      {/* 進捗別内訳 */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-4">進捗別内訳</h3>
        <div className="space-y-2">
          {Object.entries(overallStats.progressCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([progress, count]) => {
              const percentage = overallStats.totalCalls > 0 ? (count / overallStats.totalCalls) * 100 : 0
              return (
                <div key={progress} className="flex items-center gap-2">
                  <div className="w-32 text-sm font-bold">{progress}</div>
                  <div className="flex-1 bg-gray-200 rounded h-6 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full flex items-center justify-end pr-2 text-white text-xs font-bold"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    >
                      {percentage > 5 && `${percentage.toFixed(1)}%`}
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-bold">{count}件</div>
                </div>
              )
            })}
        </div>
      </div>

      {/* オペレーター別実績 */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">オペレーター別実績</h3>
          <select
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="list1">新規リスト</option>
            <option value="list2">ハルエネリスト</option>
            <option value="list3">モバイルリスト</option>
          </select>
        </div>
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-300">
              <th className="border border-gray-300 px-3 py-2 text-left">オペレーター</th>
              <th className="border border-gray-300 px-3 py-2 text-center">架電数</th>
              <th className="border border-gray-300 px-3 py-2 text-center">受注</th>
              <th className="border border-gray-300 px-3 py-2 text-center">見込A</th>
              <th className="border border-gray-300 px-3 py-2 text-center">見込B</th>
              <th className="border border-gray-300 px-3 py-2 text-center">見込C</th>
              <th className="border border-gray-300 px-3 py-2 text-center">アポ率</th>
            </tr>
          </thead>
          <tbody>
            {staffStats.map((staff, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2">{staff.staffName}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{staff.totalCalls}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{staff.totalOrders}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{staff.totalProspects}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{staff.appointmentRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={onLogout}
        className="mt-8 px-6 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition"
      >
        ログアウト
      </button>
    </div>
  )
}
