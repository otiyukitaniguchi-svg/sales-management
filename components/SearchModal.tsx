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
    repName: '',
    staffName: '',
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
      return (
        (!searchFields.companyName || record.companyName?.includes(searchFields.companyName)) &&
        (!searchFields.companyKana || record.companyKana?.includes(searchFields.companyKana)) &&
        (!searchFields.address || record.address?.includes(searchFields.address)) &&
        (!searchFields.fixedNo || record.fixedNo?.includes(searchFields.fixedNo)) &&
        (!searchFields.otherContact || record.otherContact?.includes(searchFields.otherContact)) &&
        (!searchFields.repName || record.repName?.includes(searchFields.repName)) &&
        (!searchFields.staffName || record.staffName?.includes(searchFields.staffName))
      )
    })

    if (results.length === 0) {
      alert('検索結果がありません')
      return
    }

    // 検索結果をストアに保存
    const formattedResults = results.map((record) => ({
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
      repName: '',
      staffName: '',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">顧客検索</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">事業者名</label>
            <input
              type="text"
              value={searchFields.companyName}
              onChange={(e) => handleSearchFieldChange('companyName', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="その他番号を入力"
            />
          </div>
          
          <div>
            <label className="block font-semibold text-gray-700 mb-2">代表者</label>
            <input
              type="text"
              value={searchFields.repName}
              onChange={(e) => handleSearchFieldChange('repName', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="代表者名を入力"
            />
          </div>
          
          <div className="col-span-2">
            <label className="block font-semibold text-gray-700 mb-2">担当者</label>
            <input
              type="text"
              value={searchFields.staffName}
              onChange={(e) => handleSearchFieldChange('staffName', e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full border-2 border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="担当者名を入力"
            />
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
            検索
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
