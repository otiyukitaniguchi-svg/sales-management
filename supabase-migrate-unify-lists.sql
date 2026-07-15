-- ============================================================
-- リスト統合マイグレーション
-- 新規リスト / ハルエネリスト / モバイルリスト の3つの物理テーブルを
-- 1つの customers テーブル + lists テーブル(リスト定義)に統合する。
--
-- 実行方法: Supabaseダッシュボード → SQL Editor に全文貼り付けて実行。
-- 架電履歴_全記録テーブルは変更しない(list_type列がそのまま
-- lists.slug と対応するため、架電履歴側のデータ移行は不要)。
-- 既存の3テーブルは削除しない(安全のため、移行後も残る)。
-- ============================================================

-- ----------------------------------------------------------
-- 1. lists テーブル(リスト定義)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO lists (slug, name, sort_order) VALUES
  ('list1', '新規リスト', 1),
  ('list2', 'ハルエネリスト', 2),
  ('list3', 'モバイルリスト', 3)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------
-- 2. customers テーブル(統合後の顧客データ)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_slug VARCHAR(50) NOT NULL REFERENCES lists(slug),
  no VARCHAR(50) NOT NULL,
  company_kana VARCHAR(255),
  company_name VARCHAR(255),
  fixed_no VARCHAR(50),
  other_contact VARCHAR(255),
  zip_code VARCHAR(20),
  address_kana VARCHAR(500),
  address VARCHAR(500),
  rep_kana VARCHAR(100),
  rep_name VARCHAR(100),
  staff_kana VARCHAR(100),
  staff_name VARCHAR(100),
  email VARCHAR(255),
  industry VARCHAR(100),
  memo TEXT,
  sales VARCHAR(100),
  software VARCHAR(255),
  decision VARCHAR(50),
  subsidy VARCHAR(50),
  accountant VARCHAR(50),
  established VARCHAR(50),
  recall_date VARCHAR(50),
  recall_time VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (list_slug, no)
);

CREATE INDEX IF NOT EXISTS idx_customers_list_slug ON customers(list_slug);
CREATE INDEX IF NOT EXISTS idx_customers_no ON customers(no);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------
-- 3. 既存3テーブルからのデータコピー
--    (2回目以降の実行でも重複しないよう、既存の(list_slug, no)は
--     スキップする。元テーブルが存在しない環境でもエラーにならない
--     よう、テーブルの有無を確認してから実行する)
-- ----------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('"新規リスト"') IS NOT NULL THEN
    INSERT INTO customers (
      list_slug, no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    )
    SELECT
      'list1', no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    FROM 新規リスト
    ON CONFLICT (list_slug, no) DO NOTHING;
  ELSE
    RAISE NOTICE '「新規リスト」テーブルが存在しないためコピーをスキップしました';
  END IF;

  IF to_regclass('"ハルエネリスト"') IS NOT NULL THEN
    INSERT INTO customers (
      list_slug, no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    )
    SELECT
      'list2', no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    FROM ハルエネリスト
    ON CONFLICT (list_slug, no) DO NOTHING;
  ELSE
    RAISE NOTICE '「ハルエネリスト」テーブルが存在しないためコピーをスキップしました';
  END IF;

  IF to_regclass('"モバイルリスト"') IS NOT NULL THEN
    INSERT INTO customers (
      list_slug, no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    )
    SELECT
      'list3', no, company_kana, company_name, fixed_no, other_contact,
      zip_code, address_kana, address, rep_kana, rep_name, staff_kana, staff_name,
      email, industry, memo, sales, software, decision, subsidy, accountant,
      established, recall_date, recall_time, created_at, updated_at
    FROM モバイルリスト
    ON CONFLICT (list_slug, no) DO NOTHING;
  ELSE
    RAISE NOTICE '「モバイルリスト」テーブルが存在しないためコピーをスキップしました';
  END IF;
END $$;

-- ----------------------------------------------------------
-- 4. 件数確認(実行後に目視で比較してください。元テーブルが無い場合は
--    そのリストの行は表示されません)
-- ----------------------------------------------------------
SELECT source, cnt FROM (
  SELECT '新規リスト' AS source, (SELECT COUNT(*) FROM 新規リスト)::bigint AS cnt WHERE to_regclass('"新規リスト"') IS NOT NULL
  UNION ALL
  SELECT 'ハルエネリスト', (SELECT COUNT(*) FROM ハルエネリスト)::bigint WHERE to_regclass('"ハルエネリスト"') IS NOT NULL
  UNION ALL
  SELECT 'モバイルリスト', (SELECT COUNT(*) FROM モバイルリスト)::bigint WHERE to_regclass('"モバイルリスト"') IS NOT NULL
  UNION ALL
  SELECT 'customers(list1)', COUNT(*) FROM customers WHERE list_slug = 'list1'
  UNION ALL
  SELECT 'customers(list2)', COUNT(*) FROM customers WHERE list_slug = 'list2'
  UNION ALL
  SELECT 'customers(list3)', COUNT(*) FROM customers WHERE list_slug = 'list3'
) t;

-- ----------------------------------------------------------
-- 5. RLSは既存テーブルと同様、必要に応じて有効化してください
--    (アプリはサービスロールキー経由でアクセスするためRLSの影響は
--    受けませんが、Supabase側のセキュリティ推奨事項として)
-- ----------------------------------------------------------
-- ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ リスト統合マイグレーションが完了しました。';
  RAISE NOTICE '上記の件数確認クエリの結果で、各リストとcustomersの件数が一致しているか確認してください。';
  RAISE NOTICE '既存の3テーブル(新規リスト/ハルエネリスト/モバイルリスト)は削除されていません。';
END $$;
