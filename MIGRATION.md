# データ移行ガイド

GASからSupabaseへのデータ移行手順

## 📋 移行の概要

1. GASからデータをエクスポート
2. データを変換・整形
3. Supabaseにインポート

## 🔄 ステップ1: GASからのエクスポート

### スプレッドシートからのエクスポート

各シート（新規リスト、ハルエネリスト、モバイルリスト）を個別にエクスポート:

1. Google スプレッドシートを開く
2. 対象のシートタブを選択
3. ファイル → ダウンロード → タブ区切り値（.tsv、現在のシート）
4. ファイル名を `list1.tsv`, `list2.tsv`, `list3.tsv` として保存

### 架電履歴のエクスポート

「架電履歴_全記録」シートも同様にエクスポート:

1. 「架電履歴_全記録」シートを選択
2. ファイル → ダウンロード → タブ区切り値（.tsv、現在のシート）
3. ファイル名を `call_history.tsv` として保存

## 🛠 ステップ2: データの変換

### Node.jsスクリプトによる変換

以下のスクリプトを `scripts/migrate-data.js` として保存:

```javascript
const fs = require('fs');
const path = require('path');

// TSVファイルを読み込んでJSONに変換
function tsvToJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split('\t');
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split('\t');
    const record = {};
    
    headers.forEach((header, index) => {
      record[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    records.push(record);
  }
  
  return records;
}

// フィールド名を変換
function convertFieldNames(record) {
  return {
    no: record['No'] || record['no'],
    company_kana: record['企業名フリガナ'],
    company_name: record['企業名'],
    fixed_no: record['固定番号'],
    other_contact: record['その他連絡先'],
    zip_code: record['郵便番号'],
    address_kana: record['住所フリガナ'],
    address: record['住所'],
    rep_kana: record['代表者フリガナ'],
    rep_name: record['代表者名'],
    staff_kana: record['担当者フリガナ'],
    staff_name: record['担当者名'],
    email: record['メールアドレス'],
    industry: record['業種'],
    memo: record['備考'],
    sales: record['年間売上'],
    software: record['既存ソフト'],
    decision: record['決裁者'],
    subsidy: record['過去補助金'],
    accountant: record['税理士'],
    established: record['設立1年以上'],
    recall_date: record['再コール日'],
    recall_time: record['再コール時間'],
  };
}

// 架電履歴の変換（JSONから個別レコードへ）
function convertCallHistory(record, listType) {
  const historyJson = record['架電履歴'];
  if (!historyJson) return [];
  
  try {
    const history = JSON.parse(historyJson);
    return history.map(entry => ({
      list_type: listType,
      no: record['No'],
      operator: entry.operator || '',
      date: entry.date || '',
      start_time: entry.startTime || '',
      end_time: entry.endTime || '',
      responder: entry.responder || '',
      gender: entry.gender || '',
      progress: entry.progress || '',
      note: entry.note || '',
    }));
  } catch (e) {
    console.error(`Failed to parse call history for No ${record['No']}:`, e);
    return [];
  }
}

// メイン処理
function main() {
  const lists = [
    { file: 'list1.tsv', type: 'list1', output: 'list1.json' },
    { file: 'list2.tsv', type: 'list2', output: 'list2.json' },
    { file: 'list3.tsv', type: 'list3', output: 'list3.json' },
  ];
  
  // リストデータの変換
  lists.forEach(({ file, type, output }) => {
    console.log(`Processing ${file}...`);
    
    const inputPath = path.join(__dirname, '..', 'data', file);
    const outputPath = path.join(__dirname, '..', 'data', output);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`  ⚠️  ${file} not found, skipping...`);
      return;
    }
    
    const records = tsvToJson(inputPath);
    const converted = records.map(convertFieldNames);
    
    fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
    console.log(`  ✅ Created ${output} with ${converted.length} records`);
  });
  
  // 架電履歴の変換
  console.log('\nProcessing call history...');
  const callHistoryPath = path.join(__dirname, '..', 'data', 'call_history.tsv');
  
  if (fs.existsSync(callHistoryPath)) {
    const records = tsvToJson(callHistoryPath);
    const allHistory = [];
    
    lists.forEach(({ file, type }) => {
      const inputPath = path.join(__dirname, '..', 'data', file);
      if (fs.existsSync(inputPath)) {
        const listRecords = tsvToJson(inputPath);
        listRecords.forEach(record => {
          const history = convertCallHistory(record, type);
          allHistory.push(...history);
        });
      }
    });
    
    const outputPath = path.join(__dirname, '..', 'data', 'call_history.json');
    fs.writeFileSync(outputPath, JSON.stringify(allHistory, null, 2));
    console.log(`  ✅ Created call_history.json with ${allHistory.length} records`);
  } else {
    console.log('  ⚠️  call_history.tsv not found, skipping...');
  }
  
  console.log('\n✅ Migration data preparation complete!');
}

main();
```

