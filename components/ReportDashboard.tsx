'use client'
import { useState, useEffect, useCallback } from 'react'

const PROGRESS_COLORS: Record<string, string> = {
  '受注': 'bg-green-500 text-white',
  '見込みA': 'bg-blue-500 text-white',
  '見込みB': 'bg-blue-300 text-white',
  '見込みC': 'bg-blue-200 text-gray-800',
  '不在': 'bg-yellow-300 text-gray-800',
  '再コール': 'bg-orange-400 text-white',
  '留守': 'bg-gray-300 text-gray-800',
  '拒否': 'bg-red-400 text-white',
  '時期尚早': 'bg-purple-300 text-white',
  '': 'bg-gray-100 text-gray-600',
}

const PROGRESS_LABEL: Record<string, string> = {
  '受注': '受注',
  '見込みA': '見込みA',
  '見込みB': '見込みB',
  '見込みC': '見込みC',
  '不在': '不在',
  '再コール': '再コール',
  '留守': '留守',
  '拒否': '拒否',
  '時期尚早': '時期尚早',
  '': '未入力',
}

interface ReportData {
  totalRecords: number
  months: string[]
  operators: string[]
  monthlyStats: Record<string, { total: number; byProgress: Record<string, number>; byList: Record<string, number> }>
  operatorStats: Record<string, { total: number; byProgress: Record<string, number>; byMonth: Record<string, number>; byList: Record<string, number> }>
  crossStats: Record<string, Record<string, number>>
  progressStats: Record<string, number>
  listStats: Record<string, { total: number; byProgress: Record<string, number> }>
}

interface ReportDashboardProps {
  onClose: () => void
}

