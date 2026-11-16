import { stripMarkers } from './markers.mjs'

const RULE = '# --------------------------------------------------------------------'

/**
 * Tanzil lines are single-line and have no footnotes, so the text loses its markers, line breaks
 * become one space, edge whitespace is trimmed and a literal "|" (the field separator) becomes "/".
 * Each adjustment is reported by verse ref.
 */
export function tanzilText(translation) {
  const stripped = stripMarkers(translation)
  const singleLine = stripped.replace(/\r\n|\r|\n/g, ' ')
  const trimmed = singleLine.trim()
  const text = trimmed.replaceAll('|', '/')
  return {
    text,
    newlineReplaced: singleLine !== stripped,
    whitespaceTrimmed: trimmed !== singleLine,
    pipeReplaced: text !== trimmed,
  }
}

// Same trailer layout as tanzil.net translation files, minus "Last Update": the release
// date lives only in metadata.json and CHANGELOG.md.
export function tanzilTrailer({ name, translator, language, id, source }) {
  return [
    '',
    '',
    RULE,
    '#',
    '#  Quran Translation',
    `#  Name: ${name}`,
    `#  Translator: ${translator}`,
    `#  Language: ${language}`,
    `#  ID: ${id}`,
    `#  Source: ${source}`,
    '#',
    RULE,
  ]
}

/** @returns {{ content: string, adjustments: { newlinesReplaced: string[], whitespaceTrimmed: string[], pipesReplaced: string[] } }} */
export function toTanzil(verses, info) {
  const adjustments = { newlinesReplaced: [], whitespaceTrimmed: [], pipesReplaced: [] }
  const lines = verses.map((verse) => {
    const ref = `${verse.surah}:${verse.ayah}`
    const result = tanzilText(verse.translation)
    if (result.newlineReplaced) adjustments.newlinesReplaced.push(ref)
    if (result.whitespaceTrimmed) adjustments.whitespaceTrimmed.push(ref)
    if (result.pipeReplaced) adjustments.pipesReplaced.push(ref)
    return `${verse.surah}|${verse.ayah}|${result.text}`
  })
  return { content: [...lines, ...tanzilTrailer(info)].join('\n') + '\n', adjustments }
}

/** Strict reader for verification: verse lines first, then the blank lines and "#" trailer. */
export function readTanzil(content) {
  if (!content.endsWith('\n')) throw new Error('tanzil file does not end with a newline')
  if (content.includes('\r')) throw new Error('tanzil file contains a CR')
  const lines = content.slice(0, -1).split('\n')
  const verses = []
  let index = 0
  for (; index < lines.length && lines[index] !== ''; index++) {
    const fields = lines[index].split('|')
    if (fields.length !== 3) throw new Error(`line ${index + 1} has ${fields.length} fields`)
    const [surah, ayah, text] = fields
    if (!/^[1-9]\d*$/.test(surah) || !/^[1-9]\d*$/.test(ayah)) throw new Error(`line ${index + 1} has a bad reference`)
    if (/\s$/.test(text)) throw new Error(`line ${index + 1} ends in whitespace`)
    verses.push({ surah: Number(surah), ayah: Number(ayah), text })
  }
  const trailer = lines.slice(index)
  if (trailer[0] !== '' || trailer[1] !== '' || trailer.slice(2).some((line) => !line.startsWith('#'))) {
    throw new Error('tanzil trailer is not two blank lines followed by "#" lines')
  }
  return { verses, trailer: trailer.slice(2) }
}
