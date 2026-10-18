import { configApp } from '@adonisjs/eslint-config'

export default [
  ...configApp(),
  {
    // Regenerated from the database on every migration run.
    ignores: ['database/schema.ts'],
  },
]
