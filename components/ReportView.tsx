'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line, Cell, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface PeriodRow {
  period: string // YYYY-MM
  operator: string
  calls: number
  orders: number
  orderRate: number
  progressCounts: Record<string, number>
}

interface Totals {
  totalCalls: number
  orders: number
  orderRate: number
  progressCounts: Record<string, number>
}

interface ReportData {
  progressCategories: string[]
  operators: string[]
  months: string[] // YYYY-MM, 新しい順
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

const formatMonth = (period: string): string => {
  const [y, m] = period.split('-')
  if (!y || !m) return period
  return `${y}年${Number(m)}月`
}

const zeroTotals = (categories: string[]): Totals => {
  const progressCounts: Record<string, number> = {}
  for (const c of categories) progressCounts[c] = 0
  return { totalCalls: 0, orders: 0, orderRate: 0, progressCounts }
}

const sumRows = (rows: PeriodRow[], categories: string[]): Totals => {
  const progressCounts: Record<string, number> = {}
  for (const c of categories) progressCounts[c] = 0
  let calls = 0
  let orders = 0
  for (const r of rows) {
    calls += r.calls
    orders += r.orders
    for (const [k, v] of Object.entries(r.progressCounts)) {
      progressCounts[k] = (progressCounts[k] || 0) + v
    }
  }
  return { totalCalls: calls, orders, orderRate: calls > 0 ? (orders / calls) * 100 : 0, progressCounts }
}

const rowToTotals = (row: PeriodRow | undefined, categories: string[]): Totals => {
  if (!row) return zeroTotals(categories)
  const progressCounts: Record<string, number> = {}
  for (const c of categories) progressCounts[c] = row.progressCounts[c] || 0
  return { totalCalls: row.calls, orders: row.orders, orderRate: row.orderRate, progressCounts }
}

export default function ReportView() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'overall' | 'individual'>('overall')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
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
          if (result.months?.length > 0) setSelectedMonth(result.months[0])
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

  // 対象月×全担当者(全体表示・明細用)
  const monthRows = useMemo(() => {
    if (!data) return []
    return data.monthly.filter((r) => r.period === selectedMonth)
  }, [data, selectedMonth])

  // 選択担当者×全期間(個々表示・トレンド用、新しい月順)
  const operatorRows = useMemo(() => {
    if (!data) return []
    return data.monthly
      .filter((r) => r.operator === selectedOperator)
      .sort((a, b) => b.period.localeCompare(a.period))
  }, [data, selectedOperator])

  const totals: Totals = useMemo(() => {
    if (!data) return zeroTotals([])
    if (viewMode === 'overall') return sumRows(monthRows, data.progressCategories)
    const row = operatorRows.find((r) => r.period === selectedMonth)
    return rowToTotals(row, data.progressCategories)
  }, [data, viewMode, monthRows, operatorRows, selectedMonth])

  const tableRows = viewMode === 'overall' ? monthRows : operatorRows

  // 受注率・件数の推移(全期間) - 全体表示は月ごとに全担当者を合算する
  const trendChartData = useMemo(() => {
    if (!data) return []
    if (viewMode === 'individual') {
      return [...operatorRows]
        .sort((a, b) => a.period.localeCompare(b.period))
        .map((r) => ({
          period: r.period,
          受注率: Number(r.orderRate.toFixed(1)),
          総架電数: r.calls,
          受注数: r.orders,
        }))
    }
    const grouped = new Map<string, { calls: number; orders: number }>()
    for (const row of data.monthly) {
      const g = grouped.get(row.period) || { calls: 0, orders: 0 }
      g.calls += row.calls
      g.orders += row.orders
      grouped.set(row.period, g)
    }
    return Array.from(grouped.entries())
      .map(([period, g]) => ({
        period,
        受注率: g.calls > 0 ? Number(((g.orders / g.calls) * 100).toFixed(1)) : 0,
        総架電数: g.calls,
        受注数: g.orders,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [data, viewMode, operatorRows])

  const progressChartData = useMemo(() => {
    if (!data) return []
    return data.progressCategories
      .map((cat) => ({ name: cat, value: totals.progressCounts[cat] || 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [data, totals])

  const prospectTotal = useMemo(() => {
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

      const pdf = new jsPDF('l', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 8
      const contentWidth = pageWidth - margin * 2
      const maxContentHeight = pageHeight - margin * 2
      const sectionGap = 4

      // セクション(見出し/KPI/グラフ/表)ごとに個別キャプチャして配置することで、
      // グラフや表の途中でページがまたがって切れないようにする。
      // windowWidthを広めに固定し、実際のウィンドウ幅に関わらずPC横並びレイアウトで書き出す。
      const sections = Array.from(reportRef.current.children) as HTMLElement[]
      let cursorY = margin
      let placedOnPage = false

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        const canvas = await html2canvas(section, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          windowWidth: 1440,
        })
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = contentWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        if (imgHeight > maxContentHeight) {
          if (placedOnPage) pdf.addPage()
          let remaining = imgHeight
          let offset = 0
          while (remaining > 0) {
            if (offset > 0) pdf.addPage()
            pdf.addImage(imgData, 'PNG', margin, margin - offset, imgWidth, imgHeight)
            remaining -= maxContentHeight
            offset += maxContentHeight
          }
          if (i < sections.length - 1) {
            pdf.addPage()
            cursorY = margin
          }
          placedOnPage = false
          continue
        }

        if (placedOnPage && cursorY + imgHeight > pageHeight - margin) {
          pdf.addPage()
          cursorY = margin
          placedOnPage = false
        }

        pdf.addImage(imgData, 'PNG', margin, cursorY, imgWidth, imgHeight)
        cursorY += imgHeight + sectionGap
        placedOnPage = true
      }

      const label = viewMode === 'overall' ? '全体' : selectedOperator
      const monthLabel = selectedMonth || 'all'
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      pdf.save(`効果報告レポート_${label}_${monthLabel}_${today}.pdf`)
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

  if (!data || data.months.length === 0) {
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

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-bold"
        >
          {data.months.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>

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
            {viewMode === 'overall' ? '全体実績' : `担当者: ${selectedOperator}`}　対象月: {formatMonth(selectedMonth)}　出力日: {new Date().toLocaleDateString('ja-JP')}
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
            <h3 className="text-sm font-bold text-gray-700 mb-3">受注率推移(月次・全期間)</h3>
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
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              進捗内訳({formatMonth(selectedMonth)}・件数の多い順)
            </h3>
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
          <h3 className="text-sm font-bold text-gray-700 mb-3">総架電数・受注数(月次・全期間)</h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendChartData}>
                <CartesianGrid stroke={GRID_LINE} vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} />
                <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} stroke={AXIS_LINE} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="総架電数" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="受注数" fill={CHART_GREEN} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 詳細テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h3 className="text-sm font-bold text-gray-700 px-4 pt-4">
            {viewMode === 'overall'
              ? `明細(${formatMonth(selectedMonth)}・担当者別)`
              : `明細(${selectedOperator}・月別推移)`}
          </h3>
          <div className="overflow-x-auto p-4">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {viewMode === 'overall' ? (
                    <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">担当者</th>
                  ) : (
                    <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">対象月</th>
                  )}
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">総架電数</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">受注数</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">受注率</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 whitespace-nowrap">見込み(A+C)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableRows.length > 0 ? (
                  tableRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">
                        {viewMode === 'overall' ? row.operator : formatMonth(row.period)}
                      </td>
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
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
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
