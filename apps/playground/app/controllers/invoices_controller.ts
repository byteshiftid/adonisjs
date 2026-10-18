import Invoice from '#models/invoice'
import audit from '@byteshiftid/adonisjs-audit-trail/services/main'
import { createInvoiceValidator } from '#validators/invoice'
import type { HttpContext } from '@adonisjs/core/http'

export default class InvoicesController {
  async store({ request, response }: HttpContext) {
    const { number, amountCents } = await request.validateUsing(createInvoiceValidator)
    const invoice = await Invoice.create({ number, amountCents, status: 'draft' })

    response.status(201)
    return { id: invoice.id, number: invoice.number, status: invoice.status }
  }

  /**
   * Approves an invoice. The status change is captured automatically by the
   * `Auditable` mixin (`model.updated`); the explicit domain event records the
   * business decision on top of it, within the same request.
   */
  async approve({ params, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const invoice = await Invoice.findOrFail(params.id)

    invoice.status = 'approved'
    await invoice.save()

    await audit.log('invoice.approved').on(invoice).withMeta({ approvedBy: user.id }).commitSync()

    return { id: invoice.id, number: invoice.number, status: invoice.status }
  }
}
