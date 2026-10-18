---
'@byteshiftid/adonisjs-notifications': patch
---

Fix database inbox queries returning nothing for notifications the package wrote. Notification and delivery rows and every inbox query (`notifications()`, `unreadNotifications()`, `markNotificationsAsRead()`, unread counts, the dashboard, and metrics) now derive the recipient the same way: `notifiable_type` is `getNotificationType()` when defined, otherwise the model's table (for example `users`), otherwise the class name. `notifiable_id` is stored and queried as a string, so `1` and `'1'` match. Apps that already define `getNotificationType()` are unaffected.

Rows written by earlier versions with the class name as `notifiable_type` stay invisible. Run a one-off update with your model's table name:

```sql
UPDATE notifications SET notifiable_type = 'users' WHERE notifiable_type = 'User';
UPDATE notification_deliveries SET notifiable_type = 'users' WHERE notifiable_type = 'User';
```
