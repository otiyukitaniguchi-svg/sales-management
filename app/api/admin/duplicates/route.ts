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

// 重複検出の条件として選択できるフィールド(?fields=company_name,fixed_no のように指定)
const DETECTABLE_FIELDS = ['company_name', 'fixed_no', 'other_contact', 'address', 'rep_name', 'staff_name', 'email'] as const

// Union-Find: 選択された複数フィールドのいずれかが一致するレコードどうしを
// 連結成分としてまとめてグループ化する(フィールドAで一致・フィールドBで一致、が
// 別のペアでも、片方が共通していれば全体を1グループにまとめる)
class DSU {
  private parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    const p = this.parent.get(x)!
    if (p !== x) {
      const root = this.find(p)
      this.parent.set(x, root)
      return root
    }
    return p
  }
  union(a: string, b: string) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  const fieldsParam = (request.nextUrl.searchParams.get('fields') || 'company_name')
    .split(',')
    .map((f) => f.trim())
    .filter((f) => (DETECTABLE_FIELDS as readonly string[]).includes(f))
  const detectionFields = fieldsParam.length > 0 ? fieldsParam : ['company_name']

  // 全件ページネーション取得
  let from = 0
  const pageSize = 1000
  const all: any[] = []
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*')
      .range(from, from + pageSize - 1)
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  // 選択された各フィールドについて、同じ値(前後空白除去)を持つレコードどうしを連結する
  const dsu = new DSU()
  const matchedFieldsByRoot = new Map<string, Set<string>>()
  for (const field of detectionFields) {
    const byValue = new Map<string, any[]>()
    for (const row of all) {
      const v = (row[field] || '').trim()
      if (!v) continue
      if (!byValue.has(v)) byValue.set(v, [])
      byValue.get(v)!.push(row)
    }
    for (const rows of Array.from(byValue.values())) {
      if (rows.length < 2) continue
      for (let i = 1; i < rows.length; i++) dsu.union(rows[0].id, rows[i].id)
    }
  }

  // 連結成分(グループ)ごとにレコードをまとめる
  const groups = new Map<string, any[]>()
  for (const row of all) {
    const root = dsu.find(row.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(row)
  }
  // 実際にどのフィールドが一致要因だったかをグループごとに記録
  for (const field of detectionFields) {
    const byValue = new Map<string, any[]>()
    for (const row of all) {
      const v = (row[field] || '').trim()
      if (!v) continue
      if (!byValue.has(v)) byValue.set(v, [])
      byValue.get(v)!.push(row)
    }
    for (const rows of Array.from(byValue.values())) {
      if (rows.length < 2) continue
      const root = dsu.find(rows[0].id)
      if (!matchedFieldsByRoot.has(root)) matchedFieldsByRoot.set(root, new Set())
      matchedFieldsByRoot.get(root)!.add(field)
    }
  }

  const duplicateRows = Array.from(groups.values()).filter((rows) => rows.length > 1).flat()

  // 重複候補に含まれるレコードの架電履歴件数をリストごとにまとめて取得する
  const nosBySlug = new Map<string, Set<string>>()
  for (const row of duplicateRows) {
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

  const duplicateGroups = Array.from(groups.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([root, rows]) => {
      // 空欄が少ない(＝情報が多い)順に並べ、先頭を推奨プライマリとする
      const withBlankCount = rows.map((r) => ({
        row: r,
        blankCount: FIELDS.filter((f) => !r[f] || String(r[f]).trim() === '').length,
      }))
      withBlankCount.sort((a, b) => a.blankCount - b.blankCount)

      const suggestedPrimaryId = withBlankCount[0].row.id
      // マージ後のプレビュー: プライマリが空欄のフィールドを他のレコードで埋める
      const merged: Record<string, any> = { ...withBlankCount[0].row }
      for (const field of FIELDS) {
        if (!merged[field] || String(merged[field]).trim() === '') {
          for (const { row } of withBlankCount.slice(1)) {
            if (row[field] && String(row[field]).trim() !== '') {
              merged[field] = row[field]
              break
            }
          }
        }
      }

      // 表示用の代表企業名(グループ内で最初に見つかった非空の値。フィールド指定によっては
      // 企業名が一致要因でないこともあるため、あくまで表示ラベルとして使う)
      const companyName = rows.find((r) => (r.company_name || '').trim())?.company_name?.trim()
        || `${rows[0].no}他`

      return {
        groupKey: root,
        companyName,
        matchedFields: Array.from(matchedFieldsByRoot.get(root) || []),
        suggestedPrimaryId,
        records: rows.map((r) => ({
          id: r.id,
          list_slug: r.list_slug,
          no: r.no,
          callHistoryCount: historyCountMap[`${r.list_slug}__${r.no}`] || 0,
          ...Object.fromEntries(FIELDS.map((f) => [f, r[f]])),
        })),
        mergedPreview: Object.fromEntries(FIELDS.map((f) => [f, merged[f]])),
        totalCallHistoryCount: rows.reduce(
          (sum, r) => sum + (historyCountMap[`${r.list_slug}__${r.no}`] || 0),
          0
        ),
      }
    })

  return NextResponse.json({ success: true, groups: duplicateGroups, count: duplicateGroups.length, detectionFields })
}
