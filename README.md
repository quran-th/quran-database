# quran-database

The latest Thai Quran translations of the **Open Thai Quran Project**, published as static files.
Each release is a git commit and tag, so you can see every change to the text with `git diff`.
The repository holds **one lossless file per source**. A converter script makes the
QuranEnc, Tanzil, Quran.com and generic JSON formats from it when you need them. The generator is
in this repository, so any release can be rebuilt from the same input.

> **The data files are not published yet.** The texts come from the King Fahd Complex (source 3)
> and the Tafsir Center for Quranic Studies' Al-Mukhtasar (source 4). They will be added here once
> the terms for redistributing them are settled, so this repository has no LICENSE file yet. This
> README describes the layout the files will have.

## What is in it

| Slug | API source id | Text | Footnotes |
|------|---------------|------|-----------|
| `king-fahd` | 3 | King Fahd Complex Thai translation, with footnotes | yes |
| `al-mukhtasar` | 4 | Al-Mukhtasar fi Tafsir al-Quran, Thai | none |

```
data/<slug>.csv             the canonical file: every verse and footnote, text exactly as stored
data/<slug>.meta.json       source info, version, counts, sha256 of the CSV, known data issues
changes/<version>.csv       the per-release diff, one row per changed canonical row
releases/<version>.md       release notes: what changed, every change beyond spelling listed verse by verse
releases/overrides.csv      optional manual notes/classes for the release being cut (see below)
CHANGELOG.md                newest first; a short section per release with counts and a link to its notes
scripts/                    exporter, verifier, converter and release helper (Node >= 20, no dependencies)
test/                       node:test unit tests and an offline API fixture
out/                        converter output (git-ignored)
```

Every file is UTF-8 without a BOM and uses LF line endings. Data files contain no timestamps. The
release version appears only in `meta.json`, `CHANGELOG.md` and `releases/<version>.md`.

## The canonical format: `data/<slug>.csv`

```
sura,aya,footnote,text
2,2,,คัมภีร์นี้ ไม่มีความสงสัยใด ๆ ในนั้น เป็นคำแนะนำสำหรับบรรดาผู้ยำเกรงเท่านั้น
2,3,,คือบรรดาผู้ศรัทธาต่อสิ่งเร้นลับ(*1*) และดำรงไว้ซึ่งการละหมาด และส่วนหนึ่งจากสิ่งที่เราได้ให้เป็นปัจจัยยังชีพแก่พวกเขานั้น พวกเขาก็บริจาค
2,3,1,หมายถึงสิ่งที่พ้นญาณวิสัยของมนุษย์ เช่น อัตตะของอัลลอฮฺ  มะลาอิกะฮฺของพระองค์ และสภาพของปรโลก ...
```

These are real King Fahd rows; the footnote row is shortened here. A field with a comma, a quote,
a line break or edge whitespace is quoted, for example `1,2,,"การสรรเสริญ ..., ..."`.

- There is **one row per verse**, with an empty `footnote` column. It is followed directly by that
  verse's **footnote rows**, where `footnote` is the footnote's number.
- Rows are in mushaf order: sura ascending, aya ascending, the verse row first, then its footnotes
  ascending by number. Each source has 6236 verse rows.
- `text` is the **byte-exact stored text**. Nothing is trimmed or normalised. Verse text keeps
  its inline footnote markers `(*n*)`, where `n` is the footnote's number **within the verse**
  (it starts at 1 in every verse).
- The file follows RFC 4180, written strictly:
  - each record ends with LF, and the file ends with a newline;
  - a field is quoted when it contains a comma, a double quote, CR or LF, or when it begins or
    ends with whitespace, so no line ends in raw whitespace;
  - quotes inside a field are doubled.
- Line breaks inside a text are kept as they are, quoted. Read the file with any RFC 4180 reader
  that accepts line breaks inside quoted fields, for example Python's
  `csv.DictReader(open(p, newline='', encoding='utf-8'))` or `csv-parse` in Node.
- **There is no Arabic column.** Importers bring their own Arabic text. The API's Arabic is not a
  plain mushaf text: it puts the basmala at the start of the first verse of every surah, so do
  not use it as a reference text.

### `data/<slug>.meta.json`

