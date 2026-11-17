export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { toFrontendFormat, CallHistoryRecord, CustomerRecord } from '@/lib/types'

const LEGACY_LIST_TYPE_ALIASES: Record<string, string[]> = {
  list1: ['list1', '新規リスト'],
  list2: ['list2', 'ハルエネリスト'],
  list3: ['list3', 'モバイルリスト'],
}

const PAGE_SIZE = 1000

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

    const { count: customerCount, error: customerCountError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*', { count: 'exact', head: true })
      .eq('list_slug', listId)

    if (customerCountError) throw customerCountError

    // Supabase/PostgREST returns at most 1000 rows per request. Page through
    // both tables so the CSV includes every customer and every call record.
    const customerPageCount = Math.max(1, Math.ceil((customerCount || 0) / PAGE_SIZE))
    const customerPages = await Promise.all(
      Array.from({ length: customerPageCount }, (_, i) =>
        supabaseAdmin
          .from(TABLES.CUSTOMERS)
          .select('*')
          .eq('list_slug', listId)
          .order('no', { ascending: true })
          .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1)
      )
    )

    const records: CustomerRecord[] = []
    for (const { data, error } of customerPages) {
      if (error) throw error
      if (data) records.push(...(data as CustomerRecord[]))
    }

    const historyListTypes = LEGACY_LIST_TYPE_ALIASES[listId] || [listId]
    const { count: historyCount, error: historyCountError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*', { count: 'exact', head: true })
      .in('list_type', historyListTypes)

    if (historyCountError) throw historyCountError

    const historyPageCount = Math.max(1, Math.ceil((historyCount || 0) / PAGE_SIZE))
    const historyPages = await Promise.all(
      Array.from({ length: historyPageCount }, (_, i) =>
        supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('*')
          .in('list_type', historyListTypes)
          .order('id', { ascending: true })
          .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1)
      )
    )

    const historiesByNo = new Map<string, CallHistoryRecord[]>()
    for (const { data, error } of historyPages) {
      if (error) throw error
      for (const history of (data || []) as CallHistoryRecord[]) {
        const entries = historiesByNo.get(history.no) || []
        entries.push(history)
        historiesByNo.set(history.no, entries)
      }
    }

    const headers = [
      'No', '会社名', '電話番号', 'その他連絡先', '郵便番号', '住所',
      '担当者', '業種', 'メモ', '売上', '利用ソフト', '決裁者',
      '補助金', '税理士', '設立年月', '折返し日', '折返し時間',
      '架電履歴担当者', '架電履歴対応日', '架電履歴開始時刻', '架電履歴終了時刻',
      '架電履歴対応者', '架電履歴性別', '架電履歴進捗', '架電履歴内容', '架電履歴登録日時'
    ]

    const rows = records.flatMap((record) => {
      const r = toFrontendFormat(record)
      const customerColumns = [
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
      ]

      const histories = historiesByNo.get(record.no) || []
      histories.sort((a, b) =>
        `${a.date || ''} ${a.start_time || ''} ${a.created_at || ''}`.localeCompare(
          `${b.date || ''} ${b.start_time || ''} ${b.created_at || ''}`
        )
      )

      // Keep one row per call for easy filtering and pivoting. Customers with
      // no call history still appear once with blank call-history columns.
      return (histories.length > 0 ? histories : [null]).map((history) =>
        [
          ...customerColumns,
          history?.operator,
          history?.date,
          history?.start_time,
          history?.end_time,
          history?.responder,
          history?.gender,
          history?.progress,
          history?.note,
          history?.created_at,
        ].map(csvCell).join(',')
      )
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
