import { test } from '@japa/runner'
import {
  normalizeRecipient,
  normalizeRecipients,
  resolveNotifiableId,
  resolveNotifiableType,
} from '../src/utils/notifiable_resolver.ts'
import type { Notifiable } from '../src/contracts/notifiable.ts'

class TableUser {
  static table = 'users'
  id = 7
}

class Admin {
  id = 9
}

test.group('resolveNotifiableType', () => {
  test('prefers getNotificationType() over the model table', ({ assert }) => {
    class Declared extends TableUser {
      getNotificationType(): string {
        return 'members'
      }
    }

    assert.equal(resolveNotifiableType(new Declared()), 'members')
  })

  test('uses the model table over the class name', ({ assert }) => {
    assert.equal(resolveNotifiableType(new TableUser()), 'users')
  })

  test('falls back to the class name when there is no table', ({ assert }) => {
    assert.equal(resolveNotifiableType(new Admin()), 'Admin')
  })
})

test.group('resolveNotifiableId', () => {
  test('stringifies numeric ids', ({ assert }) => {
    assert.equal(resolveNotifiableId({ id: 42 }), '42')
  })

  test('prefers getNotificationId() over the primary key', ({ assert }) => {
    const notifiable = {
      id: 1,
      $primaryKeyValue: 2,
      getNotificationId: () => 'custom-3',
    }

    assert.equal(resolveNotifiableId(notifiable), 'custom-3')
  })

  test('reads the Lucid primary key when the id is not a plain property', ({ assert }) => {
    const notifiable = { $primaryKeyValue: 'a1b2' }

    assert.equal(resolveNotifiableId(notifiable), 'a1b2')
  })

  test('returns undefined when no id is available', ({ assert }) => {
    assert.isUndefined(resolveNotifiableId({ name: 'anonymous' }))
  })
})

test.group('normalizeRecipient', () => {
  test('normalizes Notifiable interface with getNotificationId', ({ assert }) => {
    const notifiable: Notifiable = {
      getNotificationId() {
        return 123
      },
      getNotificationType() {
        return 'User'
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, '123')
    assert.equal(normalized.type, 'User')
    assert.instanceOf(normalized.routes, Map)
    assert.equal(normalized.original, notifiable)
  })

  test('normalizes Notifiable with id property', ({ assert }) => {
    const notifiable = {
      id: 'user-456',
      constructor: { name: 'CustomUser' },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, 'user-456')
    assert.equal(normalized.type, 'CustomUser')
  })

  test('normalizes a model instance to its table and string id', ({ assert }) => {
    const normalized = normalizeRecipient(new TableUser())

    assert.equal(normalized.type, 'users')
    assert.equal(normalized.id, '7')
  })

  test('normalizes plain object without Notifiable interface', ({ assert }) => {
    const plainObject = {
      id: 789,
      email: 'test@example.com',
    }

    const normalized = normalizeRecipient(plainObject)

    assert.equal(normalized.id, '789')
    assert.exists(normalized.type)
    assert.equal(normalized.original, plainObject)
  })

  test('stores routeNotificationFor resolver in routes map', ({ assert }) => {
    const notifiable: Notifiable = {
      routeNotificationFor(channel: string) {
        return channel === 'mail' ? 'user@example.com' : null
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.isTrue(normalized.routes.has('__resolver__'))
    const resolver = normalized.routes.get('__resolver__') as Function
    assert.equal(resolver('mail'), 'user@example.com')
    assert.isNull(resolver('database'))
  })

  test('handles object without id', ({ assert }) => {
    const notifiable = {
      getNotificationType() {
        return 'Anonymous'
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, '0')
    assert.equal(normalized.type, 'Anonymous')
  })

  test('returns already normalized object unchanged', ({ assert }) => {
    const alreadyNormalized = {
      id: 'test-id',
      type: 'TestType',
      routes: new Map(),
      original: {},
    }

    const normalized = normalizeRecipient(alreadyNormalized)

    assert.equal(normalized, alreadyNormalized)
  })
})

test.group('normalizeRecipients', () => {
  test('normalizes single notifiable', ({ assert }) => {
    const notifiable = {
      id: 1,
      getNotificationType() {
        return 'User'
      },
    }

    const normalized = normalizeRecipients(notifiable)

    assert.isArray(normalized)
    assert.lengthOf(normalized, 1)
    assert.equal(normalized[0].id, '1')
  })

  test('normalizes array of notifiables', ({ assert }) => {
    const notifiables = [
      { id: 1, getNotificationType: () => 'User' },
      { id: 2, getNotificationType: () => 'Admin' },
      { id: 3, getNotificationType: () => 'Guest' },
    ]

    const normalized = normalizeRecipients(notifiables)

    assert.isArray(normalized)
    assert.lengthOf(normalized, 3)
    assert.equal(normalized[0].id, '1')
    assert.equal(normalized[1].id, '2')
    assert.equal(normalized[2].id, '3')
  })

  test('handles empty array', ({ assert }) => {
    const normalized = normalizeRecipients([])

    assert.isArray(normalized)
    assert.lengthOf(normalized, 0)
  })

  test('normalizes mixed types in array', ({ assert }) => {
    const notifiables: unknown[] = [
      { id: 1, getNotificationType: () => 'User' },
      { id: 'admin-2', constructor: { name: 'Admin' } },
    ]

    const normalized = normalizeRecipients(notifiables)

    assert.lengthOf(normalized, 2)
    assert.equal(normalized[0].id, '1')
    assert.equal(normalized[1].id, 'admin-2')
  })
})
