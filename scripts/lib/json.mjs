export function jsonMeta(source, slug) {
  return {
    sourceId: source.id,
    slug,
    name: source.name,
    shortName: source.shortName,
    author: source.author,
    language: source.language,
  }
}

/** Generic map keyed by "sura:aya" in mushaf order; text is stored exactly, markers included. */
export function toGenericJson(source, slug, verses) {
  const map = {}
  for (const verse of verses) {
    map[`${verse.sura}:${verse.aya}`] = {
      translation: verse.translation,
      footnotes: verse.footnotes.map((note) => ({ number: note.number, text: note.text })),
    }
  }
  return JSON.stringify({ meta: jsonMeta(source, slug), verses: map }, null, 2) + '\n'
}
