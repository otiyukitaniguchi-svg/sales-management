export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, LIST_TYPE_MAP, TABLES } from '@/lib/supabase'
import { toFrontendFormat } from '@/lib/types'

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

    // 架電履歴の検索条件
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
      // SQLを使用して、各 (list_type, no) の最新1行のみを抽出し、その行が条件に一致するか判定する
      // date, start_time, created_at の順で最新を定義
      const { data: matchedHistory, error: historyError } = await supabaseAdmin.rpc('search_latest_call_history', {
        p_operator: operator || null,
        p_date: historyDate || null,
        p_start_time: historyStartTime || null,
        p_end_time: historyEndTime || null,
        p_responder: responder || null,
        p_gender: historyGender || null,
        p_progress: progress || null,
        p_note: historyNote || null
      })

      // RPCが未定義の場合はフォールバックとして従来の（ただし修正された）ロジックを使用
      if (historyError) {
        console.warn('RPC search_latest_call_history failed, falling back to manual filtering:', historyError)
        
        // フォールバック: 全履歴を取得して最新行を特定（パフォーマンス上の懸念はあるが正確性を優先）
        const { data: allHistory, error: fetchError } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('list_type, no, operator, date, start_time, end_time, responder, gender, progress, note, created_at')
          .order('date', { ascending: false })
          .order('start_time', { ascending: false })
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        const latestMap = new Map<string, any>()
        for (const row of (allHistory || [])) {
          const key = `${row.list_type}:${row.no}`
          if (!latestMap.has(key)) {
            latestMap.set(key, row)
          }
        }

        // TypeScriptの反復処理エラー回避のため Array.from() を使用
        const latestRows = Array.from(latestMap.values())
        for (const row of latestRows) {
          let match = true
          if (operator && (row.operator || '').trim() !== operator.trim()) match = false
          if (match && responder && (row.responder || '').trim() !== responder.trim()) match = false
          if (match && historyGender && (row.gender || '').trim() !== historyGender.trim()) match = false
          if (match && progress && (row.progress || '').trim() !== progress.trim()) match = false
          if (match && historyNote && (row.note || '').trim() !== historyNote.trim()) match = false
          if (match && historyDate) {
            const d = historyDate.replace(/\//g, '-').trim()
            const rd = (row.date || '').replace(/\//g, '-').trim()
            if (d !== rd) match = false
          }
          if (match && historyStartTime && (row.start_time || '').trim() !== historyStartTime.trim()) match = false
          
          if (match) {
            const listId = row.list_type === '新規リスト' ? 'list1' : 
                           row.list_type === 'ハルエネリスト' ? 'list2' : 
                           row.list_type === 'モバイルリスト' ? 'list3' : row.list_type
            if (!matchedByList.has(listId)) matchedByList.set(listId, new Set())
            matchedByList.get(listId)!.add(row.no)
          }
        }
      } else {
        for (const row of (matchedHistory || [])) {
          const listId = row.list_type === '新規リスト' ? 'list1' : 
                         row.list_type === 'ハルエネリスト' ? 'list2' : 
                         row.list_type === 'モバイルリスト' ? 'list3' : row.list_type
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

      const { data: records, error } = await query
      if (error) continue

      if (records && records.length > 0) {
        const matchedNos = records.map(r => r.no)
        const { data: historyCounts } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('no, list_type')
          .eq('list_type', tableName) // 日本語名で絞り込み
          .in('no', matchedNos)

        const countMap: Record<string, number> = {}
        for (const h of (historyCounts || [])) {
          countMap[h.no] = (countMap[h.no] || 0) + 1
        }

        for (const record of records) {
          const frontendRecord = toFrontendFormat(record)
          frontendRecord.callHistoryCount = countMap[record.no] || 0
          results.push({ listId: listId, record: frontendRecord })
        }
      }
    }

    return NextResponse.json({ success: true, results: results, count: results.length })
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json({ success: false, message: error.message || '不明なエラー' }, { status: 500 })
  }
}
