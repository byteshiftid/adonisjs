import { test } from '@japa/runner'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { NotificationManager } from '../src/notification_manager.ts'
import { Notification } from '../src/notification.ts'
import { DatabaseChannel } from '../src/channels/database_channel.ts'
import { LucidNotificationRepository } from '../src/repositories/lucid_notification_repository.ts'
import { withNotifications } from '../src/mixins/with_notifications.ts'
import type { NotificationChannel } from '../src/contracts/channels.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import { createSqliteTestDatabase, type SqliteTestDatabase } from './helpers/sqlite_database.ts'

class User extends compose(BaseModel, withNotifications()) {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string | null
}

class InvoicePaid extends Notification {
  via(): string[] {
    return ['database']
  }

  toDatabase(): Record<string, unknown> {
    return { amount: 4200 }
  }
}

class FailingMail extends Notification {
  via(): string[] {
    return ['mail']
  }

  toMail(): Record<string, unknown> {
    return { subject: 'Invoice' }
  }
}

function createConfig(channels: NotificationConfig['channels']): NotificationConfig {
  return {
    channels,
    queue: { enabled: false, defaultQueue: 'notifications' },
    routing: {},
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: {
      recordAttempts: true,
      failFast: false,
      retry: { attempts: 1, backoff: [] },
    },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

test.group('Delivery tracking with the database channel (SQLite)', (group) => {
  let harness: SqliteTestDatabase

  group.each.setup(async () => {
    harness = await createSqliteTestDatabase()
  })

  group.each.teardown(async () => {
    await harness.close()
  })

  test('a successful database delivery marks its delivery row sent and links the notification', async ({
    assert,
  }) => {
    const repository = new LucidNotificationRepository()
    const manager = new NotificationManager(
      createConfig({ database: () => new DatabaseChannel(repository) })
    )
    manager.setRepository(repository)

    const user = await User.create({ email: 'ada@example.com' })
    await manager.sendNow(user, new InvoicePaid())

    const notifications = await harness.db.from('notifications')
    assert.lengthOf(notifications, 1)

    const deliveries = await harness.db.from('notification_deliveries')
    assert.lengthOf(deliveries, 1)

    const [delivery] = deliveries
    assert.equal(delivery.status, 'sent')
    assert.equal(delivery.attempts, 1)
    assert.isNotNull(delivery.sent_at)
    assert.equal(delivery.notification_id, notifications[0].id)
    assert.equal(delivery.provider_message_id, notifications[0].id)
  })

  test('a failed delivery is recorded as failed with its structured error', async ({ assert }) => {
    const failingChannel: NotificationChannel = {
      name: 'mail',
      requiresRoute: false,
      resolvesOwnMessage: false,
      async send() {
        throw new Error('smtp unavailable')
      },
    }
    const repository = new LucidNotificationRepository()
    const manager = new NotificationManager(createConfig({ mail: () => failingChannel }))
    manager.setRepository(repository)

    await assert.rejects(
      () =>
        manager.sendNow(
          { id: 'u1', original: {}, type: 'users', routes: new Map() },
          new FailingMail()
        ),
      'smtp unavailable'
    )

    const [delivery] = await harness.db.from('notification_deliveries')
    assert.equal(delivery.status, 'failed')
    assert.equal(delivery.attempts, 1)
    assert.isNotNull(delivery.failed_at)
    assert.equal(JSON.parse(delivery.error).message, 'smtp unavailable')
  })
})
