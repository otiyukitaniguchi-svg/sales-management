'use client'

import { FrontendCustomerRecord } from '@/lib/types'
import { FIELD_LABELS, getLabel } from '@/lib/labels'

interface RecordDetailProps {
  record: FrontendCustomerRecord
}

export default function RecordDetail({ record }: RecordDetailProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">顧客詳細</h2>
      
      {/* 基本情報 */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 border-b pb-2">基本情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">{getLabel('no')}</label>
            <div className="font-semibold">{record.no}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{getLabel('companyName')}</label>
            <div className="font-semibold">{record.companyName || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{getLabel('companyKana')}</label>
            <div>{record.companyKana || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{getLabel('fixedNo')}</label>
            <div>{record.fixedNo || '-'}</div>
          </div>
        </div>
      </div>

      {/* 住所情報 */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 border-b pb-2">住所情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">{getLabel('zipCode')}</label>
            <div>{record.zipCode || '-'}</div>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">{getLabel('address')}</label>
            <div>{record.address || '-'}</div>
          </div>
        </div>
      </div>

      {/* 担当者情報 */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 border-b pb-2">担当者情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">{getLabel('staffName')}</label>
            <div>{record.staffName || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{getLabel('email')}</label>
            <div>{record.email || '-'}</div>
          </div>
        </div>
      </div>

      {/* その他情報 */}
      <div>
        <h3 className="font-bold text-lg mb-3 border-b pb-2">その他情報</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">{getLabel('industry')}</label>
            <div>{record.industry || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{getLabel('sales')}</label>
            <div>{record.sales || '-'}</div>
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">{getLabel('memo')}</label>
            <div className="whitespace-pre-wrap">{record.memo || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
