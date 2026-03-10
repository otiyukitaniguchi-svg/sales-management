# 営業管理システム (Sales Management System)

Google Apps Script (GAS) + Google Sheets から Supabase + Next.js への移行版

## 📋 概要

このプロジェクトは、Google Apps ScriptベースのGoogleスプレッドシート営業管理システムを、モダンなウェブスタック（Next.js + Supabase）に移行したものです。

## 🚀 主な機能

- **顧客リスト管理**: 3つの独立したリスト（新規、ハルエネ、モバイル）
- **架電履歴管理**: 各顧客への架電履歴の記録・表示
- **検索機能**: Noによる全リスト横断検索
- **TSV/JSONインポート**: 既存データの一括インポート
- **Slack通知**: 受注時の自動通知
- **マルチユーザー対応**: ロールベースのアクセス制御

## 🛠 技術スタック

### バックエンド
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL)
- **TypeScript**

### フロントエンド
- **React 18**
- **Zustand** (状態管理)
- **Tailwind CSS**

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でアカウント作成
2. 新しいプロジェクトを作成
3. プロジェクトURLとAPIキーを取得

### 3. データベーススキーマの適用

Supabase SQLエディタで `supabase-schema.sql` を実行:

```sql
-- supabase-schema.sqlの内容をコピー&ペースト
```

### 4. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

`.env.local` を編集して、以下の値を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-random-secret-string
SLACK_WEBHOOK_URL=your-slack-webhook-url (optional)
```

### 5. 初期ユーザーの作成

管理者ユーザーを作成するには、Supabase SQLエディタで以下を実行:

```sql
-- パスワードハッシュを生成（bcryptで "your-password" をハッシュ化）
-- オンラインツール: https://bcrypt-generator.com/
INSERT INTO users (username, display_name, password_hash, role)
VALUES ('admin', '管理者', '$2b$10$...your-bcrypt-hash...', 'admin');
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 📂 プロジェクト構造

```
sales-management-system/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # 認証API
│   │   ├── lists/             # リストデータAPI
│   │   ├── search/            # 検索API
│   │   └── slack/             # Slack通知API
│   ├── globals.css            # グローバルCSS
│   ├── layout.tsx             # ルートレイアウト
│   └── page.tsx               # メインページ
├── components/                # Reactコンポーネント
│   ├── LoginScreen.tsx
│   ├── NavigationBar.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── api-client.ts         # APIクライアント
│   ├── slack.ts              # Slack通知ユーティリティ
│   ├── store.ts              # Zustandストア
│   ├── supabase.ts           # Supabaseクライアント
│   └── types.ts              # TypeScript型定義
├── supabase-schema.sql       # データベーススキーマ
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🔄 GASからの移行ガイド

### データ移行

1. **既存データのエクスポート**
   - 各シート（新規リスト、ハルエネリスト、モバイルリスト）をTSVまたはCSV形式でエクスポート

2. **データの整形**
   - フィールド名を以下のマッピングに従って変換:
     ```
     No → no
     企業名フリガナ → companyKana
     企業名 → companyName
     固定番号 → fixedNo
     ... (以下省略)
     ```

3. **Supabaseへのインポート**
   - APIエンドポイント `/api/lists/{listId}/import` を使用
   - または、Supabase UIから直接CSVインポート

### 架電履歴の移行

1. **架電履歴シートのエクスポート**
   - 「架電履歴_全記録」シートをエクスポート

2. **データの整形**
   - JSONフォーマットから個別レコードに分解
   - list_type フィールドを追加（list1, list2, list3）

3. **Supabaseへのインポート**
   - `架電履歴_全記録` テーブルに直接インポート

## 🔐 認証

現在はシンプルなユーザー名・パスワード認証を実装していますが、Supabase Authに移行することも可能です。

## 📊 API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン

### リスト管理
- `GET /api/lists/{listId}` - リストデータ取得
- `POST /api/lists/{listId}/import` - データインポート
- `POST /api/lists/{listId}/update/{no}` - レコード更新

### 架電履歴
- `GET /api/lists/{listId}/history/{no}` - 架電履歴取得

### 検索
- `GET /api/search?no={no}` - No検索

### Slack通知
- `POST /api/slack/notify` - 受注通知送信

## 🚢 本番環境へのデプロイ

### Vercelへのデプロイ（推奨）

1. GitHubリポジトリにプッシュ
2. [Vercel](https://vercel.com)にログイン
3. "Import Project" でリポジトリを選択
4. 環境変数を設定
5. デプロイ

### その他のホスティング

- **Netlify**: `npm run build` → distフォルダをデプロイ
- **自前サーバー**: `npm run build` → `npm start`

## 🔧 カスタマイズ

### フィールドの追加

1. `supabase-schema.sql` にカラムを追加
2. `lib/types.ts` で型定義を更新
3. フロントエンドコンポーネントにフィールドを追加

### 新しいリストの追加

1. Supabaseに新しいテーブルを作成
2. `lib/supabase.ts` の `LIST_TYPE_MAP` に追加
3. `components/Sidebar.tsx` の `LIST_NAMES` に追加

## 🐛 トラブルシューティング

### データベース接続エラー
- `.env.local` の環境変数が正しいか確認
- Supabaseプロジェクトが有効か確認

### 認証エラー
- ユーザーが正しく作成されているか確認
- パスワードハッシュが正しいか確認

### インポートエラー
- データフォーマットが正しいか確認
- 必須フィールド（no）が含まれているか確認

## 📝 ライセンス

MIT License

## 🤝 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
