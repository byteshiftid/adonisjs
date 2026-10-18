/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

router
  .group(() => {
    router.get('posts', [controllers.Posts, 'index'])
    router.post('posts', [controllers.Posts, 'store'])
  })
  .prefix('/api/v1')
  .use(middleware.tenant())

router
  .group(() => {
    router.post('invoices', [controllers.Invoices, 'store'])
    router.post('invoices/:id/approve', [controllers.Invoices, 'approve'])
  })
  .prefix('/api/v1')
  .use(middleware.auth())
