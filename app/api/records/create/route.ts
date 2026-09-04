export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, getNextGlobalNos, TABLES } from '@/lib/supabase'
import { toDbFormat, FrontendCustomerRecord } from '@/lib/types'

interface CreateRecordBody {
  listSlug: string
  fields: Partial<FrontendCustomerRecord>
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

    const nextNo = (await getNextGlobalNos(supabaseAdmin, 1))[0]
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
