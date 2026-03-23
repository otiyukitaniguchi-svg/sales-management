'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { FrontendCustomerRecord } from '@/lib/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const currentList = useAppStore((state) => state.currentList)
  const listData = useAppStore((state) => state.listData)
  const setCurrentListIndex = useAppStore((state) => state.setCurrentListIndex)
  const setSearchMode = useAppStore((state) => state.setSearchMode)
  const setSearchResults = useAppStore((state) => state.setSearchResults)
  const setSearchResultIndex = useAppStore((state) => state.setSearchResultIndex)

  // 検索フィールド
  const [searchFields, setSearchFields] = useState({
    companyName: '',
    companyKana: '',
    address: '',
    fixedNo: '',
    otherContact: '',
    email: '',
    repName: '',
    staffName: '',
    callOperator: '',
    callResponder: '',
    callProgress: '',
    callNote: '',
    recallDate: '',
  })

  const handleSearchFieldChange = (field: string, value: string) => {
    setSearchFields((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSearch = () => {
    const records = listData[currentList] || []
    
    // 検索条件に合致するレコードをフィルタリング
    const results = records.filter((record: FrontendCustomerRecord) => {
      // 基本情報の検索
      const basicMatch = (
        (!searchFields.companyName || record.companyName?.includes(searchFields.companyName)) &&
        (!searchFields.companyKana || record.companyKana?.includes(searchFields.companyKana)) &&
        (!searchFields.address || record.address?.includes(searchFields.address)) &&
        (!searchFields.fixedNo || record.fixedNo?.includes(searchFields.fixedNo)) &&
        (!searchFields.otherContact || record.otherContact?.includes(searchFields.otherContact)) &&
        (!searchFields.email || record.email?.includes(searchFields.email)) &&
        (!searchFields.repName || record.repName?.includes(searchFields.repName)) &&
        (!searchFields.staffName || record.staffName?.includes(searchFields.staffName))
      )

      // 基本情報がマッチしなければスキップ
      if (!basicMatch) return false

      // 架電履歴の検索条件があるかチェック
      const hasCallFilter = searchFields.callOperator || searchFields.callResponder || searchFields.callProgress || searchFields.callNote || searchFields.recallDate
      
      // 架電履歴の検索条件がなければ、基本情報のみでマッチ
      if (!hasCallFilter) return true

      // 架電履歴がある場合、条件に合致する履歴があるかチェック
      const callHistory = record.callHistory || []
      return callHistory.some((call: any) => {
        return (
          (!searchFields.callOperator || call.operator?.includes(searchFields.callOperator)) &&
          (!searchFields.callResponder || call.responder?.includes(searchFields.callResponder)) &&
          (!searchFields.callProgress || call.progress?.includes(searchFields.callProgress)) &&
          (!searchFields.callNote || call.note?.includes(searchFields.callNote)) &&
          (!searchFields.recallDate || call.date?.includes(searchFields.recallDate))
        )
      })
    })

    if (results.length === 0) {
      alert('HITなし')
      return
    }

    // 検索結果をNo.順でソート
    const sortedResults = [...results].sort((a, b) => {
      const noA = parseInt(a.no || '0', 10)
      const noB = parseInt(b.no || '0', 10)
      return noA - noB
    })

    // 検索結果をストアに保存
    const formattedResults = sortedResults.map((record) => ({
      listId: currentList,
      record,
    }))
    setSearchResults(formattedResults)
    setSearchResultIndex(0)
    setSearchMode(true)
    onClose()
  }

  const handleClear = () => {
    setSearchFields({
      companyName: '',
      companyKana: '',
      address: '',
      fixedNo: '',
      otherContact: '',
      email: '',
      repName: '',
      staffName: '',
      callOperator: '',
      callResponder: '',
      callProgress: '',
      callNote: '',
      recallDate: '',
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">顧客検索</h2>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">企業名</label>
            <input
              type="text"
              value={searchFields.companyName}
              onChange={(e) => handleSearchFieldChange('companyName', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="企業名を入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">フリガナ</label>
            <input
              type="text"
              value={searchFields.companyKana}
              onChange={(e) => handleSearchFieldChange('companyKana', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="フリガナを入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">住所</label>
            <input
              type="text"
              value={searchFields.address}
              onChange={(e) => handleSearchFieldChange('address', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="住所を入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">固定番号</label>
            <input
              type="text"
              value={searchFields.fixedNo}
              onChange={(e) => handleSearchFieldChange('fixedNo', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="固定番号を入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">その他番号</label>
            <input
              type="text"
              value={searchFields.otherContact}
              onChange={(e) => handleSearchFieldChange('otherContact', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="その他番号を入力"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-2">メールアドレス</label>
            <input
              type="text"
              value={searchFields.email}
              onChange={(e) => handleSearchFieldChange('email', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="メールアドレスを入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">代表者</label>
            <input
              type="text"
              value={searchFields.repName}
              onChange={(e) => handleSearchFieldChange('repName', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="代表者名を入力"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-2">担当者</label>
            <input
              type="text"
              value={searchFields.staffName}
              onChange={(e) => handleSearchFieldChange('staffName', e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="担当者名を入力"
            />
          </div>
        </div>

        <div className="border-t-2 border-gray-300 pt-4 mb-6">
          <h3 className="text-lg font-bold mb-4">架電履歴から検索</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">オペレーター</label>
              <input
                type="text"
                value={searchFields.callOperator}
                onChange={(e) => handleSearchFieldChange('callOperator', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="オペレーター名を入力"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">対応者</label>
              <input
                type="text"
                value={searchFields.callResponder}
                onChange={(e) => handleSearchFieldChange('callResponder', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="対応者名を入力"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">進捗</label>
              <input
                type="text"
                value={searchFields.callProgress}
                onChange={(e) => handleSearchFieldChange('callProgress', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="進捗を入力（受注、見込みA等）"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">対応日</label>
              <input
                type="text"
                value={searchFields.recallDate}
                onChange={(e) => handleSearchFieldChange('recallDate', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="対応日を入力（YYYY-MM-DD）"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-gray-700 mb-2">コール備考</label>
              <input
                type="text"
                value={searchFields.callNote}
                onChange={(e) => handleSearchFieldChange('callNote', e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="コール備考を入力"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClear}
            className="px-6 py-2 bg-gray-400 text-white rounded font-semibold hover:bg-gray-500"
          >
            クリア
          </button>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600"
          >
            検索/実行
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
