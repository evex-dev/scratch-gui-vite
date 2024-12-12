import { Glob } from 'bun'
import { convertSassToCss } from './plugins/scratchCSS'
import path from 'node:path'
import { bundle } from 'lightningcss'

for await (const entry of new Glob('src/**/*.css').scan()) {
  const code = await Bun.file(entry).text()
  const css = convertSassToCss(code)
  console.log(entry)
  await Bun.write(entry, css, {createPath: true})
  const transformed = bundle({
    filename: path.join('p', entry)
  }).code
}
