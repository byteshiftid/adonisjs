import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import notifications from '@byteshiftid/adonisjs-notifications/services/main'
import type { Notification } from '@byteshiftid/adonisjs-notifications'
import User from '#models/user'
import InvoiceApprovedNotification from '#notifications/invoice_approved_notification'

const PASSWORD = 'correct-horse-battery'

/**
 * The package types its fake assertions as `new (...args: unknown[]) => Notification`,
 * which rejects constructors with typed parameters. Cast once at this boundary.
 */
const ApprovedClass = InvoiceApprovedNotification as unknown as new (
  ...args: unknown[]
) => Notification

/**
 * Reads the first page of a user's database inbox through the package's query API.
 */
async function inboxOf(user: User) {
  const inboxQuery = await user.notifications()
  return inboxQuery.query().paginate(1, 20)
}

test.group('Notifications through the playground app', (group) => {
  group.setup(async () => {
    const rollback = await testUtils.db().migrate()
    return rollback
  })

  group.each.setup(async () => {
    await db.from('notification_deliveries').delete()
    await db.from('notifications').delete()
    await db.from('users').delete()
  })

  test('a notification sent to a user lands in its database inbox', async ({ assert }) => {
    const user = await User.create({
      email: 'cy@example.com',
      password: PASSWORD,
      fullName: 'Cy Customer',
    })

    // Only the mail channel needs the network, so only mail is faked.
    const fake = notifications.fake({ channels: ['mail'] })
    try {
      await user.notify(new InvoiceApprovedNotification({ id: 7, number: 'INV-0007' }))

      fake.assertSentOnChannel(user, ApprovedClass, 'mail')

      const inbox = await inboxOf(user)
      assert.lengthOf(inbox.all(), 1)
      assert.equal(await user.unreadNotificationsCount(), 1)

      const rows = await db.from('notifications').select('notifiable_id', 'read_at')
      assert.lengthOf(rows, 1)
      assert.equal(rows[0].notifiable_id, String(user.id))
      assert.isNull(rows[0].read_at)
    } finally {
      notifications.restore()
    }
  })

  test('marking the inbox as read clears the unread count', async ({ assert }) => {
    const user = await User.create({
      email: 'dee@example.com',
      password: PASSWORD,
      fullName: 'Dee Customer',
    })

    notifications.fake({ channels: ['mail'] })
    try {
      await user.notify(new InvoiceApprovedNotification({ id: 8, number: 'INV-0008' }))
      assert.equal(await user.unreadNotificationsCount(), 1)

      await user.markNotificationsAsRead()

      assert.equal(await user.unreadNotificationsCount(), 0)
      const [row] = await db.from('notifications').select('read_at')
      assert.isNotNull(row.read_at)
    } finally {
      notifications.restore()
    }
  })

  test('one user cannot see another user’s inbox', async ({ assert }) => {
    const sender = await User.create({
      email: 'eli@example.com',
      password: PASSWORD,
      fullName: 'Eli Owner',
    })
    const bystander = await User.create({
      email: 'fay@example.com',
      password: PASSWORD,
      fullName: 'Fay Bystander',
    })

    notifications.fake({ channels: ['mail'] })
    try {
      await sender.notify(new InvoiceApprovedNotification({ id: 9, number: 'INV-0009' }))

      const senderInbox = await inboxOf(sender)
      const bystanderInbox = await inboxOf(bystander)

      assert.lengthOf(senderInbox.all(), 1)
      assert.lengthOf(bystanderInbox.all(), 0)
      assert.equal(await bystander.unreadNotificationsCount(), 0)
    } finally {
      notifications.restore()
    }
  })
})
