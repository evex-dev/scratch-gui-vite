import urls from './a.json' with { type: 'json' }


const result =await Promise.all(urls.map(url => {
    return new Promise(resolve => import(/* @vite-ignore */new URL(url, location.href)).then(module => resolve(['✅success', url, module])).catch(e => resolve([
    '❌failed',
    url,
    e,
    e.name,
    e.message,
    e.stack
  ])))
}))
result.sort((a, b) => urls.indexOf(a[0]) - urls.indexOf(b[0]))

for (const res of result) {
    console.log(...res)
}
