import { basename, join } from 'node:path'

/**
 * Directory holding the `.stub` templates used by the configure hook and
 * commands. In source this module lives inside `stubs/`. In the published
 * build tsdown hoists it into a shared chunk at the `build/` root, while
 * `copy:templates` places the templates in `build/stubs/`.
 */
export const stubsRoot =
  basename(import.meta.dirname) === 'stubs'
    ? import.meta.dirname
    : join(import.meta.dirname, 'stubs')
