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
    const noFilter = (request.nextUrl.searchParams.get('no') || '').trim()
    const companyNameFilter = (request.nextUrl.searchParams.get('companyName') || '').trim().toLowerCase()
    const operatorFilter = (request.nextUrl.searchParams.get('operator') || '').trim()

    // 受注件数は全履歴に比べて限られるため、検索対象として全件を取得する。
    // 件数を先に取得し、必要なページを並列取得する。count用とdata用で
    // select()の引数が異なるため、selectClauseを都度渡す関数にしている
    const buildBaseQuery = (selectClause: string, opts?: { count: 'exact'; head: true }) => {
      let q = supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select(selectClause, opts)
        .eq('progress', '受注')
      if (noFilter) q = q.ilike('no', `%${noFilter}%`)
      if (operatorFilter) q = q.ilike('operator', `%${operatorFilter}%`)
      return q
    }

    const pageSize = 1000
    const { count: entryCount, error: countError } = await buildBaseQuery('*', { count: 'exact', head: true })
    if (countError) throw countError

    const entryPageCount = Math.max(1, Math.ceil((entryCount || 0) / pageSize))
    const entryPages = await Promise.all(
      Array.from({ length: entryPageCount }, (_, i) =>
        buildBaseQuery('id, no, list_type, operator, responder, date, start_time, note, reply_date, source, created_at')
          .order('created_at', { ascending: false })
          .range(i * pageSize, i * pageSize + pageSize - 1)
      )
    )
    const entries: any[] = []
    for (const { data, error } of entryPages) {
      if (error) throw error
      if (data) entries.push(...data)
    }
    // ページごとに独立取得しているため、ページをまたいだ順序を保証するため再ソートする
    entries.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))

    // 顧客名を解決するため、リストslugごとにNoをまとめてcustomersテーブルへ問い合わせる(並列)
    const nosBySlug = new Map<string, Set<string>>()
    for (const row of entries) {
      const slug = resolveListSlug(row.list_type)
      if (!nosBySlug.has(slug)) nosBySlug.set(slug, new Set())
      nosBySlug.get(slug)!.add(row.no)
    }

    const companyNameByKey = new Map<string, string>()
    const customerLookups = await Promise.all(
      Array.from(nosBySlug.entries()).map(([slug, nos]) =>
        supabaseAdmin
          .from(TABLES.CUSTOMERS)
          .select('no, company_name')
          .eq('list_slug', slug)
          .in('no', Array.from(nos))
          .then((res) => ({ slug, ...res }))
      )
    )
    for (const { slug, data: customers, error: custError } of customerLookups) {
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

    let data = entries.map((row) => {
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
        replyDate: row.reply_date || '',
        source: row.source || '',
        createdAt: row.created_at,
      }
    })

    if (companyNameFilter) {
      data = data.filter((d) => d.companyName.toLowerCase().includes(companyNameFilter))
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in feed API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