- `source`: `id`, `slug`, `name`, `shortName`, `author` and `language`, from the API.
- `version` and `previousVersion`. The exporter uses `previousVersion` to re-run a release.
- `verseCount`, `footnoteCount` and `sha256` (of `data/<slug>.csv`).
- `emptyTranslations`: verses published with empty text, only with `--allow-empty`.
- `footnoteMismatches`: verses whose markers and footnotes disagree (see "Known data issues").
- `embeddedLineBreaks`: rows whose text contains CR or LF. A verse row appears as `sura:aya` and a
  footnote row as `sura:aya:n`.

### `changes/<version>.csv`

```
source,sura,aya,footnote,old,new
king-fahd,2,197,,...old verse text...,...new verse text...
king-fahd,2,197,1,...old footnote 1...,...new footnote 1...
```

- There is one row per added, removed or changed canonical row, keyed by `(sura, aya, footnote)`.
  An empty `footnote` means the verse row.
- `old` and `new` hold the full text. An empty `old` means the row was added, and an empty `new`
  means it was removed.
- Because the encoding is exact, a release can be reverted from this file, and the exporter relies
  on that (see "Re-running a release").
- The first release of a source has no rows. `CHANGELOG.md` says "initial release".
- Edge case: a verse published as empty text with `--allow-empty` cannot be told apart from a
  missing verse in this file.

## Release notes: `releases/<version>.md`

The exporter writes the notes from the same row diff as `changes/<version>.csv`. Any change that
is not a plain spelling fix is declared there **explicitly, verse by verse**.

### How a change is classified

1. Each changed row (verse text or footnote) is split into **word tokens**. The tokens come from
   `new Intl.Segmenter('th', { granularity: 'word' })`, which is Node's built-in ICU.
   - Whitespace and punctuation are their own tokens.
   - A `(*n*)` marker is one atomic token.
   - A segment that holds any letter, mark or digit counts as a word, even when ICU calls it
     non-word-like, for example `ๆ` or `ฯ`.
2. The old and new tokens are diffed with an LCS. Each run of changed tokens is a **hunk**.
3. Each hunk gets exactly one class:

| Class | Label in the notes | When |
|-------|--------------------|------|
| `spelling` | แก้คำสะกด | one word changed into one word, with an edit distance (in code points) of at most 2 **and** at most 1/3 of the longer word's length |
| `punctuation` | วรรคตอน | only whitespace or punctuation changed, for example a space or a comma added or removed |
| `marker` | เชิงอรรถเครื่องหมาย | only `(*n*)` markers changed, possibly with whitespace |
| `wordChanged` | เปลี่ยนคำ | any other replacement of words |
| `wordsAdded` | เพิ่มคำ | words only on the new side |
| `wordsRemoved` | ลบคำ | words only on the old side |
| `rowAdded` | แถวใหม่ | a verse or footnote row that is new |
| `rowRemoved` | แถวที่ลบ | a verse or footnote row that was removed |

- A row whose hunks are all `spelling` or `punctuation` is a plain spelling fix. Any other class
  is a **declared** change.
- The rules lean conservative: when a hunk does not clearly fit `spelling`, it is declared.
- A misspelt word is often missing from ICU's dictionary. ICU can then split the text around it
  differently from the corrected text. For example, `ถูกล่ามด้วยโช่ตรวน` splits as
  `ถูก|ล่า|มด้วยโช่|ตรวน`, while the fix splits as `ถูก|ล่าม|ด้วย|โซ่|ตรวน`.
- For a hunk that holds only word tokens, the classifier therefore compares the old and new text
  character by character. The change must fall inside **one word of the corrected text**, and that
  word and the same span of the old text are checked with the spelling rule.
- A hunk whose characters did not change, and only split into words differently, is ignored.
- The test suite checks these real fixes as `spelling`: โช่ → โซ่, สรวงสรรค์ → สรวงสวรรค์ and
  เซาวาล → เชาวาล. A one-letter change in a short word can also pass as spelling, for example
  `เขา` → `เรา` (3 code points, distance 1). Record such a change with an override.

### What the notes contain

The notes come Thai first, with English sub-labels. They contain:

