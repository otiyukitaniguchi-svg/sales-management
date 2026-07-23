'use client'

import { useEffect, useState } from 'react'
import { ApiClient } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'

interface DuplicateGroup {
  groupKey: string
  companyName: string
  matchedFields: string[]
  suggestedPrimaryId: string
  records: Array<Record<string, any>>
  mergedPreview: Record<string, any>
  totalCallHistoryCount: number
}

const PREVIEW_FIELDS: Array<[string, string]> = [
  ['company_name', '企業名'],
  ['fixed_no', '固定電話'],
  ['other_contact', 'その他連絡先'],
  ['address', '住所'],
  ['rep_name', '代表者'],
  ['staff_name', '担当者'],
  ['email', 'メール'],
]

// 統合実行時に項目ごとに値を選べる全項目(DBの列名と対応)
const MERGE_FIELDS: Array<[string, string]> = [
  ['company_kana', '企業名フリガナ'],
  ['company_name', '企業名'],
  ['fixed_no', '固定番号'],
  ['other_contact', 'その他連絡先'],
  ['zip_code', '郵便番号'],
  ['address_kana', '住所フリガナ'],
  ['address', '住所'],
  ['rep_kana', '代表者フリガナ'],
  ['rep_name', '代表者名'],
  ['staff_kana', '担当者フリガナ'],
  ['staff_name', '担当者名'],
  ['email', 'メールアドレス'],
  ['industry', '業種'],
  ['memo', '備考'],
  ['sales', '年間売上'],
  ['software', '既存ソフト'],
  ['decision', '決裁者'],
  ['subsidy', '過去補助金'],
  ['accountant', '税理士'],
  ['established', '設立1年以上'],
  ['recall_date', '再コール日'],
  ['recall_time', '再コール時間'],
]

// 重複検出の条件として選べるフィールド(サーバー側のDETECTABLE_FIELDSと対応)
const DETECTION_FIELD_OPTIONS: Array<[string, string]> = [
  ['company_name', '企業名'],
  ['fixed_no', '固定番号'],
  ['other_contact', 'その他連絡先'],
  ['address', '住所'],
  ['rep_name', '代表者名'],
  ['staff_name', '担当者名'],
  ['email', 'メールアドレス'],
]

// 主レコード(target)を起点に、各項目ごとに最初に値が入っているレコードのidを選ぶ
// (項目ごとの選択のデフォルト値。あとで管理者がラジオボタンで上書きできる)
function defaultFieldChoices(records: Array<Record<string, any>>, targetId: string): Record<string, string> {
  const target = records.find((r) => r.id === targetId)
  const others = records.filter((r) => r.id !== targetId)
  const choices: Record<string, string> = {}
  for (const [field] of MERGE_FIELDS) {
    let chosen = targetId
    const tVal = target?.[field]
    if (!tVal || String(tVal).trim() === '') {
      const found = others.find((o) => o[field] && String(o[field]).trim() !== '')
      if (found) chosen = found.id
    }
    choices[field] = chosen
  }

  // その他連絡先が空欄のままなら、主レコードと異なる番号(固定・携帯問わず)が
  // どこかにあれば、そちらをその他連絡先の初期値として提案する
  const currentOtherContact = records.find((r) => r.id === choices.other_contact)?.other_contact
  if (!currentOtherContact || String(currentOtherContact).trim() === '') {
    const primaryFixedNo = String(target?.fixed_no || '').trim()
    const candidates: Array<{ id: string; value: string }> = []
    for (const o of others) {
      const f = String(o.fixed_no || '').trim()
      const oc = String(o.other_contact || '').trim()
      if (f) candidates.push({ id: o.id, value: f })
      if (oc) candidates.push({ id: o.id, value: oc })
    }
    const second = candidates.find((c) => c.value !== primaryFixedNo)
    if (second) choices.other_contact = second.id
  }
  return choices
}

function buildFieldOverrides(records: Array<Record<string, any>>, choices: Record<string, string>): Record<string, string> {
  const overrides: Record<string, string> = {}
  for (const [field] of MERGE_FIELDS) {
    const sourceId = choices[field]
    const value = records.find((r) => r.id === sourceId)?.[field]
    overrides[field] = value ? String(value) : ''
  }
  return overrides
}

