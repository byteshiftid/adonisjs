# Security policy

## Supported versions

Each package supports its latest minor release line. Fixes are not backported to older majors.

| Package                               | Supported          |
| ------------------------------------- | ------------------ |
| `@byteshiftid/adonisjs-audit-trail`   | 1.x (latest minor) |
| `@byteshiftid/adonisjs-notifications` | 1.x (latest minor) |
| `@byteshiftid/adonisjs-tenant`        | 1.x (latest minor) |

The previous `@rikology/*` names are deprecated and receive no fixes; upgrade to the `@byteshiftid` names.

## Reporting a vulnerability

Report privately through GitHub: [open a security advisory](https://github.com/byteshiftid/adonisjs/security/advisories/new). Do not open a public issue, discussion or pull request for a vulnerability.

Include:

- the affected package and version
- a description of the issue and its impact
- steps or code to reproduce it
- any suggested remediation

## What to expect

1. **Acknowledgment** within 72 hours.
2. **Investigation and scoping**, usually within 7 days.
3. **Fix and release**, coordinated with you. Critical fixes ship out of band.
4. **Disclosure** through a GitHub security advisory after the fix is published, crediting you if you agree.

## Scope

Reports should concern the packages in this repository, for example audit hash-chain or redaction bypasses, tenant isolation bypasses, notification data exposure across users or tenants, or privilege escalation through package commands. Weak application configuration outside the packages' documented guarantees is out of scope. Package-specific hardening guidance lives in each package's `docs/` and `SECURITY.md`.
