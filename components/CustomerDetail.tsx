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
  const [editingCallIndex, setEditingCallIndex] = useState<number | null>(null)
  const [editingCallData, setEditingCallData] = useState<FrontendCallHistoryEntry | null>(null)
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
      console.log('📋 [DEBUG] Loading call history for:', currentList, record.no)
      const result = await ApiClient.getCallHistory(currentList, record.no)
      console.log('📋 [DEBUG] API call history response:', result)
      console.log('📋 [DEBUG] API response success:', result.success)
      console.log('📋 [DEBUG] API response data length:', result.data ? result.data.length : 'null')
      if (result.data && result.data.length > 0) {
        console.log('📋 [DEBUG] First entry:', result.data[0])
        console.log('📋 [DEBUG] Last entry:', result.data[result.data.length - 1])
      }
      if (result.success && result.data) {
        console.log('📋 [DEBUG] Setting call history with', result.data.length, 'entries')
        setCallHistory(result.data)
      } else {
        console.warn('📋 [DEBUG] No data in response')
      }
    } catch (e) {
      console.error('📋 [DEBUG] Failed to load call history:', e)
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
      const result = await ApiClient.updateRecord(currentList, record.no, editedRecord, undefined, user?.display_name)
      if (result.success) {
        setListData(currentList, result.data || records)
        setSaveMessage('保存しました')
        setTimeout(() => setSaveMessage(''), 3000)
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
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`
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
    
    console.log('📞 [DEBUG] Saving call entry:', callEntry)
    console.log('📞 [DEBUG] Current list:', currentList, 'Record no:', record.no)
    
    try {
      const result = await ApiClient.updateRecord(currentList, record.no, undefined, [callEntry], user?.display_name)
      console.log('✅ [DEBUG] API Response:', result)
      console.log('✅ [DEBUG] API Response success:', result.success)
      console.log('✅ [DEBUG] API Response data:', result.data)
      console.log('✅ [DEBUG] API Response message:', result.message)
      
      if (result.success) {
        setIsCallActive(false)
        resetCurrentCall()
        
        console.log('🔄 [DEBUG] Loading call history...')
        // Wait for database to update
        await new Promise(resolve => setTimeout(resolve, 500))
        await loadCallHistory()
        console.log('📋 [DEBUG] Updated call history length:', callHistory.length)
        
        alert('架電情報を保存しました')
      } else {
        console.error('❌ [DEBUG] API Error:', result.message)
        alert('架電保存エラー: ' + (result.message || '不明なエラー'))
      }
    } catch (e: any) {
      console.error('❌ [DEBUG] Exception:', e)
      alert('架電保存エラー: ' + e.message)
    }
  }

  if (!record || !editedRecord) {
    return <div className="text-center text-gray-500 mt-20 text-lg">データを読み込み中...</div>
  }

  const handleEditCallHistory = (index: number, entry: FrontendCallHistoryEntry) => {
    setEditingCallIndex(index)
    setEditingCallData({ ...entry })
  }

  const handleEditingCallFieldChange = (field: keyof FrontendCallHistoryEntry, value: string) => {
    if (editingCallData) {
      setEditingCallData({ ...editingCallData, [field]: value })
    }
  }

  const handleSaveCallHistory = async () => {
    if (!editingCallData || !record) return
    try {
      const result = await ApiClient.updateRecord(currentList, record.no, undefined, [editingCallData], user?.display_name)
      if (result.success) {
        await loadCallHistory()
        setEditingCallIndex(null)
        setEditingCallData(null)
        alert('架電情報を更新しました')
      } else {
        alert('更新エラー: ' + (result.message || '不明なエラー'))
      }
    } catch (e: any) {
      alert('更新エラー: ' + e.message)
    }
  }

  const handleCancelCallHistory = () => {
    setEditingCallIndex(null)
    setEditingCallData(null)
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* 顧客管理 */}
      <div className="rounded-lg shadow-md border border-gray-300 p-4 bg-gradient-to-br from-orange-50 to-white mb-6">
        <span className="font-bold text-lg bg-orange-200 px-2 py-0.5">顧客管理</span>
        
        <div className="flex gap-6 mt-4">
          {/* 左列 */}
          <div className="flex-1 border-r border-blue-200">
            {/* 事業者名 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">事業者名</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.companyName || ''} onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-2xl font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* フリガナ */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">フリガナ</div>
              <div className="flex-1 px-4 py-2">
                <input type="text" value={editedRecord.companyKana || ''} onChange={(e) => handleFieldChange('companyKana', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-1 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 住所 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">住所</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.address || ''} onChange={(e) => handleFieldChange('address', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 住所フリガナ */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">フリガナ</div>
              <div className="flex-1 px-4 py-2">
                <input type="text" value={editedRecord.addressKana || ''} onChange={(e) => handleFieldChange('addressKana', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-1 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 固定番号 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">固定番号</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.fixedNo || ''} onChange={(e) => handleFieldChange('fixedNo', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* その他番号 */}
            <div className="flex">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">その他番号</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.otherContact || ''} onChange={(e) => handleFieldChange('otherContact', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
          </div>

          {/* 右列 */}
          <div className="flex-1">
            {/* 代表者 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">代表者</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.repName || ''} onChange={(e) => handleFieldChange('repName', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" placeholder="代表" />
              </div>
            </div>
            {/* 代表者フリガナ */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">フリガナ</div>
              <div className="flex-1 px-4 py-2">
                <input type="text" value={editedRecord.repKana || ''} onChange={(e) => handleFieldChange('repKana', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-1 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 担当者 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">担当者</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.staffName || ''} onChange={(e) => handleFieldChange('staffName', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" placeholder="担当" />
              </div>
            </div>
            {/* 担当者フリガナ */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">フリガナ</div>
              <div className="flex-1 px-4 py-2">
                <input type="text" value={editedRecord.staffKana || ''} onChange={(e) => handleFieldChange('staffKana', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-1 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 業種 */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">業種</div>
              <div className="flex-1 px-4 py-3">
                <input type="text" value={editedRecord.industry || ''} onChange={(e) => handleFieldChange('industry', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded" />
              </div>
            </div>
            {/* 備考 */}
            <div className="flex">
              <div className="w-32 px-4 py-3 font-semibold text-lg text-gray-700 bg-gray-50 border-r border-gray-200 whitespace-nowrap">備考</div>
              <div className="flex-1 px-4 py-3">
                <textarea value={editedRecord.memo || ''} onChange={(e) => handleFieldChange('memo', e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 text-lg font-bold h-20 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded resize-none" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 架電履歴 */}
      <div className="rounded-lg shadow-md border border-gray-300 p-4 bg-gradient-to-br from-gray-50 to-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-lg bg-gray-200 px-2 py-0.5">架電履歴</span>
          <button onClick={handleCallStart} disabled={isCallActive}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-semibold disabled:bg-gray-400 hover:bg-blue-600">開始</button>
          <button onClick={handleCallEnd} disabled={!isCallActive}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm font-semibold disabled:bg-gray-400 hover:bg-red-600">終了</button>
        </div>

        {isCallActive && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <label className="font-semibold text-gray-700">対応者:</label>
                <input type="text" value={currentCall.operator || ''} onChange={(e) => setCurrentCall({ ...currentCall, operator: e.target.value })}
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm" />
              </div>
              <div>
                <label className="font-semibold text-gray-700">性別:</label>
                <select value={currentCall.gender || ''} onChange={(e) => setCurrentCall({ ...currentCall, gender: e.target.value })}
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm">
                  <option value="">選択</option>
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700">進捗:</label>
                <select value={currentCall.progress || ''} onChange={(e) => setCurrentCall({ ...currentCall, progress: e.target.value })}
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm">
                  <option value="">選択してください</option>
                  <option value="受注">受注</option>
                  <option value="見込みA">見込みA</option>
                  <option value="見込みC">見込みC</option>
                  <option value="担当不在">担当不在</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-gray-700">コール備歴:</label>
                <input type="text" value={currentCall.note || ''} onChange={(e) => setCurrentCall({ ...currentCall, note: e.target.value })}
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm" />
              </div>
            </div>
          </div>
        )}

        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">担当者</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-20">対応日</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">開始</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">終了</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-20">対応者</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-16">性別</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-24">進捗</th>
              <th className="border border-gray-400 px-4 py-2 text-left font-bold bg-gray-300 flex-1">コール履歴</th>
              <th className="border border-gray-400 px-4 py-2 text-left whitespace-nowrap font-bold bg-gray-300 w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {callHistory.length === 0 ? (
              <tr><td colSpan={9} className="border border-gray-400 px-4 py-3 text-center text-gray-400">履歴なし</td></tr>
            ) : (
              /* 最新順にソートして表示（新しい順） */
              callHistory.slice(0, 5).map((entry, displayIndex) => {
                const isEditing = editingCallIndex === displayIndex
                return (
                  <tr key={displayIndex} className={displayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.operator || ''} onChange={(e) => handleEditingCallFieldChange('operator', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.operator
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-20 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.date || ''} onChange={(e) => handleEditingCallFieldChange('date', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.date
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.startTime || ''} onChange={(e) => handleEditingCallFieldChange('startTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.startTime
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.endTime || ''} onChange={(e) => handleEditingCallFieldChange('endTime', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.endTime
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-20 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.responder || ''} onChange={(e) => handleEditingCallFieldChange('responder', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.responder
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-16 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <select value={editingCallData?.gender || ''} onChange={(e) => handleEditingCallFieldChange('gender', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm">
                          <option value="">選択</option>
                          <option value="男性">男性</option>
                          <option value="女性">女性</option>
                        </select>
                      ) : (
                        entry.gender
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-24 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <select value={editingCallData?.progress || ''} onChange={(e) => handleEditingCallFieldChange('progress', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm">
                          <option value="">選択</option>
                          <option value="受注">受注</option>
                          <option value="見込みA">見込みA</option>
                          <option value="見込みC">見込みC</option>
                          <option value="担当不在">担当不在</option>
                        </select>
                      ) : (
                        entry.progress
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 cursor-pointer hover:bg-blue-100" onClick={() => handleEditCallHistory(displayIndex, entry)}>
                      {isEditing ? (
                        <input type="text" value={editingCallData?.note || ''} onChange={(e) => handleEditingCallFieldChange('note', e.target.value)} className="w-full border border-gray-300 px-1 py-0.5 text-sm" />
                      ) : (
                        entry.note
                      )}
                    </td>
                    <td className="border border-gray-400 px-4 py-2 whitespace-nowrap w-20">
                      {isEditing ? (
                        <>
                          <button onClick={handleSaveCallHistory} className="px-2 py-1 bg-green-500 text-white rounded text-xs mr-1 hover:bg-green-600">保存</button>
                          <button onClick={handleCancelCallHistory} className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500">キャンセル</button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>


    </div>
  )
}
