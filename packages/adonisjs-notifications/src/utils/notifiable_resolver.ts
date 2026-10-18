import type { Notifiable, NormalizedNotifiable } from '../contracts/notifiable.ts'

/**
 * Discriminator stored in `notifiable_type` for a recipient.
 *
 * Every write path (notification and delivery rows) and every read path (inbox, unread
 * counts, mark-as-read, metrics, fakes) must derive it here, so they always agree.
 * Precedence: `getNotificationType()`, then the model's table, then the class name.
 */
export function resolveNotifiableType(notifiable: object): string {
  const declared = (notifiable as Notifiable).getNotificationType?.()
  const ctor = notifiable.constructor as { table?: unknown; name?: string } | undefined
  const table = typeof ctor?.table === 'string' ? ctor.table : undefined

  return declared ?? table ?? ctor?.name ?? 'Object'
}

/**
 * Identifier stored in `notifiable_id`, always as a string. Numbers are stringified so that a
 * SQLite column binds and compares them the same way on write and read.
 * Precedence: `getNotificationId()`, then the Lucid primary key, then `id`.
 */
export function resolveNotifiableId(notifiable: object): string | undefined {
  const obj = notifiable as Notifiable & { $primaryKeyValue?: unknown; id?: unknown }
  const id = obj.getNotificationId?.() ?? obj.$primaryKeyValue ?? obj.id

  return id === undefined || id === null ? undefined : String(id)
}

/**
 * Normalize a single recipient into a consistent shape.
 * Handles: Notifiable interface, plain objects, already-normalized objects.
 */
export function normalizeRecipient(notifiable: unknown): NormalizedNotifiable {
  // Already normalized
  if (
    typeof notifiable === 'object' &&
    notifiable !== null &&
    'id' in notifiable &&
    'type' in notifiable &&
    'routes' in notifiable &&
    'original' in notifiable
  ) {
    return notifiable as NormalizedNotifiable
  }

  // Notifiable interface
  if (typeof notifiable === 'object' && notifiable !== null) {
    const routes = new Map<string, unknown>()

    // Pre-populate routes from routeNotificationFor if available
    if (
      'routeNotificationFor' in notifiable &&
      typeof notifiable.routeNotificationFor === 'function'
    ) {
      routes.set('__resolver__', notifiable.routeNotificationFor.bind(notifiable))
    }

    return {
      id: resolveNotifiableId(notifiable) ?? '0',
      type: resolveNotifiableType(notifiable),
      routes,
      original: notifiable,
    }
  }

  // Fallback for primitives or unexpected values
  return {
    id: '0',
    type: 'unknown',
    routes: new Map(),
    original: notifiable,
  }
}

/**
 * Normalize one or many recipients into an array.
 */
export function normalizeRecipients(notifiable: unknown | unknown[]): NormalizedNotifiable[] {
  if (Array.isArray(notifiable)) {
    return notifiable.map(normalizeRecipient)
  }
  return [normalizeRecipient(notifiable)]
}
