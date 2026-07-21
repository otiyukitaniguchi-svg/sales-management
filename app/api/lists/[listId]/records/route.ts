export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

// PostgRESTの.or()フィルタに埋め込む値をエスケープする(search/route.tsと同じ理由)
function escapeOrValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// 管理者のレコード削除UIから、指定リスト内をNo/企業名で検索するための一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const { listId } = params
    const q = (request.nextUrl.searchParams.get('q') || '').trim()

    if (!(await verifyListExists(supabaseAdmin, listId))) {
      return NextResponse.json({ success: false, message: '無効なリストIDです' }, { status: 400 })
    }

    if (!q) {
      return NextResponse.json({ success: true, records: [] })
    }

    const escaped = escapeOrValue(q)
    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('no, company_name, address, staff_name, rep_name, fixed_no')
      .eq('list_slug', listId)
      .or(`no.ilike.%${escaped}%,company_name.ilike.%${escaped}%`)
      .order('no', { ascending: true })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      success: true,
      records: (data || []).map((r) => ({
        no: r.no,
        companyName: r.company_name || '',
        address: r.address || '',
        staffName: r.staff_name || '',
        repName: r.rep_name || '',
        fixedNo: r.fixed_no || '',
      })),
    })
  } catch (error: any) {
    console.error('Error in lists/[listId]/records GET:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
