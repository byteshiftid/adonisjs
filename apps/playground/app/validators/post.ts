import vine from '@vinejs/vine'

/**
 * Validator for creating a tenant-scoped post. The tenant is never read
 * from the body: it always comes from the resolved tenant context.
 */
export const createPostValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
})