- per source, a table of hunks and affected verses for every class;
- the section **การแก้ไขที่ไม่ใช่คำสะกด (Changes beyond spelling)**. It lists every declared hunk
  with:
  - its reference, `2:197` or `2:197 เชิงอรรถ 1`;
  - its class;
  - `เดิม (old)` and `ใหม่ (new)` excerpts, with the changed words in `**bold**` and about 3
    words of context on each side. A short row is shown in full. Line breaks show as `⏎`, and
    `*` is escaped;
- the section **แก้คำสะกด (Spelling fixes)**, with one `ref: old -> new` line per spelling hunk.

For the first release of a source, the notes say "initial release, no changes".

The last line records `process.versions.node` and `process.versions.icu`. Word boundaries depend
on ICU, so regenerating the notes on a different Node or ICU version can move token boundaries
and change the excerpts or even a class. That is why the notes are generated once per release and
committed. Re-running a release on the same machine reproduces them byte for byte.

### Manual overrides: `releases/overrides.csv`

```
source,sura,aya,footnote,class,note
king-fahd,2,197,,,แก้ให้ตรงกับต้นฉบับภาษาอาหรับ
king-fahd,14,49,1,spelling,
```

- Each line names one changed row: `source` is the slug, and an empty `footnote` means the verse
  row.
- `class` is optional. When given, it reclassifies the row's hunks. Punctuation hunks are left
  alone unless the row has nothing else.
- `note` is shown next to the reference in the notes, together with "จัดประเภทเอง (manual class)"
  when the class was overridden. Use it to record why a wording change was made, or to correct a
  hunk the classifier misjudged.
- The exporter applies the file to the release it is generating. It **fails, writing nothing**,
  when:
  - an override names a row that did not change in that release;
  - a class is unknown;
  - a row is listed twice;
  - an override would turn a row addition or removal into anything else, or the reverse.
- The file has no version column, so empty it after the release is committed. Otherwise the next
  release fails on rows it does not change.

## Converting to other formats

```sh
npm run convert                                   # every format for every source into ./out
node scripts/convert.mjs --to tanzil --source king-fahd
node scripts/convert.mjs --to all --out /tmp/qt   # --to quranenc|tanzil|qurancom|json|all
```

The converter reads `data/<slug>.csv` and `data/<slug>.meta.json` and writes:

| `--to` | File |
|--------|------|
| `quranenc` | `out/<slug>/quranenc/<slug>.csv` |
| `tanzil` | `out/<slug>/tanzil/th.<slug>.txt` |
| `qurancom` | `out/<slug>/quran-com/<slug>.json` |
| `json` | `out/<slug>/json/<slug>.json` |

The output is deterministic: the same canonical files always give the same bytes. For Tanzil, the
converter prints the verses it adjusted.

### QuranEnc-style CSV

```
id,sura,aya,translation,footnotes
1,1,1,ด้วยพระนามของอัลลอฮฺ ผู้ทรงกรุณาปราณี ผู้ทรงเมตตาเสมอ,
```

- The columns are those of QuranEnc's own CSV download.
- `id` is the running verse number, from 1 to 6236.
- `translation` is the stored text with its `(*n*)` markers.
- `footnotes` holds the verse's footnotes as `[n] text`, joined by a single `\n`. This is how
  QuranEnc gives them.
- Quoting and line endings follow the canonical writer: LF, quoted only when needed.

**Import note:** footnotes inside a joined column are ambiguous when a footnote itself spans
lines. Use the canonical CSV when you need footnotes as data.

### Tanzil text

```
1|1|ด้วยพระนามของอัลลอฮฺ ผู้ทรงกรุณาปราณี ผู้ทรงเมตตาเสมอ
...
114|6|จากหมู่ญินและมนุษย์


# --------------------------------------------------------------------
#
#  Quran Translation
#  Name: ...
...
```

- There are 6236 lines in the form `sura|aya|text`, then two blank lines and a 10-line `#` block.
- This is the clean variant:
  - markers are removed without leaving a stray space;
  - line breaks become one space;
  - whitespace at the start and end is trimmed;
  - a literal `|` would become `/`, but no text contains one.

**Import note:** any Tanzil translation loader reads this file. If you parse it yourself, skip
blank lines and `#` lines, then split each line on the first two `|`.

