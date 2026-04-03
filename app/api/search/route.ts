import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, LIST_TYPE_MAP, TABLES } from '@/lib/supabase'
import { toFrontendFormat } from '@/lib/types'

// list_type の日本語名 → listId のマッピング
const LIST_TYPE_TO_ID: Record<string, string> = {
  '新規リスト': 'list1',
  'ハルエネリスト': 'list2',
  'モバイルリスト': 'list3',
  // listId形式もそのまま通す（後方互換）
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

    // 架電履歴の検索条件（全項目）
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
    // Map<listId, Set<no>> で重複を排除する
    const matchedByList: Map<string, Set<string>> = new Map()

    // 1. 架電履歴からの検索（履歴条件があれば）
    if (hasHistorySearch) {
      // 全件取得するためページネーション対応（最大10000件）
      let from = 0
      const pageSize = 1000
      let allHistoryMatches: Array<{ list_type: string; no: string }> = []

      while (true) {
        let historyQuery = supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('list_type, no')
          .range(from, from + pageSize - 1)

        if (operator) historyQuery = historyQuery.ilike('operator', `%${operator}%`)
        if (historyDate) {
          const dateSlash = historyDate.replace(/-/g, '/')
          const dateDash = historyDate.replace(/\//g, '-')
          historyQuery = historyQuery.or(`date.eq.${dateSlash},date.eq.${dateDash}`)
        }
        if (historyStartTime) historyQuery = historyQuery.ilike('start_time', `%${historyStartTime}%`)
        if (historyEndTime) historyQuery = historyQuery.ilike('end_time', `%${historyEndTime}%`)
        if (responder) historyQuery = historyQuery.ilike('responder', `%${responder}%`)
        if (historyGender) historyQuery = historyQuery.eq('gender', historyGender)
        if (progress) historyQuery = historyQuery.eq('progress', progress)
        if (historyNote) historyQuery = historyQuery.ilike('note', `%${historyNote}%`)

        const { data: historyMatches, error: historyError } = await historyQuery

        if (historyError) {
          console.error('History search error:', historyError)
          break
        }

        if (!historyMatches || historyMatches.length === 0) break

        allHistoryMatches = allHistoryMatches.concat(historyMatches)

        if (historyMatches.length < pageSize) break
        from += pageSize
      }

      // list_type を listId に変換し、重複を除去して Map に格納
      for (const m of allHistoryMatches) {
        const listId = LIST_TYPE_TO_ID[m.list_type] || m.list_type
        if (!matchedByList.has(listId)) {
          matchedByList.set(listId, new Set())
        }
        matchedByList.get(listId)!.add(m.no)
      }
    }

    const results = []

    // 2. 各リスト（新規、ハルエネ、モバイル）を横断検索
    for (const [listId, tableName] of Object.entries(LIST_TYPE_MAP)) {
      // 履歴条件があるが、このリストに該当がない場合はスキップ
      if (hasHistorySearch && !matchedByList.has(listId)) {
        continue
      }

      // 履歴条件でヒットした No の一意なリスト
      const uniqueNos = hasHistorySearch
        ? Array.from(matchedByList.get(listId)!)
        : null

      // 顧客テーブルへのクエリ
      let query = supabaseAdmin.from(tableName).select('*')

      // 基本情報の条件があれば適用
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

      // 再コール日時の検索
      if (hasRecallSearch) {
        if (recallDateParam === '') {
          query = query.is('recall_date', null)
        } else if (recallDateParam) {
          query = query.eq('recall_date', recallDateParam)
        }
      }

      // 履歴条件でヒットした No のみに絞り込む（重複除去済み）
      if (uniqueNos !== null) {
        if (uniqueNos.length === 0) continue
        query = query.in('no', uniqueNos)
      }

      const { data: records, error } = await query.limit(200)

      if (error) {
        console.error(`Search error in ${tableName}:`, error)
        continue
      }

      if (records && records.length > 0) {
        for (const record of records) {
          // 架電履歴件数を取得（list_typeが日本語名で保存されているため両方で検索）
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
