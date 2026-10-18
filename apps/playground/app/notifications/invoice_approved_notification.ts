import { Notification, MailMessage } from '@byteshiftid/adonisjs-notifications'

export interface ApprovedInvoice {
  id: number
  number: string
}

/**
 * Sent to the account owner when an invoice is approved. The mail channel is
 * faked in tests; the database channel writes a real inbox row.
 */
export default class InvoiceApprovedNotification extends Notification {
  public shouldQueue = false

  readonly invoice: ApprovedInvoice

  constructor(invoice: ApprovedInvoice) {
    super()
    this.invoice = invoice
  }

  via(_notifiable: unknown): string[] {
    return ['mail', 'database']
  }

  toMail(_notifiable: unknown) {
    return MailMessage.create()
      .subject(`Invoice ${this.invoice.number} approved`)
      .line(`Invoice ${this.invoice.number} has been approved.`)
  }

  toDatabase(_notifiable: unknown) {
    return {
      title: `Invoice ${this.invoice.number} approved`,
      invoiceId: this.invoice.id,
    }
  }
}
