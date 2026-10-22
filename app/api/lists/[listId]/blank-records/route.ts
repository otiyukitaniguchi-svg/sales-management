export const dynamic = 'force-dynamic'
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { toFrontendFormat, CustomerRecord } from '@/lib/types'
import { isBlankCustomerRecord } from '@/lib/csvImport'

// 既存3リストは list_type が 'list1' 形式と '新規リスト' 形式で混在しているため両方を見る
const LEGACY_LIST_TYPE_ALIASES: Record<string, string[]> = {
  list1: ['list1', '新規リスト'],
  list2: ['list2', 'ハルエネリスト'],
  list3: ['list3', 'モバイルリスト'],
}

// No以外が空の顧客レコード(列名が合わないCSVの取り込みで作られたもの等)を探す。
// 架電履歴が1件でもあるレコードは対象外にする
async function findBlankNos(listId: string): Promise<string[]> {
  const pageSize = 1000
  const { count, error: countError } = await supabaseAdmin
    .from(TABLES.CUSTOMERS)
    .select('*', { count: 'exact', head: true })
    .eq('list_slug', listId)
  if (countError) throw countError

  const pageCount = Math.max(1, Math.ceil((count || 0) / pageSize))
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .select('*')
        .eq('list_slug', listId)
        .order('no', { ascending: true })
        .range(i * pageSize, i * pageSize + pageSize - 1)
    )
  )
  const blankNos: string[] = []
  for (const { data, error } of pages) {
    if (error) throw error
    for (const row of (data || []) as CustomerRecord[]) {
      if (isBlankCustomerRecord(toFrontendFormat(row))) blankNos.push(row.no)
    }
  }
  if (blankNos.length === 0) return []

  const historyListTypes = LEGACY_LIST_TYPE_ALIASES[listId] || [listId]
  const withHistory = new Set<string>()
  for (let i = 0; i < blankNos.length; i += 200) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('no')
      .in('list_type', historyListTypes)
      .in('no', blankNos.slice(i, i + 200))
    if (error) throw error
    for (const row of data || []) withHistory.add(row.no)
  }
  return blankNos.filter((no) => !withHistory.has(no))
}

// 件数の確認(削除しない)
export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError
  try {
    if (!(await verifyListExists(supabaseAdmin, params.listId))) {
      return NextResponse.json({ success: false, message: '無効なリストIDです' }, { status: 400 })
    }
    const nos = await findBlankNos(params.listId)
    return NextResponse.json({ success: true, blankCount: nos.length })
  } catch (error: any) {
    console.error('Error in blank-records GET:', error)
    return NextResponse.json({ success: false, message: error.message || '不明なエラー' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError
  try {
    const { listId } = params
    if (!(await verifyListExists(supabaseAdmin, listId))) {
      return NextResponse.json({ success: false, message: '無効なリストIDです' }, { status: 400 })
    }
    const nos = await findBlankNos(listId)
    let deletedCount = 0
    for (let i = 0; i < nos.length; i += 200) {
      const { error, count } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .delete({ count: 'exact' })
        .eq('list_slug', listId)
        .in('no', nos.slice(i, i + 200))
      if (error) throw error
      deletedCount += count || 0
    }
    return NextResponse.json({ success: true, deletedCount })
  } catch (error: any) {
    console.error('Error in blank-records DELETE:', error)
    return NextResponse.json({ success: false, message: error.message || '不明なエラー' }, { status: 500 })
  }
}
