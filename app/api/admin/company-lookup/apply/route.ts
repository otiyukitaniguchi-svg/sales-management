export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { listId, no, companyName, address, zipCode } = body as {
      listId: string
      no: string
      companyName?: string
      address?: string
      zipCode?: string
    }

    if (!listId || !no) {
      return NextResponse.json({ success: false, message: '対象レコードが指定されていません' }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (companyName) updates.company_name = companyName
    if (address) updates.address = address
    if (zipCode) updates.zip_code = zipCode

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: '更新する項目がありません' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .update(updates)
      .eq('list_slug', listId)
      .eq('no', no)

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '更新しました' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
