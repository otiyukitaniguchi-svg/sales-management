export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from(TABLES.LISTS)
    .select('id, slug, name, sort_order, created_at')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, lists: data })
}
