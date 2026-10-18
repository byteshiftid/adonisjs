import { basename, dirname } from 'node:path'
import { AppFactory } from '@adonisjs/core/factories/app'
import { test } from '@japa/runner'
import { configure } from '../configure.js'
import { stubsRoot } from '../stubs/main.js'

test.group('Configure hook', () => {
  test('publishes migrations that create the configured tables', async ({ assert }) => {
    const app = new AppFactory().create(new URL('../', import.meta.url))
    await app.init()
    const stubs = await app.stubs.create()
    const rendered = new Map<string, { contents: string; destination: string }>()

    const codemods = {
      async makeUsingStub(root: string, path: string, data: Record<string, unknown>) {
        const stub = await stubs.build(path, { source: root })
        const prepared = await stub.prepare(data)
        rendered.set(path, { contents: prepared.contents, destination: prepared.destination })
        return prepared
      },
      async updateRcFile() {},
      async installPackages() {},
    }

    const command = {
      app,
      parsedFlags: { mail: true, queue: true },
      prompt: {
        confirm: async (message: string) => message.includes('migrations'),
      },
      async createCodemods() {
        return codemods
      },
      logger: { success() {}, log() {}, warning() {} },
    }

    await configure(command as never)

    const notifications = rendered.get('migrations/create_notifications_table.stub')
    const deliveries = rendered.get('migrations/create_notification_deliveries_table.stub')

    assert.include(notifications?.contents, "protected tableName = 'notifications'")
    assert.equal(dirname(notifications!.destination), app.makePath('database', 'migrations'))
    assert.match(basename(notifications!.destination), /^\d+_create_notifications_table\.ts$/)
    assert.include(deliveries?.contents, "protected tableName = 'notification_deliveries'")
    assert.equal(dirname(deliveries!.destination), app.makePath('database', 'migrations'))
    assert.match(
      basename(deliveries!.destination),
      /^\d+_create_notification_deliveries_table\.ts$/
    )
    assert.equal(
      rendered.get('config/notifications.stub')?.destination,
      app.configPath('notifications.ts')
    )
    assert.isTrue(stubsRoot.endsWith('stubs'))
  })
})
