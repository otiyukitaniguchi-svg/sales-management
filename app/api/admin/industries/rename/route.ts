export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

interface RenameItem {
  oldName: string
  newName: string
}

export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const renames: RenameItem[] = Array.isArray(body.renames) ? body.renames : []

    if (renames.length === 0) {
      return NextResponse.json({ success: false, message: '変更対象が指定されていません' }, { status: 400 })
    }

    const results: Array<{ oldName: string; newName: string; updatedCount: number; error?: string }> = []

    for (const { oldName, newName } of renames) {
      const trimmedOld = (oldName || '').trim()
      const trimmedNew = (newName || '').trim()
      if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) continue

      const { data, error } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .update({ industry: trimmedNew })
        .eq('industry', trimmedOld)
        .select('id')

      if (error) {
        results.push({ oldName: trimmedOld, newName: trimmedNew, updatedCount: 0, error: error.message })
      } else {
        results.push({ oldName: trimmedOld, newName: trimmedNew, updatedCount: data?.length || 0 })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Error in industries/rename:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
