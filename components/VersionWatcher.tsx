'use client'

import { useEffect, useRef, useState } from 'react'

const CHECK_INTERVAL_MS = 3 * 60 * 1000

// 新しいデプロイを検知したら控えめなバナーで知らせるだけにし、自動リロードはしない。
// 架電入力中に強制リロードすると未保存の内容が消えてしまうため、
// 更新するかどうかは必ずユーザー自身の操作に委ねる。
export default function VersionWatcher() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const baselineRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (cancelled || !version) return
        if (baselineRef.current === null) {
          baselineRef.current = version
        } else if (version !== baselineRef.current) {
          setHasUpdate(true)
        }
      } catch {
        // ネットワーク一時エラーは無視して次回のチェックに任せる
      }
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!hasUpdate) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 text-sm">
      <span>🔄 AnyProの新しいバージョンがあります</span>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 bg-blue-500 rounded font-bold hover:bg-blue-600"
      >
        今すぐ更新
      </button>
    </div>
  )
}
