export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { normalizeAddress, normalizePhone, normalizeCompanyName } from '@/lib/dataCleanup'
import type { NextRequest } from 'next/server'

// 全顧客レコードを走査し、住所(丁目/番地/号の表記ゆれ)と固定番号(先頭0欠落・ハイフン
// なし)の正規化候補を検出する(読み取り専用、実際の反映はapplyルートで行う)
export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    let from = 0
    const pageSize = 1000
    const addressChanges: any[] = []
    const phoneChanges: any[] = []
    const companyNameChanges: any[] = []
    let scannedCount = 0

    while (true) {
      const { data, error } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .select('id, list_slug, no, company_name, address, fixed_no, other_contact')
        .range(from, from + pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        scannedCount++
        const newAddress = normalizeAddress(row.address)
        if (row.address && newAddress !== row.address) {
          addressChanges.push({
            id: row.id,
            listSlug: row.list_slug,
            no: row.no,
            companyName: row.company_name || '',
            oldValue: row.address,
            newValue: newAddress,
          })
        }

        const newFixedNo = normalizePhone(row.fixed_no)
        if (row.fixed_no && newFixedNo !== row.fixed_no) {
          phoneChanges.push({
            id: row.id,
            field: 'fixed_no',
            listSlug: row.list_slug,
            no: row.no,
            companyName: row.company_name || '',
            oldValue: row.fixed_no,
            newValue: newFixedNo,
          })
        }

        const newOtherContact = normalizePhone(row.other_contact)
        if (row.other_contact && newOtherContact !== row.other_contact) {
          phoneChanges.push({
            id: row.id,
            field: 'other_contact',
            listSlug: row.list_slug,
            no: row.no,
            companyName: row.company_name || '',
            oldValue: row.other_contact,
            newValue: newOtherContact,
          })
        }

        const newCompanyName = normalizeCompanyName(row.company_name)
        if (row.company_name && newCompanyName !== row.company_name) {
          companyNameChanges.push({
            id: row.id,
            listSlug: row.list_slug,
            no: row.no,
            companyName: row.company_name || '',
            oldValue: row.company_name,
            newValue: newCompanyName,
          })
        }
      }

      if (data.length < pageSize) break
      from += pageSize
    }

    return NextResponse.json({ success: true, scannedCount, addressChanges, phoneChanges, companyNameChanges })
  } catch (error: any) {
    console.error('Error in data-cleanup/preview:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
