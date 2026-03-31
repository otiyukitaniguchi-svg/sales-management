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
      for (let i = 0; i < editingCallHistoryAll.length; i++) {
        await ApiClient.updateCallHistory(currentList, record.no, i, editingCallHistoryAll[i])
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
          await ApiClient.deleteCallHistory(currentList, record.no, index)
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

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* 上部アクションバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={isSearchMode ? handleSearchExecute : toggleSearchMode}
            disabled={isSearching}
            className={`px-4 py-1 rounded text-sm font-medium border shadow-sm transition-colors ${isSearchMode ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {isSearching ? '検索中...' : (isSearchMode ? '検索実行' : '検索')}
          </button>
          {isSearchMode && (
            <button 
              onClick={toggleSearchMode}
              className="px-4 py-1 bg-red-500 text-white rounded text-sm font-medium border border-red-600 shadow-sm hover:bg-red-600"
            >
              キャンセル
            </button>
          )}
          <span className="text-sm text-gray-600 ml-2">{saveMessage}</span>
        </div>
        <div className="text-sm font-bold flex items-center">
          <span className="mr-2">No.</span>
          <input 
            type="text"
            value={isSearchMode ? (searchRecord.no || '') : (record?.no || '')}
            onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, no: e.target.value}) : null}
            readOnly={!isSearchMode}
            className={`w-12 text-right border-b border-black focus:outline-none bg-transparent ${isSearchMode ? 'text-blue-600 font-bold' : ''}`}
          />
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 顧客基本情報セクション */}
        <div className="bg-[#FFFDE7] border border-gray-300 rounded shadow-sm p-4">
          <h2 className="text-sm font-bold mb-3 border-b border-gray-300 pb-1">【顧客基本情報】</h2>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-9 space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500">《企業名》</label>
                <input 
                  type="text" 
                  placeholder={isSearchMode ? "企業名・フリガナで検索..." : ""}
                  value={isSearchMode ? (searchRecord.companyName || '') : (editedRecord?.companyName || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, companyName: e.target.value}) : handleFieldChange('companyName', e.target.value)}
                  className="w-full border border-gray-300 px-3 py-3 text-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">《住所》</label>
                <input 
                  type="text" 
                  placeholder={isSearchMode ? "住所で検索..." : ""}
                  value={isSearchMode ? (searchRecord.address || '') : (editedRecord?.address || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, address: e.target.value}) : handleFieldChange('address', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500">代表</label>
                  <input 
                    type="text" 
                    placeholder={isSearchMode ? "代表者名で検索..." : ""}
                    value={isSearchMode ? (searchRecord.repName || '') : (editedRecord?.repName || '')}
                    onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, repName: e.target.value}) : handleFieldChange('repName', e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500">担当</label>
                  <input 
                    type="text" 
                    placeholder={isSearchMode ? "担当者名で検索..." : ""}
                    value={isSearchMode ? (searchRecord.staffName || '') : (editedRecord?.staffName || '')}
                    onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, staffName: e.target.value}) : handleFieldChange('staffName', e.target.value)}
                    className="w-full border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">備考</label>
                <textarea 
                  placeholder={isSearchMode ? "備考内容で検索..." : ""}
                  value={isSearchMode ? (searchRecord.memo || '') : (editedRecord?.memo || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, memo: e.target.value}) : handleFieldChange('memo', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm h-16 resize-none"
                />
              </div>
            </div>
            <div className="col-span-3 space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500">固定番号</label>
                <input 
                  type="text" 
                  placeholder={isSearchMode ? "電話番号で検索..." : ""}
                  value={isSearchMode ? (searchRecord.fixedNo || '') : (editedRecord?.fixedNo || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, fixedNo: e.target.value}) : handleFieldChange('fixedNo', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">その他連絡先</label>
                <input 
                  type="text" 
                  value={isSearchMode ? (searchRecord.otherContact || '') : (editedRecord?.otherContact || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, otherContact: e.target.value}) : handleFieldChange('otherContact', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">Mail address</label>
                <input 
                  type="text" 
                  placeholder={isSearchMode ? "メールで検索..." : ""}
                  value={isSearchMode ? (searchRecord.email || '') : (editedRecord?.email || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, email: e.target.value}) : handleFieldChange('email', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">業種</label>
                <input 
                  type="text" 
                  placeholder={isSearchMode ? "業種で検索..." : ""}
                  value={isSearchMode ? (searchRecord.industry || '') : (editedRecord?.industry || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({...searchRecord, industry: e.target.value}) : handleFieldChange('industry', e.target.value)}
                  className="w-full border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 架電履歴セクション */}
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden flex flex-col">
          {/* 架電履歴操作ボタン */}
          {!isSearchMode && (
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center space-x-2">
              <button 
                onClick={handleCallStart}
                disabled={isCallActive || isDeleteMode}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                開始
              </button>
              <button 
                onClick={handleCallEnd}
                disabled={!isCallActive}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                終了
              </button>
              <button 
                onClick={handleEditAllRows}
                disabled={isCallActive || isDeleteMode}
                className={`px-3 py-1 rounded text-sm font-medium border shadow-sm transition-colors ${isEditingAllRows ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' : 'bg-yellow-600 text-white border-yellow-700 hover:bg-yellow-700'}`}
              >
                {isEditingAllRows ? '保存' : '編集'}
              </button>
              <button 
                onClick={handleDeleteModeToggle}
                disabled={isCallActive || isEditingAllRows}
                className={`px-3 py-1 rounded text-sm font-medium border shadow-sm transition-colors ${isDeleteMode ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-gray-600 text-white border-gray-700 hover:bg-gray-700'}`}
              >
                {isDeleteMode ? (selectedDeleteIndices.length > 0 ? '実行' : 'キャンセル') : '削除/実行'}
              </button>
            </div>
          )}
          
          {/* 架電履歴テーブル */}
          <div className="overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '300px' }}>
              <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
                <thead className="bg-blue-100 sticky top-0">
                  <tr>
                    {isDeleteMode && <th className="border border-gray-300 px-1 py-1 w-8"></th>}
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '90px', minWidth: '90px' }}>担当者</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '90px', minWidth: '90px' }}>対応日</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '70px', minWidth: '70px' }}>開始</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '70px', minWidth: '70px' }}>終了</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '90px', minWidth: '90px' }}>対応者</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '50px', minWidth: '50px' }}>性別</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ width: '80px', minWidth: '80px' }}>進捗</th>
                    <th className="border border-gray-300 px-2 py-1 text-[10px]" style={{ flex: 1 }}>コール履歴</th>
                  </tr>
                </thead>
                <tbody>
                  {isSearchMode ? (
                    <tr className="bg-yellow-50" style={{ height: 'auto' }}>
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
