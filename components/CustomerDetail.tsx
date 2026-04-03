'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'
import { PROGRESS_OPTIONS, GENDER_OPTIONS } from '@/lib/labels'

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
  const [currentCall, setCurrentCall] = useState<Partial<FrontendCallHistoryEntry>>({})
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchRecord, setSearchRecord] = useState<Partial<FrontendCustomerRecord>>({})
  const [searchHistory, setSearchHistory] = useState<Partial<FrontendCallHistoryEntry>>({})
  const [isSearching, setIsSearching] = useState(false)
  
  // 削除モード用の状態
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedDeleteIndices, setSelectedDeleteIndices] = useState<number[]>([])

  // レコードごとの編集状態を保持するためのキャッシュ
  const [editCache, setEditCache] = useState<{[key: string]: FrontendCustomerRecord}>({})

  // 履歴の展開状態を管理
  const [expandedHistoryIndices, setExpandedHistoryIndices] = useState<number[]>([])

  useEffect(() => {
    if (record && !isSearchMode) {
      // キャッシュがあればそれを使用、なければレコードから初期化
      const cacheKey = `${currentList}-${record.no}`
      if (editCache[cacheKey]) {
        setEditedRecord(editCache[cacheKey])
      } else {
        setEditedRecord({ ...record })
      }
      loadCallHistory()
      setExpandedHistoryIndices([]) // レコード切り替え時に展開状態をリセット
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
    if (editedRecord && record) {
      const updated = { ...editedRecord, [field]: value }
      setEditedRecord(updated)
      
      // キャッシュを更新
      const cacheKey = `${currentList}-${record.no}`
      setEditCache(prev => ({
        ...prev,
        [cacheKey]: updated
      }))
    }
  }

  const handleSave = async () => {
    if (!editedRecord || !record) return
    setIsSaving(true)
    try {
      const success = await ApiClient.updateCustomer(currentList, record.no, editedRecord)
      if (success) {
        // 保存成功時にストアのデータも更新して同期をとる
        const updatedRecords = [...records]
        updatedRecords[currentListIndex] = editedRecord
        setListData(currentList, updatedRecords)
        
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
      for (let i = 0; i < editingCallHistoryAll.length; i++) {
        const entry = editingCallHistoryAll[i]
        let success = false
        
        // IDがある場合はIDベースの更新APIを使用する
        if ((entry as any).id) {
          const response = await fetch(`/api/call-history/${(entry as any).id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          })
          const result = await response.json()
          success = response.ok && (result.success || !result.error)
        } else {
          // IDがない場合はインデックスベースの更新APIを使用する
          success = await ApiClient.updateCallHistory(currentList, record.no, i, entry)
        }
        
        if (!success) {
          throw new Error(`履歴の保存に失敗しました (Index: ${i})`)
        }
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
      setIsEditingAllRows(false)
    }
  }

  const handleEditingAllRowsFieldChange = (index: number, field: string, value: string) => {
    const updated = [...editingCallHistoryAll]
    updated[index] = { ...updated[index], [field]: value }
    setEditingCallHistoryAll(updated)
  }

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
          let success = false
          
          if ((entry as any).id) {
            const response = await fetch(`/api/call-history/${(entry as any).id}`, { method: 'DELETE' })
            const result = await response.json()
            success = response.ok && (result.success || !result.error)
          } else {
            success = await ApiClient.deleteCallHistory(currentList, record.no, index)
          }
          
          if (!success) {
            console.error(`Failed to delete index ${index}`)
          }
        }
        setIsDeleteMode(false)
        setSelectedDeleteIndices([])
        await loadCallHistory()
        setSaveMessage('✓ 選択した履歴を削除しました')
        setTimeout(() => setSaveMessage(''), 2000)
      } catch (error) {
        console.error('Failed to delete selected rows:', error)
        setSaveMessage('✗ 削除に失敗しました')
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
        const cacheKey = `${currentList}-${record.no}`
        setEditedRecord(editCache[cacheKey] || { ...record })
        loadCallHistory()
      }
    }
  }

  const handleClearSearch = async () => {
    setIsSearchMode(false)
    setSearchRecord({})
    setSearchHistory({})
    // 元のリストデータを再読み込みして通常表示に戻す
    try {
      const result = await ApiClient.getListData(currentList)
      if (result.success && result.data) {
        setListData(currentList, result.data)
        setCurrentListIndex(0)
      }
    } catch (error) {
      console.error('Reload failed:', error)
    }
    if (record) {
      const cacheKey = `${currentList}-${record.no}`
      setEditedRecord(editCache[cacheKey] || { ...record })
      loadCallHistory()
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isSearchMode && !isSearching) {
      handleSearchExecute()
    }
  }

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
      if (searchHistory.date) params.append('historyDate', searchHistory.date)
      if (searchHistory.startTime) params.append('historyStartTime', searchHistory.startTime)
      if (searchHistory.endTime) params.append('historyEndTime', searchHistory.endTime)
      if (searchHistory.responder) params.append('responder', searchHistory.responder)
      if (searchHistory.gender) params.append('historyGender', searchHistory.gender)
      if (searchHistory.progress) params.append('progress', searchHistory.progress)
      if (searchHistory.note) params.append('historyNote', searchHistory.note)
      // 再コール日時の検索（空欄検索含む）
      if (searchRecord.recallDate !== undefined) params.append('recallDate', searchRecord.recallDate || '')
      if (searchRecord.recallTime !== undefined) params.append('recallTime', searchRecord.recallTime || '')

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
        // 保存成功時にストアのデータも更新
        const updatedRecords = [...records]
        updatedRecords[currentListIndex] = editedRecord
        setListData(currentList, updatedRecords)
        
        setSaveMessage('✓ 再コール日時を設定しました')
        setTimeout(() => setSaveMessage(''), 2000)
      }
    } catch (error) {
      console.error('Failed to set recall:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleHistoryExpand = (index: number) => {
    setExpandedHistoryIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden tracking-wider">
      {/* 上部アクションバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleSearchMode}
            className={`px-4 py-1 rounded text-sm font-medium transition-colors ${
              isSearchMode 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSearchMode ? '検索キャンセル' : '検索モード開始'}
          </button>
          {isSearchMode && (
            <button
              onClick={handleSearchExecute}
              disabled={isSearching}
              className="px-4 py-1 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSearching ? '検索中...' : '検索実行'}
            </button>
          )}
          {!isSearchMode && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-1 rounded text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              検索解除
            </button>
          )}
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
        <div className="text-sm font-bold">
          No. {isSearchMode ? '---' : (record?.no || '---')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 顧客情報セクション */}
        <div className="bg-[#FFFDE7] border border-gray-300 rounded shadow-sm p-4">
          <div className="flex justify-between items-center mb-3 border-b border-gray-300 pb-1">
            <h2 className="text-sm font-bold">【顧客基本情報】</h2>
            {!isSearchMode && (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-9 space-y-4">
              {[
                { label: '《企業名》', field: 'companyName', placeholder: '企業名・フリガナで検索...', height: 'h-12', fontSize: 'text-xl' },
                { label: '《住所》', field: 'address', placeholder: '住所で検索...', height: 'h-10', fontSize: 'text-lg' },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-[10px] text-gray-500 mb-1">{item.label}</label>
                  <input
                    type="text"
                    placeholder={isSearchMode ? item.placeholder : ""}
                    value={isSearchMode ? ((searchRecord as any)[item.field] || '') : ((editedRecord as any)?.[item.field] || '')}
                    onChange={(e) => isSearchMode ? setSearchRecord({ ...searchRecord, [item.field]: e.target.value }) : handleFieldChange(item.field, e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className={`w-full border border-gray-300 px-3 py-2 ${item.fontSize} ${item.height} ${item.field === 'companyName' ? 'font-bold' : ''}`}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '《代表》', field: 'repName', placeholder: '代表者名で検索...' },
                  { label: '《担当》', field: 'staffName', placeholder: '担当者名で検索...' },
                ].map((item) => (
                  <div key={item.field}>
                    <label className="block text-[10px] text-gray-500 mb-1">{item.label}</label>
                    <input
                      type="text"
                      placeholder={isSearchMode ? item.placeholder : ""}
                      value={isSearchMode ? ((searchRecord as any)[item.field] || '') : ((editedRecord as any)?.[item.field] || '')}
                      onChange={(e) => isSearchMode ? setSearchRecord({ ...searchRecord, [item.field]: e.target.value }) : handleFieldChange(item.field, e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full border border-gray-300 px-3 py-2 text-base h-10 tracking-wider"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">備考</label>
                <textarea
                  placeholder={isSearchMode ? "備考内容で検索..." : ""}
                  value={isSearchMode ? (searchRecord.memo || '') : (editedRecord?.memo || '')}
                  onChange={(e) => isSearchMode ? setSearchRecord({ ...searchRecord, memo: e.target.value }) : handleFieldChange('memo', e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full border border-gray-300 px-2 py-1 text-sm h-16 resize-none"
                />
              </div>
            </div>
            <div className="col-span-3 space-y-3">
              {[
                { label: '《固定番号》', field: 'fixedNo' },
                { label: '《その他連絡先》', field: 'otherContact' },
                { label: '《メールアドレス》', field: 'email' },
                { label: '《業種》', field: 'industry' },
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-[10px] text-gray-500 mb-1">{item.label}</label>
                  <input
                    type="text"
                    value={isSearchMode ? ((searchRecord as any)[item.field] || '') : ((editedRecord as any)?.[item.field] || '')}
                    onChange={(e) => isSearchMode ? setSearchRecord({ ...searchRecord, [item.field]: e.target.value }) : handleFieldChange(item.field, e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full border border-gray-300 px-3 py-2 text-base h-10 tracking-wider"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 架電履歴セクション */}
        <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold">架電履歴</h2>
              {!isSearchMode && (
                <>
                  <button 
                    onClick={isCallActive ? handleCallEnd : handleCallStart}
                    className={`px-3 py-1 rounded text-xs font-medium text-white ${isCallActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isCallActive ? '終了' : '開始'}
                  </button>
                  <button 
                    onClick={handleEditAllRows}
                    className={`px-3 py-1 rounded text-xs font-medium ${isEditingAllRows ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {isEditingAllRows ? '保存' : '編集'}
                  </button>
                  <button 
                    onClick={handleDeleteModeToggle}
                    className={`px-3 py-1 rounded text-xs font-medium ${isDeleteMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    {isDeleteMode ? (selectedDeleteIndices.length > 0 ? '実行' : '解除') : '削除'}
                  </button>
                </>
              )}
            </div>
            
            {/* 再コール日時設定セクション */}
            <div className="flex items-center space-x-2 bg-white p-1 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-600 px-1">
                {isSearchMode ? '再コール日時検索' : '再コール日時'}
              </span>
              <input 
                type="date" 
                value={isSearchMode ? (searchRecord.recallDate ?? '') : (editedRecord?.recallDate || '')} 
                onChange={(e) => isSearchMode 
                  ? setSearchRecord({...searchRecord, recallDate: e.target.value})
                  : handleFieldChange('recallDate', e.target.value)
                }
                className="border border-gray-300 rounded px-1 py-0.5 text-[10px]"
              />
              <input 
                type="time" 
                value={isSearchMode ? (searchRecord.recallTime ?? '') : (editedRecord?.recallTime || '')} 
                onChange={(e) => isSearchMode
                  ? setSearchRecord({...searchRecord, recallTime: e.target.value})
                  : handleFieldChange('recallTime', e.target.value)
                }
                className="border border-gray-300 rounded px-1 py-0.5 text-[10px]"
              />
              {isSearchMode ? (
                <span className="text-[9px] text-gray-400">空欄のまま検索→未設定を検索</span>
              ) : (
                <button 
                  onClick={handleSetRecall}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-green-700 disabled:opacity-50"
                >
                  設定
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '180px' }}>
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-blue-100 sticky top-0 z-10">
                <tr>
                  {isDeleteMode && <th className="border border-gray-300 px-1 py-1 text-[10px] text-gray-600 w-[40px]">選択</th>}
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[90px]">担当者</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[110px]">対応日</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[70px]">開始</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[70px]">終了</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[90px]">対応者</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[90px]">性別</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700 w-[90px]">進捗</th>
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-bold text-gray-700">コール履歴</th>
                </tr>
              </thead>
              <tbody>
                {isSearchMode ? (
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        placeholder="担当者"
                        value={searchHistory.operator || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, operator: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="date" 
                        value={searchHistory.date || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, date: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={searchHistory.startTime || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, startTime: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="time" 
                        value={searchHistory.endTime || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, endTime: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        placeholder="対応者"
                        value={searchHistory.responder || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, responder: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <select 
                        value={searchHistory.gender || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, gender: e.target.value})}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      >
                        {GENDER_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.value === '' ? '性別' : opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-300 p-1">
                      <select 
                        value={searchHistory.progress || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, progress: e.target.value})}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      >
                        {PROGRESS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.value === '' ? '進捗' : opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input 
                        type="text" 
                        placeholder="メモ検索"
                        value={searchHistory.note || ''}
                        onChange={(e) => setSearchHistory({...searchHistory, note: e.target.value})}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full border border-gray-200 px-1 py-0.5 text-xs"
                      />
                    </td>
                  </tr>
                ) : (
                  callHistory.length > 0 ? (
                    callHistory.map((entry, idx) => (
                      <tr key={idx} className={`hover:bg-gray-50 ${selectedDeleteIndices.includes(idx) ? 'bg-red-50' : ''}`}>
                        {isDeleteMode && (
                          <td className="border border-gray-300 px-1 py-1 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedDeleteIndices.includes(idx)}
                              onChange={() => toggleDeleteSelection(idx)}
                            />
                          </td>
                        )}
                        <td className="border border-gray-300 px-2 py-1 text-sm">
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <input 
                              type="text" 
                              value={isCallActive && idx === 0 ? editingCallData?.operator || '' : editingCallHistoryAll[idx]?.operator || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, operator: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'operator', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            />
                          ) : entry.operator}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-sm">{entry.date}</td>
                        <td className="border border-gray-300 px-2 py-1 text-sm">
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <input 
                              type="text" 
                              value={isCallActive && idx === 0 ? editingCallData?.startTime || '' : editingCallHistoryAll[idx]?.startTime || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, startTime: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'startTime', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            />
                          ) : entry.startTime}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-sm">
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <input 
                              type="text" 
                              value={isCallActive && idx === 0 ? editingCallData?.endTime || '' : editingCallHistoryAll[idx]?.endTime || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, endTime: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'endTime', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            />
                          ) : entry.endTime}
                        </td>
                        <td 
                          className="border border-gray-300 px-2 py-1 text-xs cursor-pointer"
                          onClick={() => !isEditingAllRows && !(isCallActive && idx === 0) && toggleHistoryExpand(idx)}
                        >
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <input 
                              type="text" 
                              value={isCallActive && idx === 0 ? editingCallData?.responder || '' : editingCallHistoryAll[idx]?.responder || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, responder: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'responder', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            />
                          ) : (
                            <div className={`text-sm whitespace-pre-wrap break-words tracking-wider ${expandedHistoryIndices.includes(idx) ? '' : 'line-clamp-1'}`}>
                              {entry.responder}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-sm">
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <select 
                              value={isCallActive && idx === 0 ? editingCallData?.gender || '' : editingCallHistoryAll[idx]?.gender || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, gender: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'gender', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            >
                              <option value="">-</option>
                              <option value="男性">男性</option>
                              <option value="女性">女性</option>
                            </select>
                          ) : entry.gender}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-sm">
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <select 
                              value={isCallActive && idx === 0 ? editingCallData?.progress || '' : editingCallHistoryAll[idx]?.progress || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, progress: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'progress', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm tracking-wider"
                            >
                              <option value="">-</option>
                              <option value="受注">受注</option>
                              <option value="見込みA">見込みA</option>
                              <option value="見込みB">見込みB</option>
                              <option value="見込みC">見込みC</option>
                              <option value="留守">留守</option>
                              <option value="拒否">拒否</option>
                              <option value="時期尚早">時期尚早</option>
                            </select>
                          ) : entry.progress}
                        </td>
                        <td 
                          className="border border-gray-300 px-2 py-1 text-xs cursor-pointer"
                          onClick={() => !isEditingAllRows && !(isCallActive && idx === 0) && toggleHistoryExpand(idx)}
                        >
                          {isEditingAllRows || (isCallActive && idx === 0) ? (
                            <textarea 
                              value={isCallActive && idx === 0 ? editingCallData?.note || '' : editingCallHistoryAll[idx]?.note || ''}
                              onChange={(e) => isCallActive && idx === 0 ? setEditingCallData({...editingCallData, note: e.target.value}) : handleEditingAllRowsFieldChange(idx, 'note', e.target.value)}
                              className="w-full border border-gray-300 px-1 py-0.5 text-sm resize-none" style={{ height: '28px' }}
                            />
                          ) : (
                            <div className={`text-sm whitespace-pre-wrap break-words tracking-wider ${expandedHistoryIndices.includes(idx) ? '' : 'line-clamp-1'}`}>
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
  )
}
