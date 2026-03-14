'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

export default function CustomerDetail() {
  const currentList = useAppStore((state) => state.currentList)
  const currentListIndex = useAppStore((state) => state.currentListIndex)
  const listData = useAppStore((state) => state.listData)
  const user = useAppStore((state) => state.user)
  const currentCall = useAppStore((state) => state.currentCall)
  const setCurrentCall = useAppStore((state) => state.setCurrentCall)
  const resetCurrentCall = useAppStore((state) => state.resetCurrentCall)
  const setListData = useAppStore((state) => state.setListData)

  const records = listData[currentList]
  const record = records[currentListIndex]

  const [editedRecord, setEditedRecord] = useState<FrontendCustomerRecord | null>(null)
  const [callHistory, setCallHistory] = useState<FrontendCallHistoryEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (record) {
      setEditedRecord({ ...record })
      loadCallHistory()
    }
  }, [record?.no, currentList, currentListIndex])

  const loadCallHistory = async () => {
    if (!record) return
    try {
      const result = await ApiClient.getCallHistory(currentList, record.no)
      if (result.success && result.data) {
        setCallHistory(result.data)
      }
    } catch (e) {
      console.error('Failed to load call history:', e)
    }
  }

  const handleFieldChange = (field: keyof FrontendCustomerRecord, value: string) => {
    if (editedRecord) {
      setEditedRecord({ ...editedRecord, [field]: value })
    }
  }

  const handleSave = async () => {
    if (!editedRecord || !record) return
    setIsSaving(true)
    try {
      const result = await ApiClient.updateRecord(currentList, record.no, editedRecord)
      if (result.success) {
        const updatedRecords = [...records]
        updatedRecords[currentListIndex] = editedRecord
        setListData(currentList, updatedRecords)
        setSaveMessage('保存しました ✓')
        setTimeout(() => setSaveMessage(''), 2000)
      } else {
        alert('保存エラー: ' + (result.message || '不明なエラー'))
      }
    } catch (e: any) {
      alert('保存エラー: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCallStart = () => {
    const now = new Date()
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
    setCurrentCall({ ...currentCall, date: dateStr, startTime: timeStr, operator: user?.display_name || '' })
    setIsCallActive(true)
  }

  const handleCallEnd = async () => {
    if (!record || !currentCall.date || !currentCall.startTime) return
    const now = new Date()
    const endTimeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
    
    // 架電履歴エントリを作成
    const callEntry: FrontendCallHistoryEntry = {
      operator: currentCall.operator || user?.display_name || '',
      date: currentCall.date,
      startTime: currentCall.startTime,
      endTime: endTimeStr,
      responder: currentCall.responder || '',
      gender: currentCall.gender || '',
      progress: currentCall.progress || '',
      note: currentCall.note || '',
    }
    
    try {
      const result = await ApiClient.updateRecord(currentList, record.no, undefined, [callEntry], user?.display_name)
      if (result.success) {
        setIsCallActive(false)
        resetCurrentCall()
        await loadCallHistory()
        alert('架電情報を保存しました')
      } else {
        alert('架電保存エラー: ' + (result.message || '不明なエラー'))
      }
    } catch (e: any) {
      alert('架電保存エラー: ' + e.message)
    }
  }

  if (!record || !editedRecord) {
    return <div className="text-center text-gray-500 mt-20 text-sm">データを読み込み中...</div>
  }

  return (
    <div className="flex gap-2 p-2 h-full overflow-auto bg-white">
      {/* ─── メインエリア ─── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">

        {/* 顧客基本情報 - 表統デザイン */}
        <div className="border border-gray-300 bg-white rounded-lg shadow-sm">
          {/* タイトル行 */}
          <div className="flex border-b border-gray-300 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex-1 px-6 py-4 font-bold text-base text-gray-800">顧客管理</div>
            <div className="w-32 px-6 py-4 font-bold text-base text-gray-700 border-l border-gray-300 text-right">No. {record.no}</div>
          </div>

          {/* 事業情報セクションタイトル */}
          <div className="border-b border-gray-300">
            <div className="px-6 py-2 font-semibold text-sm text-gray-700 bg-gray-50">会社情報</div>
          </div>

          {/* 事業情報テーブル */}
          <div className="flex border-b border-gray-300">
            {/* 左列 */}
            <div className="flex-1 border-r border-gray-300">
              {/* 事業者名 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">事業者名</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.companyName || ''} onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* フリガナ */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">フリガナ</div>
                <div className="flex-1 px-4 py-2">
                  <input type="text" value={editedRecord.companyKana || ''} onChange={(e) => handleFieldChange('companyKana', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 住所 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">住所</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.address || ''} onChange={(e) => handleFieldChange('address', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 住所フリガナ */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">フリガナ</div>
                <div className="flex-1 px-4 py-2">
                  <input type="text" value={editedRecord.addressKana || ''} onChange={(e) => handleFieldChange('addressKana', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 固定番号 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">固定番号</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.fixedNo || ''} onChange={(e) => handleFieldChange('fixedNo', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* その他番号 */}
              <div className="flex">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">その他番号</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.otherContact || ''} onChange={(e) => handleFieldChange('otherContact', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
            </div>

            {/* 右列 */}
            <div className="flex-1">
              {/* 代表者 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">代表者</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.repName || ''} onChange={(e) => handleFieldChange('repName', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" placeholder="代表" />
                </div>
              </div>
              {/* 代表者フリガナ */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">フリガナ</div>
                <div className="flex-1 px-4 py-2">
                  <input type="text" value={editedRecord.repKana || ''} onChange={(e) => handleFieldChange('repKana', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 担当者 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">担当者</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.staffName || ''} onChange={(e) => handleFieldChange('staffName', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" placeholder="担当" />
                </div>
              </div>
              {/* 担当者フリガナ */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">フリガナ</div>
                <div className="flex-1 px-4 py-2">
                  <input type="text" value={editedRecord.staffKana || ''} onChange={(e) => handleFieldChange('staffKana', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 業種 */}
              <div className="flex border-b border-gray-200">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">業種</div>
                <div className="flex-1 px-4 py-3">
                  <input type="text" value={editedRecord.industry || ''} onChange={(e) => handleFieldChange('industry', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
                </div>
              </div>
              {/* 備考 */}
              <div className="flex">
                <div className="w-24 px-4 py-3 font-semibold text-sm text-gray-700 bg-gray-50 border-r border-gray-200">備考</div>
                <div className="flex-1 px-4 py-3">
                  <textarea value={editedRecord.memo || ''} onChange={(e) => handleFieldChange('memo', e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 text-base h-20 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded resize-none" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 架電履歴 */}
        <div className="rounded-lg shadow-md border border-gray-300 p-4 bg-gradient-to-br from-gray-50 to-white flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-sm bg-gray-200 px-2 py-0.5">架電履歴</span>
            <button onClick={handleCallStart} disabled={isCallActive}
              className="px-4 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-40">開始</button>
            <button onClick={handleCallEnd} disabled={!isCallActive}
              className="px-4 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-40">終了</button>
          </div>

          {/* 架電中入力行 */}
          {isCallActive && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-400 rounded flex flex-wrap gap-2 items-center text-sm">
              <span className="font-bold text-yellow-700">🔴 架電中</span>
              <span>担当: {currentCall.operator}</span>
              <span>開始: {currentCall.startTime}</span>
              <span>対応日: {currentCall.date}</span>
              <label className="flex items-center gap-1">対応者:
                <input type="text" value={currentCall.responder || ''} onChange={(e) => setCurrentCall({ ...currentCall, responder: e.target.value })}
                  className="border border-gray-300 px-1 py-0.5 w-20 text-xs" />
              </label>
              <label className="flex items-center gap-1">性別:
                <select value={currentCall.gender || ''} onChange={(e) => setCurrentCall({ ...currentCall, gender: e.target.value })}
                  className="border border-gray-300 px-1 py-0.5 text-xs">
                  <option value="">選択</option>
                  {['男性','女性'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1">進捗:
                <select value={currentCall.progress || ''} onChange={(e) => setCurrentCall({ ...currentCall, progress: e.target.value })}
                  className="border border-gray-300 px-1 py-0.5 text-xs">
                  <option value="">選択</option>
                  {['受注','見込みA','見込みC','担当不在','留守','いつの日か','現アナ','閉業','前回受注','前回NG','前回採択'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1 flex-1">コール備歴:
                <input type="text" value={currentCall.note || ''} onChange={(e) => setCurrentCall({ ...currentCall, note: e.target.value })}
                  className="border border-gray-300 px-1 py-0.5 flex-1 text-xs" />
              </label>
            </div>
          )}

          {/* 履歴テーブル */}
          {/* 架電履歴テーブル - 最新5件表示 */}
          <div className="flex flex-col flex-1 border border-gray-300 rounded bg-white w-full min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-sm border-collapse min-w-max">
                <thead className="sticky top-0 bg-gray-300">
                  <tr>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">担当者</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-20">対応日</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">開始</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">終了</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-20">対応者</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">性別</th>
                    <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-24">進捗</th>
                    <th className="border border-gray-400 px-4 py-2 text-left font-bold bg-gray-300 flex-1">コール履歴</th>
                  </tr>
                </thead>
                <tbody>
                  {callHistory.length === 0 ? (
                    <tr><td colSpan={8} className="border border-gray-400 px-4 py-3 text-center text-gray-400">履歴なし</td></tr>
                  ) : (
                    /* 最新順にソートして表示（新しい順） */
                    [...callHistory].slice(0, 5).reverse().map((entry, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16">{entry.operator}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-20">{entry.date ? `2026/${entry.date}` : ''}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16">{entry.startTime}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16">{entry.endTime}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-20">{entry.responder}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16">{entry.gender}</td>
                        <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-24">{entry.progress}</td>
                        <td className="border border-gray-400 px-4 py-2 flex-1 overflow-hidden">{entry.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 右パネル ─── */}
      <div className="w-44 flex-shrink-0 flex flex-col gap-2 text-sm">
        <div className="border border-gray-400 p-2 bg-gray-50">
          <label className="text-xs font-bold block mb-1">担当者数</label>
          <select className="w-full border border-gray-400 text-xs py-1 px-1">
            <option value="">選択してください</option>
            {['1人','2人','3人','4人','5人以上'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="border border-gray-400 p-2 bg-gray-50">
          <div className="text-xs font-bold mb-2">ヒアリング項目</div>
          {([
            { label: '年創業士', field: 'established' },
            { label: '既存ソフト', field: 'software' },
            { label: '決裁者',   field: 'decision' },
            { label: '過去補助金', field: 'subsidy' },
            { label: '税理士',   field: 'accountant' },
          ] as const).map(({ label, field }) => (
            <div key={field} className="mb-1">
              <label className="text-xs text-gray-500">{label}:</label>
              <input type="text" value={(editedRecord as any)[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                className="w-full border border-gray-400 px-1 py-0.5 text-xs" />
            </div>
          ))}
          <div className="mb-1">
            <label className="text-xs text-gray-500">設立1年以上:</label>
            <select value={editedRecord.sales || ''} onChange={(e) => handleFieldChange('sales', e.target.value)}
              className="w-full border border-gray-400 text-xs py-0.5 px-1">
              <option value="">近似</option>
              <option value="yes">はい</option>
              <option value="no">いいえ</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-400 p-2 bg-gray-50">
          <div className="text-xs font-bold mb-1">商材候補一覧</div>
          {['II導入補助金','省力化補助金'].map(item => (
            <label key={item} className="flex items-center gap-1 text-xs mt-1">
              <input type="checkbox" /> {item}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
