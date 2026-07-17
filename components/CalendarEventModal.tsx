'use client'

import { useState } from 'react'
import { ApiClient } from '@/lib/api-client'

interface CalendarEventModalProps {
  companyName: string
  orderDate: string
  operatorName: string
  defaultAddress?: string
  defaultStaffName?: string
  defaultContact?: string
  onClose: () => void
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const next = (h + 1) % 24
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

export default function CalendarEventModal({
  companyName,
  orderDate,
  operatorName,
  defaultAddress,
  defaultStaffName,
  defaultContact,
  onClose,
}: CalendarEventModalProps) {
  const today = new Date()
  const jstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [title, setTitle] = useState(`AI補助金 ${orderDate} ${companyName}（${operatorName}）`)
  const [visitDate, setVisitDate] = useState(jstToday)
  const [visitTime, setVisitTime] = useState('10:00')
  const [address, setAddress] = useState(defaultAddress || '')
  const [staffName, setStaffName] = useState(defaultStaffName || '')
  const [contact, setContact] = useState(defaultContact || '')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)
  const [successLink, setSuccessLink] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !visitDate || !visitTime) {
      setError('タイトル・訪問日・訪問時間を入力してください')
      return
    }
    setIsSubmitting(true)
    setError('')
    setNotConfigured(false)
    try {
      const description = [
        staffName ? `顧客担当者: ${staffName}` : null,
        contact ? `連絡先: ${contact}` : null,
        details ? `詳細: ${details}` : null,
      ].filter(Boolean).join('\n')

      const result = await ApiClient.createCalendarEvent({
        title,
        description,
        location: address,
        date: visitDate,
        startTime: visitTime,
        endTime: addHour(visitTime),
      })
      if (result.success) {
        setSuccessLink(result.htmlLink || '')
      } else if ((result as any).message?.includes('GOOGLE_SERVICE_ACCOUNT')) {
        setNotConfigured(true)
      } else {
        setError(result.message || '登録に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '登録中にエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">📅 Googleカレンダーに登録</h2>

        {successLink ? (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ カレンダーに登録しました
            </div>
            {successLink && (
              <a href={successLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">
                カレンダーで開く
              </a>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600">
              閉じる
            </button>
          </div>
        ) : notConfigured ? (
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded text-sm">
              Googleカレンダー連携がまだ設定されていません。管理者にサービスアカウントの設定を依頼してください。
            </div>
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600">
              閉じる
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">タイトル</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">訪問日</label>
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">訪問時間</label>
                <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">訪問住所</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">顧客担当者</label>
              <input value={staffName} onChange={(e) => setStaffName(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">連絡先</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">詳細(任意)</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="w-full border border-gray-300 px-3 py-2 rounded h-20 resize-none" />
            </div>

            {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>}

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-gray-400 text-white rounded font-bold hover:bg-gray-500">
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? '登録中...' : '登録する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
