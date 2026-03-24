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

  const records = listData[currentList]
  const record = records[currentListIndex]

  const [editedRecord, setEditedRecord] = useState<FrontendCustomerRecord | null>(null)
  const [callHistory, setCallHistory] = useState<FrontendCallHistoryEntry[]>([])
  const [editingCallIndex, setEditingCallIndex] = useState<number | null>(null)
  const [editingCallData, setEditingCallData] = useState<FrontendCallHistoryEntry | null>(null)
  const [isEditingAllRows, setIsEditingAllRows] = useState(false)
  const [editingCallHistoryAll, setEditingCallHistoryAll] = useState<FrontendCallHistoryEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [recallDateMap, setRecallDateMap] = useState<{ [key: string]: string }>({}) // レコード別の再コール日時
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set())
  const [expandedNoteIndex, setExpandedNoteIndex] = useState<number | null>(null)
  const [currentCall, setCurrentCall] = useState<Partial<FrontendCallHistoryEntry>>({})

  useEffect(() => {
    if (record) {
      setEditedRecord({ ...record })
      loadCallHistory()
      // レコード別の再コール日時を読み込む
      const saved = localStorage.getItem(`recall_${currentList}_${record.no}`)
      if (saved) {
        setRecallDateMap(prev => ({ ...prev, [`${currentList}_${record.no}`]: saved }))
      }
    }
  }, [record, currentList])

  const loadCallHistory = async () => {
    if (!record) return
    try {
      const response = await ApiClient.getCallHistory(currentList, record.no)
      const history = (response as any).data || []
      setCallHistory(Array.isArray(history) ? history : [])
    } catch (error) {
      console.error('Failed to load call history:', error)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    if (editedRecord) {
      setEditedRecord({ ...editedRecord, [field]: value })
    }
  }

  const handleSave = async () => {
    if (!editedRecord || !record) return
    setIsSaving(true)
    try {
      const success = await ApiClient.updateCustomer(currentList, record.no, editedRecord)
      if (success) {
        setSaveMessage('✓ 顧客情報を保存しました')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const resetCurrentCall = () => {
    setCurrentCall({})
  }

  const handleCallStart = () => {
    setIsCallActive(true)
    const now = new Date()
    const newEntry: FrontendCallHistoryEntry = {
      operator: user?.display_name || 'オペレーター',
      date: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5),
      endTime: '',
      responder: '',
      gender: '',
      progress: '',
      note: '',
    }
    setCallHistory([newEntry, ...callHistory])
    setEditingCallIndex(0)
    setEditingCallData(newEntry)
    setCurrentCall(newEntry)
  }

  const handleCallEnd = async () => {
    if (!record || editingCallIndex === null || !editingCallData) return
    
    const now = new Date()
    const endTime = now.toTimeString().slice(0, 5)
    const finalEntry = { ...editingCallData, endTime }
    
    setIsCallActive(false)
    
    try {
      const success = await ApiClient.createCallHistory(currentList, record.no, finalEntry)
      if (success) {
        resetCurrentCall()
        setEditingCallIndex(null)
        setEditingCallData(null)
        await loadCallHistory()
      }
    } catch (error) {
      console.error('Failed to save call history:', error)
    }
  }

  const handleEditCallHistory = (index: number, entry: FrontendCallHistoryEntry) => {
    setEditingCallIndex(index)
    setEditingCallData({ ...entry })
  }

  const handleEditingCallFieldChange = (field: string, value: string) => {
    if (editingCallData) {
      setEditingCallData({ ...editingCallData, [field]: value })
    }
  }

  const handleSaveCallHistory = async () => {
    if (!editingCallData || !record || editingCallIndex === null) return
    try {
      const success = await ApiClient.updateCallHistory(currentList, record.no, editingCallIndex, editingCallData)
      if (success) {
        alert('✓ 架電履歴を保存しました')
        setEditingCallIndex(null)
        setEditingCallData(null)
        await loadCallHistory()
      }
    } catch (error) {
      console.error('Failed to save call history:', error)
      alert('✗ 保存に失敗しました')
    }
  }

  const handleCancelCallHistory = () => {
    setEditingCallIndex(null)
    setEditingCallData(null)
  }

  const handleDeleteCallHistory = async (index: number) => {
    if (!record) return
    try {
      const success = await ApiClient.deleteCallHistory(currentList, record.no, index)
      if (success) {
        await loadCallHistory()
      }
    } catch (error) {
      console.error('Failed to delete call history:', error)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedForDelete.size === 0) {
      alert('削除する行を選択してください')
      return
    }
    if (!record) return
    try {
      const indices = Array.from(selectedForDelete).sort((a, b) => b - a)
      let successCount = 0
      for (const index of indices) {
        const success = await ApiClient.deleteCallHistory(currentList, record.no, index)
        if (success) successCount++
      }
      if (successCount > 0) {
        alert(`${successCount}件の履歴を削除しました`)
        setSelectedForDelete(new Set())
        setIsDeleteMode(false)
        await loadCallHistory()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete call history:', error)
      alert('削除処理中にエラーが発生しました')
    }
  }

  const toggleSelectForDelete = (index: number) => {
    const newSelected = new Set(selectedForDelete)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedForDelete(newSelected)
  }

  const handleEditAllRows = () => {
    if (isEditingAllRows) {
      handleSaveAllRows()
    } else {
      setIsEditingAllRows(true)
      setEditingCallHistoryAll([...callHistory])
    }
  }

  const handleSaveAllRows = async () => {
    if (!record) return
    setIsSaving(true)
    try {
      for (let i = 0; i < editingCallHistoryAll.length; i++) {
        await ApiClient.updateCallHistory(currentList, record.no, i, editingCallHistoryAll[i])
      }
      setIsEditingAllRows(false)
      setEditingCallHistoryAll([])
      await loadCallHistory()
      setSaveMessage('✓ 架電履歴を保存しました')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (error) {
      console.error('Failed to save all rows:', error)
      setSaveMessage('✗ 保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditingAllRowsFieldChange = (index: number, field: string, value: string) => {
    const updated = [...editingCallHistoryAll]
    updated[index] = { ...updated[index], [field]: value }
    setEditingCallHistoryAll(updated)
  }

  if (!record || !editedRecord) {
    return <div className="p-4 text-center text-gray-400">顧客を選択してください</div>
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#fdfcf0] min-h-full">
      {/* 顧客基本情報セクション */}
      <div className="border-2 border-black rounded-lg p-4 relative bg-[#fdfcf0]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold">【顧客基本情報】</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">No.</span>
            <span className="text-sm font-bold border-b border-black min-w-[60px] text-center">{record.no}</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          {/* 左側メインエリア */}
          <div className="col-span-10 flex flex-col gap-2">
            {/* 企業名 */}
            <div className="border border-black p-2 rounded bg-white">
              <label className="block text-[10px] font-bold mb-1">〈企業名〉</label>
              <input
                type="text"
                value={editedRecord.companyKana || ''}
                onChange={(e) => handleFieldChange('companyKana', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-xs mb-1 focus:outline-none"
                placeholder="フリガナ"
              />
              <input
                type="text"
                value={editedRecord.companyName || ''}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
                className="w-full border border-gray-300 px-2 py-2 text-xl font-bold focus:outline-none"
                placeholder="企業名"
              />
            </div>

            {/* 住所 */}
            <div className="border border-black p-2 rounded bg-white">
              <label className="block text-[10px] font-bold mb-1">〈住所〉</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="text"
                  value={editedRecord.zipCode || ''}
                  onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  placeholder="郵便番号"
                />
                <input
                  type="text"
                  value={editedRecord.addressKana || ''}
                  onChange={(e) => handleFieldChange('addressKana', e.target.value)}
                  className="flex-1 border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                  placeholder="住所フリガナ"
                />
              </div>
              <input
                type="text"
                value={editedRecord.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="w-full border border-gray-300 px-2 py-2 text-xl font-bold focus:outline-none"
                placeholder="住所"
              />
            </div>
          </div>

          {/* 右側サイドエリア */}
          <div className="col-span-2 flex flex-col gap-2">
            <div className="border border-black p-2 rounded bg-white flex-1">
              <label className="block text-[10px] font-bold mb-1">固定番号</label>
              <input
                type="text"
                value={editedRecord.fixedNo || ''}
                onChange={(e) => handleFieldChange('fixedNo', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
              />
            </div>
            <div className="border border-black p-2 rounded bg-white flex-1">
              <label className="block text-[10px] font-bold mb-1">その他連絡先</label>
              <input
                type="text"
                value={editedRecord.otherContact || ''}
                onChange={(e) => handleFieldChange('otherContact', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
              />
            </div>
            <div className="border border-black p-2 rounded bg-white flex-1">
              <label className="block text-[10px] font-bold mb-1">Mail address</label>
              <input
                type="text"
                value={editedRecord.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
              />
            </div>
            <div className="border border-black p-2 rounded bg-white flex-1">
              <label className="block text-[10px] font-bold mb-1">業種</label>
              <input
                type="text"
                value={editedRecord.industry || ''}
                onChange={(e) => handleFieldChange('industry', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 代表・担当・備考 */}
        <div className="grid grid-cols-10 gap-1 mt-1">
          <div className="col-span-5 border border-black p-1 rounded bg-white">
            <label className="block text-[9px] font-bold mb-0.5">代表</label>
            <input
              type="text"
              value={editedRecord.repKana || ''}
              onChange={(e) => handleFieldChange('repKana', e.target.value)}
              className="w-full border border-gray-300 px-1 py-0.5 text-xs mb-0.5 focus:outline-none"
              placeholder="フリガナ"
            />
            <input
              type="text"
              value={editedRecord.repName || ''}
              onChange={(e) => handleFieldChange('repName', e.target.value)}
              className="w-full border border-gray-300 px-1 py-0.5 text-xs focus:outline-none"
              placeholder="漢字"
            />
          </div>
          <div className="col-span-5 border border-black p-1 rounded bg-white">
            <label className="block text-[9px] font-bold mb-0.5">担当</label>
            <input
              type="text"
              value={editedRecord.staffKana || ''}
              onChange={(e) => handleFieldChange('staffKana', e.target.value)}
              className="w-full border border-gray-300 px-1 py-0.5 text-xs mb-0.5 focus:outline-none"
              placeholder="フリガナ"
            />
            <input
              type="text"
              value={editedRecord.staffName || ''}
              onChange={(e) => handleFieldChange('staffName', e.target.value)}
              className="w-full border border-gray-300 px-1 py-0.5 text-xs focus:outline-none"
              placeholder="漢字"
            />
          </div>
          <div className="col-span-10 border border-black p-1 rounded bg-white mt-1">
            <label className="block text-[9px] font-bold mb-0.5">備考</label>
            <textarea
              value={editedRecord.memo || ''}
              onChange={(e) => handleFieldChange('memo', e.target.value)}
              className="w-full border border-gray-300 px-1 py-0.5 text-xs h-[40px] focus:outline-none resize-none"
            />
          </div>
        </div>


      </div>

      {/* 架電履歴セクション（既存機能を維持） */}
      <div className="border-2 border-black rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg bg-gray-200 px-2 py-0.5 border border-black">架電履歴</span>
            <button onClick={handleCallStart} disabled={isCallActive}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-semibold disabled:bg-gray-400 hover:bg-blue-600">開始</button>
            <button onClick={handleCallEnd} disabled={!isCallActive}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm font-semibold disabled:bg-gray-400 hover:bg-red-600">終了</button>
            <button onClick={handleEditAllRows} disabled={isSaving}
              className={`px-3 py-1 rounded text-sm font-semibold ${isEditingAllRows ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-600'} text-white disabled:bg-gray-400`}>
              {isEditingAllRows ? '保存' : '編集/保存'}
            </button>
            <button onClick={() => { setIsDeleteMode(!isDeleteMode); setSelectedForDelete(new Set()); }}
              className={`px-3 py-1 rounded text-sm font-semibold ${isDeleteMode ? 'bg-gray-400' : 'bg-purple-500'} text-white hover:opacity-80`}>
              {isDeleteMode ? 'キャンセル' : '削除/実行'}
            </button>
            {isDeleteMode && (
              <button onClick={handleDeleteSelected} disabled={selectedForDelete.size === 0}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold disabled:bg-gray-400 hover:bg-red-700">
                実行
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded p-2">
            <label className="font-semibold text-sm text-gray-700 whitespace-nowrap">再コール日時:</label>
            {(() => {
              const key = `${currentList}_${record?.no}`
              const saved = recallDateMap[key] || ''
              const [savedDate, savedTime] = saved.split(' ')
              return (
                <>
                  <input type="date" value={savedDate || ''} onChange={(e) => setRecallDateMap(prev => ({ ...prev, [key]: `${e.target.value} ${savedTime || ''}` }))} className="border border-gray-300 px-2 py-1 rounded text-sm" />
                  <input type="time" value={savedTime || ''} onChange={(e) => setRecallDateMap(prev => ({ ...prev, [key]: `${savedDate || ''} ${e.target.value}` }))} className="border border-gray-300 px-2 py-1 rounded text-sm" />
                  <button onClick={() => {
                    const dateStr = recallDateMap[key]?.split(' ')[0] || ''
                    const timeStr = recallDateMap[key]?.split(' ')[1] || ''
                    if (dateStr && timeStr) {
                      localStorage.setItem(`recall_${key}`, `${dateStr} ${timeStr}`)
                      alert(`再コール日時を設定しました: ${dateStr} ${timeStr}`)
                    } else {
                      alert('日時を入力してください')
                    }
                  }} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm font-semibold hover:bg-yellow-600">設定</button>
                </>
              )
            })()}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(5 * 40px + 50px)' }}>
          <table className="w-full border-collapse border border-black">
            <thead className="sticky top-0 z-10">
              <tr>
                {isDeleteMode && <th className="px-2 py-2 text-center whitespace-nowrap font-bold bg-blue-300 w-8 border border-black">✓</th>}
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-16 border border-black">担当者</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-24 border border-black">対応日</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-20 border border-black">開始</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-20 border border-black">終了</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-20 border border-black">対応者</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-16 border border-black">性別</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-24 border border-black">進捗</th>
                <th className="px-4 py-2 text-left font-bold bg-blue-300 flex-1 border border-black">コール履歴</th>

              </tr>
            </thead>
            <tbody>
              {callHistory.length === 0 ? (
                <tr><td colSpan={isDeleteMode ? 10 : 9} className="px-4 py-3 text-center text-gray-400">履歴なし</td></tr>
              ) : (
                (isEditingAllRows ? editingCallHistoryAll : callHistory).map((entry, displayIndex) => {
                  return (
                    <tr key={displayIndex} className={displayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {isDeleteMode && (
                        <td className="px-2 py-2 text-center border border-black">
                          <input type="checkbox" checked={selectedForDelete.has(displayIndex)} onChange={() => toggleSelectForDelete(displayIndex)} />
                        </td>
                      )}
                      <td className="px-4 py-2 whitespace-nowrap w-16 border border-black">
                        {isEditingAllRows ? (
                          <input type="text" value={editingCallHistoryAll[displayIndex]?.operator || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'operator', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.operator
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-20 border border-black">
                        {isEditingAllRows ? (
                          <input type="date" value={editingCallHistoryAll[displayIndex]?.date || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'date', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.date ? new Date(entry.date).toISOString().split('T')[0] : '-'
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-16 border border-black">
                        {isEditingAllRows ? (
                          <input type="time" value={editingCallHistoryAll[displayIndex]?.startTime || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'startTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.startTime
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-16 border border-black">
                        {isEditingAllRows ? (
                          <input type="time" value={editingCallHistoryAll[displayIndex]?.endTime || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'endTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.endTime
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-20 border border-black">
                        {isEditingAllRows ? (
                          <input type="text" value={editingCallHistoryAll[displayIndex]?.responder || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'responder', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.responder
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-16 border border-black">
                        {isEditingAllRows ? (
                          <input type="text" value={editingCallHistoryAll[displayIndex]?.gender || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'gender', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.gender
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-24 border border-black">
                        {isEditingAllRows ? (
                          <select value={editingCallHistoryAll[displayIndex]?.progress || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'progress', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm">
                            <option value="">選択</option>
                            <option value="受注">受注</option>
                            <option value="見込みA">見込みA</option>
                            <option value="見込みC">見込みC</option>
                            <option value="担当不在">担当不在</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            entry.progress === '受注' ? 'bg-red-100 text-red-700' :
                            entry.progress?.includes('見込み') ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {entry.progress}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 border border-black">
                        {isEditingAllRows ? (
                          <input type="text" value={editingCallHistoryAll[displayIndex]?.note || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'note', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          <div
                            onClick={() => setExpandedNoteIndex(expandedNoteIndex === displayIndex ? null : displayIndex)}
                            className="cursor-pointer hover:bg-blue-50 p-1 rounded break-words text-sm"
                            style={{
                              maxHeight: expandedNoteIndex === displayIndex ? 'none' : '60px',
                              overflow: expandedNoteIndex === displayIndex ? 'visible' : 'hidden',
                              whiteSpace: expandedNoteIndex === displayIndex ? 'pre-wrap' : 'normal'
                            }}
                          >
                            {entry.note}
                          </div>
                        )}
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
