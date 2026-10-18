---
'@byteshiftid/adonisjs-notifications': patch
---

Fix `notifications.fake()` recording `send()` as queued. `send()` is now recorded as queued only when the real manager would queue it (queue enabled, a dispatcher attached, and `shouldQueue` not `false`); otherwise it is recorded as sent. `await user.notify(...)` followed by `assertSentTo(...)` now works as the testing guide describes. The fake also matches notifiables by the same type and id the real manager stores.
