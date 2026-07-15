export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

function generateSlug(): string {
  return 'list_' + Math.random().toString(36).slice(2, 10)
}

export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { name } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, message: 'リスト名を入力してください' }, { status: 400 })
    }

    const { data: maxSort } = await supabaseAdmin
      .from(TABLES.LISTS)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const slug = generateSlug()
    const { data, error } = await supabaseAdmin
      .from(TABLES.LISTS)
      .insert({ slug, name: String(name).trim(), sort_order: (maxSort?.sort_order || 0) + 1 })
      .select('id, slug, name, sort_order, created_at')
      .single()

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, list: data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
