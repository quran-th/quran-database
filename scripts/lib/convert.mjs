import { toGenericJson } from './json.mjs'
import { toQuranCom } from './qurancom.mjs'
import { toQuranEncCsv } from './quranenc.mjs'
import { toTanzil } from './tanzil.mjs'

export const FORMATS = ['quranenc', 'tanzil', 'qurancom', 'json']
const TANZIL_SOURCE = 'Open Thai Quran Project'
const LANGUAGE_NAMES = { th: 'Thai' }

export function outputPath(format, slug, language) {
  return {
    quranenc: `${slug}/quranenc/${slug}.csv`,
    tanzil: `${slug}/tanzil/${language}.${slug}.txt`,
    qurancom: `${slug}/quran-com/${slug}.json`,
    json: `${slug}/json/${slug}.json`,
  }[format]
}

/**
 * Builds the requested formats from one source's meta.json and parsed canonical verses.
 * @returns {{ files: Record<string, string>, tanzilAdjustments: object|null }} paths relative to the output dir
 */
export function convertSource(meta, verses, formats = FORMATS) {
  const source = meta.source
  const files = {}
  let tanzilAdjustments = null
  for (const format of formats) {
    const path = outputPath(format, source.slug, source.language)
    if (format === 'quranenc') files[path] = toQuranEncCsv(verses)
    else if (format === 'qurancom') files[path] = toQuranCom(source, source.slug, verses)
    else if (format === 'json') files[path] = toGenericJson(source, source.slug, verses)
    else if (format === 'tanzil') {
      const tanzil = toTanzil(verses, {
        name: source.shortName ?? source.name,
        translator: source.author ?? source.name,
        language: LANGUAGE_NAMES[source.language] ?? source.language,
        id: `${source.language}.${source.slug}`,
        source: TANZIL_SOURCE,
      })
      files[path] = tanzil.content
      tanzilAdjustments = tanzil.adjustments
    } else throw new Error(`unknown format "${format}" (use ${FORMATS.join(', ')} or all)`)
  }
  return { files, tanzilAdjustments }
}
