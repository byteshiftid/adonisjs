import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Logger } from '@adonisjs/core/logger'
import type { Emitter } from '@adonisjs/core/events'
import { Database } from '@adonisjs/lucid/database'
import { Adapter, BaseModel } from '@adonisjs/lucid/orm'
import type { DatabaseConfig } from '@adonisjs/lucid/types/database'

/**
 * Real SQLite database for tests that must exercise the Lucid models and the
 * Lucid-backed repository (column round-trips, query builder updates).
 *
 * Each call gets its own file in a temp directory, so suites never share rows.
 * The tables mirror the published migration stubs in `stubs/migrations`.
 */
export interface SqliteTestDatabase {
  db: Database
  close(): Promise<void>
}

export async function createSqliteTestDatabase(): Promise<SqliteTestDatabase> {
  const dir = mkdtempSync(join(tmpdir(), 'notifications-sqlite-'))
  const config: DatabaseConfig = {
    connection: 'test',
    connections: {
      test: {
        client: 'better-sqlite3',
        connection: { filename: join(dir, 'test.sqlite') },
        useNullAsDefault: true,
      },
    },
  }

  // Lucid only uses the emitter for `db:query` listeners, and tests register none.
  // A real Emitter needs a full application instance, so this no-op stub stands in.
  const emitter = {
    emit() {
      return false
    },
    hasListeners() {
      return false
    },
  } as unknown as Emitter<Record<string, unknown>>
  const logger = new Logger({ enabled: false, name: 'notifications-test', level: 'silent' })

  const db = new Database(config, logger, emitter)
  const previousAdapter = BaseModel.$adapter
  BaseModel.useAdapter(new Adapter(db))

  const close = async () => {
    BaseModel.useAdapter(previousAdapter)
    await db.manager.closeAll()
    rmSync(dir, { recursive: true, force: true })
  }

  try {
    // `db.connection().schema` is one knex builder that accumulates statements, so each
    // DDL call reads it fresh; reusing a stored reference re-runs earlier statements.
    await db.connection().schema.createTable('users', (table) => {
      table.increments('id').primary()
      table.string('email').nullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })

    await db.connection().schema.createTable('notifications', (table) => {
      table.uuid('id').primary()
      table.string('type').notNullable()
      table.string('notifiable_type').notNullable()
      table.string('notifiable_id').notNullable()
      table.json('data').notNullable()
      table.json('metadata').nullable()
      table.timestamp('read_at').nullable()
      table.timestamp('seen_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['notifiable_type', 'notifiable_id'])
    })

    await db.connection().schema.createTable('notification_deliveries', (table) => {
      table.uuid('id').primary()
      table.uuid('notification_id').nullable()
      table.string('notification_type').notNullable()
      table.string('notifiable_type').notNullable()
      table.string('notifiable_id').notNullable()
      table.string('channel').notNullable()
      table.string('status').notNullable().defaultTo('pending')
      table.integer('attempts').notNullable().defaultTo(0)
      table.string('dedupe_key').notNullable().unique()
      table.string('provider_message_id').nullable()
      table.json('error').nullable()
      table.timestamp('available_at').nullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('failed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  } catch (error) {
    await close()
    throw error
  }

  return { db, close }
}
