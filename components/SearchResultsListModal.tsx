'use client'

import { useAppStore } from '@/lib/store'

interface SearchResultsListModalProps {
  onClose: () => void
}

export default function SearchResultsListModal({ onClose }: SearchResultsListModalProps) {
  const searchResults = useAppStore((state) => state.searchResults)
  const setSearchResultIndex = useAppStore((state) => state.setSearchResultIndex)
  const lists = useAppStore((state) => state.lists)

  const listName = (id: string) => lists.find((l) => l.slug === id)?.name || id

  const handleSelect = (index: number) => {
    setSearchResultIndex(index)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] flex flex-col">
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
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">No</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">リスト</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">企業名</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">住所</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">担当者</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">固定番号</th>
                <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold">架電件数</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((item, index) => (
                <tr
                  key={`${item.listId}-${item.record.no}-${index}`}
                  onClick={() => handleSelect(index)}
                  className="hover:bg-blue-50 cursor-pointer"
                >
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.no}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{listName(item.listId)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm font-bold">{item.record.companyName}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.address}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.staffName}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.record.fixedNo}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-sm text-center">{item.record.callHistoryCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
