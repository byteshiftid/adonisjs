---
'@byteshiftid/adonisjs-notifications': minor
---

Publish under the `@byteshiftid` scope. The package was previously `@rikology/adonisjs-notifications`; replace the dependency and every import path (`@rikology/adonisjs-notifications/...` → `@byteshiftid/adonisjs-notifications/...`), including the provider and commands entries in `adonisrc.ts`. The optional `@adonisjs/queue` peer range is now `~0.6.2`, so a future 0.7 release of the experimental queue package is opt-in.
