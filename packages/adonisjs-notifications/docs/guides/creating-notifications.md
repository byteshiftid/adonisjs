# Creating Notifications

## Generate a notification

```bash
node ace make:notification InvoicePaid
```

Flags:

- `--queued` / `-q` — sets `shouldQueue = true`
- `--mail` / `-m` — adds `toMail()` method stub
- `--database` / `-d` — adds `toDatabase()` method stub

Generated file at `app/notifications/InvoicePaid.ts`.

## Notification class

```ts
import { Notification, MailMessage } from '@byteshiftid/adonisjs-notifications'

export default class InvoicePaid extends Notification {
  public shouldQueue = true
  public queue = 'notifications'
  public connection = 'redis'
  public category = 'billing'
  public priority = 'high'

  constructor(private invoice: { id: number; amount: number }) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail', 'database']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject(`Invoice #${this.invoice.id} Paid`)
      .greeting('Hello!')
      .line(`Your invoice for $${this.invoice.amount} has been paid.`)
      .action('View Invoice', `https://app.example.com/invoices/${this.invoice.id}`)
  }

  toDatabase(notifiable: unknown) {
    return {
      invoiceId: this.invoice.id,
      amount: this.invoice.amount,
      message: `Invoice #${this.invoice.id} paid`,
    }
  }

  shouldSend(notifiable: unknown, channel: string) {
    return channel !== 'mail' || (notifiable as any).emailVerified
  }

  delay(notifiable: unknown, channel: string) {
    if (channel === 'mail') {
      return '5m' // 5 minutes
    }
    return null
  }
}
```

## Base class reference

### Required

- `via(notifiable)` — return array of channel names

### Optional channel methods

- `toMail(notifiable)` — return `MailMessage` or `MailMessageOptions`
- `toDatabase(notifiable)` — return plain object for inbox storage
- `toLog(notifiable)` — return object/string for log channel

### Optional gates

- `shouldSend(notifiable, channel)` — return false to skip a channel
- `delay(notifiable, channel)` — return ms number or duration string like `'5m'`, `'1h'`, `'30s'`
- `routeNotificationFor(channel, notifiable)` — override route for this notification

### Optional serialization

- `serialize()` — return plain object for queue payload
- `static deserialize(data)` — reconstruct instance from queue payload

### Properties

- `shouldQueue` — whether to dispatch to queue
- `queue` — target queue name
- `connection` — queue connection name
- `category` — for preference filtering
- `priority` — for quiet-hours bypass
- `instanceId` — auto-generated UUID for deduplication

## MailMessage fluent builder

```ts
MailMessage.create()
  .subject('Welcome')
  .greeting('Hello!')
  .salutation('Regards, Team')
  .line('Thanks for joining us.')
  .line('Here is what you can do next.')
  .action('Get Started', 'https://example.com/start')
  .view('emails.welcome', { name: 'John' })
  .html('<p>Rich HTML</p>')
  .text('Plain text fallback')
  .from('noreply@example.com', 'Example App')
  .replyTo('support@example.com')
  .cc(['boss@example.com'])
  .bcc(['archive@example.com'])
  .mailer('transactional')
  .priority('high')
  .tags(['welcome', 'onboarding'])
  .with('extraData', 'value')
```

## Database messages

`toDatabase()` must return a plain object. This is stored as JSON in the `notifications` table.

```ts
toDatabase(notifiable) {
  return {
    title: 'Invoice Paid',
    body: `Invoice #${this.invoice.id} has been paid`,
    actionUrl: `/invoices/${this.invoice.id}`,
  }
}
```
