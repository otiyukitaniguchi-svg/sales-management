'use client'

import { useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { FrontendCustomerRecord } from '@/lib/types'

interface SearchResultsListModalProps {
  onClose: () => void
}

type SortKey = 'no' | 'progress' | 'companyName' | 'address' | 'staffName' | 'gender' | 'contact' | 'recall'
type SortDir = 'asc' | 'desc'

interface ResultItem {
  listId: string
  record: FrontendCustomerRecord
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'no', label: 'No' },
  { key: 'progress', label: '進捗' },
  { key: 'companyName', label: '企業名' },
  { key: 'address', label: '住所' },
  { key: 'staffName', label: '担当者' },
  { key: 'gender', label: '性別' },
  { key: 'contact', label: '連絡先' },
  { key: 'recall', label: '再コール日時' },
]

function getContact(record: FrontendCustomerRecord): string {
  return record.fixedNo || record.otherContact || ''
}

function getRecall(record: FrontendCustomerRecord): string {
  if (!record.recallDate && !record.recallTime) return ''
  return `${record.recallDate || ''} ${record.recallTime || ''}`.trim()
}

function getSortValue(item: ResultItem, key: SortKey): string | number {
  switch (key) {
    case 'no': {
      const n = Number(item.record.no)
      return Number.isNaN(n) ? item.record.no || '' : n
    }
    case 'progress':
      return item.record.latestProgress || ''
    case 'companyName':
      return item.record.companyName || ''
    case 'address':
      return item.record.address || ''
    case 'staffName':
      return item.record.staffName || ''
    case 'gender':
      return item.record.latestGender || ''
    case 'contact':
      return getContact(item.record)
    case 'recall':
      return getRecall(item.record)
    default:
      return ''
  }
}

export default function SearchResultsListModal({ onClose }: SearchResultsListModalProps) {
  const searchResults = useAppStore((state) => state.searchResults)
  const setSearchResultIndex = useAppStore((state) => state.setSearchResultIndex)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sortedResults = useMemo(() => {
    const indexed = searchResults.map((item, originalIndex) => ({ item, originalIndex }))
    if (!sortKey) return indexed

    indexed.sort((a, b) => {
      const va = getSortValue(a.item, sortKey)
      const vb = getSortValue(b.item, sortKey)
      let cmp: number
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = String(va).localeCompare(String(vb), 'ja')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return indexed
  }, [searchResults, sortKey, sortDir])

  const handleHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleSelect = (originalIndex: number) => {
    setSearchResultIndex(originalIndex)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
          <h2 className="text-xl font-bold">検索結果一覧({searchResults.length}件)</h2>
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600">
            閉じる
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full border-collapse">
            <thead className="bg-blue-100 sticky top-0">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col.key)}
                    className="border border-gray-300 px-3 py-2 text-left text-xs font-bold cursor-pointer select-none hover:bg-blue-200"
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedResults.map(({ item, originalIndex }) => (
                <tr
                  key={`${item.listId}-${item.record.no}-${originalIndex}`}
                  onClick={() => handleSelect(originalIndex)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.no}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.latestProgress || ''}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm font-bold">{item.record.companyName}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.address}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.staffName}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.latestGender || ''}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{getContact(item.record)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{getRecall(item.record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
