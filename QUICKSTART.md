# 🚀 クイックスタートガイド

GASからSupabase + Next.jsへの移行が完了しました！

## 📦 プロジェクト構成

```
sales-management-system/
├── app/                        # Next.js App Router
│   ├── api/                   # APIエンドポイント
│   │   ├── auth/             # 認証API
│   │   ├── lists/            # リストデータ・更新API
│   │   ├── search/           # 検索API
│   │   └── slack/            # Slack通知API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                # Reactコンポーネント
│   ├── LoginScreen.tsx
│   ├── NavigationBar.tsx
│   └── Sidebar.tsx
├── lib/                       # ユーティリティ・設定
│   ├── api-client.ts         # APIクライアント
│   ├── slack.ts              # Slack通知
│   ├── store.ts              # Zustand状態管理
│   ├── supabase.ts           # Supabaseクライアント
│   └── types.ts              # TypeScript型定義
├── supabase-schema.sql       # データベーススキーマ
├── package.json
├── README.md
├── DEPLOYMENT.md             # デプロイメントガイド
└── MIGRATION.md              # データ移行ガイド
```

## ⚡ 5分でセットアップ

### 1. Supabaseプロジェクトを作成

1. https://supabase.com でアカウント作成
2. 新しいプロジェクトを作成（無料プランでOK）
3. プロジェクトURLとAPIキーをメモ

### 2. データベーススキーマを適用

Supabase Dashboard → SQL Editor で以下を実行:

```sql
-- supabase-schema.sql の内容を全てコピー&ペースト
-- 実行ボタンをクリック
```

### 3. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=$(openssl rand -base64 32)
SLACK_WEBHOOK_URL=your-slack-webhook-url  # オプション
```

### 4. 依存関係をインストール

```bash
npm install
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

http://localhost:3000 を開く

### 6. 初期ユーザーを作成

Supabase SQL Editorで:

```sql
-- パスワードハッシュを生成（bcrypt）
-- オンラインツール: https://bcrypt-generator.com/
-- 例: "admin123" → "$2b$10$..."

INSERT INTO users (username, display_name, password_hash, role)
VALUES ('admin', '管理者', '$2b$10$...your-hash...', 'admin');
```

### 7. ログイン

- ユーザー名: `admin`
- パスワード: （上記で設定したもの）

## 📊 データ移行

詳細は `MIGRATION.md` を参照

### 簡易版手順

1. GASからTSVエクスポート
2. `scripts/migrate-data.js` で変換
3. Supabase UIまたはAPIでインポート

## 🚢 本番環境へデプロイ

詳細は `DEPLOYMENT.md` を参照

### Vercel（推奨）

```bash
# GitHubにプッシュ
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/sales-management-system.git
git push -u origin main

# Vercelで「Import Project」からリポジトリを選択
# 環境変数を設定してデプロイ
```

## 🔧 主な機能

### 実装済み
- ✅ ユーザー認証（ログイン）
- ✅ 3つのリスト管理（新規、ハルエネ、モバイル）
- ✅ リストデータの取得・表示
- ✅ レコード更新API
- ✅ 架電履歴の取得・追加
- ✅ No検索（全リスト横断）
- ✅ TSV/JSONインポート
- ✅ Slack通知（受注時）
- ✅ マルチユーザー対応

### 開発中（フロントエンド）
- 🔨 レコード詳細表示・編集UI
- 🔨 架電履歴入力UI
- 🔨 検索UI
- 🔨 インポートUI

## 📝 次のステップ

1. **フロントエンドの完成**
   - レコード編集フォームの実装
   - 架電履歴テーブルの実装
   - 検索モーダルの実装

2. **機能追加**
   - エクスポート機能
   - フィルタリング・ソート
   - ダッシュボード（統計）

3. **最適化**
   - ページネーション
   - キャッシング
   - パフォーマンス改善

## 🆘 トラブルシューティング

### ビルドエラー

```bash
rm -rf .next node_modules
npm install
npm run dev
```

### データベース接続エラー

- 環境変数が正しいか確認
- Supabaseプロジェクトが有効か確認

### 認証エラー

- ユーザーが作成されているか確認
- パスワードハッシュが正しいか確認

## 📚 関連ドキュメント

- `README.md` - プロジェクト概要・詳細ガイド
- `DEPLOYMENT.md` - 各種デプロイ方法
- `MIGRATION.md` - データ移行手順

## 💡 ヒント

- **開発時**: `.env.local` を使用
- **本番環境**: ホスティングサービスの環境変数設定を使用
- **セキュリティ**: `.env*` ファイルはGitにコミットしない
- **バックアップ**: Supabaseは自動バックアップされます

---

質問・問題があれば、GitHubのIssuesで報告してください！
