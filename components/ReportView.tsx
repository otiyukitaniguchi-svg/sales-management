'use client'

import { useState, useEffect } from 'react'

interface PeriodRow {
  period: string
  operator: string
  calls: number
  orders: number
  orderRate: number
}

export default function ReportView() {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily')
  const [daily, setDaily] = useState<PeriodRow[]>([])
  const [monthly, setMonthly] = useState<PeriodRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/reports')
        const result = await response.json()
        if (result.success) {
          setDaily(result.daily || [])
          setMonthly(result.monthly || [])
        } else {
          setError(result.message || 'レポートの取得に失敗しました')
        }
      } catch (e: any) {
        setError(e.message || 'レポートの取得中にエラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    }
    fetchReport()
  }, [])

  const rows = reportType === 'daily' ? daily : monthly

  return (
    <div className="p-6 bg-white h-full overflow-auto">
      <div className="flex justify-end items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded ${reportType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            日次
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded ${reportType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            月次
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <div className="text-center py-10">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {reportType === 'daily' ? '日付' : '年月'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">架電数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">受注数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">受注率</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length > 0 ? (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.operator}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.calls}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{row.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                      {row.orderRate.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">データがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
