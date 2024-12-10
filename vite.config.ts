import { defineConfig, ResolvedConfig, type Plugin } from 'vite'
import { reactVirtualized } from './plugins/reactVirtualized.ts'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as url from 'node:url'
import { existsSync } from 'node:fs'
import { build } from 'esbuild'

const scratchGuiPlugin = (): Plugin => {
  let resolvedConfig!: ResolvedConfig
  return {
    name: 'vite-plugin-scratch',
    async configResolved(config) {
      resolvedConfig = config
    },
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
      const targetUrl = `/${path.relative(resolvedConfig.root, resolvedPath).replace(/\\/g, '/')}`
      if (prefix === 'arraybuffer') {
        return {
          code: `import url from '${targetUrl}'\nexport default await fetch(url).then(res => res.arrayBuffer())`
        }
      } else if (prefix === 'raw') {
        return {
          code: `import url from '${targetUrl}'
          export default await fetch(url).then(res => res.text())`
        }
      } else if (prefix === 'base64') {
        return {
          code: `import url from '${targetUrl}'
          const blob = await fetch(url).then(res => res.blob())
          const reader = new FileReader()
          const promise = new Promise((resolve, reject) => {
            // dataurl to base64
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.onerror = reject
          })
          reader.readAsDataURL(blob)
          export default await promise`
        }
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
       if (importer.includes('node_modules')) {
        console.log(name.join('.'))
       }
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
        if (!existsSync(noModuleId)) {
          return
        }
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

const CJS_PATCHES = [
  'css-vendor',
  '@scratch/paper',
  'color-convert'
]
const cjs = (): Plugin => {
  return {
    name: 'vite-plugin-cjs',
    async load(id, options) {
      for (const patch of CJS_PATCHES) {
        if (id.includes(`node_modules/${patch}`)) {
          const built = await build({
            entryPoints: [id.replace(/\?.*/, '')],
            write: false,
            bundle: true,
            format: 'esm'
          })
          return {
            code: built.outputFiles[0].text
          }
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [
    cjs(),
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
