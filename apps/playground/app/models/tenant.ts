import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * The tenant directory is owned by the application: the tenancy package
 * resolves identities through lookups like this one and never provisions rows.
 */
export default class Tenant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string
}
