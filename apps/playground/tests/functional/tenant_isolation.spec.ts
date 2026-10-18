import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { TenantService } from '@byteshiftid/adonisjs-tenant'
import Tenant from '#models/tenant'
import Post from '#models/post'

test.group('Tenant isolation through the playground app', (group) => {
  group.setup(async () => {
    const rollback = await testUtils.db().migrate()
    return rollback
  })

  group.each.setup(async () => {
    await db.from('posts').delete()
    await db.from('tenants').delete()
  })

  test('a tenant only lists and creates its own posts', async ({ client, assert }) => {
    const acme = await Tenant.create({ name: 'Acme', slug: 'acme' })
    const globex = await Tenant.create({ name: 'Globex', slug: 'globex' })

    const acmePost = await client
      .post('/api/v1/posts')
      .header('X-Tenant-ID', String(acme.id))
      .json({ title: 'Acme launch' })
    acmePost.assertStatus(201)
    assert.equal(acmePost.body().tenantId, acme.id)

    const globexPost = await client
      .post('/api/v1/posts')
      .header('X-Tenant-ID', String(globex.id))
      .json({ title: 'Globex launch' })
    globexPost.assertStatus(201)
    assert.equal(globexPost.body().tenantId, globex.id)

    const acmeList = await client.get('/api/v1/posts').header('X-Tenant-ID', String(acme.id))
    acmeList.assertStatus(200)
    assert.deepEqual(
      acmeList.body().map((post: { title: string }) => post.title),
      ['Acme launch']
    )

    const globexList = await client.get('/api/v1/posts').header('X-Tenant-ID', String(globex.id))
    globexList.assertStatus(200)
    assert.deepEqual(
      globexList.body().map((post: { title: string }) => post.title),
      ['Globex launch']
    )

    const rows = await db.from('posts').select('title', 'tenant_id').orderBy('id', 'asc')
    assert.deepEqual(rows, [
      { title: 'Acme launch', tenant_id: acme.id },
      { title: 'Globex launch', tenant_id: globex.id },
    ])
  })

  test('a missing tenant header is rejected and writes nothing', async ({ client, assert }) => {
    await Tenant.create({ name: 'Acme', slug: 'acme' })

    const list = await client.get('/api/v1/posts')
    list.assertStatus(404)
    assert.equal(list.text(), 'Tenant not found')

    const create = await client.post('/api/v1/posts').json({ title: 'Orphan' })
    create.assertStatus(404)

    const rows = await db.from('posts').select('id')
    assert.lengthOf(rows, 0)
  })

  test('an unknown tenant identifier is rejected and writes nothing', async ({
    client,
    assert,
  }) => {
    await Tenant.create({ name: 'Acme', slug: 'acme' })

    for (const header of ['9999', 'not-a-tenant']) {
      const create = await client
        .post('/api/v1/posts')
        .header('X-Tenant-ID', header)
        .json({ title: 'Stray' })
      create.assertStatus(404)
      assert.equal(create.text(), 'Tenant not found')
    }

    const rows = await db.from('posts').select('id')
    assert.lengthOf(rows, 0)
  })

  test('TenantScope refuses cross-tenant writes and unscoped reads', async ({ assert }) => {
    const acme = await Tenant.create({ name: 'Acme', slug: 'acme' })
    const globex = await Tenant.create({ name: 'Globex', slug: 'globex' })
    const acmeContext = { id: acme.id, name: acme.name, slug: acme.slug }

    await TenantService.run(acmeContext, async () => {
      const post = await Post.create({ title: 'Acme internal' })
      assert.equal(post.tenant_id, acme.id)

      await assert.rejects(
        () => Post.create({ title: 'Smuggled', tenant_id: globex.id }),
        /Cross-tenant write blocked/
      )
    })

    // Outside any tenant context, scoped reads fail closed instead of
    // returning rows from every tenant.
    await assert.rejects(() => Post.query().exec(), /tenant/i)

    const rows = await db.from('posts').select('title', 'tenant_id')
    assert.deepEqual(rows, [{ title: 'Acme internal', tenant_id: acme.id }])
  })
})
