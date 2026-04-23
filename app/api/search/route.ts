export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, LIST_TYPE_MAP, TABLES } from '@/lib/supabase'
import { toFrontendFormat } from '@/lib/types'

/**
 * 日付文字列を YYYY-MM-DD 形式に正規化する。
 * DBには "2026/02/09" と "2026-02-09" の両形式が混在するため両方を扱う。
 */
function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const s = String(dateStr).replace(/\//g, '-').trim()
  const parts = s.split('-')
  if (parts.length === 3) {
    const y = parts[0]
    const m = parts[1].padStart(2, '0')
    const d = parts[2].padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return s
}

/**
 * "HH:MM" / "HH:MM:SS" の先頭5文字を返す
 */
function normalizeTime(t: string | null | undefined): string {
  if (!t) return ''
  return String(t).trim().slice(0, 5)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // --- 顧客基本情報の検索条件（部分一致） ---
    const no = searchParams.get('no')
    const companyName = searchParams.get('companyName')
    const companyKana = searchParams.get('companyKana')
    const address = searchParams.get('address')
    const repName = searchParams.get('repName')
    const staffName = searchParams.get('staffName')
    const memo = searchParams.get('memo')
    const fixedNo = searchParams.get('fixedNo')
    const otherContact = searchParams.get('otherContact')
    const email = searchParams.get('email')
    const industry = searchParams.get('industry')

    // --- 架電履歴の検索条件 ---
    // operator/responder/progress/gender は完全一致（選択値のため）
    // note は部分一致
    // date/start_time/end_time はどの履歴にでも一致すればOK
    const operator = searchParams.get('operator')
    const historyDate = searchParams.get('historyDate')
    const historyStartTime = searchParams.get('historyStartTime')
    const historyEndTime = searchParams.get('historyEndTime')
    const responder = searchParams.get('responder')
    const historyGender = searchParams.get('historyGender')
    const progress = searchParams.get('progress')
    const historyNote = searchParams.get('historyNote')

    // 履歴検索の範囲: latest = 各顧客の最新履歴のみ / all = 過去履歴すべて（デフォルト: latest）
    const historyScope = (searchParams.get('historyScope') || 'latest').toLowerCase() === 'all' ? 'all' : 'latest'

    // --- 再コール日時の検索条件 ---
    // recallDate="" (空文字列) は「未設定(空欄)を検索」を意味する
    const recallDateParam = searchParams.get('recallDate')
    const recallTimeParam = searchParams.get('recallTime')
    const hasRecallSearch = recallDateParam !== null || recallTimeParam !== null

    const hasHistorySearch = !!(
      operator || historyDate || historyStartTime || historyEndTime ||
      responder || historyGender || progress || historyNote
    )

    // 空値のみでの全件検索を防止
    const hasCustomerCond = !!(
      no || companyName || companyKana || address || repName || staffName || memo ||
      fixedNo || otherContact || email || industry
    )
    if (!hasCustomerCond && !hasHistorySearch && !hasRecallSearch) {
      return NextResponse.json(
        { success: false, message: '検索条件が指定されていません' },
        { status: 400 }
      )
    }

    // --- 架電履歴による絞り込み ---
    // 「最新履歴」ではなく「いずれかの履歴」が条件に一致すれば候補とする
    const matchedByList: Map<string, Set<string>> = new Map()

    if (hasHistorySearch) {
      // 全履歴をページングで取得（Supabase の上限1000件を超える可能性があるため）
      // latestモードでも最新履歴を判定するため全件取得が必要
      const allHistory: any[] = []
      const pageSize = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('list_type, no, operator, date, start_time, end_time, responder, gender, progress, note')
          .range(from, from + pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allHistory.push(...data)
        if (data.length < pageSize) break
        from += pageSize
      }

      // historyScope=latest の場合は、(list_type, no) ごとに最新の1件のみを残す
      let candidateRows = allHistory
      if (historyScope === 'latest') {
        type Row = typeof allHistory[number]
        const latestMap = new Map<string, Row>()
        for (const row of allHistory) {
          const key = `${row.list_type}__${row.no}`
          const prev = latestMap.get(key)
          if (!prev) { latestMap.set(key, row); continue }
          // 日付(YYYY-MM-DD) + 開始時刻(HH:MM) で降順最新を選ぶ
          const cur = `${normalizeDate(row.date)}T${normalizeTime(row.start_time)}`
          const pv = `${normalizeDate(prev.date)}T${normalizeTime(prev.start_time)}`
          if (cur > pv) latestMap.set(key, row)
        }
        candidateRows = Array.from(latestMap.values())
      }

      const normalizedSearchDate = historyDate ? normalizeDate(historyDate) : ''
      const normalizedStart = historyStartTime ? normalizeTime(historyStartTime) : ''
      const normalizedEnd = historyEndTime ? normalizeTime(historyEndTime) : ''
      const noteLower = historyNote ? historyNote.toLowerCase() : ''

      for (const row of candidateRows) {
        let match = true

        if (operator && (row.operator || '').trim() !== operator.trim()) match = false
        if (match && responder && !(row.responder || '').includes(responder.trim())) match = false
        if (match && historyGender && (row.gender || '').trim() !== historyGender.trim()) match = false
        if (match && progress && (row.progress || '').trim() !== progress.trim()) match = false

        if (match && noteLower) {
          if (!(row.note || '').toLowerCase().includes(noteLower)) match = false
        }

        if (match && normalizedSearchDate) {
          if (normalizeDate(row.date) !== normalizedSearchDate) match = false
        }

        if (match && normalizedStart) {
          if (normalizeTime(row.start_time) !== normalizedStart) match = false
        }
        if (match && normalizedEnd) {
          if (normalizeTime(row.end_time) !== normalizedEnd) match = false
        }

        if (match) {
          const listId =
            row.list_type === '新規リスト' ? 'list1' :
            row.list_type === 'ハルエネリスト' ? 'list2' :
            row.list_type === 'モバイルリスト' ? 'list3' : row.list_type
          if (!matchedByList.has(listId)) matchedByList.set(listId, new Set())
          matchedByList.get(listId)!.add(String(row.no))
        }
      }

      // 履歴条件を指定したが1件も該当しない場合は空を返す
      if (matchedByList.size === 0) {
        return NextResponse.json({ success: true, results: [], count: 0 })
      }
    }

    // --- 顧客テーブル検索 ---
    const results: any[] = []

    for (const [listId, tableName] of Object.entries(LIST_TYPE_MAP)) {
      if (hasHistorySearch && !matchedByList.has(listId)) continue

      const uniqueNos = hasHistorySearch ? Array.from(matchedByList.get(listId)!) : null
      if (uniqueNos !== null && uniqueNos.length === 0) continue

      let query = supabaseAdmin.from(tableName).select('*')

      if (no) query = query.ilike('no', `%${no}%`)
      if (companyName) {
        // 企業名は company_name / company_kana 両方の部分一致
        query = query.or(`company_name.ilike.%${companyName}%,company_kana.ilike.%${companyName}%`)
      }
      if (companyKana) query = query.ilike('company_kana', `%${companyKana}%`)
      if (address) {
        query = query.or(`address.ilike.%${address}%,address_kana.ilike.%${address}%`)
      }
      if (repName) query = query.or(`rep_name.ilike.%${repName}%,rep_kana.ilike.%${repName}%`)
      if (staffName) query = query.or(`staff_name.ilike.%${staffName}%,staff_kana.ilike.%${staffName}%`)
      if (memo) query = query.ilike('memo', `%${memo}%`)
      if (fixedNo) query = query.ilike('fixed_no', `%${fixedNo}%`)
      if (otherContact) query = query.ilike('other_contact', `%${otherContact}%`)
      if (email) query = query.ilike('email', `%${email}%`)
      if (industry) query = query.ilike('industry', `%${industry}%`)

      if (hasRecallSearch) {
        // recall_date: "" (空文字列) → 未設定扱い（null または 空文字列）
        if (recallDateParam === '') {
          query = query.or('recall_date.is.null,recall_date.eq.')
        } else if (recallDateParam) {
          query = query.eq('recall_date', recallDateParam)
        }
        if (recallTimeParam === '') {
          query = query.or('recall_time.is.null,recall_time.eq.')
        } else if (recallTimeParam) {
          query = query.eq('recall_time', recallTimeParam)
        }
      }

      if (uniqueNos !== null) query = query.in('no', uniqueNos)

      // 検索結果は最大2000件まで取得（安全策）
      query = query.limit(2000)

      const { data: records, error } = await query
      if (error) {
        console.error(`[search] table=${tableName} error:`, error)
        continue
      }

      if (records && records.length > 0) {
        const matchedNos = records.map(r => r.no)
        const { data: historyCounts } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('no')
          .eq('list_type', tableName)
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

    return NextResponse.json({ success: true, results, count: results.length })
  } catch (error: any) {
    console.error('[search] fatal error:', error)
    return NextResponse.json(
      { success: false, message: error?.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
