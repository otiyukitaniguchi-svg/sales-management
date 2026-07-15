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

export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

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

  // company_name(前後空白除去)でグルーピング
  const groups = new Map<string, any[]>()
  for (const row of all) {
    const key = (row.company_name || '').trim()
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const duplicateGroups = Array.from(groups.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([companyName, rows]) => {
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

      return {
        companyName,
        suggestedPrimaryId,
        records: rows.map((r) => ({
          id: r.id,
          list_slug: r.list_slug,
          no: r.no,
          ...Object.fromEntries(FIELDS.map((f) => [f, r[f]])),
        })),
        mergedPreview: Object.fromEntries(FIELDS.map((f) => [f, merged[f]])),
      }
    })

  return NextResponse.json({ success: true, groups: duplicateGroups, count: duplicateGroups.length })
}
