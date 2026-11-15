import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parseCanonical } from './lib/canonical.mjs'
import { FORMATS, convertSource } from './lib/convert.mjs'

const surahDir = (slug) => `data/${slug}`

/** Joins data/<slug>/001.csv … 114.csv into the whole canonical CSV: one header, then the rows of every file in order. */
export function readCanonicalText(rootDir, slug) {
  const dir = join(rootDir, surahDir(slug))
  const names = readdirSync(dir).sort()
  if (names.length === 0) throw new Error(`${surahDir(slug)} has no surah files`)
  let header = null
  const bodies = names.map((name) => {
    if (!/^\d{3}\.csv$/.test(name)) throw new Error(`${surahDir(slug)}/${name} is not a surah file (NNN.csv)`)
    const text = readFileSync(join(dir, name), 'utf8')
    const end = text.indexOf('\n') + 1
    if (end === 0) throw new Error(`${surahDir(slug)}/${name} has no header line`)
    header ??= text.slice(0, end)
    if (text.slice(0, end) !== header) throw new Error(`${surahDir(slug)}/${name} has a different header`)
    return text.slice(end)
  })
  return header + bodies.join('')
}
const metaPath = (slug) => `data/${slug}.meta.json`

function publishedSlugs(rootDir) {
  const dataDir = join(rootDir, 'data')
  if (!existsSync(dataDir)) return []
  return readdirSync(dataDir)
    .filter((name) => name.endsWith('.meta.json'))
    .map((name) => name.slice(0, -'.meta.json'.length))
    .sort()
}

function writeFiles(outDir, files) {
  for (const [path, content] of Object.entries(files)) {
    const target = join(outDir, path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
}

const USAGE = `usage: node scripts/convert.mjs --to <${FORMATS.join('|')}|all> [--source <slug>|all] [--plain] [--out DIR]
  --to FORMAT      output format, or all
  --source SLUG    source to convert (default all)
  --plain          remove the (*n*) footnote markers from all texts; files get a .plain suffix
  --out DIR        output folder (default ./out)
  --root DIR       repository root holding data/ (default: this repository)`

/** Reads data/<slug>/*.csv + .meta.json and returns { files, tanzilAdjustments } for the requested formats. */
export function convertFromRepository(rootDir, slug, formats, options) {
  const meta = JSON.parse(readFileSync(join(rootDir, metaPath(slug)), 'utf8'))
  const verses = parseCanonical(readCanonicalText(rootDir, slug))
  return convertSource(meta, verses, formats, options)
}

function main() {
  const { values } = parseArgs({
    options: {
      to: { type: 'string' },
      source: { type: 'string', default: 'all' },
      out: { type: 'string', default: 'out' },
      plain: { type: 'boolean', default: false },
      root: { type: 'string' },
    },
  })
  if (!values.to) throw new Error(`--to is required\n${USAGE}`)
  const formats = values.to === 'all' ? FORMATS : [values.to]
  if (!formats.every((format) => FORMATS.includes(format))) throw new Error(`unknown format "${values.to}"\n${USAGE}`)
  const rootDir = resolve(values.root ?? fileURLToPath(new URL('..', import.meta.url)))
  const available = publishedSlugs(rootDir)
  const slugs = values.source === 'all' ? available : [values.source]
  if (slugs.length === 0) throw new Error(`no data/<slug>.meta.json found under ${rootDir}`)
  for (const slug of slugs) {
    if (!available.includes(slug)) throw new Error(`unknown source "${slug}" (available: ${available.join(', ')})`)
  }
  const outDir = resolve(values.out)
  for (const slug of slugs) {
    const { files, tanzilAdjustments } = convertFromRepository(rootDir, slug, formats, { plain: values.plain })
    writeFiles(outDir, files)
    for (const path of Object.keys(files)) console.log(`wrote ${join(outDir, path)}`)
    for (const [kind, refs] of Object.entries(tanzilAdjustments ?? {})) {
      if (refs.length) console.log(`  tanzil ${kind}: ${refs.length} (${refs.join(', ')})`)
    }
  }
}

// realpath: import.meta.url is resolved through symlinks (e.g. macOS /var -> /private/var), argv[1] is not.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(`convert failed: ${error.message}`)
    process.exit(1)
  }
}
