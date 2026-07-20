'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { FrontendCustomerRecord } from '@/lib/types'

interface CreateRecordModalProps {
  onClose: () => void
}

type FormState = Partial<FrontendCustomerRecord>

const emptyForm: FormState = {
  companyKana: '',
  companyName: '',
  fixedNo: '',
  otherContact: '',
  zipCode: '',
  addressKana: '',
  address: '',
  repKana: '',
  repName: '',
  staffKana: '',
  staffName: '',
  email: '',
  industry: '',
  memo: '',
}

export default function CreateRecordModal({ onClose }: CreateRecordModalProps) {
  const lists = useAppStore((state) => state.lists)
  const listData = useAppStore((state) => state.listData)
  const setListData = useAppStore((state) => state.setListData)
  const currentList = useAppStore((state) => state.currentList)

  const [listSlug, setListSlug] = useState(currentList || lists[0]?.slug || '')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setError('')

    const missing: string[] = []
    if (!listSlug) missing.push('リスト')
    if (!(form.companyName || '').trim()) missing.push('企業名')
    if (!(form.address || '').trim()) missing.push('住所')
    if (!(form.fixedNo || '').trim()) missing.push('固定番号')
    if (!(form.repName || '').trim() && !(form.staffName || '').trim()) missing.push('代表者名または担当者名')

    if (missing.length > 0) {
      setError(`必須項目が未入力です: ${missing.join('、')}`)
      return
    }

    setIsSaving(true)
    const result: any = await ApiClient.createRecord(listSlug, form)
    setIsSaving(false)

    if (!result.success) {
      setError(result.message || '作成に失敗しました')
      return
    }

    // 現在ロード済みのリストデータがあれば即座に反映する
    if (listData[listSlug]) {
      const newRecord: FrontendCustomerRecord = {
        ...form,
        no: result.no,
        callHistory: [],
        callHistoryCount: 0,
      } as FrontendCustomerRecord
      setListData(listSlug, [...listData[listSlug], newRecord])
    }

    alert(`No. ${result.no} として「${lists.find((l) => l.slug === listSlug)?.name || listSlug}」に登録しました`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300">
          <h2 className="text-xl font-bold">📝 新規レコード作成</h2>
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600">
            閉じる
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">
          {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-bold mb-1">追加先リスト <span className="text-red-600">*</span></label>
            <select
              value={listSlug}
              onChange={(e) => setListSlug(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
            >
              {lists.map((l) => (
                <option key={l.slug} value={l.slug}>{l.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Noは全リストを通じて最後のNoの次の番号が自動で付与されます</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">企業名 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">企業名フリガナ</label>
              <input
                type="text"
                value={form.companyKana}
                onChange={(e) => setField('companyKana', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">住所 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">住所フリガナ</label>
              <input
                type="text"
                value={form.addressKana}
                onChange={(e) => setField('addressKana', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">郵便番号</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={(e) => setField('zipCode', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">固定番号 <span className="text-red-600">*</span></label>
              <input
                type="text"
                value={form.fixedNo}
                onChange={(e) => setField('fixedNo', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">その他連絡先</label>
              <input
                type="text"
                value={form.otherContact}
                onChange={(e) => setField('otherContact', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                代表者名 <span className="text-red-600">*(担当者名と両方空欄は不可)</span>
              </label>
              <input
                type="text"
                value={form.repName}
                onChange={(e) => setField('repName', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">代表者フリガナ</label>
              <input
                type="text"
                value={form.repKana}
                onChange={(e) => setField('repKana', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                担当者名 <span className="text-red-600">*(代表者名と両方空欄は不可)</span>
              </label>
              <input
                type="text"
                value={form.staffName}
                onChange={(e) => setField('staffName', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">担当者フリガナ</label>
              <input
                type="text"
                value={form.staffKana}
                onChange={(e) => setField('staffKana', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">メールアドレス</label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">業種</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setField('industry', e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">備考</label>
              <textarea
                value={form.memo}
                onChange={(e) => setField('memo', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-300 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-400 text-white rounded font-bold hover:bg-gray-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '作成中...' : '作成する'}
          </button>
        </div>
      </div>
    </div>
  )
}
