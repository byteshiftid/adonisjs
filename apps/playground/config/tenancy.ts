import { defineTenancyConfig } from '@byteshiftid/adonisjs-tenant'
import Tenant from '#models/tenant'

const tenancyConfig = defineTenancyConfig({
  /**
   * The default tenant resolver strategy.
   * Available strategies: 'subdomain' | 'header' | 'jwt' | 'path'
   */
  default: 'header',

  /**
   * Return a 404 when a request does not resolve to a tenant.
   * @default true
   */
  failOnMissing: true,

  /**
   * Configured tenant resolver strategies.
   * Each key is a strategy name that maps to a resolver type and options.
   */
  tenants: {
    header: {
      resolver: 'header',
      options: {
        /**
         * The HTTP header that carries the tenant identifier. Headers are
         * untrusted input: the lookup below decides whether the tenant exists.
         */
        header: 'X-Tenant-ID',

        lookup: async (tenantId) => {
          const tenant = await Tenant.find(tenantId)
          return tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null
        },
      },
    },
  },
})

export default tenancyConfig
