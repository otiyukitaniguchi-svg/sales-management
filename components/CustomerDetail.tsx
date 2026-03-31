'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

export default function CustomerDetail() {
  const currentList = useAppStore((state) => state.currentList)
  const currentListIndex = useAppStore((state) => state.currentListIndex)
  const listData = useAppStore((state) => state.listData)
  const setListData = useAppStore((state) => state.setListData)
  const setCurrentList = useAppStore((state) => state.setCurrentList)
  const setCurrentListIndex = useAppStore((state) => state.setCurrentListIndex)
  const user = useAppStore((state) => state.user)

  const records = listData[currentList] || []
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
  const [expandedNoteIndex, setExpandedNoteIndex] = useState<number | null>(null)
  const [currentCall, setCurrentCall] = useState<Partial<FrontendCallHistoryEntry>>({})
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchRecord, setSearchRecord] = useState<Partial<FrontendCustomerRecord>>({})
  const [searchHistory, setSearchHistory] = useState<Partial<FrontendCallHistoryEntry>>({})
  const [isSearching, setIsSearching] = useState(false)
  
  // 削除モード用の状態
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedDeleteIndices, setSelectedDeleteIndices] = useState<number[]>([])

  useEffect(() => {
    if (record && !isSearchMode) {
      setEditedRecord({ ...record })
      loadCallHistory()
    }
  }, [record, isSearchMode])

  const loadCallHistory = async () => {
    if (!record) return
    try {
      const response = await ApiClient.getCallHistory(currentList, record.no)
      let history = (response as any).data || []
      if (Array.isArray(history)) {
        // 日付と開始時間で降順（最新順）にソート
        history.sort((a: any, b: any) => {
          const dateA = new Date(`${a.date} ${a.startTime || '00:00'}`)
          const dateB = new Date(`${b.date} ${b.startTime || '00:00'}`)
          return dateB.getTime() - dateA.getTime()
        })
      }
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
          setCurrentCall({})
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
      // 編集内容を保存
      // 注意: callHistoryは最新順にソートされているが、ApiClient.updateCallHistoryのindexは
      // データベース上のインデックス（作成順）を期待している可能性がある。
      // しかし、現在のAPI実装（/api/call-history/[id]）はIDベースなので、
      // フロントエンドの各エントリがIDを持っているか確認が必要。
      
      for (let i = 0; i < editingCallHistoryAll.length; i++) {
        const entry = editingCallHistoryAll[i]
        // IDがある場合はIDベースの更新APIを使用する
        if ((entry as any).id) {
          await fetch(`/api/call-history/${(entry as any).id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          })
        } else {
          // IDがない場合は従来のインデックスベース（非推奨だが互換性のため）
          await ApiClient.updateCallHistory(currentList, record.no, i, entry)
        }
      }
      
      // 保存完了後に編集モードを確実に終了
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
      // 念のためここでも編集モードを終了
      setIsEditingAllRows(false)
    }
  }

  const handleEditingAllRowsFieldChange = (index: number, field: string, value: string) => {
    const updated = [...editingCallHistoryAll]
    updated[index] = { ...updated[index], [field]: value }
    setEditingCallHistoryAll(updated)
  }

  // 削除モードの切り替えと実行
  const handleDeleteModeToggle = async () => {
    if (isDeleteMode) {
      if (selectedDeleteIndices.length === 0) {
        setIsDeleteMode(false)
        return
      }
      
      if (!confirm(`${selectedDeleteIndices.length}件の履歴を削除しますか？`)) return
      
      setIsSaving(true)
      try {
        // インデックスが大きい順に削除して、インデックスのズレを防ぐ
        const sortedIndices = [...selectedDeleteIndices].sort((a, b) => b - a)
        for (const index of sortedIndices) {
          const entry = callHistory[index]
          if ((entry as any).id) {
            await fetch(`/api/call-history/${(entry as any).id}`, { method: 'DELETE' })
          } else {
            await ApiClient.deleteCallHistory(currentList, record.no, index)
          }
        }
        setIsDeleteMode(false)
        setSelectedDeleteIndices([])
        await loadCallHistory()
        setSaveMessage('✓ 選択した履歴を削除しました')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (error) {
        console.error('Failed to delete selected rows:', error)
      } finally {
        setIsSaving(false)
      }
    } else {
      setIsDeleteMode(true)
      setSelectedDeleteIndices([])
    }
  }

  const toggleDeleteSelection = (index: number) => {
    setSelectedDeleteIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  // 検索モードへの切り替え
  const toggleSearchMode = () => {
    if (!isSearchMode) {
      setIsSearchMode(true)
      setSearchRecord({})
      setSearchHistory({})
      setEditedRecord(null)
      setCallHistory([])
    } else {
      setIsSearchMode(false)
      if (record) {
        setEditedRecord({ ...record })
        loadCallHistory()
      }
    }
  }

  // 検索の実行
  const handleSearchExecute = async () => {
    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      if (searchRecord.no) params.append('no', searchRecord.no)
      if (searchRecord.companyName) params.append('companyName', searchRecord.companyName)
      if (searchRecord.address) params.append('address', searchRecord.address)
      if (searchRecord.repName) params.append('repName', searchRecord.repName)
      if (searchRecord.staffName) params.append('staffName', searchRecord.staffName)
      if (searchRecord.memo) params.append('memo', searchRecord.memo)
      if (searchRecord.fixedNo) params.append('fixedNo', searchRecord.fixedNo)
      if (searchRecord.otherContact) params.append('otherContact', searchRecord.otherContact)
      if (searchRecord.email) params.append('email', searchRecord.email)
      if (searchRecord.industry) params.append('industry', searchRecord.industry)
      
      if (searchHistory.operator) params.append('operator', searchHistory.operator)
      if (searchHistory.responder) params.append('responder', searchHistory.responder)
      if (searchHistory.progress) params.append('progress', searchHistory.progress)
      if (searchHistory.note) params.append('historyNote', searchHistory.note)

      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()

      if (data.success && data.results.length > 0) {
        const groupedByList: { [key: string]: any[] } = {}
        data.results.forEach((r: any) => {
          const listId = r.listId || currentList
          if (!groupedByList[listId]) {
            groupedByList[listId] = []
          }
          groupedByList[listId].push(r.record)
        })
        
        Object.entries(groupedByList).forEach(([listId, records]) => {
          setListData(listId, records)
        })
        
        const firstResult = data.results[0]
        setCurrentList(firstResult.listId)
        setCurrentListIndex(0)
        
        setIsSearchMode(false)
        setSaveMessage(`✓ ${data.results.length}件ヒットしました`)
      } else {
        setSaveMessage('✗ 該当するデータが見つかりませんでした')
      }
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Search failed:', error)
      setSaveMessage('✗ 検索に失敗しました')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSetRecall = async () => {
    if (!editedRecord || !record) return
    setIsSaving(true)
    try {
      const success = await ApiClient.updateCustomer(currentList, record.no, {
        ...editedRecord,
        recallDate: editedRecord.recallDate,
        recallTime: editedRecord.recallTime
      })
      if (success) {
        setSaveMessage('✓ 再コール日時を設定しました')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    } catch (error) {
      console.error('Failed to set recall:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* 上部アクションバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={isSearchMode ? handleSearchExecute : toggleSearchMode}
            disabled={isSearching}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              isSearchMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSearching ? '検索中...' : isSearchMode ? '検索実行' : '検索モード'}
          </button>
          {isSearchMode && (
            <button 
              onClick={toggleSearchMode}
              className="px-4 py-1.5 rounded text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              キャンセル
            </button>
          )}
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {currentList}: {currentListIndex + 1} / {records.length}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 顧客情報セクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">顧客情報</h3>
            {!isSearchMode && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'No', field: 'no' },
                { label: '会社名', field: 'companyName' },
                { label: '会社名(カナ)', field: 'companyKana' },
                { label: '電話番号', field: 'fixedNo' },
                { label: 'その他連絡先', field: 'otherContact' },
                { label: '郵便番号', field: 'zipCode' },
                { label: '住所', field: 'address' },
                { label: '代表者名', field: 'repName' },
                { label: '担当者名', field: 'staffName' },
                { label: 'メールアドレス', field: 'email' },
                { label: '業種', field: 'industry' },
                { label: '備考', field: 'memo' },
              ].map((item) => (
                <div key={item.field} className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">{item.label}</label>
                  {isSearchMode ? (
                    <input
                      type="text"
                      value={(searchRecord as any)[item.field] || ''}
                      onChange={(e) => setSearchRecord({ ...searchRecord, [item.field]: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`${item.label}で検索...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={(editedRecord as any)?.[item.field] || ''}
                      onChange={(e) => handleFieldChange(item.field, e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-3 text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 架電履歴セクション */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-700">架電履歴</h3>
              {!isSearchMode && (
                <>
                  <button 
                    onClick={isCallActive ? handleCallEnd : handleCallStart}
                    className={`px-3 py-1 rounded text-sm font-medium text-white ${isCallActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isCallActive ? '終了' : '開始'}
                  </button>
                  <button 
                    onClick={handleEditAllRows}
                    className={`px-3 py-1 rounded text-sm font-medium ${isEditingAllRows ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {isEditingAllRows ? '保存' : '編集'}
                  </button>
                  <button 
                    onClick={handleDeleteModeToggle}
                    className={`px-3 py-1 rounded text-sm font-medium ${isDeleteMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {isDeleteMode ? (selectedDeleteIndices.length > 0 ? '実行' : '解除') : '削除'}
                  </button>
                </>
              )}
            </div>
            
            {/* 再コール日時設定セクション */}
            {!isSearchMode && (
              <div className="flex items-center space-x-2 bg-white p-1 rounded border border-gray-200">
                <span className="text-xs font-bold text-gray-600 px-1">再コール日時</span>
                <input 
                  type="date" 
                  value={editedRecord?.recallDate || ''} 
                  onChange={(e) => handleFieldChange('recallDate', e.target.value)}
                  className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                />
                <input 
                  type="time" 
                  value={editedRecord?.recallTime || ''} 
                  onChange={(e) => handleFieldChange('recallTime', e.target.value)}
                  className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                />
                <button 
                  onClick={handleSetRecall}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-2 py-0.5 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  設定
                </button>
              </div>
            )}
          </div>
          <div className="p-0 overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <table className="min-w-full border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-100">
                    {isDeleteMode && <th className="border border-gray-300 px-1 py-1 text-xs text-gray-600 w-[40px]">選択</th>}
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[90px]">担当者</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[90px]">対応日</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[70px]">開始</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[70px]">終了</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[90px]">対応者</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[50px]">性別</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600 w-[80px]">進捗</th>
                    <th className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-600">コール履歴</th>
                  </tr>
                </thead>
                <tbody>
                  {isSearchMode ? (
                    <tr className="bg-blue-50">
                      <td className="border border-gray-300 p-1">
                        <input 
                          type="text" 
                          placeholder="担当者検索"
                          value={searchHistory.operator || ''}
                          onChange={(e) => setSearchHistory({...searchHistory, operator: e.target.value})}
                          className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                        />
                      </td>
                      <td colSpan={2} className="border border-gray-300 p-1 text-center text-xs text-gray-400">-</td>
                      <td className="border border-gray-300 p-1 text-center text-xs text-gray-400">-</td>
                      <td className="border border-gray-300 p-1">
                        <input 
                          type="text" 
                          placeholder="対応者検索"
                          value={searchHistory.responder || ''}
                          onChange={(e) => setSearchHistory({...searchHistory, responder: e.target.value})}
                          className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                        />
                      </td>
                      <td className="border border-gray-300 p-1 text-center text-xs text-gray-400">-</td>
                      <td className="border border-gray-300 p-1">
                        <select 
                          value={searchHistory.progress || ''}
                          onChange={(e) => setSearchHistory({...searchHistory, progress: e.target.value})}
                          className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                        >
                          <option value="">進捗検索</option>
                          <option value="受注">受注</option>
                          <option value="見込みA">見込みA</option>
                          <option value="見込みC">見込みC</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-1">
                        <input 
                          type="text" 
                          placeholder="履歴の内容で検索..."
                          value={searchHistory.note || ''}
                          onChange={(e) => setSearchHistory({...searchHistory, note: e.target.value})}
                          className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                        />
                      </td>
                    </tr>
                  ) : (
                    callHistory.length > 0 ? (
                      callHistory.map((entry, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50 ${selectedDeleteIndices.includes(idx) ? 'bg-red-50' : ''}`} style={{ height: 'auto' }}>
                          {isDeleteMode && (
                            <td className="border border-gray-300 px-1 py-1 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedDeleteIndices.includes(idx)}
                                onChange={() => toggleDeleteSelection(idx)}
                              />
                            </td>
                          )}
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <input 
                                type="text" 
                                value={isCallActive && idx === 0 ? editingCallData?.operator || '' : editingCallHistoryAll[idx]?.operator || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, operator: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'operator', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              />
                            ) : entry.operator}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">{entry.date}</td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <input 
                                type="text" 
                                value={isCallActive && idx === 0 ? editingCallData?.startTime || '' : editingCallHistoryAll[idx]?.startTime || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, startTime: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'startTime', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              />
                            ) : entry.startTime}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <input 
                                type="text" 
                                value={isCallActive && idx === 0 ? editingCallData?.endTime || '' : editingCallHistoryAll[idx]?.endTime || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, endTime: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'endTime', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              />
                            ) : entry.endTime}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <input 
                                type="text" 
                                value={isCallActive && idx === 0 ? editingCallData?.responder || '' : editingCallHistoryAll[idx]?.responder || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, responder: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'responder', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              />
                            ) : entry.responder}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <select 
                                value={isCallActive && idx === 0 ? editingCallData?.gender || '' : editingCallHistoryAll[idx]?.gender || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, gender: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'gender', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              >
                                <option value="">-</option>
                                <option value="男性">男性</option>
                                <option value="女性">女性</option>
                              </select>
                            ) : entry.gender}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <select 
                                value={isCallActive && idx === 0 ? editingCallData?.progress || '' : editingCallHistoryAll[idx]?.progress || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, progress: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'progress', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs"
                              >
                                <option value="">-</option>
                                <option value="受注">受注</option>
                                <option value="見込みA">見込みA</option>
                                <option value="見込みC">見込みC</option>
                                <option value="留守">留守</option>
                                <option value="拒否">拒否</option>
                              </select>
                            ) : entry.progress}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-xs">
                            {isEditingAllRows || (isCallActive && idx === 0) ? (
                              <textarea 
                                value={isCallActive && idx === 0 ? editingCallData?.note || '' : editingCallHistoryAll[idx]?.note || ''}
                                onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, note: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'note', e.target.value)}
                                className="w-full border border-gray-300 px-1 py-0.5 text-xs resize-none overflow-y-auto" style={{ height: '20px', minHeight: '20px' }}
                              />
                            ) : (
                              <div className="text-xs whitespace-pre-wrap break-words overflow-y-auto" style={{ height: '20px', minHeight: '20px' }}>
                                {entry.note}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isDeleteMode ? 9 : 8} className="border border-gray-300 px-2 py-4 text-center text-xs text-gray-400">
                          履歴はありません
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
