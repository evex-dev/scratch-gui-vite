import { Glob } from 'bun'
import path from 'node:path'
import { bundle } from 'lightningcss'
import * as fs from 'node:fs/promises'

for await (const entry of new Glob('src/**/*.css').scan()) {
  await fs.rename(entry, entry.replace('.css', '.module.css'))
}
