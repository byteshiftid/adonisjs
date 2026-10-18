# Byteshift packages for AdonisJS

Foundation packages for AdonisJS v7 applications, maintained by [Byteshift](https://byteshift.id). Each package is published separately under the `@byteshiftid` npm scope, so an application installs only what it needs.

[![ci](https://github.com/byteshiftid/adonisjs/actions/workflows/ci.yml/badge.svg)](https://github.com/byteshiftid/adonisjs/actions/workflows/ci.yml)

## Packages

| Package                                                                  | Description                                                                          | Previously                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------- |
| [`@byteshiftid/adonisjs-audit-trail`](packages/adonisjs-audit-trail)     | Tamper-evident audit trail with hash chains, redaction and a transactional outbox    | `@rikology/adonisjs-audit-trail`   |
| [`@byteshiftid/adonisjs-notifications`](packages/adonisjs-notifications) | Channel-based notifications with database inbox, mail, queue delivery and test fakes | `@rikology/adonisjs-notifications` |
| [`@byteshiftid/adonisjs-tenant`](packages/adonisjs-tenant)               | Multitenancy: tenant resolution, tenant-aware auth guards and Lucid query scoping    | `@rikology/adonisjs-tenant`        |

Install a package and run its configure hook:

```sh
node ace add @byteshiftid/adonisjs-audit-trail
```

### Moving from `@rikology/*`

The packages above moved here from their `@rikology` names with full git history. Replace the dependency, then replace every `@rikology/adonisjs-<name>` import path with `@byteshiftid/adonisjs-<name>`, including the provider, command and middleware entries in `adonisrc.ts` and `start/kernel.ts`. Database tables and configuration options are unchanged.

## Compatibility

|                        | audit-trail               | notifications                | tenant |
| ---------------------- | ------------------------- | ---------------------------- | ------ |
| Node.js                | ≥ 24                      | ≥ 24                         | ≥ 24   |
| `@adonisjs/core`       | 7.x                       | 7.x                          | 7.x    |
| `@adonisjs/lucid`      | 22.x (optional)           | 22.x (optional)              | 22.x   |
| `@adonisjs/auth`       | 10.x (optional)           | —                            | 10.x   |
| `@adonisjs/mail`       | —                         | 10.x (optional)              | —      |
| `@adonisjs/queue`      | —                         | 0.6.x, from 0.6.2 (optional) | —      |
| Databases tested in CI | SQLite, PostgreSQL, MySQL | SQLite (playground)          | SQLite |

`@adonisjs/queue` is still experimental upstream, so the peer range stays on 0.6.x until a newer release is verified here. Every package is also exercised end to end in [`apps/playground`](apps/playground), an AdonisJS v7 application that runs each configure hook and integration test in CI.

## Development

Requirements: Node.js 24 and pnpm through Corepack (`corepack enable`).

```sh
pnpm install
pnpm build        # build every package (playground tests consume the build output)
pnpm test         # lint, tests and coverage gates for every package
pnpm typecheck
pnpm format:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the changeset and release workflow.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not open public issues for security problems.

## License

[MIT](LICENSE.md) © Riko Riswandha Fahmi Prasetyo (Byteshift)
