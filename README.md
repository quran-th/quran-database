# quran-database

Thai translations of the Quran from the [Open Thai Quran Project](https://quran.in.th), published as
plain, versioned data files.

- **One canonical CSV per translation.** Every verse and footnote, with the text exactly as stored.
- **Every release is a git tag** (`vYYYY.MM.DD`), so any change to the text shows up in `git diff`.
- **Release notes** separate plain spelling fixes from changes that alter wording, which are
  listed verse by verse.
- **A converter** produces QuranEnc, Tanzil, Quran.com and JSON formats from the canonical files.

> **Status:** the first release (`2026.11.14`) is being prepared. The data files and scripts
> described below will appear here with it.

## Translations

| Slug | Source id | Translation | Verses | Footnotes |
|------|-----------|-------------|--------|-----------|
| `king-fahd` | 3 | King Fahd Complex for the Printing of the Holy Quran, Thai translation with footnotes | 6236 | 7287 |
| `al-mukhtasar` | 4 | Al-Mukhtasar fi Tafsir al-Quran, Tafsir Center for Quranic Studies | 6236 | none |

## Repository layout

```
data/<slug>.csv          canonical translation file (one per source)
data/<slug>.meta.json    source info, version, counts, checksum, known data issues
changes/<version>.csv    every row changed in that release, old and new text
releases/<version>.md    release notes for that release
CHANGELOG.md             one short section per release, newest first
scripts/                 export, verify, convert and release scripts
test/                    unit tests and an offline fixture
```

## Data schemas

### `data/<slug>.csv`

| Column | Type | Description |
|--------|------|-------------|
| `sura` | integer, 1–114 | Surah number |
| `aya` | integer | Verse number within the surah |
| `footnote` | integer or empty | Empty for the verse text; the footnote number (1, 2, …) for a footnote row |
| `text` | string | The translation text, or the footnote text |

```csv
sura,aya,footnote,text
2,2,,คัมภีร์นี้ ไม่มีความสงสัยใด ๆ ในนั้น เป็นคำแนะนำสำหรับบรรดาผู้ยำเกรงเท่านั้น
2,3,,คือบรรดาผู้ศรัทธาต่อสิ่งเร้นลับ(*1*) และดำรงไว้ซึ่งการละหมาด ...
2,3,1,หมายถึงสิ่งที่พ้นญาณวิสัยของมนุษย์ ...
```

- **Order:** rows follow the mushaf order: surah, then verse. Each verse row comes first, followed
  directly by its footnote rows in ascending order. Each file has 6236 verse rows.
- **Footnote markers:** `(*n*)` in a verse text points to footnote `n` of that verse. Numbering
  starts at 1 in every verse.
- **No Arabic text:** there is no Arabic column. Join the rows to your own Arabic text on
  `(sura, aya)`.

### `data/<slug>.meta.json`

| Field | Description |
|-------|-------------|
| `source` | `id`, `slug`, `name`, `shortName`, `author`, `language` |
| `version`, `previousVersion` | This release and the one before it (`null` for the first) |
| `verseCount`, `footnoteCount` | Row counts in the CSV |
| `sha256` | Checksum of `data/<slug>.csv` |
| `emptyTranslations` | Verses published with empty text |
| `footnoteMismatches` | Verses whose `(*n*)` markers and footnotes do not match |
| `embeddedLineBreaks` | Rows whose text contains a line break (`sura:aya`, or `sura:aya:n` for a footnote) |

### `changes/<version>.csv`

| Column | Description |
|--------|-------------|
| `source` | Translation slug |
| `sura`, `aya`, `footnote` | The row that changed (an empty `footnote` means the verse text) |
| `old`, `new` | Full text before and after. An empty `old` means the row was added; an empty `new` means it was removed. |

### `releases/<version>.md`

The release notes count the changes for each translation by class:

- spelling;
- punctuation;
- footnote marker;
- word changed, words added, words removed;
- row added, row removed.

Every change that is not a plain spelling fix is listed explicitly, with the verse reference and an
old and a new excerpt.

## Encoding

- UTF-8 without a BOM, LF line endings, and a newline at the end of every file.
- CSV follows RFC 4180. A field is quoted when it contains a comma, a double quote or a line break,
  or when it starts or ends with whitespace. Quotes inside a field are doubled.
- A few texts contain line breaks inside a quoted field. Use a CSV reader that supports this, for
  example Python's `csv` module (`open(path, newline='', encoding='utf-8')`) or `csv-parse` in Node.
- Text is byte-exact: nothing is trimmed, normalized or re-spelled on export.
- No timestamps inside data files. The release version appears only in `meta.json`,
  `CHANGELOG.md` and the release notes.

## Setup

Requires Node.js 20 or later. There are no dependencies to install.

```sh
git clone https://github.com/quran-th/quran-database.git
cd quran-database
npm test           # offline unit tests
npm run verify     # checks the data files: order, counts, checksums, converter round trips
npm run convert    # writes every format for every translation into ./out (git-ignored)
```

Convert one translation to one format:

```sh
node scripts/convert.mjs --to tanzil --source king-fahd
# --to quranenc | tanzil | qurancom | json | all
```

| `--to` | Output | Notes |
|--------|--------|-------|
| `quranenc` | `out/<slug>/quranenc/<slug>.csv` | Columns `id,sura,aya,translation,footnotes`, as in QuranEnc's download |
| `tanzil` | `out/<slug>/tanzil/th.<slug>.txt` | `sura\|aya\|text` lines, footnote markers removed |
| `qurancom` | `out/<slug>/quran-com/<slug>.json` | Quran.com API v4 shape, markers as `<sup foot_note=ID>n</sup>` |
| `json` | `out/<slug>/json/<slug>.json` | `{ "verses": { "2:3": { "translation", "footnotes" } } }` |

## Contributing

**Translation corrections.** The data here is generated from the project's database. Don't edit
the files under `data/` by hand. Report a correction in either of two ways:

- open an issue with the verse reference (for example `2:255`, or `2:255 footnote 1`), the
  current text and the suggested fix;
- if you are a reviewer, propose it in the proofing tool at
  [contribute.quran.in.th](https://contribute.quran.in.th).

Approved corrections reach this repository with the next release, and they are listed in its
release notes.

**Code changes.** Fixes to the scripts, converters and documentation are welcome as pull requests.
Run `npm test` and `npm run verify` before you open one.

**Cutting a release (maintainers).** Run these after the fixes are live in the production
database:

```sh
node scripts/export.mjs --version 2026.11.14
npm run verify
git add -A && git commit -m "Release 2026.11.14" && git tag v2026.11.14
```

`npm run release` prints these commands for you and runs nothing.

## License

[MIT](LICENSE) © Open Thai Quran Project.

The translations are the work of their publishers, the King Fahd Complex for the Printing of the
Holy Quran and the Tafsir Center for Quranic Studies. When you use or republish the texts, credit
the publisher of each one.
