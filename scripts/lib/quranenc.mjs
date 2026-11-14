import { formatCsv, parseCsvObjects } from './csv.mjs'

// The column set of QuranEnc's own CSV download; their API additionally has arabic_text.
export const QURANENC_HEADER = ['id', 'sura', 'aya', 'translation', 'footnotes']

// QuranEnc's API and CSV give each footnote as "[n] text", one per line.
export function quranEncFootnotes(footnotes) {
  return footnotes.map((note) => `[${note.number}] ${note.text}`).join('\n')
}

/** `verses` must be in mushaf order; `id` is the running verse number. */
export function toQuranEncCsv(verses) {
  const rows = verses.map((verse, index) => [index + 1, verse.sura, verse.aya, verse.translation, quranEncFootnotes(verse.footnotes)])
  return formatCsv([QURANENC_HEADER, ...rows])
}

export function readQuranEncCsv(text) {
  return parseCsvObjects(text, QURANENC_HEADER)
}
