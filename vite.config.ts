import { defineConfig, type Plugin } from 'vite'
import { reactVirtualized } from './plugins/reactVirtualized.ts'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import * as url from 'node:url'

const scratchGuiPlugin = (): Plugin => {
  return {
    name: 'vite-plugin-scratch',
    async resolveId(source, importer, options) {
      if (!importer) {
        return
      }
      if (source.startsWith('!arraybuffer-loader!')) {
        const resolved = path.join(importer, '..', source.replace(/^!arraybuffer-loader!/, ''))
        return `arraybuffer:${encodeURIComponent(resolved)}`
      } else if (source.startsWith('!raw-loader!')) {
        const resolved = path.join(importer, '..', source.replace(/^!raw-loader!/, ''))
        return `raw:${encodeURIComponent(resolved)}`
      } else if (source.startsWith('!base64-loader!')) {
        const resolved = path.join(importer, '..', source.replace(/^!base64-loader!/, ''))
        return `base64:${encodeURIComponent(resolved)}`
      }
    },
    async load(id, options) {
      const [prefix, b64] = id.split(':')
      if (!(prefix === 'arraybuffer' || prefix === 'raw' || prefix === 'base64')) {
        return
      }
      const resolvedPath = decodeURIComponent(b64).replace(/\?.*$/, '')
      if (prefix === 'arraybuffer') {
        return {
          code: `import url from '${resolvedPath}'\nexport default await fetch(url).then(res => res.arrayBuffer())`
        }
      }
      return {
        code: `import url from '${resolvedPath}'
        export default url`
      }
    },
  }
}
const allModuleCSSPlugin = (): Plugin => {
  const cachedMap = new Map<string, string>()
  return {
    name: 'vite-plugin-all-css-as-module',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) {
        return
      }
      if (source.endsWith('.css?module')) {
        const names = source.split('.')
        const name = [...names.slice(0, -1), 'module', 'css']
        if (!source.startsWith('.')) {
          return name.join('.')
        }
        /*if (importer.includes('/gui')) {
            console.log(importer, 0, name.join('.'))
        }*/
        return path.join(importer, '..', name.join('.'))
      }
    },
    async load(id) {
      if (id.endsWith('.module.css')) {
        let noModuleId = id.replace(/\.module\.css$/, '.css')
        if (noModuleId.startsWith('react-tabs')) {
          noModuleId = url.fileURLToPath(import.meta.resolve(noModuleId))
        }
        //console.log(id, noModuleId)
        return await fs.readFile(noModuleId, { encoding: 'utf-8' })
      }
    }

   /* async transform(code, id) {
      const idKey = id.replace(/\?., '')
      if (id.endsWith('.css?main-css')) {
        return cachedMap.get(idKey)
      }
      if (id.endsWith('.css?module')) {
        let modules: Record<string, string> = {}
        const processed = await postcss([
          postcssModules({
            getJSON(_cssFilename, newModules, _outputFilename) {
              modules = newModules
            },
          })
        ]).process(code)
        cachedMap.set(idKey, processed.css)
        return {
          code: `export default ${JSON.stringify(modules)}`,
        }
      }
    }*/
  }
}
export default defineConfig({
  plugins: [
    allModuleCSSPlugin(),
    reactVirtualized(),
    scratchGuiPlugin()
  ],
  css: {
    modules: {
      scopeBehaviour: 'local'
    }
  }
})
