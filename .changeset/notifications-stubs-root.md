---
'@byteshiftid/adonisjs-notifications': patch
---

Fix `node ace configure` and `make:notification` failing with `Unable to find stub "config/notifications.stub"` when run from the published build. The bundled build resolved the stubs directory one level too high.
