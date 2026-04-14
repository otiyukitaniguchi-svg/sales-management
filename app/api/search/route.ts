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

// 日付文字列を正規化（スラッシュ→ハイフン）
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
    const matchedByList: Map<string, Set<string>> = new Map()

    // 1. 架電履歴からの検索（履歴条件があれば）
    if (hasHistorySearch) {
      // 全履歴を date DESC, start_time DESC で取得し、
      // 各 (list_type, no) の最新1件のみを取り出してから条件チェックする

      // まず全件を date DESC, start_time DESC で取得
      let from = 0
      const pageSize = 1000

      // key=(listId:no) → 最新1件の行データ を保持するMap
      const latestRowByKey: Map<string, {
        list_type: string
        no: string
        operator: string | null
        date: string | null
        start_time: string | null
        end_time: string | null
        responder: string | null
        gender: string | null
        progress: string | null
        note: string | null
      }> = new Map()

      // 全件を date DESC, start_time DESC で取得（条件フィルタなし）
      const baseQuery = supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select('list_type, no, operator, date, start_time, end_time, responder, gender, progress, note')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

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
          // 最初に出てきたレコード（= date/start_time が最新の1件）だけを保持
          if (!latestRowByKey.has(key)) {
            latestRowByKey.set(key, {
              list_type: listId,
              no: row.no,
              operator: row.operator,
              date: row.date,
              start_time: row.start_time,
              end_time: row.end_time,
              responder: row.responder,
              gender: row.gender,
              progress: row.progress,
              note: row.note,
            })
          }
        }

        if (page.length < pageSize) break
        from += pageSize
      }

      // 最新1件に対して検索条件を適用（アプリ側でフィルタリング）
      for (const [key, row] of Array.from(latestRowByKey.entries())) {
        let match = true

        // 担当オペレーター（完全一致）
        if (operator && (row.operator || '').trim() !== operator.trim()) {
          match = false
        }
        // 対応者（完全一致）
        if (match && responder && (row.responder || '').trim() !== responder.trim()) {
          match = false
        }
        // 性別（完全一致）
        if (match && historyGender && (row.gender || '').trim() !== historyGender.trim()) {
          match = false
        }
        // 進捗（完全一致）
        if (match && progress && (row.progress || '').trim() !== progress.trim()) {
          match = false
        }
        // メモ（完全一致）
        if (match && historyNote && (row.note || '').trim() !== historyNote.trim()) {
          match = false
        }
        // 架電日（スラッシュ・ハイフン両対応、完全一致）
        if (match && historyDate) {
          const slashDate = historyDate.replace(/-/g, '/').trim()
          const hyphenDate = historyDate.replace(/\//g, '-').trim()
          const rowDate = (row.date || '').trim()
          if (rowDate !== slashDate && rowDate !== hyphenDate) {
            match = false
          }
        }
        // 開始時刻（完全一致）
        if (match && historyStartTime && (row.start_time || '').trim() !== historyStartTime.trim()) {
          match = false
        }
        // 終了時刻（完全一致）
        if (match && historyEndTime && (row.end_time || '').trim() !== historyEndTime.trim()) {
          match = false
        }

        if (match) {
          const listId = row.list_type
          if (!matchedByList.has(listId)) {
            matchedByList.set(listId, new Set())
          }
          matchedByList.get(listId)!.add(row.no)
        }
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

      // 件数上限なし（ページネーション）
      let fromCustomer = 0
      const customerPageSize = 1000

      // このリストの全マッチ顧客Noを収集
      const matchedRecords: any[] = []

      while (true) {
        const { data: records, error } = await query.range(fromCustomer, fromCustomer + customerPageSize - 1)

        if (error) {
          console.error(`Search error in ${tableName}:`, error)
          break
        }
        if (!records || records.length === 0) break

        matchedRecords.push(...records)

        if (records.length < customerPageSize) break
        fromCustomer += customerPageSize
      }

      if (matchedRecords.length === 0) continue

      // 架電履歴件数をバッチ取得（N+1問題を解消）
      const matchedNos = matchedRecords.map(r => r.no)
      const { data: historyCounts } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select('no, list_type')
        .in('no', matchedNos)
        .or(`list_type.eq.${listId},list_type.eq.${tableName},list_type.eq.${Object.entries(LIST_TYPE_TO_ID).find(([, v]) => v === listId)?.[0] || listId}`)

      // no ごとの件数をカウント
      const countMap: Record<string, number> = {}
      for (const h of (historyCounts || [])) {
        countMap[h.no] = (countMap[h.no] || 0) + 1
      }

      for (const record of matchedRecords) {
        const frontendRecord = toFrontendFormat(record)
        frontendRecord.callHistoryCount = countMap[record.no] || 0

        results.push({
          listId: listId,
          record: frontendRecord,
        })
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