### Quran.com v4 style JSON

```json
{
  "meta": { "translation_name": "...", "author_name": null, "language_name": "thai", "slug": "king-fahd" },
  "translations": [
    {
      "verse_key": "2:3",
      "resource_id": 3,
      "text": "คือบรรดาผู้ศรัทธาต่อสิ่งเร้นลับ<sup foot_note=300200301>1</sup> และ...",
      "foot_notes": { "300200301": "หมายถึงสิ่งที่พ้นญาณวิสัยของมนุษย์ ..." }
    }
  ]
}
```

- `translations` has the same shape as the items of Quran.com's
  `GET /api/v4/quran/translations/{id}?fields=verse_key&foot_notes=true`.
- `resource_id` is the API source id.
- A marker whose footnote exists becomes `<sup foot_note=ID>n</sup>`. A marker without a
  footnote stays `(*n*)`, so no `<sup>` points at a missing note. A footnote without a marker
  still appears in `foot_notes`.
- **Footnote ids** are `sourceId × 100000000 + sura × 100000 + aya × 100 + n`. For example,
  footnote 1 of 2:3 in source 3 is `300200301`.
  - Ids depend only on the verse reference and footnote number, so they are stable across
    releases, and fixing one verse never renumbers another.
  - Footnote numbers must be 1 to 99; the largest today is 17.

**Import note:** turning every `<sup foot_note=ID>n</sup>` back into `(*n*)` gives the stored text
exactly.

### Generic JSON

```json
{
  "meta": { "sourceId": 3, "slug": "king-fahd", "name": "...", "shortName": "...", "author": null, "language": "th" },
  "verses": {
    "1:1": { "translation": "...", "footnotes": [] },
    "2:3": { "translation": "...(*1*)...", "footnotes": [{ "number": 1, "text": "..." }] }
  }
}
```

The keys are in mushaf order, the text is lossless and the file is indented with 2 spaces. Look up
a verse with `data.verses["2:255"]`. This file converts back to the canonical CSV byte for byte,
and `npm run verify` checks that.

## Known data issues (recorded here, to be fixed in the source database)

These belong to the API's database. They should be fixed there, not in this repository. The next
export then picks up the fixes.

- **Footnote marker mismatches:** in 313 King Fahd verses, the `(*n*)` markers do not match the
  footnote numbers. A marker may have no footnote, or a footnote may have no marker.
  - By default the export **refuses** such data. This release was cut with
    `--allow-footnote-mismatch`.
  - `data/king-fahd.meta.json` → `footnoteMismatches` lists every affected verse, for example
    `"4:63: marker 6 has no footnote; footnote 1 has no marker"`.
  - A verse that repeats a marker for the same footnote is not counted as a mismatch.
- **Embedded line breaks:** 9 King Fahd verses and 2 King Fahd footnotes contain CRLF. They are
  kept losslessly, quoted, in the canonical CSV and listed in `embeddedLineBreaks`. The verses are
  5:76, 6:6, 33:47, 33:62, 36:2–5 and 49:9, and the footnotes are 5:76:1 and 57:25:2.
- **Edge whitespace:** 48 King Fahd translations, 50 King Fahd footnotes and 24 Al-Mukhtasar
  translations begin or end with whitespace, often a tab.
- **Basmala in the Arabic:** the API's Arabic puts the basmala inside the first verse of each
  surah. Arabic is not exported, but any consumer of the API should know this.

## Cutting a release

Export only **after** the corpus and database fixes have been applied to the real (production)
database. The public API at `https://api.quran.in.th` is edge-cached for up to one hour. The
exporter bypasses that cache by adding a unique `_cb=<token>` query parameter to every request, so
you do not need to wait.

Versions are `YYYY.MM.DD`. A second release on the same day is `YYYY.MM.DD.2`, then `.3`, and so on.

```sh
npm run release -- [version] [export flags]   # prints the commands below; runs nothing
node scripts/export.mjs --version 2026.11.14  # add --allow-footnote-mismatch while the 313 refs are unfixed
npm run verify
git status --short                            # review data/, changes/, releases/<version>.md, CHANGELOG.md
git add -A && git commit -m "Release 2026.11.14"
git tag v2026.11.14
```