function FieldChoiceTable({
  records,
  targetId,
  onTargetChange,
  choices,
  onChoiceChange,
  listName,
  namePrefix,
}: {
  records: Array<Record<string, any>>
  targetId: string
  onTargetChange: (id: string) => void
  choices: Record<string, string>
  onChoiceChange: (field: string, recordId: string) => void
  listName: (slug: string) => string
  namePrefix: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse border border-gray-300 text-sm min-w-full">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-2 py-1 text-left sticky left-0 bg-gray-200">項目</th>
            {records.map((r) => (
              <th key={r.id} className="border border-gray-300 px-2 py-1 text-center whitespace-nowrap">
                <div className="flex flex-col items-center gap-1">
                  <span>{listName(r.list_slug)} / {r.no}</span>
                  <label className="flex items-center gap-1 text-xs font-normal text-orange-700">
                    <input
                      type="radio"
                      name={`${namePrefix}-target`}
                      checked={r.id === targetId}
                      onChange={() => onTargetChange(r.id)}
                    />
                    残すレコード
                  </label>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MERGE_FIELDS.map(([field, label]) => (
            <tr key={field}>
              <td className="border border-gray-300 px-2 py-1 font-medium text-gray-700 whitespace-nowrap sticky left-0 bg-white">
                {label}
              </td>
              {records.map((r) => (
                <td key={r.id} className="border border-gray-300 px-2 py-1 text-center">
                  <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`${namePrefix}-${field}`}
                      checked={choices[field] === r.id}
                      onChange={() => onChoiceChange(field, r.id)}
                    />
                    <span className="text-gray-700">{r[field] || <span className="text-gray-300">(空欄)</span>}</span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DuplicateMerge() {
  const lists = useAppStore((state) => state.lists)
  const listName = (slug: string) => lists.find((l) => l.slug === slug)?.name || slug
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mergingKey, setMergingKey] = useState<string | null>(null)
  const [isMergingAll, setIsMergingAll] = useState(false)
  const [mergeAllProgress, setMergeAllProgress] = useState<{ done: number; total: number } | null>(null)
  const [primarySelection, setPrimarySelection] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [detectionFields, setDetectionFields] = useState<Set<string>>(new Set(['company_name']))

  // 項目ごとに選んで統合(検出済みグループの詳細編集)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [groupFieldChoices, setGroupFieldChoices] = useState<Record<string, Record<string, string>>>({})

  // 手動でNo/企業名を指定して統合
  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState<any[]>([])
  const [manualSearching, setManualSearching] = useState(false)
  const [manualBasket, setManualBasket] = useState<any[]>([])
  const [manualTarget, setManualTarget] = useState('')
  const [manualFieldChoices, setManualFieldChoices] = useState<Record<string, string>>({})
  const [manualMerging, setManualMerging] = useState(false)
  const [manualError, setManualError] = useState('')

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.getDuplicates(Array.from(detectionFields))
      if (result.success && result.data) {
        setGroups(result.data)
        const defaults: Record<string, string> = {}
        for (const g of result.data as DuplicateGroup[]) defaults[g.groupKey] = g.suggestedPrimaryId
        setPrimarySelection(defaults)
        setSelectedGroups(new Set((result.data as DuplicateGroup[]).map((g) => g.groupKey)))
        setExpandedGroups(new Set())
        setGroupFieldChoices({})
      } else {
        setError(result.message || '検出に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '検出中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleDetectionField = (field: string) => {
    setDetectionFields((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  const primaryIdOf = (group: DuplicateGroup) => primarySelection[group.groupKey] || group.suggestedPrimaryId

  const toggleGroupSelected = (groupKey: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const toggleSelectAllGroups = () => {
    setSelectedGroups((prev) => (prev.size === groups.length ? new Set() : new Set(groups.map((g) => g.groupKey))))
  }

  const mergedPreviewFor = (group: DuplicateGroup) => {
    const primaryId = primaryIdOf(group)
    const primary = group.records.find((r) => r.id === primaryId)
    const others = group.records.filter((r) => r.id !== primaryId)
    const preview: Record<string, any> = {}
    for (const [field] of PREVIEW_FIELDS) {
      let value = primary?.[field]
      if (!value || String(value).trim() === '') {
        for (const o of others) {
          if (o[field] && String(o[field]).trim() !== '') {
            value = o[field]
            break
          }
        }
      }
      preview[field] = value
    }

    if (!preview.other_contact || String(preview.other_contact).trim() === '') {
      const primaryFixedNo = String(preview.fixed_no || '').trim()
      const candidateNumbers: string[] = []
      for (const o of others) {
        const oFixedNo = String(o.fixed_no || '').trim()
        const oOtherContact = String(o.other_contact || '').trim()
        if (oFixedNo) candidateNumbers.push(oFixedNo)
        if (oOtherContact) candidateNumbers.push(oOtherContact)
      }
      const secondNumber = candidateNumbers.find((n) => n !== primaryFixedNo)
      if (secondNumber) {
        preview.other_contact = secondNumber
      }
    }

    return preview
  }

  const toggleGroupExpanded = (group: DuplicateGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group.groupKey)) {
        next.delete(group.groupKey)
      } else {
        next.add(group.groupKey)
        setGroupFieldChoices((prevChoices) => ({
          ...prevChoices,
          [group.groupKey]: defaultFieldChoices(group.records, primaryIdOf(group)),
        }))
      }
      return next
    })
  }

  const handleMerge = async (group: DuplicateGroup) => {
    const primaryId = primaryIdOf(group)
    const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId)
    if (!confirm(`「${group.companyName}」の${group.records.length}件を1件に統合します。よろしいですか？`)) return

    setMergingKey(group.groupKey)
    setError('')
    const result: any = await ApiClient.mergeDuplicates(primaryId, duplicateIds)
    setMergingKey(null)
    if (result.success) {
      const historyNote = result.reassignedHistoryCount > 0
        ? `(架電履歴${result.reassignedHistoryCount}件も引き継ぎました)`
        : ''
      setMessage(`✓ 「${group.companyName}」を統合しました${historyNote}`)
      setTimeout(() => setMessage(''), 4000)
      setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey))
      setSelectedGroups((prev) => {
        const next = new Set(prev)
        next.delete(group.groupKey)
        return next
      })
    } else {
      setError(result.message || '統合に失敗しました')
    }
  }

  const handleDetailMerge = async (group: DuplicateGroup) => {
    const targetId = primaryIdOf(group)
    const sourceIds = group.records.map((r) => r.id).filter((id) => id !== targetId)
    const choices = groupFieldChoices[group.groupKey]
    if (!choices) return
    if (!confirm(`「${group.companyName}」の${group.records.length}件を、選択した項目の内容で1件に統合します。よろしいですか？`)) return

    setMergingKey(group.groupKey)
    setError('')
    const fieldOverrides = buildFieldOverrides(group.records, choices)
    const result: any = await ApiClient.mergeDuplicates(targetId, sourceIds, fieldOverrides)
    setMergingKey(null)
    if (result.success) {
      const historyNote = result.reassignedHistoryCount > 0
        ? `(架電履歴${result.reassignedHistoryCount}件も引き継ぎました)`
        : ''
      setMessage(`✓ 「${group.companyName}」を選択した内容で統合しました${historyNote}`)
      setTimeout(() => setMessage(''), 4000)
      setGroups((prev) => prev.filter((g) => g.groupKey !== group.groupKey))
      setSelectedGroups((prev) => {
        const next = new Set(prev)
        next.delete(group.groupKey)
        return next
      })
    } else {
      setError(result.message || '統合に失敗しました')
    }
  }

  const handleMergeAll = async () => {
    const targetGroups = groups.filter((g) => selectedGroups.has(g.groupKey))
    if (targetGroups.length === 0) return
    const totalRecords = targetGroups.reduce((sum, g) => sum + g.records.length, 0)
    const totalHistory = targetGroups.reduce((sum, g) => sum + g.totalCallHistoryCount, 0)
    if (!confirm(
      `選択された${targetGroups.length}件の重複グループ(合計${totalRecords}レコード、架電履歴計${totalHistory}件)を` +
      `統合します。よろしいですか？`
    )) return

    setIsMergingAll(true)
    setError('')
    setMessage('')
    setMergeAllProgress({ done: 0, total: targetGroups.length })

    let successCount = 0
    let failCount = 0
    let historyTotal = 0
    const failedNames: string[] = []
    const mergedKeys = new Set<string>()

    for (let i = 0; i < targetGroups.length; i++) {
      const group = targetGroups[i]
      const primaryId = primaryIdOf(group)
      const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId)
      const result: any = await ApiClient.mergeDuplicates(primaryId, duplicateIds)
      if (result.success) {
        successCount++
        historyTotal += result.reassignedHistoryCount || 0
        mergedKeys.add(group.groupKey)
      } else {
        failCount++
        failedNames.push(group.companyName)
      }
      setMergeAllProgress({ done: i + 1, total: targetGroups.length })
    }

    setGroups((prev) => prev.filter((g) => !mergedKeys.has(g.groupKey)))
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      mergedKeys.forEach((key) => next.delete(key))
      return next
    })
    setIsMergingAll(false)
    setMergeAllProgress(null)

    if (failCount === 0) {
      setMessage(`✓ ${successCount}件のグループを統合しました(架電履歴 計${historyTotal}件も引き継ぎました)`)
      setTimeout(() => setMessage(''), 6000)
    } else {
      setMessage(successCount > 0 ? `✓ ${successCount}件のグループを統合しました(架電履歴 計${historyTotal}件も引き継ぎました)` : '')
      setError(`✗ ${failCount}件の統合に失敗しました: ${failedNames.join('、')}`)
    }
  }

  // --- 手動統合(No/企業名を指定してレコードを追加していく) ---

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return
    setManualSearching(true)
    setManualError('')
    try {
      const result = await ApiClient.searchDuplicateCandidates(manualQuery.trim())
      if (result.success) {
        setManualResults(result.records || [])
      } else {
        setManualResults([])
        setManualError(result.message || '検索に失敗しました')
      }
    } catch (e: any) {
      setManualError(e.message || '検索中にエラーが発生しました')
    } finally {
      setManualSearching(false)
    }
  }

  const addToBasket = (record: any) => {
    if (manualBasket.some((r) => r.id === record.id)) return
    const nextBasket = [...manualBasket, record]
    setManualBasket(nextBasket)
    const nextTarget = manualTarget || record.id
    setManualTarget(nextTarget)
    if (nextBasket.length >= 2) {
      setManualFieldChoices(defaultFieldChoices(nextBasket, nextTarget))
    }
  }

  const removeFromBasket = (id: string) => {
    const nextBasket = manualBasket.filter((r) => r.id !== id)
    setManualBasket(nextBasket)
    let nextTarget = manualTarget
    if (manualTarget === id) {
      nextTarget = nextBasket[0]?.id || ''
      setManualTarget(nextTarget)
    }
    if (nextBasket.length >= 2) {
      setManualFieldChoices(defaultFieldChoices(nextBasket, nextTarget))
    } else {
      setManualFieldChoices({})
    }
  }

  const changeManualTarget = (id: string) => {
    setManualTarget(id)
    if (manualBasket.length >= 2) {
      setManualFieldChoices(defaultFieldChoices(manualBasket, id))
    }
  }

  const handleManualMerge = async () => {
    if (manualBasket.length < 2 || !manualTarget) return
    const sourceIds = manualBasket.map((r) => r.id).filter((id) => id !== manualTarget)
    if (!confirm(`指定した${manualBasket.length}件を、選択した項目の内容で1件に統合します。よろしいですか？`)) return

    setManualMerging(true)
    setManualError('')
    const fieldOverrides = buildFieldOverrides(manualBasket, manualFieldChoices)
    try {
      const result: any = await ApiClient.mergeDuplicates(manualTarget, sourceIds, fieldOverrides)
      if (result.success) {
        const historyNote = result.reassignedHistoryCount > 0
          ? `(架電履歴${result.reassignedHistoryCount}件も引き継ぎました)`
          : ''
        setMessage(`✓ 指定した${manualBasket.length}件を統合しました${historyNote}`)
        setTimeout(() => setMessage(''), 5000)
        setManualBasket([])
        setManualTarget('')
        setManualFieldChoices({})
        setManualResults([])
        setManualQuery('')
      } else {
        setManualError(result.message || '統合に失敗しました')
      }
    } catch (e: any) {
      setManualError(e.message || '統合中にエラーが発生しました')
    } finally {
      setManualMerging(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 検出条件 */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-bold text-gray-700 mb-2">重複を検出する条件(1つでも複数でも選択できます)</p>
        <div className="flex flex-wrap gap-4 mb-3">
          {DETECTION_FIELD_OPTIONS.map(([field, label]) => (
            <label key={field} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={detectionFields.has(field)} onChange={() => toggleDetectionField(field)} />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={load}
          disabled={isMergingAll || detectionFields.size === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '検出中...' : 'この条件で検出する'}
        </button>
        {detectionFields.size === 0 && <span className="ml-3 text-sm text-red-600">条件を1つ以上選択してください</span>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-gray-600">選択した条件のいずれかが一致するレコードをグループ化しています(自動では統合されません)</p>
        <div className="flex items-center gap-3">
          {groups.length > 0 && (
            <label className="flex items-center gap-1 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={groups.length > 0 && selectedGroups.size === groups.length}
                onChange={toggleSelectAllGroups}
                disabled={isMergingAll}
              />
              全選択
            </label>
          )}
          {groups.length > 0 && (
            <button
              onClick={handleMergeAll}
              disabled={isMergingAll || mergingKey !== null || selectedGroups.size === 0}
              className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {isMergingAll
                ? `統合中... (${mergeAllProgress?.done ?? 0}/${mergeAllProgress?.total ?? selectedGroups.size})`
                : `選択したグループを一括統合(${selectedGroups.size}件)`}
            </button>
          )}
        </div>
      </div>

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isLoading ? (
        <p className="text-gray-500">検出中...</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 py-10 text-center">重複候補は見つかりませんでした</p>
      ) : (
        groups.map((group) => {
          const isExpanded = expandedGroups.has(group.groupKey)
          const choices = groupFieldChoices[group.groupKey]
          return (
            <div key={group.groupKey} className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-lg font-bold flex items-center gap-2 flex-wrap">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(group.groupKey)}
                    onChange={() => toggleGroupSelected(group.groupKey)}
                    disabled={isMergingAll}
                  />
                  {group.companyName}({group.records.length}件)
                  {group.matchedFields.length > 0 && (
                    <span className="text-xs font-normal bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
                      一致条件: {group.matchedFields.map((f) => DETECTION_FIELD_OPTIONS.find(([k]) => k === f)?.[1] || f).join('・')}
                    </span>
                  )}
                  {group.totalCallHistoryCount > 0 && (
                    <span className="text-sm font-normal text-gray-600">
                      架電履歴 計{group.totalCallHistoryCount}件も統合されます
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleGroupExpanded(group)}
                    disabled={isMergingAll}
                    className="px-3 py-2 bg-white border border-orange-400 text-orange-700 rounded text-sm font-bold hover:bg-orange-100 disabled:opacity-50"
                  >
                    {isExpanded ? '項目ごとの選択を閉じる' : '項目ごとに選んで統合'}
                  </button>
                  <button
                    onClick={() => handleMerge(group)}
                    disabled={mergingKey === group.groupKey || isMergingAll}
                    className="px-4 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50"
                  >
                    {mergingKey === group.groupKey ? '統合中...' : 'この内容で統合を実行'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-1">主レコード(統合後に残る側)を選択できます。ラジオボタンで切り替えてください</p>
              <table className="w-full border-collapse border border-gray-300 text-sm mb-3">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-2 py-1 text-center">主</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">リスト/No</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">架電履歴</th>
                    {PREVIEW_FIELDS.map(([, label]) => (
                      <th key={label} className="border border-gray-300 px-2 py-1 text-left">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((r) => {
                    const isPrimary = r.id === primaryIdOf(group)
                    return (
                      <tr key={r.id} className={isPrimary ? 'bg-yellow-100' : 'bg-white'}>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          <input
                            type="radio"
                            name={`primary-${group.groupKey}`}
                            checked={isPrimary}
                            onChange={() => setPrimarySelection((prev) => ({ ...prev, [group.groupKey]: r.id }))}
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          {listName(r.list_slug)} / {r.no}
                          {isPrimary && <span className="ml-1 text-xs text-orange-600 font-bold">(主レコード)</span>}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-gray-700">{r.callHistoryCount}件</td>
                        {PREVIEW_FIELDS.map(([field]) => (
                          <td key={field} className="border border-gray-300 px-2 py-1 text-gray-700">
                            {r[field] || <span className="text-gray-300">(空欄)</span>}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr className="bg-green-50 font-bold">
                    <td className="border border-gray-300 px-2 py-1"></td>
                    <td className="border border-gray-300 px-2 py-1">統合後</td>
                    <td className="border border-gray-300 px-2 py-1 text-green-700">{group.totalCallHistoryCount}件</td>
                    {PREVIEW_FIELDS.map(([field]) => (
                      <td key={field} className="border border-gray-300 px-2 py-1 text-green-700">
                        {mergedPreviewFor(group)[field] || <span className="text-gray-300">(空欄)</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {isExpanded && choices && (
                <div className="border-t-2 border-orange-300 pt-3 mt-3">
                  <p className="text-xs text-gray-600 mb-2">
                    項目ごとに、どのレコードの内容を残すか選べます(上の「主レコード」を切り替えても、ここでの選択は変わりません)
                  </p>
                  <FieldChoiceTable
                    records={group.records}
                    targetId={primaryIdOf(group)}
                    onTargetChange={(id) => setPrimarySelection((prev) => ({ ...prev, [group.groupKey]: id }))}
                    choices={choices}
                    onChoiceChange={(field, recordId) =>
                      setGroupFieldChoices((prev) => ({
                        ...prev,
                        [group.groupKey]: { ...prev[group.groupKey], [field]: recordId },
                      }))
                    }
                    listName={listName}
                    namePrefix={`group-${group.groupKey}`}
                  />
                  <button
                    onClick={() => handleDetailMerge(group)}
                    disabled={mergingKey === group.groupKey || isMergingAll}
                    className="mt-3 px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-50"
                  >
                    {mergingKey === group.groupKey ? '統合中...' : '選択した内容で統合を実行'}
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* 手動統合 */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <h3 className="text-lg font-bold mb-2">🔧 手動でレコードを指定して統合</h3>
        <p className="text-sm text-gray-600 mb-3">
          自動検出に出てこない組み合わせでも、No・企業名で検索してレコードを2件以上追加すれば、項目ごとに選んで統合できます
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch() }}
            placeholder="Noまたは企業名で検索"
            className="flex-1 border border-gray-300 px-3 py-2 rounded"
          />
          <button
            onClick={handleManualSearch}
            disabled={manualSearching}
            className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 disabled:opacity-50"
          >
            {manualSearching ? '検索中...' : '検索'}
          </button>
        </div>

        {manualError && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-3">{manualError}</div>}

        {manualResults.length > 0 && (
          <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-2 py-1 text-left">リスト/No</th>
                <th className="border border-gray-300 px-2 py-1 text-left">企業名</th>
                <th className="border border-gray-300 px-2 py-1 text-left">住所</th>
                <th className="border border-gray-300 px-2 py-1 text-left">担当者</th>
                <th className="border border-gray-300 px-2 py-1 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {manualResults.map((r) => {
                const inBasket = manualBasket.some((b) => b.id === r.id)
                return (
                  <tr key={r.id} className="bg-white">
                    <td className="border border-gray-300 px-2 py-1">{listName(r.list_slug)} / {r.no}</td>
                    <td className="border border-gray-300 px-2 py-1">{r.company_name || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1">{r.address || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1">{r.staff_name || r.rep_name || '-'}</td>
                    <td className="border border-gray-300 px-2 py-1 text-center">
                      <button
                        onClick={() => addToBasket(r)}
                        disabled={inBasket}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 disabled:opacity-40"
                      >
                        {inBasket ? '追加済み' : '＋ 追加'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {manualBasket.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-700 mb-2">統合候補({manualBasket.length}件)</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {manualBasket.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-2 bg-white border border-blue-300 rounded px-3 py-1 text-sm">
                  {listName(r.list_slug)} / {r.no}({r.company_name || '企業名未入力'})
                  <button onClick={() => removeFromBasket(r.id)} className="text-red-600 font-bold hover:text-red-800">×</button>
                </span>
              ))}
            </div>

            {manualBasket.length < 2 ? (
              <p className="text-sm text-gray-500">統合するには、もう1件以上追加してください</p>
            ) : (
              <>
                <FieldChoiceTable
                  records={manualBasket}
                  targetId={manualTarget}
                  onTargetChange={changeManualTarget}
                  choices={manualFieldChoices}
                  onChoiceChange={(field, recordId) =>
                    setManualFieldChoices((prev) => ({ ...prev, [field]: recordId }))
                  }
                  listName={listName}
                  namePrefix="manual"
                />
                <button
                  onClick={handleManualMerge}
                  disabled={manualMerging}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {manualMerging ? '統合中...' : `選択した内容で統合を実行(${manualBasket.length}件)`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
