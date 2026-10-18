import '@byteshiftid/adonisjs-audit-trail/types'

/**
 * Typed domain audit event names. Once registered, the `audit.log()` facade
 * autocompletes them and rejects unknown names at compile time.
 */
declare module '@byteshiftid/adonisjs-audit-trail/types' {
  interface AuditEvents {
    'invoice.approved': true
  }
}
