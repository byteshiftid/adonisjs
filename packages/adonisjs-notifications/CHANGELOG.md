# @byteshiftid/adonisjs-notifications

## 1.6.0

### Minor Changes

- c721db5: Publish under the `@byteshiftid` scope. The package was previously `@rikology/adonisjs-notifications`; replace the dependency and every import path (`@rikology/adonisjs-notifications/...` → `@byteshiftid/adonisjs-notifications/...`), including the provider and commands entries in `adonisrc.ts`. The optional `@adonisjs/queue` peer range is now `~0.6.2`, so a future 0.7 release of the experimental queue package is opt-in.

### Patch Changes

- 6aa1555: Fix `node ace configure` failing with `ReferenceError: tableName is not defined` while publishing the `notifications` and `notification_deliveries` migrations.
- f465d0f: Fix database-channel delivery rows staying `pending` with a null `notification_id` after a successful send. Lucid replaced the UUID primary key with the SQLite row id on insert, so the status update matched no row. Delivery rows now become `sent` and link the stored notification. Failed deliveries on SQLite are also recorded as `failed` with their error, instead of failing with a SQL error that hid the original one.
- 788a30c: Fix `notifications.fake()` recording `send()` as queued. `send()` is now recorded as queued only when the real manager would queue it (queue enabled, a dispatcher attached, and `shouldQueue` not `false`); otherwise it is recorded as sent. `await user.notify(...)` followed by `assertSentTo(...)` now works as the testing guide describes. The fake also matches notifiables by the same type and id the real manager stores.
- d2267b6: Fix database inbox queries returning nothing for notifications the package wrote. Notification and delivery rows and every inbox query (`notifications()`, `unreadNotifications()`, `markNotificationsAsRead()`, unread counts, the dashboard, and metrics) now derive the recipient the same way: `notifiable_type` is `getNotificationType()` when defined, otherwise the model's table (for example `users`), otherwise the class name. `notifiable_id` is stored and queried as a string, so `1` and `'1'` match. Apps that already define `getNotificationType()` are unaffected.
  
  Rows written by earlier versions with the class name as `notifiable_type` stay invisible. Run a one-off update with your model's table name:
  
  ```sql
  UPDATE notifications SET notifiable_type = 'users' WHERE notifiable_type = 'User';
  UPDATE notification_deliveries SET notifiable_type = 'users' WHERE notifiable_type = 'User';
  ```
- 28282a7: Fix `node ace configure` and `make:notification` failing with `Unable to find stub "config/notifications.stub"` when run from the published build. The bundled build resolved the stubs directory one level too high.
