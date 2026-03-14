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

        {/* 顧客基本情報 */}
        <div className="rounded-lg shadow-md border border-blue-200 p-4 bg-gradient-to-br from-blue-50 to-white">
          {/* ヘッダー */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-blue-300">
            <span className="font-bold text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded">顧客基本情報</span>
            <span className="text-lg font-bold text-blue-700">No. {record.no}</span>
          </div>

          <div className="flex flex-col gap-3">
            {/* セクション1: 会社名情報 */}
            <div className="bg-white rounded p-3 border border-blue-100">
              <h3 className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">会社情報</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">会社名</label>
                  <input type="text" value={editedRecord.companyName || ''} onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    className="w-full border-2 border-blue-300 px-3 py-2 text-sm font-bold rounded hover:border-blue-400 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">仮名名</label>
                  <input type="text" value={editedRecord.companyKana || ''} onChange={(e) => handleFieldChange('companyKana', e.target.value)}
                    className="w-full border-2 border-blue-300 px-3 py-2 text-sm rounded hover:border-blue-400 focus:border-blue-500 focus:outline-none bg-blue-50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">業種</label>
                  <input type="text" value={editedRecord.industry || ''} onChange={(e) => handleFieldChange('industry', e.target.value)}
                    className="w-full border-2 border-blue-300 px-3 py-2 text-sm rounded hover:border-blue-400 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* セクション2: 連絡先情報 */}
            <div className="bg-white rounded p-3 border border-green-100">
              <h3 className="text-xs font-bold text-green-700 mb-2 uppercase tracking-wide">連絡先</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">固定番号</label>
                  <input type="text" value={editedRecord.fixedNo || ''} onChange={(e) => handleFieldChange('fixedNo', e.target.value)}
                    className="w-full border-2 border-green-300 px-3 py-2 text-sm rounded hover:border-green-400 focus:border-green-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">その他番号</label>
                  <input type="text" value={editedRecord.otherContact || ''} onChange={(e) => handleFieldChange('otherContact', e.target.value)}
                    className="w-full border-2 border-green-300 px-3 py-2 text-sm rounded hover:border-green-400 focus:border-green-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">メールアドレス</label>
                  <input type="text" value={editedRecord.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full border-2 border-green-300 px-3 py-2 text-sm rounded hover:border-green-400 focus:border-green-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* セクション3: 住所情報 */}
            <div className="bg-white rounded p-3 border border-purple-100">
              <h3 className="text-xs font-bold text-purple-700 mb-2 uppercase tracking-wide">住所</h3>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">〒</label>
                  <input type="text" value={editedRecord.zipCode || ''} onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    className="w-full border-2 border-purple-300 px-3 py-2 text-sm rounded hover:border-purple-400 focus:border-purple-500 focus:outline-none" placeholder="000-0000" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">住所カナ</label>
                  <input type="text" value={editedRecord.addressKana || ''} onChange={(e) => handleFieldChange('addressKana', e.target.value)}
                    className="w-full border-2 border-purple-300 px-3 py-2 text-sm rounded hover:border-purple-400 focus:border-purple-500 focus:outline-none bg-purple-50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">住所</label>
                <input type="text" value={editedRecord.address || ''} onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full border-2 border-purple-300 px-3 py-2 text-sm rounded hover:border-purple-400 focus:border-purple-500 focus:outline-none" />
              </div>
            </div>

            {/* セクション4: 担当者情報 */}
            <div className="bg-white rounded p-3 border border-orange-100">
              <h3 className="text-xs font-bold text-orange-700 mb-2 uppercase tracking-wide">担当者</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">代表（カナ）</label>
                  <input type="text" value={editedRecord.repKana || ''} onChange={(e) => handleFieldChange('repKana', e.target.value)}
                    className="w-full border-2 border-orange-300 px-3 py-2 text-sm rounded hover:border-orange-400 focus:border-orange-500 focus:outline-none bg-orange-50" />
                  <input type="text" value={editedRecord.repName || ''} onChange={(e) => handleFieldChange('repName', e.target.value)}
                    className="w-full border-2 border-orange-300 px-3 py-2 text-sm rounded hover:border-orange-400 focus:border-orange-500 focus:outline-none mt-2" placeholder="代表" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">担当（カナ）</label>
                  <input type="text" value={editedRecord.staffKana || ''} onChange={(e) => handleFieldChange('staffKana', e.target.value)}
                    className="w-full border-2 border-orange-300 px-3 py-2 text-sm rounded hover:border-orange-400 focus:border-orange-500 focus:outline-none bg-orange-50" />
                  <input type="text" value={editedRecord.staffName || ''} onChange={(e) => handleFieldChange('staffName', e.target.value)}
                    className="w-full border-2 border-orange-300 px-3 py-2 text-sm rounded hover:border-orange-400 focus:border-orange-500 focus:outline-none mt-2" placeholder="担当" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">備考</label>
                  <textarea value={editedRecord.memo || ''} onChange={(e) => handleFieldChange('memo', e.target.value)}
                    className="w-full border-2 border-orange-300 px-3 py-2 text-sm h-20 rounded hover:border-orange-400 focus:border-orange-500 focus:outline-none resize-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="mt-4 flex justify-end gap-3 items-center pt-3 border-t border-blue-200">
            {saveMessage && <span className="text-green-600 text-sm font-bold animate-pulse">{saveMessage}</span>}
            <button onClick={handleSave} disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold rounded-lg border border-green-700 hover:opacity-90 disabled:opacity-50 shadow-md transition-all">
              {isSaving ? '保存中...' : '💾 保存'}
            </button>
          </div>
        </div>

        {/* 架電履歴 */}
        <div className="border-2 border-gray-400 p-3 bg-gray-50">
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
          {/* 架電履歴テーブル - 最新5件表示 + スクロール対応 */}
          <div className="flex flex-col h-64 border border-gray-300 rounded bg-white w-full">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead className="sticky top-0 bg-gray-200">
                  <tr>
                    {['担当者','対応日','開始','終了','対応者','性別','進捗','コール備歴'].map(h => (
                      <th key={h} className="border border-gray-400 px-3 py-1 text-left whitespace-nowrap font-bold bg-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {callHistory.length === 0 ? (
                    <tr><td colSpan={8} className="border border-gray-400 px-2 py-3 text-center text-gray-400">履歴なし</td></tr>
                  ) : (
                    /* 最新順にソートして表示（新しい順） */
                    [...callHistory].reverse().map((entry, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.operator}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.date}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.startTime}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.endTime}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.responder}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.gender}</td>
                        <td className="border border-gray-400 px-3 py-1 whitespace-nowrap">{entry.progress}</td>
                        <td className="border border-gray-400 px-3 py-1 min-w-32">{entry.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {callHistory.length > 5 && (
              <div className="text-xs text-gray-500 px-2 py-1 border-t border-gray-300 bg-gray-50">
                全 {callHistory.length} 件（スクロールで全て表示）
              </div>
            )}
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
