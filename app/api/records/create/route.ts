export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { toDbFormat, FrontendCustomerRecord } from '@/lib/types'

interface CreateRecordBody {
  listSlug: string
  fields: Partial<FrontendCustomerRecord>
}

// 全リストを横断して現在の最大Noを求める(Noは text 列のため数値化して比較する)
async function getNextGlobalNo(): Promise<string> {
  let from = 0
  const pageSize = 1000
  let maxNo = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('no')
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data) {
      const n = parseInt(row.no, 10)
      if (!isNaN(n) && n > maxNo) maxNo = n
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return String(maxNo + 1)
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateRecordBody = await request.json()
    const { listSlug, fields } = body

    if (!listSlug) {
      return NextResponse.json({ success: false, message: 'リストが指定されていません' }, { status: 400 })
    }
    if (!(await verifyListExists(supabaseAdmin, listSlug))) {
      return NextResponse.json({ success: false, message: '無効なリストIDです' }, { status: 400 })
    }

    const companyName = (fields.companyName || '').trim()
    const address = (fields.address || '').trim()
    const fixedNo = (fields.fixedNo || '').trim()
    const repName = (fields.repName || '').trim()
    const staffName = (fields.staffName || '').trim()

    const missing: string[] = []
    if (!companyName) missing.push('企業名')
    if (!address) missing.push('住所')
    if (!fixedNo) missing.push('固定番号')
    if (!repName && !staffName) missing.push('代表者名または担当者名')

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, message: `必須項目が未入力です: ${missing.join('、')}` },
        { status: 400 }
      )
    }

    const nextNo = await getNextGlobalNo()
    const dbFields = toDbFormat({ ...fields, no: nextNo } as FrontendCustomerRecord)

    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .insert([{ ...dbFields, list_slug: listSlug }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, no: nextNo, listSlug, data })
  } catch (error: any) {
    console.error('Error in records/create:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
