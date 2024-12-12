import { type Plugin } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as url from 'node:url'
import { existsSync } from 'node:fs'
import * as sass from 'sass'


/**
 * @author ChatGPT (gpt-4o)
 */
function convertSassToCss(sassCode: string): string {
  // 正規表現でSassの変数とその利用箇所を置き換え
  const variableRegex = /\$([a-zA-Z0-9_-]+):\s*([^;]+);/g;
  const usageRegex = /\$([a-zA-Z0-9_-]+)/g;

  // 変数の宣言部分をCSSカスタムプロパティに変換
  const cssVariables: Record<string, string> = {};
  sassCode = sassCode.replace(variableRegex, (_, name, value) => {
    cssVariables[name] = value.trim();
    return '';
  });

  // Sass変数の利用箇所をCSSカスタムプロパティに変換
  const cssCode = sassCode.replace(usageRegex, (_, name) => {
    return `var(--${name})`;
  });

  // CSSカスタムプロパティの定義をまとめて生成
  const customProperties = Object.entries(cssVariables)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join('\n');

  return `body {
${customProperties}
}

${cssCode}`;
}

export const scratchCSS = (): Plugin => {
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
          noModuleId = url.fileURLToPath(await import.meta.resolve?.(noModuleId) ?? '')
        }
        //console.log(id, noModuleId)
        if (!existsSync(noModuleId)) {
          return
        }
        const css = await fs.readFile(noModuleId, { encoding: 'utf-8' })
       // const cssCode = convertSassToCss(css)
        return css
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
