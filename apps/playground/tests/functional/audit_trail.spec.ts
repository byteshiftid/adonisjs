import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import User from '#models/user'
import type { AuditStoreContract, VerifyReport } from '@byteshiftid/adonisjs-audit-trail/types'

const PASSWORD = 'correct-horse-battery'

function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  return promise
}

/**
 * Model events are flushed asynchronously (`guarantee: 'best-effort'`), so
 * reads are retried until the expected rows have landed or the timeout expires.
 */
async function eventually<T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  timeoutMs = 5000
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let value = await read()
  while (!ready(value) && Date.now() < deadline) {
    await delay(50)
    value = await read()
  }
  return value
}

/**
 * Verifies every stream through the store contract that `node ace audit:verify`
 * uses internally.
 */
async function verifyEveryStream(): Promise<VerifyReport[]> {
  const manager = await app.container.make('audit.manager')
  const store = manager.use() as AuditStoreContract
  const streams = (await store.listStreams?.()) ?? []

  const reports: VerifyReport[] = []
  for (const stream of streams) {
    for await (const report of store.verify(stream)) {
      reports.push(report)
    }
  }
  return reports
}

/**
 * Reads the access token from the login response. The shape is checked at
 * runtime, so a changed response fails here with a clear message.
 */
function tokenFrom(body: unknown): string {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    const data = body.data
    if (typeof data === 'object' && data !== null && 'token' in data) {
      if (typeof data.token === 'string') {
        return data.token
      }
    }
  }
  throw new Error('Login response did not include a string access token')
}

async function loginAs(client: ApiClient, email: string): Promise<string> {
  const login = await client.post('/api/v1/auth/login').json({ email, password: PASSWORD })
  login.assertStatus(200)
  return tokenFrom(login.body())
}

test.group('Audit trail through the playground app', (group) => {
  group.setup(async () => {
    const rollback = await testUtils.db().migrate()
    return rollback
  })

  group.each.setup(async () => {
    await db.from('auth_access_tokens').delete()
    await db.from('users').delete()
  })

  test('model changes and explicit events are recorded with the request actor and the chain verifies', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      email: 'ana@example.com',
      password: PASSWORD,
      fullName: 'Ana Auditor',
    })
    const token = await loginAs(client, 'ana@example.com')

    const created = await client
      .post('/api/v1/invoices')
      .bearerToken(token)
      .json({ number: 'INV-0001', amountCents: 125000 })
    created.assertStatus(201)
    const invoiceId: number = created.body().id

    const approved = await client.post(`/api/v1/invoices/${invoiceId}/approve`).bearerToken(token)
    approved.assertStatus(200)
    assert.equal(approved.body().status, 'approved')

    const rows = await eventually(
      () =>
        db
          .from('audits')
          .where('auditable_type', 'Invoice')
          .where('auditable_id', String(invoiceId))
          .orderBy('seq', 'asc')
          .select('event', 'actor_type', 'actor_id'),
      (value) => value.length === 3
    )

    assert.deepEqual(rows.map((row) => row.event).sort(), [
      'invoice.approved',
      'model.created',
      'model.updated',
    ])
    for (const row of rows) {
      assert.equal(row.actor_type, 'user')
      assert.equal(row.actor_id, String(user.id))
    }

    const chain = await verifyEveryStream()
    assert.isAbove(chain.length, 0)
    for (const report of chain) {
      assert.isTrue(report.valid, `stream ${report.stream} broke at seq ${report.firstInvalidSeq}`)
    }
    assert.isAbove(
      chain.reduce((total, report) => total + report.checkedCount, 0),
      2
    )
  })

  test('audit rows cannot be rewritten in place', async ({ client, assert }) => {
    await User.create({ email: 'bo@example.com', password: PASSWORD, fullName: 'Bo Reviewer' })
    const token = await loginAs(client, 'bo@example.com')

    const created = await client
      .post('/api/v1/invoices')
      .bearerToken(token)
      .json({ number: 'INV-0002', amountCents: 500 })
    created.assertStatus(201)

    const [row] = await eventually(
      () =>
        db
          .from('audits')
          .where('auditable_type', 'Invoice')
          .where('auditable_id', String(created.body().id))
          .select('id', 'actor_id'),
      (value) => value.length === 1
    )
    assert.exists(row)

    await assert.rejects(() => db.from('audits').where('id', row.id).update({ actor_id: 'forged' }))

    const [stored] = await db.from('audits').where('id', row.id).select('actor_id')
    assert.equal(stored.actor_id, row.actor_id)
  })
})
