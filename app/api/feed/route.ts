export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// 架電履歴.list_type は旧3リストのみ日本語名で保存されている(history/[no]/route.ts参照)。
// customers.list_slug と突き合わせるために逆変換する。新規作成リストはslugがそのまま入る。
const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  '新規リスト': 'list1',
  'ハルエネリスト': 'list2',
  'モバイルリスト': 'list3',
}

function resolveListSlug(listType: string | null): string {
  const t = (listType || '').trim()
  return LEGACY_NAME_TO_SLUG[t] || t
}

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 50, 200)

    const { data: rows, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('id, no, list_type, operator, responder, date, start_time, note, created_at')
      .eq('progress', '受注')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const entries = rows || []

    // 顧客名を解決するため、リストslugごとにNoをまとめてcustomersテーブルへ問い合わせる
    const nosBySlug = new Map<string, Set<string>>()
    for (const row of entries) {
      const slug = resolveListSlug(row.list_type)
      if (!nosBySlug.has(slug)) nosBySlug.set(slug, new Set())
      nosBySlug.get(slug)!.add(row.no)
    }

    const companyNameByKey = new Map<string, string>()
    for (const [slug, nos] of Array.from(nosBySlug.entries())) {
      const { data: customers, error: custError } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .select('no, company_name')
        .eq('list_slug', slug)
        .in('no', Array.from(nos))
      if (custError) throw custError
      for (const c of customers || []) {
        companyNameByKey.set(`${slug}__${c.no}`, c.company_name || '')
      }
    }

    const { data: listRows, error: listsError } = await supabaseAdmin
      .from(TABLES.LISTS)
      .select('slug, name')
    if (listsError) throw listsError
    const listNameBySlug = new Map((listRows || []).map((l) => [l.slug, l.name]))

    const data = entries.map((row) => {
      const slug = resolveListSlug(row.list_type)
      return {
        id: row.id,
        no: row.no,
        listId: slug,
        listName: listNameBySlug.get(slug) || row.list_type,
        companyName: companyNameByKey.get(`${slug}__${row.no}`) || '',
        operator: row.operator || '',
        responder: row.responder || '',
        date: row.date || '',
        startTime: row.start_time || '',
        note: row.note || '',
        createdAt: row.created_at,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
