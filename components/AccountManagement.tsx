'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { ApiClient } from '@/lib/api-client'
import { User } from '@/lib/types'

interface NewUserForm {
  username: string
  displayName: string
  password: string
  role: string
}

const emptyNewUser: NewUserForm = { username: '', displayName: '', password: '', role: 'user' }

export default function AccountManagement() {
  const currentUser = useAppStore((state) => state.user)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [isCreating, setIsCreating] = useState(false)
  const [newUser, setNewUser] = useState<NewUserForm>(emptyNewUser)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState('user')

  // パスワードはハッシュ化して保存するため後から閲覧はできない。
  // 代わりに、作成・リセットした「その場」だけ平文を一時的に表示する
  const [revealedCredential, setRevealedCredential] = useState<{ username: string; password: string; action: string } | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await ApiClient.listUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        setError(result.message || '取得に失敗しました')
      }
    } catch (e: any) {
      setError(e.message || '取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async () => {
    if (!newUser.username || !newUser.displayName || !newUser.password) {
      setError('ユーザー名・表示名・パスワードは必須です')
      return
    }
    setError('')
    const result = await ApiClient.createUser(
      newUser.username,
      newUser.displayName,
      newUser.password,
      newUser.role
    )
    if (result.success) {
      setRevealedCredential({ username: newUser.username, password: newUser.password, action: '作成' })
      setIsCreating(false)
      setNewUser(emptyNewUser)
      loadUsers()
    } else {
      setError(result.message || '作成に失敗しました')
    }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id || null)
    setEditUsername(user.username)
    setEditDisplayName(user.display_name)
    setEditPassword('')
    setEditRole(user.role || 'user')
    setError('')
    setRevealedCredential(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPassword('')
    setRevealedCredential(null)
  }

  const handleSaveEdit = async (id: string) => {
    setError('')
    const updates: { username?: string; displayName?: string; password?: string; role?: string } = {
      username: editUsername,
      displayName: editDisplayName,
      role: editRole,
    }
    if (editPassword) updates.password = editPassword

    const result = await ApiClient.updateUser(id, updates)
    if (result.success) {
      if (editPassword) {
        setRevealedCredential({ username: editUsername, password: editPassword, action: 'リセット' })
      } else {
        setMessage('✓ 更新しました')
        setTimeout(() => setMessage(''), 3000)
      }
      setEditingId(null)
      setEditPassword('')
      loadUsers()
    } else {
      setError(result.message || '更新に失敗しました')
    }
  }

  const handleDelete = async (user: User) => {
    if (!user.id) return
    if (!confirm(`「${user.username}」を削除しますか？`)) return
    setError('')
    const result = await ApiClient.deleteUser(user.id)
    if (result.success) {
      setMessage('✓ 削除しました')
      setTimeout(() => setMessage(''), 3000)
      loadUsers()
    } else {
      setError(result.message || '削除に失敗しました')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setIsCreating((v) => !v)
            setError('')
            setRevealedCredential(null)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded font-bold hover:bg-blue-600"
        >
          {isCreating ? 'キャンセル' : '+ 新規アカウント作成'}
        </button>
      </div>

      {revealedCredential && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-yellow-800 mb-1">
              ⚠️ パスワードは保存後に読み返すことができません。今のうちに控えてください({revealedCredential.action}直後のみ表示)
            </p>
            <p className="font-mono text-lg">
              <span className="text-gray-600">{revealedCredential.username}</span>
              <span className="mx-2 text-gray-400">/</span>
              <span className="font-bold text-yellow-900">{revealedCredential.password}</span>
            </p>
          </div>
          <button
            onClick={() => setRevealedCredential(null)}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm font-bold hover:bg-yellow-600 shrink-0"
          >
            閉じる
          </button>
        </div>
      )}

      {message && <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {isCreating && (
        <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">ユーザー名(ログインID)</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">表示名</label>
              <input
                type="text"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">パスワード</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">権限</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full border border-gray-300 px-3 py-2 rounded"
              >
                <option value="user">一般</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="self-start px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600"
          >
            作成
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-200">
              <th className="border border-gray-300 px-3 py-2 text-left">ユーザー名</th>
              <th className="border border-gray-300 px-3 py-2 text-left">表示名</th>
              <th className="border border-gray-300 px-3 py-2 text-left">権限</th>
              <th className="border border-gray-300 px-3 py-2 text-left">パスワード</th>
              <th className="border border-gray-300 px-3 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = !!user.id && user.id === currentUser?.id
              const isEditing = editingId === user.id
              return (
                <tr key={user.id} className="bg-white">
                  <td className="border border-gray-300 px-3 py-2">
                    {isEditing ? (
                      <input
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 rounded"
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isEditing ? (
                      <input
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 rounded"
                      />
                    ) : (
                      user.display_name
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isEditing ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        disabled={isSelf}
                        className="w-full border border-gray-300 px-2 py-1 rounded disabled:bg-gray-100"
                      >
                        <option value="user">一般</option>
                        <option value="admin">管理者</option>
                      </select>
                    ) : user.role === 'admin' ? (
                      '管理者'
                    ) : (
                      '一般'
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    {isEditing ? (
                      <input
                        type="password"
                        placeholder="変更する場合のみ入力"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 rounded"
                      />
                    ) : (
                      '••••••••'
                    )}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => user.id && handleSaveEdit(user.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm font-bold hover:bg-green-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm font-bold hover:bg-gray-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => startEdit(user)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-bold hover:bg-blue-600"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isSelf}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isSelf ? '自分自身は削除できません' : ''}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
