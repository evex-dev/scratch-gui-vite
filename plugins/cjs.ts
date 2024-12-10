import type { Plugin } from 'vite'
import * as esbuild from 'esbuild'
import * as path from 'node:path'

const CJS_PATCHES = [
  '@scratch/paper',
  'parse-color',
  'react-popover'
]

const cached = new Map<string, string>()
const getBuild = async (id: string) => {
  if (cached.has(id)) {
    return cached.get(id)
  }
  const result = await esbuild.build({
    entryPoints: [id],
    format: 'esm',
    platform: 'browser',
    target: 'esnext',
    bundle: true,
    write: false,
    logLevel: 'error',
  })
  const code = result.outputFiles?.[0].text
  if (!code) {
    throw result.errors[0]
  }
  cached.set(id, code)
  return code
}

export const cjsPlugin = (): Plugin => {
  return {
    name: 'vite-plugin-cjs',
    async load(id, options) {
      let isPatch = false
      for (const patch of CJS_PATCHES) {
        if (id.includes(`node_modules/${patch}`)) {
          isPatch = true
          break
        }
      }
      if (!isPatch) {
        return
      }
      const code = await getBuild(id)
      if (!code) {
        return
      }
      console.log('patched', id)
      return {
        code
      }
    },
  }
}