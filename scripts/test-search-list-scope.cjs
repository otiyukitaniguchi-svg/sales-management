// Run: node scripts/test-search-list-scope.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const customers = [
  { list_slug: 'list1', no: '1', company_name: '同名企業' },
  { list_slug: 'list2', no: '1', company_name: '同名企業' },
]
const histories = [
  { id: 1, list_type: '新規リスト', no: '1', operator: '担当A', date: '2026-11-10' },
  { id: 2, list_type: 'list2', no: '1', operator: '担当B', date: '2026-11-10' },
]
let queries = []
class Query {
  constructor(table) { this.table = table; this.filters = []; this.head = false }
  select(fields, options) { this.head = options?.head || false; return this }
  eq(key, value) { this.filters.push([key, [value]]); return this }
  in(key, values) { this.filters.push([key, values]); return this }
  or() { return this }
  ilike(key, value) { this.filters.push([key, null, value.replaceAll('%', '')]); return this }
  order() { return this }
  range() { return this }
  then(resolve, reject) {
    queries.push(this)
    let rows = this.table === 'lists' ? [{ slug: 'list1' }, { slug: 'list2' }]
      : this.table === 'customers' ? customers : histories
    rows = rows.filter((row) => this.filters.every(([key, values, term]) =>
      values ? values.includes(row[key]) : String(row[key] || '').includes(term)))
    return Promise.resolve({ data: this.head ? null : rows, count: rows.length, error: null }).then(resolve, reject)
  }
}
const output = {}
const compiled = ts.transpileModule(fs.readFileSync('app/api/search/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
vm.runInNewContext(compiled, {
  exports: output, console,
  require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }
    if (name === '@/lib/supabase') return {
      TABLES: { LISTS: 'lists', CUSTOMERS: 'customers', CALL_HISTORY: 'history' },
      supabaseAdmin: { from: (table) => new Query(table) },
    }
    if (name === '@/lib/types') return { toFrontendFormat: (row) => ({ no: row.no, companyName: row.company_name }) }
    throw Error(name)
  },
})
async function search(params) {
  queries = []
  return output.GET({ nextUrl: { searchParams: new URLSearchParams(params) } })
}
;(async () => {
  let response = await search({ companyName: '同名' })
  assert.equal(response.status, 200); assert.equal(response.body.results.length, 2)
  response = await search({ companyName: '同名', listId: 'list2' })
  assert.equal(response.body.results.length, 1); assert.equal(response.body.results[0].listId, 'list2')
  assert.equal(queries.filter((query) => query.table === 'customers').length, 1)
  response = await search({ listId: 'list1' })
  assert.equal(response.body.results.length, 1)
  response = await search({ listId: 'deleted', operator: '担当A' })
  assert.equal(response.status, 400); assert.equal(queries.length, 1)
  response = await search({})
  assert.equal(response.status, 400); assert.equal(queries.length, 0)
  for (const historyScope of ['latest', 'all']) {
    response = await search({ listId: 'list1', operator: '担当A', historyScope })
    assert.equal(response.body.results.length, 1)
    assert.equal(response.body.results[0].listId, 'list1')
    assert.equal(response.body.results[0].record.callHistoryCount, 1)
    for (const query of queries.filter((query) => query.table === 'history')) {
      assert.ok(query.filters.some(([key, values]) => key === 'list_type' && values.includes('list1') && values.includes('新規リスト')))
    }
    response = await search({ listId: 'list2', operator: '担当A', historyScope })
    assert.equal(response.body.results.length, 0)
  }
  response = await search({ operator: '担当A' })
  assert.equal(response.body.results.length, 1)
  console.log('Search scope checks passed: all/single/list-only/invalid/empty searches and latest/all legacy history isolation.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