Read `releases/<version>.md` before you commit. Every change beyond spelling is listed there, and
`releases/overrides.csv` records notes or corrections. None of the scripts push anything.

### What the export does

1. It fetches `GET /translation-sources` and, for each source and surah,
   `GET /surahs/:id?sourceId=N&offset=..&limit=50`. Pages are 50 verses, because the API answers
   500 for `limit=100` on long surahs. It waits about 150 ms before each request, makes up to 3
   attempts with backoff, and runs 4 requests in parallel (`--concurrency N`).
2. It validates each source:
   - 114 surahs and 6236 verses;
   - verse numbers contiguous in every surah and matching `verses_count`;
   - Arabic text present in the API response;
   - no empty translation (`--allow-empty` overrides this and lists them);
   - every `(*n*)` marker has footnote `n` and every footnote has a marker
     (`--allow-footnote-mismatch` overrides this and lists them);
   - footnote numbers unique and between 1 and 99, and no empty footnote.

   If any check fails, it prints every problem, writes **nothing**, and exits 1.
3. It builds the files in memory:
   - `data/<slug>.csv` and `data/<slug>.meta.json`;
   - the diff against the previous release in `data/`, which becomes `changes/<version>.csv` and
     `releases/<version>.md` (after `releases/overrides.csv` is applied);
   - the `CHANGELOG.md` section.

   Then it writes them.

Options:

- `--sources 3,4` chooses which sources to export. A source not listed above gets the slug
  `source-<id>`.
- `--api URL` points the exporter at another API.
- `--from-fixture DIR` reads API-shaped JSON from disk instead of the network.
- `--out DIR` writes to a folder other than this repository.
- `--test-expected-counts S,V` relaxes the 114/6236 expectation. The exporter accepts it only
  together with `--from-fixture`:

```sh
node scripts/export.mjs --version 2026.11.14 --from-fixture test/fixtures/api --test-expected-counts 3,14 --out /tmp/qt
node scripts/verify.mjs --root /tmp/qt --test-expected-counts 3,14
```

### Re-running a release

Running the export again with the same version and input produces byte-identical files, so
`git status` stays clean.

- If the input has changed, the exporter still diffs against the **previous** release, not the
  version being replaced. It rebuilds that baseline by reverting the existing
  `changes/<version>.csv`.
- The `## <version>` section in `CHANGELOG.md` and `releases/<version>.md` are replaced, never
  duplicated.
- A re-run must use the same `--sources` as the original run.
- The exporter refuses a version older than the one already in `data/`.

### `npm run verify`

The verifier exits non-zero on any mismatch.

- **`data/` layout:** it may hold only `<slug>.csv` + `<slug>.meta.json` pairs.
- **Canonical CSV:**
  - a strict RFC 4180 parse, which rejects bare quotes, unterminated fields, unequal field counts,
    a BOM or a missing final newline;
  - mushaf order, with each verse row before its footnotes and footnotes ascending;
  - contiguous ayat and 114/6236;
  - the file is byte-identical to the canonical writer's output for its own content;
  - counts, `sha256`, `footnoteMismatches`, `emptyTranslations` and `embeddedLineBreaks` match
    `meta.json`.
- **Every converter, run in memory, with its output re-parsed:**
  - QuranEnc CSV: field and row counts, running ids, text, and the footnotes column;
  - Tanzil: one `sura|aya|text` line per verse with exactly 2 pipes and no trailing whitespace,
    the clean text, and the 10-line trailer;
  - Quran.com: JSON parse, verse count, `<sup>` back to `(*n*)`, `foot_notes`, and no dangling
    `<sup>`;
  - generic JSON: verse count and meta.
- **Round trip:** canonical → JSON → canonical gives the same bytes.
- **Release files:** every `changes/*.csv` parses, `releases/overrides.csv` (if present) is
  well-formed, and each version in `data/` has a `CHANGELOG.md` section and a
  `releases/<version>.md`.

## Development

```sh
npm test                 # node --test; offline, using test/fixtures/api
```

The fixture is real API output for surahs 1, 108 and 112 of sources 3 and 4. A few verses were
edited to add edge cases: a comma and quotes, CRLF, a trailing tab, a leading space, and a
multi-line footnote.

