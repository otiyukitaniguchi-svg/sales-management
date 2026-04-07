'use client'

import { useState, useEffect } from 'react'

interface ReportData {
  operator: string
  period: string
  total: number
  success: number
  pending: number
  failure: number
}

export default function ReportView() {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily')
  const [data, setData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/reports?type=${reportType}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportType])

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

      {isLoading ? (
        <div className="text-center py-10">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期間</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当者</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">総架電数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成約/前向き</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">不在/再コール</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">その他</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成約率</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.operator}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">{row.success}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{row.pending}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.failure}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                      {row.total > 0 ? ((row.success / row.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">データがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
