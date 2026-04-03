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

// 日付文字列を比較可能な形式に正規化（スラッシュ→ハイフン）
function normalizeDate(d: string): string {
  return d ? d.replace(/\//g, '-') : ''
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

    // 再コール日時の検索条件（空文字列 = 未設定を検索）
    const recallDateParam = searchParams.get('recallDate')
    const recallTimeParam = searchParams.get('recallTime')
    const hasRecallSearch = recallDateParam !== null || recallTimeParam !== null

    const hasHistorySearch = !!(operator || historyDate || historyStartTime || historyEndTime ||
      responder || historyGender || progress || historyNote)

    // 少なくとも一つの検索条件が必要
    if (!no && !companyName && !address && !repName && !staffName && !memo &&
        !fixedNo && !otherContact && !email && !industry &&
        !hasHistorySearch && !hasRecallSearch) {
      return NextResponse.json(
        { success: false, message: '検索条件が指定されていません' },
        { status: 400 }
      )
    }

    // 架電履歴条件にマッチした (listId, no) の一意なセットを格納
    // Map<listId, Set<no>>
    const matchedByList: Map<string, Set<string>> = new Map()

    // 1. 架電履歴からの検索（履歴条件があれば）
    if (hasHistorySearch) {
      // 全履歴を date 降順・start_time 降順で取得し、
      // 各 (list_type, no) の最初のレコード（= 最新履歴）だけを残す
      let from = 0
      const pageSize = 1000
      // 最新履歴を格納: key = `${listId}:${no}`, value = 最新履歴レコード
      const latestHistory: Map<string, {
        list_type: string
        no: string
        operator: string
        date: string
        start_time: string
        end_time: string
        responder: string
        gender: string
        progress: string
        note: string
      }> = new Map()

      // 全件ページネーション取得（date降順・start_time降順）
      while (true) {
        const { data: page, error } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('list_type, no, operator, date, start_time, end_time, responder, gender, progress, note')
          .order('date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('History fetch error:', error)
          break
        }
        if (!page || page.length === 0) break

        for (const row of page) {
          const listId = LIST_TYPE_TO_ID[row.list_type] || row.list_type
          const key = `${listId}:${row.no}`
          // 最初に出てきたレコード（= 最新履歴）だけを保持
          if (!latestHistory.has(key)) {
            latestHistory.set(key, { ...row, list_type: listId })
          }
        }

        if (page.length < pageSize) break
        from += pageSize
      }

      // 最新履歴が検索条件に一致するものだけを matchedByList に追加
      for (const [key, row] of latestHistory.entries()) {
        const listId = row.list_type

        // 各条件を最新履歴に対してチェック
        if (operator && !row.operator.toLowerCase().includes(operator.toLowerCase())) continue
        if (historyDate) {
          const normalizedRowDate = normalizeDate(row.date)
          const normalizedSearchDate = normalizeDate(historyDate)
          if (normalizedRowDate !== normalizedSearchDate) continue
        }
        if (historyStartTime && !row.start_time.includes(historyStartTime)) continue
        if (historyEndTime && !row.end_time.includes(historyEndTime)) continue
        if (responder && !row.responder.toLowerCase().includes(responder.toLowerCase())) continue
        if (historyGender && row.gender !== historyGender) continue
        if (progress && row.progress !== progress) continue
        if (historyNote && !row.note.toLowerCase().includes(historyNote.toLowerCase())) continue

        // 条件に一致 → matchedByList に追加
        if (!matchedByList.has(listId)) {
          matchedByList.set(listId, new Set())
        }
        matchedByList.get(listId)!.add(row.no)
      }
    }

    const results = []

    // 2. 各リスト（新規、ハルエネ、モバイル）を横断検索
    for (const [listId, tableName] of Object.entries(LIST_TYPE_MAP)) {
      // 履歴条件があるが、このリストに該当がない場合はスキップ
      if (hasHistorySearch && !matchedByList.has(listId)) {
        continue
      }

      const uniqueNos = hasHistorySearch
        ? Array.from(matchedByList.get(listId)!)
        : null

      if (uniqueNos !== null && uniqueNos.length === 0) continue

      // 顧客テーブルへのクエリ（件数上限なし）
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
        if (recallDateParam === '') {
          query = query.is('recall_date', null)
        } else if (recallDateParam) {
          query = query.eq('recall_date', recallDateParam)
        }
      }

      // 最新履歴が条件に一致した No のみに絞り込む
      if (uniqueNos !== null) {
        query = query.in('no', uniqueNos)
      }

      // 件数上限なし（Supabaseのデフォルト上限1000件を回避するためページネーション）
      let fromCustomer = 0
      const customerPageSize = 1000

      while (true) {
        const { data: records, error } = await query.range(fromCustomer, fromCustomer + customerPageSize - 1)

        if (error) {
          console.error(`Search error in ${tableName}:`, error)
          break
        }
        if (!records || records.length === 0) break

        for (const record of records) {
          // 架電履歴件数を取得
          const { count } = await supabaseAdmin
            .from(TABLES.CALL_HISTORY)
            .select('*', { count: 'exact', head: true })
            .or(`list_type.eq.${listId},list_type.eq.${tableName}`)
            .eq('no', record.no)

          const frontendRecord = toFrontendFormat(record)
          frontendRecord.callHistoryCount = count || 0

          results.push({
            listId: listId,
            record: frontendRecord,
          })
        }

        if (records.length < customerPageSize) break
        fromCustomer += customerPageSize
      }
    }

    return NextResponse.json({
      success: true,
      results: results,
      count: results.length,
    })
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
