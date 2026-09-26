export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { toFrontendFormat, CustomerRecord } from '@/lib/types'

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return '"' + s.replace(/"/g, '""') + '"'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const { listId } = params

    if (!(await verifyListExists(supabaseAdmin, listId))) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*')
      .eq('list_slug', listId)
      .order('no', { ascending: true })

    if (error) throw error

    const records = (data || []) as CustomerRecord[]
    const headers = [
      'No', '会社名', '電話番号', 'その他連絡先', '郵便番号', '住所',
      '担当者', '業種', 'メモ', '売上', '利用ソフト', '決裁者',
      '補助金', '税理士', '設立年月', '折返し日', '折返し時間'
    ]

    const rows = records.map((record) => {
      const r = toFrontendFormat(record)
      return [
        r.no,
        r.companyName,
        r.fixedNo,
        r.otherContact,
        r.zipCode,
        r.address,
        r.staffName || r.repName,
        r.industry,
        r.memo,
        r.sales,
        r.software,
        r.decision,
        r.subsidy,
        r.accountant,
        r.established,
        r.recallDate,
        r.recallTime,
      ].map(csvCell).join(',')
    })

    const csv = '\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\r\n')
    const safeName = String(listId).replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="AnyPro_${safeName}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('Error in export list:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'CSV出力に失敗しました' },
      { status: 500 }
    )
  }
}
