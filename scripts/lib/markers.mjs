// Stored verse texts mark footnotes inline as "(*n*)", where n is the footnote number within the verse.
export const MARKER = /\(\*(\d+)\*\)/g

/**
 * Removes markers without leaving a stray space: " (*1*)" before whitespace or text end goes
 * with its leading spaces, any other marker is removed on its own.
 */
export function stripMarkers(text) {
  return text.replace(/[ \t]*\(\*\d+\*\)(?=\s|$)/g, '').replace(MARKER, '')
}

// Ids are derived from the verse reference, not a running index, so fixing one verse's
// footnotes never renumbers footnotes elsewhere: sourceId*1e8 + surah*1e5 + ayah*100 + n.
export function footnoteId(sourceId, surah, ayah, number) {
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    throw new Error(`footnote number ${number} in ${surah}:${ayah} is outside 1..99`)
  }
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > 999) throw new Error(`ayah ${ayah} is outside 1..999`)
  return sourceId * 100_000_000 + surah * 100_000 + ayah * 100 + number
}
