'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'

export default function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const setUser = useAppStore((state) => state.setUser)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await ApiClient.login(username, password)

      if (result.success && result.user) {
        setUser(result.user)
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(result.user))
      } else {
        setError(result.message || 'ログインに失敗しました')
      }
    } catch (err: any) {
      setError('ログインエラー: ' + (err.message || '不明なエラー'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center z-[10000]">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          AnyPro
        </h1>

        <form onSubmit={handleLogin}>
          <div className="mb-5">
            <label className="block mb-2 text-gray-700 font-bold">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md text-lg focus:outline-none focus:border-purple-600"
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-gray-700 font-bold">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md text-lg focus:outline-none focus:border-purple-600"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-900 text-white rounded-md text-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-400 rounded-md text-red-800 text-center">
              {error}
            </div>
          )}
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-gray-500 text-lg text-center">
          <p>初回ログイン時は管理者にお問い合わせください</p>
        </div>
      </div>
    </div>
  )
}
