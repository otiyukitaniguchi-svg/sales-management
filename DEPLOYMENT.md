# デプロイメントガイド

## Vercelへのデプロイ（推奨）

### 1. GitHubリポジトリの準備

```bash
# プロジェクトをGitリポジトリとして初期化
cd sales-management-system
git init

# すべてのファイルをステージング
git add .

# 初期コミット
git commit -m "Initial commit: GAS to Supabase migration"

# GitHubに新しいリポジトリを作成後、リモートを追加
git remote add origin https://github.com/yourusername/sales-management-system.git
git branch -M main
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [Vercel](https://vercel.com)にアクセスしてログイン
2. "Add New..." → "Project" をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (デフォルト)
   - **Build Command**: `npm run build` (デフォルト)
   - **Output Directory**: `.next` (デフォルト)

### 3. 環境変数の設定

Vercelプロジェクト設定で以下の環境変数を追加:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-random-secret-string
SLACK_WEBHOOK_URL=your-slack-webhook-url
NODE_ENV=production
```

### 4. デプロイ

"Deploy" ボタンをクリックしてデプロイを開始。
数分後、本番環境のURLが発行されます。

---

## Netlifyへのデプロイ

### 1. netlify.tomlの作成

プロジェクトルートに `netlify.toml` を作成:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 2. Netlifyでプロジェクトをインポート

1. [Netlify](https://netlify.com)にログイン
2. "Add new site" → "Import an existing project"
3. GitHubリポジトリを選択
4. ビルド設定を確認（netlify.tomlから自動読み込み）
5. 環境変数を設定（Vercelと同様）
6. "Deploy site" をクリック

---

## 自前サーバー（VPS/専用サーバー）へのデプロイ

### 1. サーバー環境の準備

```bash
# Node.js 18以上のインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2のインストール（プロセス管理）
sudo npm install -g pm2
```

### 2. プロジェクトのデプロイ

```bash
# プロジェクトをサーバーにクローン
git clone https://github.com/yourusername/sales-management-system.git
cd sales-management-system

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集して実際の値を設定

# ビルド
npm run build

# PM2でアプリケーションを起動
pm2 start npm --name "sales-management" -- start
pm2 save
pm2 startup
```

### 3. Nginxリバースプロキシの設定

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL証明書の設定（Let's Encrypt）

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Docker デプロイ

### 1. Dockerfileの作成

プロジェクトルートに `Dockerfile` を作成:

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### 2. docker-compose.ymlの作成

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
    restart: unless-stopped
```

### 3. デプロイ

```bash
# イメージのビルド
docker-compose build

# コンテナの起動
docker-compose up -d

# ログの確認
docker-compose logs -f
```

---

## 環境変数の管理

### 本番環境での推奨設定

1. **Supabase設定**
   - Row Level Security (RLS) を有効化
   - API キーの定期的なローテーション

2. **JWT Secret**
   - 強力なランダム文字列を使用
   - 生成例: `openssl rand -base64 32`

3. **Slack Webhook**
   - 本番環境専用のWebhookを使用
   - テスト環境とは別のチャンネルに通知

### セキュリティチェックリスト

- [ ] `.env.local` がGitにコミットされていないことを確認
- [ ] 本番環境のSupabase RLSが有効
- [ ] HTTPS/SSL証明書が設定されている
- [ ] CORS設定が適切
- [ ] エラーログが適切に管理されている
- [ ] バックアップ戦略が確立されている

---

## トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf .next node_modules
npm install
npm run build
```

### データベース接続エラー

- Supabaseプロジェクトが有効か確認
- APIキーが正しいか確認
- ネットワーク接続を確認

### デプロイ後の動作確認

```bash
# ヘルスチェック
curl https://your-domain.com/api/lists/list1

# ログの確認（PM2の場合）
pm2 logs sales-management
```
