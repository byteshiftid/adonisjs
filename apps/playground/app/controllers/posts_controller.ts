import Post from '#models/post'
import { createPostValidator } from '#validators/post'
import type { HttpContext } from '@adonisjs/core/http'

export default class PostsController {
  /**
   * Lists posts for the resolved tenant. `TenantScope` adds the tenant
   * predicate, so rows of other tenants never leave the database.
   */
  async index() {
    const posts = await Post.query().orderBy('id', 'asc')

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      tenantId: post.tenant_id,
    }))
  }

  /**
   * Creates a post in the resolved tenant. `TenantScope` fills `tenant_id`
   * from the active context on create.
   */
  async store({ request, response }: HttpContext) {
    const { title } = await request.validateUsing(createPostValidator)
    const post = await Post.create({ title })

    response.status(201)
    return { id: post.id, title: post.title, tenantId: post.tenant_id }
  }
}
