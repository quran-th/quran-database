<img width="1774" height="887" alt="image" src="https://github.com/user-attachments/assets/12a16f56-b001-4b41-aac4-c460da486b01" />

# quran-database

Thai translations of the Quran from the [Open Thai Quran Project](https://quran.in.th), published as
plain, versioned data files. This is a data-only repository: the only code in it is the converter
to other formats.

- **One canonical CSV per translation.** Every verse and footnote, with the text exactly as stored.
- **Every release is a git tag** (`vYYYY.MM.DD`), so any change to the text shows up in `git diff`.
- **Release notes** separate plain spelling fixes from changes that alter wording, which are
  listed verse by verse.
- **A converter** produces QuranEnc, Tanzil, Quran.com and JSON formats from the canonical files.

## Translations

| Slug | Source id | Translation | Verses | Footnotes |
|------|-----------|-------------|--------|-----------|
| `king-fahd` | 3 | King Fahd Complex for the Printing of the Holy Quran, Thai translation with footnotes | 6236 | 7287 |
| `al-mukhtasar` | 4 | Al-Mukhtasar fi Tafsir al-Quran, Tafsir Center for Quranic Studies | 6236 | none |

## Repository layout

```
data/<slug>/NNN.csv      canonical translation, one file per surah (001.csv … 114.csv)
data/<slug>.meta.json    source info, version, counts, checksum, known data issues
changes/<version>.csv    every row changed in that release, old and new text
releases/<version>.md    release notes for that release
CHANGELOG.md             one short section per release, newest first
scripts/convert.mjs      converts the canonical files into other formats
```

## Data schemas

### `data/<slug>/NNN.csv`

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
  directly by its footnote rows in ascending order. Each file holds one surah, named by its
  zero-padded number; together the 114 files have 6236 verse rows.
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
| `sha256` | Checksum of the whole translation as one CSV: the header once, then the rows of `001.csv` … `114.csv` in order |
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

## Converting to other formats

The data files need no tools: read the CSV with any RFC 4180 reader. To get another format, use the
converter. It needs Node.js 20 or later and has no dependencies.

```sh
git clone https://github.com/quran-th/quran-database.git
cd quran-database
npm run convert    # every format for every translation into ./out (git-ignored)
```

Convert one translation to one format:

```sh
node scripts/convert.mjs --to tanzil --source king-fahd
# --to quranenc | tanzil | qurancom | json | all
```

| `--to` | Output |
|--------|--------|
| `quranenc` | `out/<slug>/quranenc/<slug>.csv` |
| `tanzil` | `out/<slug>/tanzil/th.<slug>.txt` |
| `qurancom` | `out/<slug>/quran-com/<slug>.json` |
| `json` | `out/<slug>/json/<slug>.json` |

The output is deterministic: the same canonical files always give the same bytes. For Tanzil, the
converter prints the verses it adjusted.

## Contributing

**Translation corrections.** The data here is generated from the project's database. Don't edit
the files under `data/` by hand. Report a correction in either of two ways:

- open an issue with the verse reference (for example `2:255`, or `2:255 footnote 1`), the
  current text and the suggested fix;
- if you are a reviewer, propose it in the proofing tool at
  [contribute.quran.in.th](https://contribute.quran.in.th).

Approved corrections reach this repository with the next release, and they are listed in its
release notes.

**Converter and documentation.** Fixes to the converter and this README are welcome as pull
requests.

**Releases.** The project's release tooling writes the data, change lists and release notes
from the production database, outside this repository. Each release is one commit and a
`vYYYY.MM.DD` tag.

## License

[MIT](LICENSE) © Open Thai Quran Project.

The translations are the work of their publishers, the King Fahd Complex for the Printing of the
Holy Quran and the Tafsir Center for Quranic Studies. When you use or republish the texts, credit
the publisher of each one.
