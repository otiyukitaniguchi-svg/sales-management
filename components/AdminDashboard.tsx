'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { FrontendCustomerRecord } from '@/lib/types'

interface AdminDashboardProps {
  onLogout: () => void
}

const LIST_NAMES = {
  list1: '新規リスト',
  list2: 'ハルエネリスト',
  list3: 'モバイルリスト',
} as const

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const listData = useAppStore((state) => state.listData)
  const [selectedList, setSelectedList] = useState<'list1' | 'list2' | 'list3'>('list1')

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

          if (call.progress === '受注') totalOrders++
          else if (call.progress?.includes('見込み')) totalProspects++
          else if (call.progress === 'アポ') totalAppointments++

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
    const avgDailyCallCount = totalCalls > 0 ? (totalCalls / 43).toFixed(1) : 0 // 43日稼働と仮定

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
        if (call.progress === '受注') stats[operator].totalOrders++
        else if (call.progress?.includes('見込み')) {
          if (call.progress === '見込みA') stats[operator].totalProspects++
          else if (call.progress === '見込みB') stats[operator].totalProspects++
          else if (call.progress === '見込みC') stats[operator].totalProspects++
        }
        else if (call.progress === 'アポ') stats[operator].totalAppointments++
      })
    })

    // 各担当者のレートを計算
    Object.keys(stats).forEach((staffName) => {
      const stat = stats[staffName]
      if (stat.totalCalls > 0) {
        stat.appointmentRate = Math.round((stat.totalAppointments / stat.totalCalls) * 100)
        stat.prospectRate = Math.round((stat.totalProspects / stat.totalCalls) * 100)
        stat.orderRate = Math.round((stat.totalOrders / stat.totalCalls) * 100)
      }
    })

    return Object.values(stats).sort((a, b) => b.totalCalls - a.totalCalls)
  }, [listData, selectedList])

  // 進捗別の内訳（ソート済み）
  const progressBreakdown = useMemo(() => {
    const entries = Object.entries(overallStats.progressCounts)
      .map(([progress, count]) => ({
        progress,
        count,
        percentage: overallStats.totalCalls > 0 ? ((count / overallStats.totalCalls) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count)
    return entries
  }, [overallStats])

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">効果報告レポート</h1>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600"
        >
          ログアウト
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* 集計期間 */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">📅 集計期間:</span> 2001/1/21 〜 2026/3/23（9193日間 / 稼働43日）
          </p>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">リスト総件数</div>
            <div className="text-3xl font-bold text-gray-800">{overallStats.totalRecords.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">総架電数</div>
            <div className="text-3xl font-bold text-gray-800">{overallStats.totalCalls.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">架電率</div>
            <div className="text-3xl font-bold text-blue-600">{overallStats.callRate}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">受注件数</div>
            <div className="text-3xl font-bold text-green-600">{overallStats.totalOrders}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">アポ系合計</div>
            <div className="text-3xl font-bold text-gray-800">{overallStats.totalAppointments + overallStats.totalProspects}</div>
          </div>
        </div>

        {/* 第2行のサマリー */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">アポ率</div>
            <div className="text-3xl font-bold text-orange-600">{overallStats.appointmentRate}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">日平均架電数</div>
            <div className="text-3xl font-bold text-gray-800">{overallStats.avgDailyCallCount}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">平均通話時間</div>
            <div className="text-3xl font-bold text-gray-800">{overallStats.avgCallDuration}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-600 text-sm font-semibold mb-2">見込み率</div>
            <div className="text-3xl font-bold text-purple-600">{overallStats.prospectRate}%</div>
          </div>
        </div>

        {/* 進捗別内訳 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">進捗別内訳</h2>
          <div className="space-y-3">
            {progressBreakdown.map((item) => (
              <div key={item.progress} className="flex items-center gap-4">
                <div className="w-32 text-sm font-semibold text-gray-700">{item.progress}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-12 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                      {item.count}件
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{item.percentage}%</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(parseFloat(item.percentage) * 3, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* オペレーター別実績 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">オペレーター別実績</h2>
          <div className="mb-4">
            <label className="block font-semibold text-gray-700 mb-2">リスト選択</label>
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value as 'list1' | 'list2' | 'list3')}
              className="border-2 border-gray-300 px-3 py-2 rounded"
            >
              {Object.entries(LIST_NAMES).map(([listId, listName]) => (
                <option key={listId} value={listId}>
                  {listName}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">オペレーター</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">架電数</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">受注</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">見込A</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">見込B</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">見込C</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">アポ率</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((stat, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{stat.staffName}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{stat.totalCalls}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{stat.totalOrders}</td>
                    <td className="px-4 py-3 text-center text-gray-700">-</td>
                    <td className="px-4 py-3 text-center text-gray-700">-</td>
                    <td className="px-4 py-3 text-center text-gray-700">{stat.prospectRate}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{stat.appointmentRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}分${secs}秒`
}
