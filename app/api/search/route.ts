import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, LIST_TYPE_MAP, TABLES } from '@/lib/supabase'
import { toFrontendFormat } from '@/lib/types'

// list_type の日本語名 → listId のマッピング
const LIST_TYPE_TO_ID: Record<string, string> = {
  '新規リスト': 'list1',
  'ハルエネリスト': 'list2',
  'モバイルリスト': 'list3',
  'list1': 'list1',
  'list2': 'list2',
  'list3': 'list3',
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // 顧客基本情報の検索条件
    const no = searchParams.get('no')
    const companyName = searchParams.get('companyName')
    const address = searchParams.get('address')
    const repName = searchParams.get('repName')
    const staffName = searchParams.get('staffName')
    const memo = searchParams.get('memo')
    const fixedNo = searchParams.get('fixedNo')
    const otherContact = searchParams.get('otherContact')
    const email = searchParams.get('email')
    const industry = searchParams.get('industry')

    // 架電履歴の検索条件（最新履歴1件のみ参照）
    const operator = searchParams.get('operator')
    const historyDate = searchParams.get('historyDate')
    const historyStartTime = searchParams.get('historyStartTime')
    const historyEndTime = searchParams.get('historyEndTime')
    const responder = searchParams.get('responder')
    const historyGender = searchParams.get('historyGender')
    const progress = searchParams.get('progress')
    const historyNote = searchParams.get('historyNote')

    // 再コール日時の検索条件
    const recallDateParam = searchParams.get('recallDate')
    const recallTimeParam = searchParams.get('recallTime')
    const hasRecallSearch = recallDateParam !== null || recallTimeParam !== null

    const hasHistorySearch = !!(operator || historyDate || historyStartTime || historyEndTime ||
      responder || historyGender || progress || historyNote)

    if (!no && !companyName && !address && !repName && !staffName && !memo &&
        !fixedNo && !otherContact && !email && !industry &&
        !hasHistorySearch && !hasRecallSearch) {
      return NextResponse.json(
        { success: false, message: '検索条件が指定されていません' },
        { status: 400 }
      )
    }

    const matchedByList: Map<string, Set<string>> = new Map()

    if (hasHistorySearch) {
      let from = 0
      const pageSize = 1000

      const latestRowByKey: Map<string, any> = new Map()

      // 全件を date DESC, start_time DESC, created_at DESC で取得
      const baseQuery = supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select('list_type, no, operator, date, start_time, end_time, responder, gender, progress, note')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .order('created_at', { ascending: false })

      while (true) {
        const { data: page, error } = await baseQuery.range(from, from + pageSize - 1)

        if (error) {
          console.error('History fetch error:', error)
          break
        }
        if (!page || page.length === 0) break

        for (const row of page) {
          const listId = LIST_TYPE_TO_ID[row.list_type] || row.list_type
          const key = `${listId}:${row.no}`
          if (!latestRowByKey.has(key)) {
            latestRowByKey.set(key, { ...row, list_type: listId })
          }
        }

        if (page.length < pageSize) break
        from += pageSize
      }

      for (const [key, row] of Array.from(latestRowByKey.entries())) {
        let match = true

        if (operator && (row.operator || '').trim() !== operator.trim()) match = false
        if (match && responder && (row.responder || '').trim() !== responder.trim()) match = false
        if (match && historyGender && (row.gender || '').trim() !== historyGender.trim()) match = false
        if (match && progress && (row.progress || '').trim() !== progress.trim()) match = false
        if (match && historyNote && (row.note || '').trim() !== historyNote.trim()) match = false
        
        if (match && historyDate) {
          const slashDate = historyDate.replace(/-/g, '/').trim()
          const hyphenDate = historyDate.replace(/\//g, '-').trim()
          const rowDate = (row.date || '').trim()
          if (rowDate !== slashDate && rowDate !== hyphenDate) match = false
        }
        if (match && historyStartTime && (row.start_time || '').trim() !== historyStartTime.trim()) match = false
        if (match && historyEndTime && (row.end_time || '').trim() !== historyEndTime.trim()) match = false

        if (match) {
          const listId = row.list_type
          if (!matchedByList.has(listId)) matchedByList.set(listId, new Set())
          matchedByList.get(listId)!.add(row.no)
        }
      }
    }

    const results = []

    for (const [listId, tableName] of Object.entries(LIST_TYPE_MAP)) {
      if (hasHistorySearch && !matchedByList.has(listId)) continue

      const uniqueNos = hasHistorySearch ? Array.from(matchedByList.get(listId)!) : null
      if (uniqueNos !== null && uniqueNos.length === 0) continue

      let query = supabaseAdmin.from(tableName).select('*')

      if (no) query = query.ilike('no', `%${no}%`)
      if (companyName) query = query.or(`company_name.ilike.%${companyName}%,company_kana.ilike.%${companyName}%`)
      if (address) query = query.ilike('address', `%${address}%`)
      if (repName) query = query.or(`rep_name.ilike.%${repName}%,rep_kana.ilike.%${repName}%`)
      if (staffName) query = query.or(`staff_name.ilike.%${staffName}%,staff_kana.ilike.%${staffName}%`)
      if (memo) query = query.ilike('memo', `%${memo}%`)
      if (fixedNo) query = query.ilike('fixed_no', `%${fixedNo}%`)
      if (otherContact) query = query.ilike('other_contact', `%${otherContact}%`)
      if (email) query = query.ilike('email', `%${email}%`)
      if (industry) query = query.ilike('industry', `%${industry}%`)

      if (hasRecallSearch) {
        if (recallDateParam === '') query = query.is('recall_date', null)
        else if (recallDateParam) query = query.eq('recall_date', recallDateParam)
      }

      if (uniqueNos !== null) query = query.in('no', uniqueNos)

      let fromCustomer = 0
      const customerPageSize = 1000
      const matchedRecords: any[] = []

      while (true) {
        const { data: records, error } = await query.range(fromCustomer, fromCustomer + customerPageSize - 1)
        if (error) break
        if (!records || records.length === 0) break
        matchedRecords.push(...records)
        if (records.length < customerPageSize) break
        fromCustomer += customerPageSize
      }

      if (matchedRecords.length === 0) continue

      const matchedNos = matchedRecords.map(r => r.no)
      const { data: historyCounts } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select('no, list_type')
        .eq('list_type', listId)
        .in('no', matchedNos)

      const countMap: Record<string, number> = {}
      for (const h of (historyCounts || [])) {
        countMap[h.no] = (countMap[h.no] || 0) + 1
      }

      for (const record of matchedRecords) {
        const frontendRecord = toFrontendFormat(record)
        frontendRecord.callHistoryCount = countMap[record.no] || 0
        results.push({ listId: listId, record: frontendRecord })
      }
    }

    return NextResponse.json({ success: true, results: results, count: results.length })
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json({ success: false, message: error.message || '不明なエラー' }, { status: 500 })
  }
}
