export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { normalizeAddress, normalizePhone, normalizeCompanyName } from '@/lib/dataCleanup'

type Field = 'address' | 'fixed_no' | 'other_contact' | 'company_name'
const ALLOWED_FIELDS: Field[] = ['address', 'fixed_no', 'other_contact', 'company_name']
const CHUNK_SIZE = 25

function normalizeByField(field: Field, currentValue: string | null): string {
  if (field === 'address') return normalizeAddress(currentValue)
  if (field === 'company_name') return normalizeCompanyName(currentValue)
  return normalizePhone(currentValue)
}

// プレビューで選択された{id, field}を受け取り、現在値を再取得したうえで
// 正規化関数を再計算して反映する(クライアントから送られた値をそのまま書き込むのではなく、
// サーバー側で毎回再計算することでプレビューとの不整合・不正な値の混入を防ぐ)
export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const items: Array<{ id: string; field: Field }> = Array.isArray(body?.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ success: false, message: '反映対象が指定されていません' }, { status: 400 })
    }
    if (items.some((it) => !ALLOWED_FIELDS.includes(it.field))) {
      return NextResponse.json({ success: false, message: '不正なフィールドが指定されています' }, { status: 400 })
    }

    let updatedCount = 0
    let unchangedCount = 0
    let failedCount = 0

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE)
      const results = await Promise.all(
        chunk.map(async ({ id, field }) => {
          const { data: row, error: fetchError } = await supabaseAdmin
            .from(TABLES.CUSTOMERS)
            .select(`id, ${field}`)
            .eq('id', id)
            .maybeSingle()

          if (fetchError || !row) return 'failed' as const

          const currentValue = (row as any)[field] as string | null
          const newValue = normalizeByField(field, currentValue)

          if (!currentValue || newValue === currentValue) return 'unchanged' as const

          const { error: updateError } = await supabaseAdmin
            .from(TABLES.CUSTOMERS)
            .update({ [field]: newValue })
            .eq('id', id)

          return updateError ? ('failed' as const) : ('updated' as const)
        })
      )

      for (const r of results) {
        if (r === 'updated') updatedCount++
        else if (r === 'unchanged') unchangedCount++
        else failedCount++
      }
    }

    return NextResponse.json({ success: true, updatedCount, unchangedCount, failedCount })
  } catch (error: any) {
    console.error('Error in data-cleanup/apply:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
