// Run: node scripts/test-list-groups.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync('app/api/admin/lists/[id]/group/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
let updated, writes, result
const chain = {
  update(value) { updated = value; writes++; return this },
  eq(key, value) { assert.equal(key, 'id'); assert.equal(value, 'list-id'); return this },
  select() { return this },
  async maybeSingle() { return result },
}
const exportsObject = {}
vm.runInNewContext(code, {
  exports: exportsObject,
  require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }
    if (name === '@/lib/auth') return { requireAdmin: (request) => request.role === 'admin' ? null : { status: 403 } }
    if (name === '@/lib/supabase') return { TABLES: { LISTS: 'lists' }, supabaseAdmin: { from: () => chain } }
    throw Error(name)
  },
})
async function call(body, role = 'admin') {
  writes = 0; updated = undefined
  return exportsObject.PUT({ role, json: async () => body }, { params: { id: 'list-id' } })
}
;(async () => {
  result = { data: { id: 'list-id', group_name: '北海道' }, error: null }
  assert.equal((await call({ groupName: '北海道' }, 'user')).status, 403)
  assert.equal(writes, 0)
  for (const body of [null, {}, { groupName: 123 }, { groupName: 'あ'.repeat(101) }]) {
    assert.equal((await call(body)).status, 400); assert.equal(writes, 0)
  }
  assert.equal((await call({ groupName: '  北海道  ' })).status, 200)
  assert.equal(updated.group_name, '北海道')
  assert.equal((await call({ groupName: '   ' })).status, 200)
  assert.equal(updated.group_name, null)
  result = { data: null, error: null }
  assert.equal((await call({ groupName: '北海道' })).status, 404)
  result = { data: null, error: { code: 'PGRST204', message: 'missing column' } }
  const missing = await call({ groupName: '北海道' })
  assert.equal(missing.status, 500)
  assert.match(missing.body.message, /データベース更新/)
  const badJson = await exportsObject.PUT({ role: 'admin', json: async () => { throw Error('bad json') } }, { params: { id: 'list-id' } })
  assert.equal(badJson.status, 400)
  console.log('List group API checks passed (permissions, validation, assignment, clearing, missing list/schema, malformed JSON).')
})().catch((error) => { console.error(error); process.exitCode = 1 })
