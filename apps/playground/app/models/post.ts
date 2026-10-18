import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { TenantScope } from '@byteshiftid/adonisjs-tenant/mixins'

export default class Post extends TenantScope(BaseModel) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
