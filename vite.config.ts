import { defineConfig, ResolvedConfig, type Plugin } from 'vite'
import { reactVirtualized } from './plugins/reactVirtualized.ts'
import * as path from 'node:path'
import react from '@vitejs/plugin-react-swc'

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

export default defineConfig({
  plugins: [
    reactVirtualized(),
    scratchGuiPlugin(),
    react()
  ],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },
  esbuild: {
    define: {
      global: 'globalThis'
    },
    target: 'esnext'
  },
  build: {
    target: 'esnext'
  }
})
