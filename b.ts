import { build } from 'bun'

const depMap = new Map<string, string>()

const deps: string[] = []

const built = await build({
  entrypoints: ['./http-entry.js'],
  plugins: [
    {
      name: 'esbuild-plugin-http',
      setup(build) {
        build.onResolve({ filter: /.+/ }, args => {
          if (args.kind === 'require-call') {
            return {
              path: args.path,
              external: true
            }
          }
          const path = new URL(args.path, URL.canParse(args.importer) ? args.importer : undefined).href
          depMap.set(path, args.importer)
          return {
            path,
            namespace: 'http'
          }
        })
        build.onLoad({ namespace: 'http', filter: /.+/ }, async args => {
          const code = await fetch(args.path).then(res => res.text())
          const rel = args.path.replace('http://localhost:5173', '')
          if (!deps.includes(rel)) {
            deps.push(rel)
          }
          return {
            contents: code,
            loader: 'js'
          }
        })
      }
    }
  ],
})

if (!built.success) {
  const error = built.logs[0]
  let file = error.position?.file
  while (true) {
    console.log(file)
    if (!file) {
      break
    }
    file = depMap.get(file)
  }
  throw error
}

await Bun.write('./sandbox/a.json', JSON.stringify(deps), { createPath: true })
