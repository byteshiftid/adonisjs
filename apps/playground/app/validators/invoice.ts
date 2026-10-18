import vine from '@vinejs/vine'

/**
 * Validator for creating an invoice.
 */
export const createInvoiceValidator = vine.create({
  number: vine.string().trim().minLength(1).maxLength(32),
  amountCents: vine.number().withoutDecimals().positive(),
})
