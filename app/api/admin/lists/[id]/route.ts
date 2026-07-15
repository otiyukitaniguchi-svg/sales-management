export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { name } = body
    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, message: 'リスト名を入力してください' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.LISTS)
      .update({ name: String(name).trim() })
      .eq('id', params.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  const confirmed = request.nextUrl.searchParams.get('confirm') === 'true'

  const { data: list, error: fetchError } = await supabaseAdmin
    .from(TABLES.LISTS)
    .select('slug')
    .eq('id', params.id)
    .single()

  if (fetchError || !list) {
    return NextResponse.json({ success: false, message: 'リストが見つかりません' }, { status: 404 })
  }

  const { count } = await supabaseAdmin
    .from(TABLES.CUSTOMERS)
    .select('id', { count: 'exact', head: true })
    .eq('list_slug', list.slug)

  if (!confirmed) {
    return NextResponse.json(
      {
        success: false,
        requiresConfirmation: true,
        customerCount: count || 0,
        message: `このリストには${count || 0}件のデータがあります。削除するには確認が必要です`,
      },
      { status: 409 }
    )
  }

  const { error: deleteCustomersError } = await supabaseAdmin
    .from(TABLES.CUSTOMERS)
    .delete()
    .eq('list_slug', list.slug)

  if (deleteCustomersError) {
    return NextResponse.json({ success: false, message: deleteCustomersError.message }, { status: 500 })
  }

  const { error: deleteListError } = await supabaseAdmin
    .from(TABLES.LISTS)
    .delete()
    .eq('id', params.id)

  if (deleteListError) {
    return NextResponse.json({ success: false, message: deleteListError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
