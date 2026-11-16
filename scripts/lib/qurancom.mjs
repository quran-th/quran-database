import { MARKER, footnoteId } from './markers.mjs'

const SUP = /<sup foot_note=(\d+)>(\d+)<\/sup>/g

/**
 * A marker becomes Quran.com's inline `<sup foot_note=ID>n</sup>` only when the verse has
 * footnote n; an unmatched marker stays as stored "(*n*)". Every footnote is listed in
 * `foot_notes`, including one that has no marker in the text.
 */
export function toQuranComTranslation(sourceId, verse) {
  const numbers = new Set(verse.footnotes.map((note) => note.number))
  const text = verse.translation.replace(MARKER, (marker, digits) => {
    const number = Number(digits)
    if (!numbers.has(number)) return marker
    return `<sup foot_note=${footnoteId(sourceId, verse.surah, verse.ayah, number)}>${number}</sup>`
  })
  const footNotes = {}
  for (const note of verse.footnotes) footNotes[footnoteId(sourceId, verse.surah, verse.ayah, note.number)] = note.text
  return { verse_key: `${verse.surah}:${verse.ayah}`, resource_id: sourceId, text, foot_notes: footNotes }
}

export function toQuranCom(source, slug, verses) {
  const document = {
    meta: {
      translation_name: source.name,
      author_name: source.author,
      language_name: source.language === 'th' ? 'thai' : source.language,
      slug,
    },
    translations: verses.map((verse) => toQuranComTranslation(source.id, verse)),
  }
  return JSON.stringify(document, null, 2) + '\n'
}

/** Inverse of the marker rewrite, used by verification. */
export function restoreMarkers(text) {
  return text.replace(SUP, (_, id, number) => `(*${number}*)`)
}

export function supFootnoteIds(text) {
  return [...text.matchAll(SUP)].map((match) => ({ id: Number(match[1]), number: Number(match[2]) }))
}
