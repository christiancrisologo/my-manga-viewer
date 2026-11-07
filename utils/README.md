# Extraction utilities

## Batch chapter extraction

`batch-extract.js` runs `extract.js` for each command in a JSON file. When a command has a numbered URL prefix, `extract.js` builds one chapter URL for every number from `start` through `end` (inclusive), extracts the page images, and writes the resulting chapters to a catalog JSON file.

The utility does not discover chapter links from a series or index page. It assumes chapter URLs follow a predictable numbered pattern. Use it only with pages you are allowed to access, and follow the website's terms and request limits.

## Requirements

- Node.js with `fetch` support (Node.js 18 or newer).
- Project dependencies installed with `npm install` from the repository root.
- The chapter pages must expose their image tags in the HTML returned to `fetch`. A page that renders images only in the browser may not work with this extractor.

## Create a catalog from a chapter with `extract.js`

To make a catalog from one chapter page, pass its URL directly to `extract.js`:

```sh
node utils/extract.js -g=demon-slayer https://manga-123.com/demon-slayer-kimetsu-no-yaiba-manga-chapter-150/
```

By default, this extracts image URLs from the page and does not download the image files. No `-s` selector is required; without one, the extractor checks all image tags, which may include logos or other non-page images. Add `-s=CLASS-NAME` if you identify a class that belongs only to chapter pages.

For a numbered URL pattern such as `https://www.manga-123.com/chapter/1` through `/chapter/100`, pass the URL prefix, range, and `/` separator:

```sh
node utils/extract.js -x1=https://www.manga-123.com/chapter -x2=1 -x3=100 -sp=/ -g=manga-123
```

This requests each chapter page and writes one JSON file containing the catalogs it extracted. The filename is date-stamped, similar to `YYYY-MM-DD-catalogs-manga-123-ID.json`, and is saved in the current working directory. Rename that file to `catalog.json` if that exact filename is needed. To download the image files during extraction as well, add `-dwn=true -dwn-dir=manga-123`.

Try a single chapter first by setting the range to one number, for example `-x2=1 -x3=1`, and check the extracted page count before processing a long range.

## Configure a series

For example, suppose a site's chapter pages look like:

```text
https://manga-123.com/demon-slayer-kimetsu-no-yaiba-manga-chapter-150/
```

The stable part of the URL is the prefix ending in `chapter`; the chapter number follows a hyphen, and each URL ends in `/`. Create or edit `utils/node-extract.json` with one command for this series:

```json
{
  "commands": [
    {
      "url": "https://manga-123.com/demon-slayer-kimetsu-no-yaiba-manga-chapter",
      "start": 1,
      "end": 150,
      "suffix": "/",
      "download": false,
      "groupId": "demon-slayer",
      "selector": "wp-manga-chapter-img"
    }
  ]
}
```

This generates URLs from chapter 1 through chapter 150, including the example chapter 150. The `suffix` is appended after each number, so the generated URL is `https://manga-123.com/demon-slayer-kimetsu-no-yaiba-manga-chapter-150/`.

Check the site's chapter list for the actual first and last chapter numbers; change `start` and `end` accordingly. If the site has gaps or uses a different URL pattern, this range-based method will also request the missing numbers and cannot discover alternate URLs automatically.

### Find the image selector

`selector` is an image **class-name substring**, not a CSS selector. Inspect a chapter page's HTML and look for the class on the manga page `<img>` elements. For example, if the HTML contains `<img class="wp-manga-chapter-img" ...>`, use `"selector": "wp-manga-chapter-img"`. If omitted, the extractor considers all image tags, which may include logos or other page images. The extractor also has fallback matching for several common manga-reader classes.

Run a small range first (for example, set `start` and `end` to `150`) and check the extracted page count and images before processing the full series. This helps catch an incorrect URL pattern or selector early.

## Run it

From the repository root:

```sh
node utils/batch-extract.js -json=utils/node-extract.json
```

Or, from the `utils` directory:

```sh
node batch-extract.js -json=node-extract.json
```

The batch runs commands sequentially and prints a completion summary. The extractor waits between requests, so a large chapter range can take a while.

## Options

Each object in `commands` supports:

| Field      | Meaning                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `url`      | Chapter URL prefix, before the generated separator and chapter number.                                 |
| `start`    | First chapter number to request (inclusive).                                                           |
| `end`      | Last chapter number to request (inclusive).                                                            |
| `suffix`   | Optional text appended after the chapter number, such as `/`.                                          |
| `download` | `true` downloads image files; `false` stores the source image URLs in the catalog. Defaults to `true`. |
| `dir`      | Download directory, relative to `utils` when run by the batch script. Used when downloading.           |
| `convert`  | Optional image format such as `jpg`; requires the installed `sharp` dependency.                        |
| `groupId`  | Optional group identifier saved on each catalog entry.                                                 |
| `selector` | Optional substring used to match the class on image elements.                                          |

The chapter separator is `-` by default, which matches the example URL. The batch script saves generated catalogs and any downloaded files under `utils` because it runs each extraction from that directory.

## Output

Each batch command produces a JSON file containing an array of chapter catalog entries. Its filename follows this pattern:

```text
YYYY-MM-DD-catalogs-GROUP-ID.json
```

For the example above, a file with `demon-slayer` in its name is created in `utils`. If you need the exact filename `catalog.json`, rename the generated file after the batch finishes. With `download: false`, catalog pages refer to the website's image URLs. With `download: true`, images are downloaded and catalog pages refer to the local downloaded files.

Failed or unreachable chapter URLs are shown in the batch summary; check those URLs and rerun with a corrected range or configuration.

## Download a catalog with `extract-catalog.js`

`extract-catalog.js` is a follow-up step, not another chapter-page scraper. It reads a catalog JSON file containing `pages` with image URLs, downloads those images, converts non-JPEG images to JPEG, and writes a new local `catalog.json` whose page URLs refer to the downloaded files.

For the batch workflow above, keep `"download": false` so the generated catalog contains the source image URLs. Then pass that generated catalog file and an output folder to `extract-catalog.js`:

```sh
node utils/extract-catalog.js utils/<generated-catalog-file>.json public/catalogs/demon-slayer
```

The output folder will contain the downloaded page images and `catalog.json`. If the folder already has a `catalog.json` or `catalogs.json`, the utility merges the extracted catalog entries into it. If the output-folder argument is omitted, the utility creates a folder based on the input JSON filename in the current working directory.

Catalog names or the input filename should include `chapter-N` / `chapter N` if you want the downloaded page filenames to use the correct chapter number. Otherwise, chapter-number detection falls back to 1. This utility expects image URLs it can fetch; it is intended for a catalog with remote image URLs, not a batch result whose pages already point to downloaded local file paths.

## Inspect saved HTML with `extract-html.js`

Use this utility to inspect image URLs in a saved HTML file, for example when determining whether a page's image tags are visible to the extractor:

```sh
node utils/extract-html.js path/to/chapter.html
```

It also accepts HTML from standard input. In PowerShell:

```powershell
Get-Content -Raw path/to/chapter.html | node utils/extract-html.js
```

The script prints one catalog object containing the page title and extracted image URLs, followed by a count. It does not write a JSON file automatically; copy the JSON object between the `CATALOG JSON START` and `CATALOG JSON END` markers if you need to save it as an input catalog. It extracts `<img>` URLs but does not know the original page URL, so relative image URLs remain relative; absolute image URLs work best.
