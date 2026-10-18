# Contributing

Thanks for helping improve the Byteshift AdonisJS packages. This repository is a pnpm workspace: every package lives in `packages/`, and `apps/playground` is an AdonisJS v7 application that consumes the built packages.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Setup

Requirements: Node.js 24, pnpm through Corepack, and Docker only for the audit-trail PostgreSQL/MySQL tests.

```sh
corepack enable
pnpm install
pnpm build
```

## Everyday commands

| Task                                              | Command                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Build all packages                                | `pnpm build`                                                                    |
| Lint, tests and coverage gates for all packages   | `pnpm test`                                                                     |
| Type-check packages and playground                | `pnpm typecheck`                                                                |
| Check formatting                                  | `pnpm format:check`                                                             |
| Work on one package                               | `pnpm --filter @byteshiftid/adonisjs-tenant test`                               |
| Playground integration tests (after `pnpm build`) | `pnpm --filter @byteshiftid/playground test`                                    |
| Audit-trail database matrix (Docker)              | `RUN_DOCKER_TESTS=1 pnpm --filter @byteshiftid/adonisjs-audit-trail quick:test` |

Package `test` and `build` scripts run lint first. Coverage thresholds live in each package's `c8` config.

The playground installs injected copies of the packages (`injectWorkspacePackages` in `pnpm-workspace.yaml`), so it resolves `@adonisjs/core` and `@adonisjs/lucid` exactly like an app installed from npm. After changing a package, run `pnpm build` at the root (or `pnpm install`) so the playground picks up the new build.

## Changesets

Every pull request that changes a published package needs a changeset:

```sh
pnpm changeset
```

Pick the affected packages and the semver bump, then describe the change from a user's point of view. Changes that only touch tests, CI or the playground do not need one.

## Commits and pull requests

Use [Conventional Commits](https://www.conventionalcommits.org/), with the package as scope when it applies (`fix(tenant): ...`, `feat(audit-trail): ...`). Branch from `main`, keep pull requests focused, and include tests and docs for behavior changes. CI must pass: formatting, lint, type-check, package tests on Linux and Windows, the audit-trail database matrix, packaging checks and the playground.

## Releases

Releases run from `.github/workflows/release.yml` after CI passes on `main`:

1. Merged changesets make the release workflow open or update a "Version Packages" pull request with bumped versions and changelog entries.
2. Merging that pull request publishes the bumped packages to npm with provenance and creates git tags.

The workflow authenticates with the `NPM_TOKEN` repository secret (a granular npm token with publish access to `@byteshiftid`). After each package exists on npm, configure npm trusted publishing for `byteshiftid/adonisjs` and `release.yml`, then remove the token.

## License

Contributions are licensed under the [MIT License](LICENSE.md).
