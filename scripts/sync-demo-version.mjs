import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const path = 'demo/index.html'
const html = readFileSync(path, 'utf8')
const updated = html.replace(
  /esm\.sh\/@rexa-developer\/tiks@[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?/g,
  `esm.sh/@rexa-developer/tiks@${version}`,
)
if (updated === html && !html.includes(`tiks@${version}`)) {
  console.error('sync-demo-version: no esm.sh pin found in demo/index.html')
  process.exit(1)
}
writeFileSync(path, updated)
console.log(`demo pinned to ${version}`)
