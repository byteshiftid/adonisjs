import '@byteshiftid/adonisjs-audit-trail/types'

declare module '@byteshiftid/adonisjs-audit-trail/types' {
  interface AuditEvents {
    'invoice.approved': true
  }
}
