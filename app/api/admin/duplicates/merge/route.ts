export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

const FIELDS = [
  'company_kana', 'company_name', 'fixed_no', 'other_contact', 'zip_code',
  'address_kana', 'address', 'rep_kana', 'rep_name', 'staff_kana', 'staff_name',
  'email', 'industry', 'memo', 'sales', 'software', 'decision', 'subsidy',
  'accountant', 'established', 'recall_date', 'recall_time',
] as const

const LEGACY_LIST_TYPE_ALIASES: Record<string, string[]> = {
  list1: ['list1', '新規リスト'],
  list2: ['list2', 'ハルエネリスト'],
  list3: ['list3', 'モバイルリスト'],
}

export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { primaryId, duplicateIds } = body as { primaryId: string; duplicateIds: string[] }

    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json({ success: false, message: '統合対象が指定されていません' }, { status: 400 })
    }

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*')
      .in('id', [primaryId, ...duplicateIds])

    if (fetchError) {
      return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 })
    }

    const primary = rows?.find((r) => r.id === primaryId)
    const duplicates = duplicateIds.map((id) => rows?.find((r) => r.id === id)).filter(Boolean) as any[]

    if (!primary || duplicates.length !== duplicateIds.length) {
      return NextResponse.json({ success: false, message: '対象レコードが見つかりません' }, { status: 404 })
    }

    // マージ: プライマリが空欄のフィールドを重複レコードで埋める
    const mergedFields: Record<string, any> = {}
    for (const field of FIELDS) {
      let value = primary[field]
      if (!value || String(value).trim() === '') {
        for (const dup of duplicates) {
          if (dup[field] && String(dup[field]).trim() !== '') {
            value = dup[field]
            break
          }
        }
      }
      mergedFields[field] = value
    }

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .update(mergedFields)
      .eq('id', primaryId)

    if (updateError) {
      return NextResponse.json({ success: false, message: updateError.message }, { status: 500 })
    }

    // 重複レコードに紐づく架電履歴をプライマリへ付け替え
    let reassignedHistoryCount = 0
    for (const dup of duplicates) {
      const aliases = LEGACY_LIST_TYPE_ALIASES[dup.list_slug] || [dup.list_slug]
      const { data: reassignedRows, error: reassignError } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .update({ list_type: primary.list_slug, no: primary.no })
        .in('list_type', aliases)
        .eq('no', dup.no)
        .select('id')

      if (reassignError) {
        return NextResponse.json({ success: false, message: `架電履歴の付け替えに失敗しました: ${reassignError.message}` }, { status: 500 })
      }
      reassignedHistoryCount += reassignedRows?.length || 0
    }

    // 重複レコードを削除
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .delete()
      .in('id', duplicateIds)

    if (deleteError) {
      return NextResponse.json({ success: false, message: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '統合が完了しました',
      reassignedHistoryCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
