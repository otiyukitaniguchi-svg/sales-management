'use client'

import { useState } from 'react'
import Papa from 'papaparse'

interface ImportExportProps {
  listType: string
  onImportComplete?: () => void
}

export function CallHistoryImportExport({ listType, onImportComplete }: ImportExportProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')

  // CSVインポート処理
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportMessage('')
    setImportError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import-call-history', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setImportError(data.error || 'インポート失敗')
        return
      }

      setImportMessage(`✅ ${data.count}件のデータをインポートしました`)
      onImportComplete?.()

      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setImportMessage('')
      }, 3000)
    } catch (error) {
      setImportError(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    } finally {
      setIsImporting(false)
      // ファイル入力をリセット
      event.target.value = ''
    }
  }

  // CSVエクスポート処理
  const handleExport = async () => {
    try {
      const response = await fetch(`/api/call-history?list_type=${encodeURIComponent(listType)}`)
      const data = await response.json()

      if (!response.ok) {
        setImportError('エクスポート失敗')
        return
      }

      // データをCSV形式に変換
      const csv = convertToCSV(data)

      // ファイルをダウンロード
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.setAttribute('href', url)
      link.setAttribute('download', `call-history-${listType}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setImportMessage('✅ CSVをダウンロードしました')
      setTimeout(() => {
        setImportMessage('')
      }, 3000)
    } catch (error) {
      setImportError(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {/* インポートボタン */}
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          disabled={isImporting}
          className="hidden"
        />
        <span className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 inline-block">
          {isImporting ? 'インポート中...' : 'CSVインポート'}
        </span>
      </label>

      {/* エクスポートボタン */}
      <button
        onClick={handleExport}
        className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
      >
        CSVエクスポート
      </button>

      {/* メッセージ表示 */}
      {importMessage && (
        <span className="text-sm text-green-600 font-semibold">{importMessage}</span>
      )}
      {importError && (
        <span className="text-sm text-red-600 font-semibold">{importError}</span>
      )}
    </div>
  )
}

// CSVに変換する関数
function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return 'No data'
  }

  // ヘッダーを定義（CSVの列順に合わせる）
  const headers = [
    'タイムスタンプ',
    'No',
    'リスト',
    '企業名',
    '電話番号',
    '住所',
    '担当者名',
    '架電日',
    '開始時刻',
    '終了時刻',
    '対応者',
    '性別',
    '進捗',
    'メモ',
    '担当オペレーター',
  ]

  // データ行を作成
  const rows = data.map((row) => [
    row.timestamp || '',
    row.no || '',
    row.list_type || '',
    row.company_name || '',
    row.phone || '',
    row.address || '',
    row.operator_name || '',
    row.date || '',
    row.start_time || '',
    row.end_time || '',
    row.responder || '',
    row.gender || '',
    row.progress || '',
    row.note || '',
    row.operator || '',
  ])

  // CSVを生成
  const csv = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csv
}