## Format notes (what was verified, and where)

These were checked on 2026-11-14 against the live documentation and real published files.

**QuranEnc**

- API documentation: https://quranenc.com/en/home/api/
- Real API responses:
  - https://quranenc.com/api/v1/translation/sura/english_saheeh/2
  - https://quranenc.com/api/v1/translation/aya/thai_rwwad/2/3

  What they show:
  - The fields are `id, sura, aya, arabic_text, translation, footnotes`. All values are strings,
    and `id` is the running verse number (2:1 has id 8).
  - `footnotes` is `[n] text` per footnote, joined by `\n`, with no dash after the bracket.
  - QuranEnc numbers its markers per surah and writes them inline as `[n]`.
- Real CSV download: https://quranenc.com/en/home/d/csv/english_saheeh, saved as
  `english_saheeh_v1.1.2-csv.1.csv`, linked from https://quranenc.com/en/browse/thai_rwwad.
  What it shows:
  - The header is `id,sura,aya,translation,footnotes`, with no `arabic_text`.
  - The first row is a quoted multi-line `Translation Info:` block, which includes a last-update
    timestamp.
  - Records end in CRLF, while line breaks inside the footnotes field are LF.
  - Every text field is quoted, even when empty.
- **What the converter does:**
  - It uses the download's column set.
  - It leaves out the info row and its timestamp.
  - It uses LF line endings and quotes only when needed, as the canonical writer does.
  - It keeps the stored per-verse `(*n*)` markers instead of QuranEnc's per-surah `[n]`, so the
    text stays lossless.

  To match the download exactly, convert the line endings to CRLF and add their info row.

**Tanzil**

- Real files:
  - https://tanzil.net/trans/?transID=th.thai&type=txt-2 (Thai, King Fahad Quran Complex)
  - https://tanzil.net/trans/?transID=en.sahih&type=txt-2
- What they show:
  - UTF-8 without a BOM, LF line endings, and 6236 lines of `sura|aya|text`.
  - Then 2 blank lines and an 11-line trailer: a rule line of `#` and 68 dashes, `#`,
    `#  Quran Translation`, `#  Name:`, `#  Translator:`, `#  Language:`, `#  ID:`,
    `#  Last Update:`, `#  Source:`, `#`, and the rule line again.
  - There is no copyright line and no URL line.
- **What the converter does differently:**
  - It leaves out `Last Update:`, because data files carry no dates, so the trailer has 10 lines.
  - `Source:` is `Open Thai Quran Project`.
  - It adds no copyright line, because licensing is undecided.

**Quran.com API v4**

- Documentation: https://api-docs.quran.foundation/docs/content_apis_versioned/translation. It
  lists `translations[]` with an optional `foot_notes` object mapping keys to text, and `meta`
  with `translation_name`, `author_name` and `filters`.
- Real responses:
  - https://api.quran.com/api/v4/quran/translations/20?verse_key=2:3&foot_notes=true
    → `{"resource_id":20,"text":"Who believe in the unseen, establish prayer,<sup foot_note=195938>1</sup> and spend…","foot_notes":{"195937":"…","195938":"…"}}`.
    A verse without footnotes has `"foot_notes":{}`.
  - https://api.quran.com/api/v4/verses/by_key/2:3?translations=20 shows the same inline
    `<sup foot_note=ID>n</sup>`, with no quotes around the attribute value and `n` counted per
    verse.
  - https://api.quran.com/api/v4/foot_notes/195938 → `{"foot_note":{"id":195938,"text":…}}`.
  - https://api.quran.com/api/v4/resources/translations lists `id, name, author_name, slug, language_name`
    for each translation. Thai King Fahad is id 51, which has no footnotes on Quran.com.
- **What the converter does differently:**
  - `meta` adds `language_name` and `slug`, both taken from the `/resources/translations` entry.
  - It leaves out `translation_id`, because `resource_id` already carries the source id.
  - It leaves out `version`, because the version is in `meta.json`.
  - Item keys are in the order `verse_key, resource_id, text, foot_notes`.
  - Footnote ids are this project's own and do not refer to Quran.com footnotes.
