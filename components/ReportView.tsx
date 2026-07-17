'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface PeriodRow {
  period: string
  operator: string
  calls: number
  orders: number
  orderRate: number
  progressCounts: Record<string, number>
}

interface OperatorTotal {
  totalCalls: number
  orders: number
  orderRate: number
  progressCounts: Record<string, number>
}

interface OverallTotal extends OperatorTotal {
  totalCustomers: number
}

interface ReportData {
  progressCategories: string[]
  operators: string[]
  overall: OverallTotal
  byOperator: Record<string, OperatorTotal>
  daily: PeriodRow[]
  monthly: PeriodRow[]
}

// 検証済みパレット(dataviz skill参照)
const CHART_BLUE = '#2a78d6'
const CHART_GREEN = '#008300'
const STATUS_GOOD = '#0ca30c'
const GRID_LINE = '#e1e0d9'
const AXIS_TICK = '#898781'
const AXIS_LINE = '#c3c2b7'

// 「見込み」として集計するカテゴリ
const PROSPECT_CATEGORIES = ['見込みA', '見込みC']

export default function ReportView() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'overall' | 'individual'>('overall')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [periodType, setPeriodType] = useState<'daily' | 'monthly'>('monthly')
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/reports')
        const result = await response.json()
        if (result.success) {
          setData(result)
          if (result.operators?.length > 0) setSelectedOperator(result.operators[0])
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

  const totals: OverallTotal | OperatorTotal | null = useMemo(() => {
    if (!data) return null
    if (viewMode === 'overall') return data.overall
    return data.byOperator[selectedOperator] || null
  }, [data, viewMode, selectedOperator])

  const periodRows = useMemo(() => {
    if (!data) return []
    const rows = periodType === 'daily' ? data.daily : data.monthly

    if (viewMode === 'individual') {
      return rows.filter((r) => r.operator === selectedOperator)
    }

    // 全体表示: 期間ごとに担当者を合算する
    const grouped = new Map<string, PeriodRow>()
    for (const row of rows) {
      const existing = grouped.get(row.period)
      if (!existing) {
        grouped.set(row.period, { ...row, operator: '全体', progressCounts: { ...row.progressCounts } })
      } else {
        existing.calls += row.calls
        existing.orders += row.orders
        for (const [cat, cnt] of Object.entries(row.progressCounts)) {
          existing.progressCounts[cat] = (existing.progressCounts[cat] || 0) + cnt
        }
      }
    }
    const merged = Array.from(grouped.values()).map((r) => ({
      ...r,
      orderRate: r.calls > 0 ? (r.orders / r.calls) * 100 : 0,
    }))
    merged.sort((a, b) => b.period.localeCompare(a.period))
    return merged
  }, [data, periodType, viewMode, selectedOperator])

  const trendChartData = useMemo(() => {
    return [...periodRows]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((r) => ({
        period: r.period,
        受注率: Number(r.orderRate.toFixed(1)),
        架電数: r.calls,
        受注数: r.orders,
      }))
  }, [periodRows])

  const progressChartData = useMemo(() => {
    if (!data || !totals) return []
    return data.progressCategories
      .map((cat) => ({ name: cat, value: totals.progressCounts[cat] || 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [data, totals])

  const prospectTotal = useMemo(() => {
    if (!totals) return 0
    return PROSPECT_CATEGORIES.reduce((sum, cat) => sum + (totals.progressCounts[cat] || 0), 0)
  }, [totals])

  const handleExportPdf = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const label = viewMode === 'overall' ? '全体' : selectedOperator
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      pdf.save(`効果報告レポート_${label}_${today}.pdf`)
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDFの生成に失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return <div className="p-6 text-center py-10 text-gray-500">読み込み中...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
      </div>
    )
  }

  if (!data || !totals) {
    return <div className="p-6 text-center py-10 text-gray-500">データがありません</div>
  }

  return (
    <div className="bg-gray-50 h-full overflow-auto">
      {/* コントロールバー(PDFには含めない) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'overall' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}
          >
            全体
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'individual' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}
          >
            個々(担当者別)
          </button>
        </div>

        {viewMode === 'individual' && (
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            {data.operators.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        )}

        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setPeriodType('daily')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${periodType === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}
          >
            日次
          </button>
          <button
            onClick={() => setPeriodType('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${periodType === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}
          >
            月次
          </button>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="ml-auto px-4 py-1.5 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700 disabled:opacity-50"
        >
          {isExporting ? '生成中...' : '📄 PDFとして出力'}
        </button>
      </div>

      {/* PDF化対象エリア */}
      <div ref={reportRef} className="p-4 sm:p-6 bg-gray-50">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">効果報告レポート</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'overall' ? '全体実績' : `担当者: ${selectedOperator}`}　出力日: {new Date().toLocaleDateString('ja-JP')}
          </p>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="総架電数" value={totals.totalCalls.toLocaleString()} unit="件" color="blue" />
          <KpiCard label="受注数" value={totals.orders.toLocaleString()} unit="件" color="green" />
          <KpiCard label="受注率" value={totals.orderRate.toFixed(1)} unit="%" color="indigo" />
          <KpiCard label="見込み件数(A+C)" value={prospectTotal.toLocaleString()} unit="件" color="amber" />
        </div>

        {/* グラフエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              受注率推移({periodType === 'daily' ? '日次' : '月次'})
            </h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid stroke={GRID_LINE} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="受注率" stroke={CHART_BLUE} strokeWidth={2} dot={{ r: 4, fill: CHART_BLUE, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 min-w-0">
            <h3 className="text-sm font-bold text-gray-700 mb-3">進捗内訳(件数の多い順)</h3>
            <div style={{ width: '100%', height: Math.max(220, progressChartData.length * 34) }}>
              {progressChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={progressChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid stroke={GRID_LINE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11, fill: '#0b0b0b' }}
                      stroke={AXIS_LINE}
                    />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#52514e' }} />
                      {progressChartData.map((d, i) => (
                        <Cell key={i} fill={d.name === '受注' ? STATUS_GOOD : CHART_BLUE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">データがありません</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6 min-w-0">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            架電数・受注数({periodType === 'daily' ? '日次' : '月次'})
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData}>
                <CartesianGrid stroke={GRID_LINE} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} />
                <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="架電数" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="受注数" fill={CHART_GREEN} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 詳細テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h3 className="text-sm font-bold text-gray-700 px-4 pt-4">
            明細({periodType === 'daily' ? '日次' : '月次'})
          </h3>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                    {periodType === 'daily' ? '日付' : '年月'}
                  </th>
                  {viewMode === 'overall' && (
                    <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">担当者</th>
                  )}
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">架電数</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">受注数</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">受注率</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">見込み(A+C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periodRows.length > 0 ? (
                  periodRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{row.period}</td>
                      {viewMode === 'overall' && (
                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{row.operator}</td>
                      )}
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">{row.calls}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-green-600 font-semibold">{row.orders}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-blue-600 font-bold">
                        {row.orderRate.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-amber-600 font-semibold">
                        {PROSPECT_CATEGORIES.reduce((s, c) => s + (row.progressCounts[c] || 0), 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={viewMode === 'overall' ? 6 : 5} className="px-4 py-10 text-center text-gray-500">
                      データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    amber: 'text-amber-600 bg-amber-50',
  }
  return (
    <div className={`rounded-lg p-4 ${colorMap[color] || 'text-gray-600 bg-gray-50'}`}>
      <div className="text-xs font-bold opacity-70 mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold">
        {value}
        <span className="text-sm ml-1">{unit}</span>
      </div>
    </div>
  )
}
