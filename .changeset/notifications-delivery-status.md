---
'@byteshiftid/adonisjs-notifications': patch
---

Fix database-channel delivery rows staying `pending` with a null `notification_id` after a successful send. Lucid replaced the UUID primary key with the SQLite row id on insert, so the status update matched no row. Delivery rows now become `sent` and link the stored notification. Failed deliveries on SQLite are also recorded as `failed` with their error, instead of failing with a SQL error that hid the original one.
