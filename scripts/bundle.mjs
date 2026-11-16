// node scripts/bundle.mjs [--version V] [--out DIR]
// Writes <out>/quran-database-<version>/data/<slug>.csv, the whole translation rebuilt from data/<slug>/NNN.csv,
// next to a copy of <slug>.meta.json. This is the content of a release's zip asset.
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { readCanonicalText } from './convert.mjs'

export function bundle(rootDir, outDir, requestedVersion) {
  const slugs = readdirSync(join(rootDir, 'data'))
    .filter((name) => name.endsWith('.meta.json'))
    .map((name) => name.slice(0, -'.meta.json'.length))
    .sort()
  if (slugs.length === 0) throw new Error(`no data/<slug>.meta.json found under ${rootDir}`)
  const metas = slugs.map((slug) => JSON.parse(readFileSync(join(rootDir, 'data', `${slug}.meta.json`), 'utf8')))
  const versions = [...new Set(metas.map((meta) => meta.version))]
  if (versions.length !== 1) throw new Error(`meta.json versions differ: ${versions.join(', ')}`)
  const [version] = versions
  if (requestedVersion && requestedVersion !== version) throw new Error(`data/ is at ${version}, not ${requestedVersion}`)
  const target = join(outDir, `quran-database-${version}`)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(join(target, 'data'), { recursive: true })
  slugs.forEach((slug, index) => {
    const csv = readCanonicalText(rootDir, slug)
    const hash = createHash('sha256').update(csv).digest('hex')
    if (hash !== metas[index].sha256) throw new Error(`${slug}: sha256 ${hash} does not match meta.json ${metas[index].sha256}`)
    writeFileSync(join(target, 'data', `${slug}.csv`), csv)
    copyFileSync(join(rootDir, 'data', `${slug}.meta.json`), join(target, 'data', `${slug}.meta.json`))
  })
  return target
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { version: { type: 'string' }, out: { type: 'string', default: 'out' } } })
    const rootDir = fileURLToPath(new URL('..', import.meta.url))
    console.log(`wrote ${bundle(rootDir, resolve(values.out), values.version)}`)
  } catch (error) {
    console.error(`bundle failed: ${error.message}`)
    process.exit(1)
  }
}