### スクリプトの実行

```bash
# dataディレクトリを作成
mkdir -p data

# TSVファイルをdataディレクトリに配置
cp ~/Downloads/list1.tsv data/
cp ~/Downloads/list2.tsv data/
cp ~/Downloads/list3.tsv data/

# スクリプトを実行
node scripts/migrate-data.js
```

## 📤 ステップ3: Supabaseへのインポート

### 方法1: Supabase UIを使用

1. Supabaseダッシュボードを開く
2. Table Editor → 対象テーブルを選択
3. "Insert" → "Import data from CSV"
4. 変換したJSONファイルを選択してインポート

### 方法2: APIを使用

以下のスクリプトを `scripts/import-to-supabase.js` として保存:

```javascript
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function importList(listType, jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  
  console.log(`Importing ${data.length} records to ${listType}...`);
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${listType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(data)
  });
  
  if (response.ok) {
    console.log(`  ✅ Successfully imported to ${listType}`);
  } else {
    const error = await response.text();
    console.error(`  ❌ Failed to import to ${listType}:`, error);
  }
}

async function main() {
  await importList('新規リスト', path.join(__dirname, '..', 'data', 'list1.json'));
  await importList('ハルエネリスト', path.join(__dirname, '..', 'data', 'list2.json'));
  await importList('モバイルリスト', path.join(__dirname, '..', 'data', 'list3.json'));
  
  // Call history
  const callHistory = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'call_history.json'), 'utf-8')
  );
  
  console.log(`Importing ${callHistory.length} call history records...`);
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/架電履歴_全記録`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(callHistory)
  });
  
  if (response.ok) {
    console.log(`  ✅ Successfully imported call history`);
  } else {
    const error = await response.text();
    console.error(`  ❌ Failed to import call history:`, error);
  }
}

main();
```

実行:

```bash
# 環境変数を設定
export NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
export SUPABASE_SERVICE_ROLE_KEY=your-service-key

# インポート実行
node scripts/import-to-supabase.js
```

## ✅ 検証

インポート後、以下を確認:

```sql
-- レコード数の確認
SELECT COUNT(*) FROM 新規リスト;
SELECT COUNT(*) FROM ハルエネリスト;
SELECT COUNT(*) FROM モバイルリスト;
SELECT COUNT(*) FROM 架電履歴_全記録;

-- サンプルデータの確認
SELECT * FROM 新規リスト LIMIT 5;
SELECT * FROM 架電履歴_全記録 LIMIT 5;
```

## 🔧 トラブルシューティング

### 文字化け

TSVファイルをUTF-8で保存し直す:

```bash
iconv -f SHIFT_JIS -t UTF-8 list1.tsv > list1_utf8.tsv
```

### 重複エラー

Noが重複している場合、既存レコードを削除:

```sql
DELETE FROM 新規リスト WHERE no = 'xxx';
```

### 大量データのインポート

バッチ処理で分割してインポート:

```javascript
// 500件ずつに分割
const batchSize = 500;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await importBatch(batch);
}
```
