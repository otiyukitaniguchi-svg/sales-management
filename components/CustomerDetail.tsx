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
  const [recallDateMap, setRecallDateMap] = useState<{ [key: string]: string }>({})
  const [expandedNoteIndex, setExpandedNoteIndex] = useState<number | null>(null)
  const [currentCall, setCurrentCall] = useState<Partial<FrontendCallHistoryEntry>>({})
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchRecord, setSearchRecord] = useState<Partial<FrontendCustomerRecord>>({})

  useEffect(() => {
    if (record) {
      setEditedRecord({ ...record })
      loadCallHistory()
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

  const handleSearchFieldChange = (field: string, value: string) => {
    setSearchRecord({ ...searchRecord, [field]: value })
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
    
    setEditingCallData(finalEntry)
    
    setTimeout(async () => {
      setIsCallActive(false)
      setEditingCallIndex(null)
      setEditingCallData(null)
      
      try {
        const success = await ApiClient.createCallHistory(currentList, record.no, finalEntry)
        if (success) {
          resetCurrentCall()
          await loadCallHistory()
        }
      } catch (error) {
        console.error('Failed to save call history:', error)
      }
    }, 300)
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

  const handleSearch = async () => {
    if (!searchRecord || Object.keys(searchRecord).length === 0) {
      alert('検索条件を入力してください')
      return
    }

    try {
      const allRecords = listData[currentList] || []
      const filtered = allRecords.filter((rec: FrontendCustomerRecord) => {
        return Object.entries(searchRecord).every(([key, value]) => {
          if (!value) return true
          const recValue = (rec as any)[key]?.toString().toLowerCase() || ''
          return recValue.includes(value.toString().toLowerCase())
        })
      })

      if (filtered.length === 0) {
        alert('該当する顧客がありません')
        return
      }

      alert(`${filtered.length}件の顧客が見つかりました`)
      setIsSearchMode(false)
    } catch (error) {
      console.error('Search failed:', error)
      alert('検索中にエラーが発生しました')
    }
  }

  if (!record || !editedRecord) {
    return <div className="p-4 text-center text-gray-400">顧客を選択してください</div>
  }

  if (isSearchMode) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-[#fdfcf0] min-h-full">
        <div className="border-2 border-black rounded-lg p-4 bg-[#fdfcf0]">
          <h2 className="text-sm font-bold mb-4">【検索モード】</h2>
          
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-10 flex flex-col gap-2">
              <div className="border border-black p-2 rounded bg-white">
                <label className="block text-[10px] font-bold mb-1">企業名</label>
                <input
                  type="text"
                  value={searchRecord.companyName || ''}
                  onChange={(e) => handleSearchFieldChange('companyName', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-2 text-sm focus:outline-none"
                  placeholder="企業名で検索"
                />
              </div>

              <div className="border border-black p-2 rounded bg-white">
                <label className="block text-[10px] font-bold mb-1">住所</label>
                <input
                  type="text"
                  value={searchRecord.address || ''}
                  onChange={(e) => handleSearchFieldChange('address', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-2 text-sm focus:outline-none"
                  placeholder="住所で検索"
                />
              </div>

              <div className="border border-black p-2 rounded bg-white">
                <label className="block text-[10px] font-bold mb-1">電話番号</label>
                <input
                  type="text"
                  value={searchRecord.fixedNo || ''}
                  onChange={(e) => handleSearchFieldChange('fixedNo', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-2 text-sm focus:outline-none"
                  placeholder="電話番号で検索"
                />
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <button onClick={handleSearch} className="px-3 py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600">
                検索実行
              </button>
              <button onClick={() => setIsSearchMode(false)} className="px-3 py-2 bg-gray-400 text-white rounded text-sm font-semibold hover:bg-gray-500">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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

            {/* 代表・担当 */}
            <div className="flex gap-2">
              <div className="border border-black p-2 rounded bg-white flex-1">
                <label className="block text-[10px] font-bold mb-1">代表</label>
                <input
                  type="text"
                  value={editedRecord.repKana || ''}
                  onChange={(e) => handleFieldChange('repKana', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-xs mb-1 focus:outline-none"
                  placeholder="フリガナ"
                />
                <input
                  type="text"
                  value={editedRecord.repName || ''}
                  onChange={(e) => handleFieldChange('repName', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
                  placeholder="漢字"
                />
              </div>
              <div className="border border-black p-2 rounded bg-white flex-1">
                <label className="block text-[10px] font-bold mb-1">担当</label>
                <input
                  type="text"
                  value={editedRecord.staffKana || ''}
                  onChange={(e) => handleFieldChange('staffKana', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-xs mb-1 focus:outline-none"
                  placeholder="フリガナ"
                />
                <input
                  type="text"
                  value={editedRecord.staffName || ''}
                  onChange={(e) => handleFieldChange('staffName', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none"
                  placeholder="漢字"
                />
              </div>
            </div>

            {/* 備考 */}
            <div className="border border-black p-2 rounded bg-white">
              <label className="block text-[10px] font-bold mb-1">備考</label>
              <textarea
                value={editedRecord.memo || ''}
                onChange={(e) => handleFieldChange('memo', e.target.value)}
                className="w-full border border-gray-300 px-2 py-1 text-sm h-[60px] focus:outline-none resize-none"
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
      </div>

      {/* 架電履歴セクション */}
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
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-16 border border-black">担当者</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-24 border border-black">対応日</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-20 border border-black">開始</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 w-20 border border-black">終了</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 flex-1 border border-black">対応者</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 flex-1 border border-black">性別</th>
                <th className="px-4 py-2 text-left whitespace-nowrap font-bold bg-blue-300 flex-1 border border-black">進捗</th>
                <th className="px-4 py-2 text-left font-bold bg-blue-300 flex-1 border border-black">コール履歴</th>
                <th className="px-4 py-2 text-center whitespace-nowrap font-bold bg-blue-300 w-16 border border-black">削除</th>
              </tr>
            </thead>
            <tbody>
              {callHistory.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-3 text-center text-gray-400">履歴なし</td></tr>
              ) : (
                (isEditingAllRows ? editingCallHistoryAll : callHistory).map((entry, displayIndex) => {
                  const isCurrentCall = isCallActive && displayIndex === 0 && editingCallData
                  return (
                    <tr key={displayIndex} className={displayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap w-16 border border-black text-sm">
                        {isEditingAllRows ? (
                          <input type="text" value={editingCallHistoryAll[displayIndex]?.operator || ''} onChange={(e) => handleEditingAllRowsFieldChange(displayIndex, 'operator', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.operator
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-24 border border-black text-sm">
                        {isEditingAllRows ? (
                          <input type="date" value={isCurrentCall ? editingCallData?.date || '' : editingCallHistoryAll[displayIndex]?.date || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, date: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'date', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.date ? new Date(entry.date).toISOString().split('T')[0] : '-'
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-20 border border-black text-sm">
                        {isEditingAllRows ? (
                          <input type="time" value={isCurrentCall ? editingCallData?.startTime || '' : editingCallHistoryAll[displayIndex]?.startTime || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, startTime: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'startTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.startTime
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap w-20 border border-black text-sm">
                        {isEditingAllRows ? (
                          <input type="time" value={isCurrentCall ? editingCallData?.endTime || '' : editingCallHistoryAll[displayIndex]?.endTime || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, endTime: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'endTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.endTime
                        )}
                      </td>
                      <td className="px-4 py-2 border border-black text-sm">
                        {isEditingAllRows || isCurrentCall ? (
                          <input type="text" value={isCurrentCall ? editingCallData?.responder || '' : editingCallHistoryAll[displayIndex]?.responder || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, responder: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'responder', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                        ) : (
                          entry.responder
                        )}
                      </td>
                      <td className="px-4 py-2 border border-black text-sm">
                        {isEditingAllRows || isCurrentCall ? (
                          <select value={isCurrentCall ? editingCallData?.gender || '' : editingCallHistoryAll[displayIndex]?.gender || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, gender: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'gender', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm">
                            <option value="">-</option>
                            <option value="男性">男性</option>
                            <option value="女性">女性</option>
                          </select>
                        ) : (
                          entry.gender
                        )}
                      </td>
                      <td className="px-4 py-2 border border-black text-sm">
                        {isEditingAllRows || isCurrentCall ? (
                          <select value={isCurrentCall ? editingCallData?.progress || '' : editingCallHistoryAll[displayIndex]?.progress || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, progress: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'progress', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm">
                            <option value="">-</option>
                            <option value="受注">受注</option>
                            <option value="見込みA">見込みA</option>
                            <option value="見込みC">見込みC</option>
                            <option value="いつの日か">いつの日か</option>
                            <option value="留守">留守</option>
                            <option value="担当不在">担当不在</option>
                            <option value="前回受注">前回受注</option>
                            <option value="現アナ">現アナ</option>
                            <option value="前回NG">前回NG</option>
                            <option value="前回採択">前回採択</option>
                            <option value="閉業">閉業</option>
                          </select>
                        ) : (
                          entry.progress
                        )}
                      </td>
                      <td className="px-4 py-2 border border-black text-sm">
                        {isEditingAllRows || isCurrentCall ? (
                          <textarea value={isCurrentCall ? editingCallData?.note || '' : editingCallHistoryAll[displayIndex]?.note || ''} onChange={(e) => isCurrentCall ? setEditingCallData({...editingCallData, note: e.target.value}) : handleEditingAllRowsFieldChange(displayIndex, 'note', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm h-12 resize-none" />
                        ) : (
                          <div className="relative group">
                            <div className={`text-sm ${expandedNoteIndex === displayIndex ? '' : 'line-clamp-2'}`}>
                              {entry.note}
                            </div>
                            {entry.note && entry.note.length > 50 && (
                              <button onClick={() => setExpandedNoteIndex(expandedNoteIndex === displayIndex ? null : displayIndex)} className="text-[10px] text-blue-500 hover:underline mt-1">
                                {expandedNoteIndex === displayIndex ? '閉じる' : '全文表示'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center border border-black text-sm">
                        {!isEditingAllRows && !isCurrentCall && (
                          <button onClick={() => handleDeleteCallHistory(displayIndex)} className="px-2 py-1 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600">
                            削除
                          </button>
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
