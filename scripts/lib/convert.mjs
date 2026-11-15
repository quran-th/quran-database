import { toGenericJson } from './json.mjs'
import { stripMarkers } from './markers.mjs'
import { toQuranCom } from './qurancom.mjs'
import { toQuranEncCsv } from './quranenc.mjs'
import { toTanzil } from './tanzil.mjs'

export const FORMATS = ['quranenc', 'tanzil', 'qurancom', 'json']
const TANZIL_SOURCE = 'Open Thai Quran Project'
const LANGUAGE_NAMES = { th: 'Thai' }

// Plain output gets its own file name so it never overwrites the default output in the same folder.
export function outputPath(format, slug, language, { plain = false } = {}) {
  const path = {
    quranenc: `${slug}/quranenc/${slug}.csv`,
    tanzil: `${slug}/tanzil/${language}.${slug}.txt`,
    qurancom: `${slug}/quran-com/${slug}.json`,
    json: `${slug}/json/${slug}.json`,
  }[format]
  return plain && path ? path.replace(/\.[^./]+$/, '.plain$&') : path
}

/**
 * Builds the requested formats from one source's meta.json and parsed canonical verses.
 * With `plain`, every "(*n*)" marker is removed first, from verse and footnote texts alike;
 * footnotes are still listed in the formats that carry them, just no longer anchored in the text.
 * @returns {{ files: Record<string, string>, tanzilAdjustments: object|null }} paths relative to the output dir
 */
export function convertSource(meta, canonicalVerses, formats = FORMATS, { plain = false } = {}) {
  const source = meta.source
  const verses = plain
    ? canonicalVerses.map((verse) => ({
        ...verse,
        translation: stripMarkers(verse.translation),
        footnotes: verse.footnotes.map((note) => ({ ...note, text: stripMarkers(note.text) })),
      }))
    : canonicalVerses
  const files = {}
  let tanzilAdjustments = null
  for (const format of formats) {
    const path = outputPath(format, source.slug, source.language, { plain })
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
