import type { Metadata } from 'next'
import './globals.css'
import VersionWatcher from '@/components/VersionWatcher'

export const metadata: Metadata = {
  title: 'AnyPro',
  description: 'Sales Management System with Supabase',
}

export const revalidate = 0 // キャッシュなし - 常に最新版を取得

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        <VersionWatcher />
      </body>
    </html>
  )
}