export default function ReportDashboard({ onClose }: ReportDashboardProps) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>('') // 空 = 全期間
  const [activeTab, setActiveTab] = useState<'monthly' | 'operator' | 'cross' | 'progress' | 'list'>('monthly')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const url = selectedMonth
        ? `/api/report?yearMonth=${selectedMonth}`
        : '/api/report'
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setData(json)
      } else {
        setError(json.message || 'データ取得に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  const getProgressKeys = (stats: Record<string, number>) => {
    const keys = Object.keys(stats).filter(k => stats[k] > 0)
    const order = ['受注', '見込みA', '見込みB', '見込みC', '不在', '再コール', '留守', '拒否', '時期尚早', '']
    return keys.sort((a, b) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg">
          <h2 className="text-2xl font-bold text-white">効果報告</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-white text-sm font-semibold">月選択：</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded border border-blue-300 text-sm bg-white"
              >
                <option value="">全期間</option>
                {data?.months.map(ym => (
                  <option key={ym} value={ym}>{formatMonth(ym)}</option>
                ))}
              </select>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-300 bg-gray-50">
          {[
            { key: 'monthly', label: '月別集計' },
            { key: 'operator', label: '担当者別集計' },
            { key: 'cross', label: '月×担当者' },
            { key: 'progress', label: '進捗別集計' },
            { key: 'list', label: 'リスト別集計' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-blue-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-lg">読み込み中...</div>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {data && !loading && (
            <>
              {/* 合計件数バナー */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-700">{data.totalRecords.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">総架電件数</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-3">
                  {getProgressKeys(data.progressStats).map(prog => (
                    <div key={prog} className={`px-3 py-1 rounded text-sm font-semibold ${PROGRESS_COLORS[prog] || 'bg-gray-200'}`}>
                      {PROGRESS_LABEL[prog] || prog}: {data.progressStats[prog]}件
                    </div>
                  ))}
                </div>
              </div>

              {/* 月別集計 */}
              {activeTab === 'monthly' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">月別架電集計</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold">月</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">合計</th>
                          {getProgressKeys(data.progressStats).map(prog => (
                            <th key={prog} className="border border-gray-300 px-3 py-2 text-center font-bold whitespace-nowrap">
                              {PROGRESS_LABEL[prog] || prog}
                            </th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">新規</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">ハルエネ</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">モバイル</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.months.map((ym, i) => {
                          const stat = data.monthlyStats[ym]
                          return (
                            <tr key={ym} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-3 py-2 font-semibold">{formatMonth(ym)}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center font-bold text-blue-700">{stat.total}</td>
                              {getProgressKeys(data.progressStats).map(prog => (
                                <td key={prog} className="border border-gray-300 px-3 py-2 text-center">
                                  {stat.byProgress[prog] || 0}
                                </td>
                              ))}
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['新規リスト'] || 0}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['ハルエネリスト'] || 0}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['モバイルリスト'] || 0}</td>
                            </tr>
                          )
                        })}
                        {/* 合計行 */}
                        <tr className="bg-blue-50 font-bold">
                          <td className="border border-gray-300 px-3 py-2">合計</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-blue-700">{data.totalRecords}</td>
                          {getProgressKeys(data.progressStats).map(prog => (
                            <td key={prog} className="border border-gray-300 px-3 py-2 text-center">
                              {data.progressStats[prog] || 0}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['新規リスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['ハルエネリスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['モバイルリスト']?.total || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 担当者別集計 */}
              {activeTab === 'operator' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">担当者別架電集計</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold">担当者</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">合計</th>
                          {getProgressKeys(data.progressStats).map(prog => (
                            <th key={prog} className="border border-gray-300 px-3 py-2 text-center font-bold whitespace-nowrap">
                              {PROGRESS_LABEL[prog] || prog}
                            </th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">新規</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">ハルエネ</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">モバイル</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.operators
                          .sort((a, b) => (data.operatorStats[b]?.total || 0) - (data.operatorStats[a]?.total || 0))
                          .map((op, i) => {
                            const stat = data.operatorStats[op]
                            if (!stat) return null
                            return (
                              <tr key={op} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-gray-300 px-3 py-2 font-semibold">{op}</td>
                                <td className="border border-gray-300 px-3 py-2 text-center font-bold text-green-700">{stat.total}</td>
                                {getProgressKeys(data.progressStats).map(prog => (
                                  <td key={prog} className="border border-gray-300 px-3 py-2 text-center">
                                    {stat.byProgress[prog] || 0}
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['新規リスト'] || 0}</td>
                                <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['ハルエネリスト'] || 0}</td>
                                <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['モバイルリスト'] || 0}</td>
                              </tr>
                            )
                          })}
                        {/* 合計行 */}
                        <tr className="bg-green-50 font-bold">
                          <td className="border border-gray-300 px-3 py-2">合計</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-green-700">{data.totalRecords}</td>
                          {getProgressKeys(data.progressStats).map(prog => (
                            <td key={prog} className="border border-gray-300 px-3 py-2 text-center">
                              {data.progressStats[prog] || 0}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['新規リスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['ハルエネリスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['モバイルリスト']?.total || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 月×担当者クロス集計 */}
              {activeTab === 'cross' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">月別 × 担当者別 架電件数</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-purple-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold">月 / 担当者</th>
                          {data.operators.map(op => (
                            <th key={op} className="border border-gray-300 px-3 py-2 text-center font-bold whitespace-nowrap">{op}</th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">合計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.months.map((ym, i) => {
                          const cross = data.crossStats[ym] || {}
                          const rowTotal = Object.values(cross).reduce((s, v) => s + v, 0)
                          return (
                            <tr key={ym} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-3 py-2 font-semibold">{formatMonth(ym)}</td>
                              {data.operators.map(op => (
                                <td key={op} className="border border-gray-300 px-3 py-2 text-center">
                                  {cross[op] || 0}
                                </td>
                              ))}
                              <td className="border border-gray-300 px-3 py-2 text-center font-bold text-purple-700">{rowTotal}</td>
                            </tr>
                          )
                        })}
                        {/* 合計行 */}
                        <tr className="bg-purple-50 font-bold">
                          <td className="border border-gray-300 px-3 py-2">合計</td>
                          {data.operators.map(op => (
                            <td key={op} className="border border-gray-300 px-3 py-2 text-center">
                              {data.operatorStats[op]?.total || 0}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 text-center text-purple-700">{data.totalRecords}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 進捗別集計 */}
              {activeTab === 'progress' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">進捗別集計（全体）</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                    {getProgressKeys(data.progressStats).map(prog => {
                      const count = data.progressStats[prog] || 0
                      const pct = data.totalRecords > 0 ? ((count / data.totalRecords) * 100).toFixed(1) : '0.0'
                      return (
                        <div key={prog} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${PROGRESS_COLORS[prog] || 'bg-gray-200'}`}>
                            {PROGRESS_LABEL[prog] || prog}
                          </div>
                          <div className="text-3xl font-bold text-gray-800">{count.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{pct}%</div>
                          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 担当者×進捗クロス */}
                  <h3 className="text-lg font-bold mb-4 text-gray-800">担当者別 進捗内訳</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-orange-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold">担当者</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">合計</th>
                          {getProgressKeys(data.progressStats).map(prog => (
                            <th key={prog} className="border border-gray-300 px-3 py-2 text-center font-bold whitespace-nowrap">
                              {PROGRESS_LABEL[prog] || prog}
                            </th>
                          ))}
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">受注率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.operators
                          .sort((a, b) => (data.operatorStats[b]?.total || 0) - (data.operatorStats[a]?.total || 0))
                          .map((op, i) => {
                            const stat = data.operatorStats[op]
                            if (!stat) return null
                            const juchu = stat.byProgress['受注'] || 0
                            const rate = stat.total > 0 ? ((juchu / stat.total) * 100).toFixed(1) : '0.0'
                            return (
                              <tr key={op} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border border-gray-300 px-3 py-2 font-semibold">{op}</td>
                                <td className="border border-gray-300 px-3 py-2 text-center font-bold">{stat.total}</td>
                                {getProgressKeys(data.progressStats).map(prog => (
                                  <td key={prog} className={`border border-gray-300 px-3 py-2 text-center ${prog === '受注' && (stat.byProgress[prog] || 0) > 0 ? 'text-green-700 font-bold' : ''}`}>
                                    {stat.byProgress[prog] || 0}
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-700">{rate}%</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* リスト別集計 */}
              {activeTab === 'list' && (
                <div>
                  <h3 className="text-lg font-bold mb-4 text-gray-800">リスト別集計</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {['新規リスト', 'ハルエネリスト', 'モバイルリスト'].map(listName => {
                      const stat = data.listStats[listName]
                      if (!stat) return null
                      const pct = data.totalRecords > 0 ? ((stat.total / data.totalRecords) * 100).toFixed(1) : '0.0'
                      return (
                        <div key={listName} className="border border-gray-200 rounded-lg p-5 shadow-sm">
                          <div className="text-lg font-bold text-gray-800 mb-2">{listName}</div>
                          <div className="text-4xl font-bold text-blue-700 mb-1">{stat.total.toLocaleString()}</div>
                          <div className="text-sm text-gray-500 mb-4">全体の {pct}%</div>
                          <div className="space-y-1">
                            {getProgressKeys(stat.byProgress).map(prog => (
                              <div key={prog} className="flex items-center justify-between text-sm">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PROGRESS_COLORS[prog] || 'bg-gray-200'}`}>
                                  {PROGRESS_LABEL[prog] || prog}
                                </span>
                                <span className="font-semibold">{stat.byProgress[prog]}件</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* リスト×月クロス */}
                  <h3 className="text-lg font-bold mb-4 text-gray-800">リスト別 月次推移</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-teal-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-bold">月</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">新規リスト</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">ハルエネリスト</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">モバイルリスト</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-bold">合計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.months.map((ym, i) => {
                          const stat = data.monthlyStats[ym]
                          return (
                            <tr key={ym} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-3 py-2 font-semibold">{formatMonth(ym)}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['新規リスト'] || 0}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['ハルエネリスト'] || 0}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{stat.byList['モバイルリスト'] || 0}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center font-bold text-teal-700">{stat.total}</td>
                            </tr>
                          )
                        })}
                        <tr className="bg-teal-50 font-bold">
                          <td className="border border-gray-300 px-3 py-2">合計</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['新規リスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['ハルエネリスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{data.listStats['モバイルリスト']?.total || 0}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-teal-700">{data.totalRecords}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
