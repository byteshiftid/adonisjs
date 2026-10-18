import { test } from '@japa/runner'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { NotificationManager } from '../src/notification_manager.ts'
import { Notification } from '../src/notification.ts'
import { DatabaseChannel } from '../src/channels/database_channel.ts'
import { LucidNotificationRepository } from '../src/repositories/lucid_notification_repository.ts'
import { withNotifications } from '../src/mixins/with_notifications.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import { createSqliteTestDatabase, type SqliteTestDatabase } from './helpers/sqlite_database.ts'

/** Model without any discriminator override: the inbox must still match what was written. */
class User extends compose(BaseModel, withNotifications()) {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string | null
}

/** Model that already applies the documented `getNotificationType()` workaround. */
class WorkaroundUser extends compose(BaseModel, withNotifications()) {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string | null

  getNotificationType(): string {
    return WorkaroundUser.table
  }
}

class InvoicePaid extends Notification {
  via(): string[] {
    return ['database']
  }

  toDatabase(): Record<string, unknown> {
    return { amount: 4200 }
  }
}

function createConfig(repository: LucidNotificationRepository): NotificationConfig {
  return {
    channels: { database: () => new DatabaseChannel(repository) },
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

test.group('Inbox identity with a real SQLite database', (group) => {
  let harness: SqliteTestDatabase
  let repository: LucidNotificationRepository
  let manager: NotificationManager

  group.each.setup(async () => {
    harness = await createSqliteTestDatabase()
    repository = new LucidNotificationRepository()
    manager = new NotificationManager(createConfig(repository))
    manager.setRepository(repository)
  })

  group.each.teardown(async () => {
    await harness.close()
  })

  test('mixin inbox queries find a notification written for the same model', async ({ assert }) => {
    const user = await User.create({ email: 'ada@example.com' })
    await manager.sendNow(user, new InvoicePaid())

    assert.equal(await user.unreadNotificationsCount(), 1)
  })

  test('markNotificationsAsRead clears the inbox written for the same model', async ({
    assert,
  }) => {
    const user = await User.create({ email: 'ada@example.com' })
    await manager.sendNow(user, new InvoicePaid())
    assert.equal(await user.unreadNotificationsCount(), 1)

    await user.markNotificationsAsRead()

    assert.equal(await user.unreadNotificationsCount(), 0)
  })

  test('rows are stored with the table as discriminator and a string id', async ({ assert }) => {
    const user = await User.create({ email: 'ada@example.com' })
    await manager.sendNow(user, new InvoicePaid())

    const [notification] = await harness.db.from('notifications')
    assert.equal(notification.notifiable_type, 'users')
    assert.equal(notification.notifiable_id, '1')

    const [delivery] = await harness.db.from('notification_deliveries')
    assert.equal(delivery.notifiable_type, 'users')
    assert.equal(delivery.notifiable_id, '1')
  })

  test('repository queries match numeric and string ids alike', async ({ assert }) => {
    const user = await User.create({ email: 'ada@example.com' })
    await manager.sendNow(user, new InvoicePaid())

    assert.equal(await repository.unreadCount('users', 1), 1)
    assert.equal(await repository.unreadCount('users', '1'), 1)
  })

  test('a model that declares getNotificationType keeps its inbox', async ({ assert }) => {
    const user = await WorkaroundUser.create({ email: 'grace@example.com' })
    await manager.sendNow(user, new InvoicePaid())

    assert.equal(await user.unreadNotificationsCount(), 1)
    assert.equal(await repository.unreadCount('users', '1'), 1)
  })
})
