export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

// 既存3リストは list_type が 'list1' 形式と '新規リスト' 形式で混在しているため、
// 架電履歴の削除時は両方を許容する(新規作成されたリストにはこの表記ゆれはない)
const LEGACY_LIST_TYPE_ALIASES: Record<string, string[]> = {
  list1: ['list1', '新規リスト'],
  list2: ['list2', 'ハルエネリスト'],
  list3: ['list3', 'モバイルリスト'],
}

// 顧客レコード1件を削除する(管理者限定)。紐づく架電履歴も一緒に削除する。
export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string; no: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const { listId, no } = params

    if (!(await verifyListExists(supabaseAdmin, listId))) {
      return NextResponse.json({ success: false, message: '無効なリストIDです' }, { status: 400 })
    }
    if (!no) {
      return NextResponse.json({ success: false, message: 'Noが指定されていません' }, { status: 400 })
    }

    const { data: deletedCustomers, error: deleteCustomerError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .delete()
      .eq('list_slug', listId)
      .eq('no', no)
      .select('id')

    if (deleteCustomerError) {
      return NextResponse.json({ success: false, message: deleteCustomerError.message }, { status: 500 })
    }
    if (!deletedCustomers || deletedCustomers.length === 0) {
      return NextResponse.json({ success: false, message: '該当するレコードが見つかりません' }, { status: 404 })
    }

    const historyAliases = LEGACY_LIST_TYPE_ALIASES[listId] || [listId]
    const { data: deletedHistory, error: deleteHistoryError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .delete()
      .in('list_type', historyAliases)
      .eq('no', no)
      .select('id')

    if (deleteHistoryError) {
      console.error('架電履歴の削除エラー(顧客レコードは削除済み):', deleteHistoryError)
    }

    return NextResponse.json({
      success: true,
      deletedHistoryCount: deletedHistory?.length || 0,
    })
  } catch (error: any) {
    console.error('Error in lists/[listId]/records/[no] DELETE:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
