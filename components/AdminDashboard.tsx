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
  const [viewMode, setViewMode] = useState<'list' | 'staff'>('list')

  // リスト別の集計
  const listStats = useMemo(() => {
    const stats: Record<string, {
      listName: string
      totalRecords: number
      totalCalls: number
      totalAppointments: number
      totalProspects: number
      totalOrders: number
      callRate: number
      appointmentRate: number
      prospectRate: number
      orderRate: number
    }> = {}

    Object.entries(LIST_NAMES).forEach(([listId, listName]) => {
      const records = listData[listId as keyof typeof listData] || []
      let totalCalls = 0
      let totalAppointments = 0
      let totalProspects = 0
      let totalOrders = 0

      records.forEach((record: FrontendCustomerRecord) => {
        const callHistory = record.callHistory || []
        totalCalls += callHistory.length

        callHistory.forEach((call: any) => {
          if (call.progress === '受注') totalOrders++
          else if (call.progress?.includes('見込み')) totalProspects++
          else if (call.progress === 'アポ') totalAppointments++
        })
      })

      const totalRecords = records.length
      stats[listId] = {
        listName,
        totalRecords,
        totalCalls,
        totalAppointments,
        totalProspects,
        totalOrders,
        callRate: totalRecords > 0 ? Math.round((totalCalls / totalRecords) * 100) / 100 : 0,
        appointmentRate: totalCalls > 0 ? Math.round((totalAppointments / totalCalls) * 100) : 0,
        prospectRate: totalCalls > 0 ? Math.round((totalProspects / totalCalls) * 100) : 0,
        orderRate: totalCalls > 0 ? Math.round((totalOrders / totalCalls) * 100) : 0,
      }
    })

    return stats
  }, [listData])

  // 担当者別の集計
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
        else if (call.progress?.includes('見込み')) stats[operator].totalProspects++
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

    return stats
  }, [listData, selectedList])

  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600 bg-yellow-100">
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600"
        >
          ログアウト
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* タブ */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 font-bold rounded ${
              viewMode === 'list'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            リスト別集計
          </button>
          <button
            onClick={() => setViewMode('staff')}
            className={`px-4 py-2 font-bold rounded ${
              viewMode === 'staff'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            担当者別集計
          </button>
        </div>

        {/* リスト別集計 */}
        {viewMode === 'list' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">リスト別効果報告</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-400">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-400 px-4 py-2 text-left">リスト名</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">顧客数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">架電数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">アポ数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">見込み数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">受注数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">架電率</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">アポ率</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">見込み率</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">受注率</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(listStats).map(([listId, stat]) => (
                    <tr key={listId} className="hover:bg-gray-100">
                      <td className="border border-gray-400 px-4 py-2 font-semibold">{stat.listName}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalRecords}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalCalls}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalAppointments}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalProspects}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center font-bold text-green-600">{stat.totalOrders}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.callRate.toFixed(2)}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.appointmentRate}%</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.prospectRate}%</td>
                      <td className="border border-gray-400 px-4 py-2 text-center font-bold text-green-600">{stat.orderRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 担当者別集計 */}
        {viewMode === 'staff' && (
          <div>
            <h2 className="text-2xl font-bold mb-4">担当者別集計</h2>
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
              <table className="w-full border-collapse border border-gray-400">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border border-gray-400 px-4 py-2 text-left">担当者</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">架電数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">アポ数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">見込み数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">受注数</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">アポ率</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">見込み率</th>
                    <th className="border border-gray-400 px-4 py-2 text-center">受注率</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(staffStats).map(([staffName, stat]) => (
                    <tr key={staffName} className="hover:bg-gray-100">
                      <td className="border border-gray-400 px-4 py-2 font-semibold">{stat.staffName}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalCalls}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalAppointments}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.totalProspects}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center font-bold text-green-600">{stat.totalOrders}</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.appointmentRate}%</td>
                      <td className="border border-gray-400 px-4 py-2 text-center">{stat.prospectRate}%</td>
                      <td className="border border-gray-400 px-4 py-2 text-center font-bold text-green-600">{stat.orderRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
