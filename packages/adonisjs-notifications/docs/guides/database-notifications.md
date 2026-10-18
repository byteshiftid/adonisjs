# Database Notifications

Database notifications provide a persistent inbox for users. Requires `@adonisjs/lucid`.

## Model setup

Add the mixin to your Lucid model:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withNotifications } from '@byteshiftid/adonisjs-notifications/mixins'

export default class User extends compose(BaseModel, withNotifications()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string
}
```

### How inbox rows are matched

Every row stores the recipient as `notifiable_type` and `notifiable_id`. Both the write path and the
inbox queries (`user.notifications()`, `unreadNotificationsCount()`, `markNotificationsAsRead()`,
the dashboard, and metrics) derive them the same way:

- `notifiable_type` is `getNotificationType()` when the model defines it, otherwise the model's
  table (`users`), otherwise the class name.
- `notifiable_id` is always stored as a string, so `1` and `'1'` refer to the same recipient.

```ts
export default class User extends compose(BaseModel, withNotifications()) {
  static table = 'users'

  // Optional. Keeps working unchanged; it returns the same value as the table default.
  getNotificationType() {
    return User.table
  }
}
```

**Upgrading from versions before this change:** earlier versions stored the class name (for example
`User`) as `notifiable_type`, so those rows stay invisible to the inbox. Rewrite them once, using the
table name your model resolves to:

```sql
UPDATE notifications SET notifiable_type = 'users' WHERE notifiable_type = 'User';
UPDATE notification_deliveries SET notifiable_type = 'users' WHERE notifiable_type = 'User';
```

Apps that already return a custom type from `getNotificationType()` only need to run the update when
their stored rows were written with the class name.

## Sending to database

```ts
import { Notification } from '@byteshiftid/adonisjs-notifications'

export default class WelcomeNotification extends Notification {
  via(notifiable) {
    return ['database']
  }

  toDatabase(notifiable) {
    return {
      title: 'Welcome to the app',
      body: 'Thanks for signing up!',
      icon: 'user-add',
    }
  }
}
```

Send:
```ts
await user.notify(new WelcomeNotification())
```

## Querying notifications

```ts
// All notifications
const all = await (await user.notifications()).query().paginate(1, 20)

// Unread only
const unread = await (await user.unreadNotifications()).query().paginate(1, 20)

// Unread count
const count = await user.unreadNotificationsCount()
```

## Read state

```ts
await user.markNotificationsAsRead()   // mark all as read
// Note: mark single notification via repository
```

The `NotificationRepository` contract also provides:
- `markAsRead(id)` — mark single notification as read
- `markAsUnread(id)` — mark single notification as unread
- `markAllAsRead(notifiableType, notifiableId)` — mark all unread for a notifiable
- `markAsSeen(id)` — mark as seen (separate from read)

## Repository

The package uses a repository pattern for database operations.

**LucidNotificationRepository** (default) — uses Lucid models.

**MemoryNotificationRepository** (testing) — in-memory, non-persistent.

```ts
import { MemoryNotificationRepository } from '@byteshiftid/adonisjs-notifications'

const repo = new MemoryNotificationRepository()
```

## Migrations

When you run `node ace configure @byteshiftid/adonisjs-notifications`, two migration stubs are published:

- `database/migrations/xxx_create_notifications_table.ts`
- `database/migrations/xxx_create_notification_deliveries_table.ts`

The `notifications` table stores inbox records with columns:
`id`, `type`, `notifiable_type`, `notifiable_id`, `data`, `metadata`, `read_at`, `seen_at`, `created_at`, `updated_at`

The `notification_deliveries` table stores delivery attempts with columns:
`id`, `notification_id`, `notification_type`, `notifiable_type`, `notifiable_id`, `channel`, `status`, `attempts`, `dedupe_key`, `provider_message_id`, `error`, `available_at`, `sent_at`, `failed_at`, `created_at`, `updated_at`

## Pruning

Remove old notifications:
```bash
node ace notifications:prune --older-than=90d
```
