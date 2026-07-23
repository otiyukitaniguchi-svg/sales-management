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

function escapeOrValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// 手動統合(No/企業名を指定してレコードを追加していく統合)のための、
// リストを横断した検索(管理者限定)
export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim()
    if (!q) {
      return NextResponse.json({ success: true, records: [] })
    }

    const escaped = escapeOrValue(q)
    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*')
      .or(`no.ilike.%${escaped}%,company_name.ilike.%${escaped}%`)
      .order('no', { ascending: true })
      .limit(30)

    if (error) throw error

    const rows = data || []
    const nosBySlug = new Map<string, Set<string>>()
    for (const row of rows) {
      const slug = row.list_slug as string
      if (!nosBySlug.has(slug)) nosBySlug.set(slug, new Set())
      nosBySlug.get(slug)!.add(row.no)
    }

    const historyCountMap: Record<string, number> = {}
    await Promise.all(
      Array.from(nosBySlug.entries()).map(async ([slug, nos]) => {
        const { data: historyRows, error: historyError } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('no')
          .in('list_type', LEGACY_LIST_TYPE_ALIASES[slug] || [slug])
          .in('no', Array.from(nos))
        if (historyError) return
        for (const h of historyRows || []) {
          const key = `${slug}__${h.no}`
          historyCountMap[key] = (historyCountMap[key] || 0) + 1
        }
      })
    )

    return NextResponse.json({
      success: true,
      records: rows.map((r) => ({
        id: r.id,
        list_slug: r.list_slug,
        no: r.no,
        callHistoryCount: historyCountMap[`${r.list_slug}__${r.no}`] || 0,
        ...Object.fromEntries(FIELDS.map((f) => [f, r[f]])),
      })),
    })
  } catch (error: any) {
    console.error('Error in admin/duplicates/search:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
