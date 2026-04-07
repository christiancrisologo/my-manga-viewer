import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node utils/extract-catalog.js <catalog.json> [output-folder]');
  process.exit(1);
}

const catalogPath = path.resolve(args[0]);
const fallbackOutputFolder = path.basename(catalogPath, path.extname(catalogPath));
const outputFolder = path.resolve(args[1] ? args[1] : fallbackOutputFolder);

const isImageMime = (mime) => /^image\//i.test(mime || '');
const isJpegMime = (mime) => /^image\/(jpeg|jpg)$/i.test(mime || '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => 2000 + Math.floor(Math.random() * 2000);

function parseChapterNumber(catalogFile, catalogName) {
  const fileMatch = path.basename(catalogFile, path.extname(catalogFile)).match(/chapter[-_]?([0-9]+)/i);
  if (fileMatch) return Number(fileMatch[1]);

  const nameMatch = (catalogName || '').match(/chapter\s*([0-9]+)/i);
  if (nameMatch) return Number(nameMatch[1]);

  return 1;
}

function normalizeCatalogBase(catalogFile) {
  return path.basename(catalogFile, path.extname(catalogFile))
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function getOutputFilename(baseName, chapter, pageIndex) {
  return `${baseName}-chapter-${chapter}-page-${pageIndex + 1}.jpg`;
}

async function readCatalog(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());

  return { buffer, contentType };
}

async function saveAsJpeg(buffer, outputPath) {
  await sharp(buffer)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

async function writeBuffer(buffer, outputPath) {
  await fs.promises.writeFile(outputPath, buffer);
}

async function extractCatalog(catalogFile, targetFolder) {
  const data = await readCatalog(catalogFile);
  const baseName = normalizeCatalogBase(catalogFile);
  
  // Handle both single catalog and array of catalogs
  const catalogs = Array.isArray(data) ? data : [data];

  await fs.promises.mkdir(targetFolder, { recursive: true });

  console.log(`Using catalog: ${catalogFile}`);
  console.log(`Output folder: ${targetFolder}`);
  console.log(`Found ${catalogs.length} catalog(s).`);

  for (const catalog of catalogs) {
    if (!catalog.pages || !Array.isArray(catalog.pages)) {
      console.warn(`Skipping catalog "${catalog.name}": no valid pages array.`);
      continue;
    }

    const chapterNumber = parseChapterNumber(catalogFile, catalog.name);
    console.log(`\nProcessing catalog: "${catalog.name}" (Chapter ${chapterNumber}, ${catalog.pages.length} pages)`);

    for (let index = 0; index < catalog.pages.length; index += 1) {
      const page = catalog.pages[index];
      const pageNumber = index + 1;
      const outputFilename = getOutputFilename(baseName, chapterNumber, index);
      const outputFile = path.join(targetFolder, outputFilename);

      if (!page || !page.url) {
        console.warn(`  Skipping page ${pageNumber}: missing URL`);
        continue;
      }

      const delayMs = randomDelay();
      console.log(`  [${pageNumber}/${catalog.pages.length}] Waiting ${delayMs}ms before downloading...`);
      await sleep(delayMs);

      try {
        const { buffer, contentType } = await downloadImage(page.url);

        if (!isImageMime(contentType)) {
          console.warn(`  [${pageNumber}/${catalog.pages.length}] URL did not resolve to an image (${page.url})`);
          continue;
        }

        const pageExt = path.extname(new URL(page.url).pathname).toLowerCase();
        const shouldConvert = !isJpegMime(contentType) || pageExt === '.webp' || pageExt === '.png' || pageExt === '.gif';

        if (shouldConvert) {
          await saveAsJpeg(buffer, outputFile);
          console.log(`  [${pageNumber}/${catalog.pages.length}] Converted and saved: ${outputFilename}`);
        } else {
          await writeBuffer(buffer, outputFile);
          console.log(`  [${pageNumber}/${catalog.pages.length}] Saved: ${outputFilename}`);
        }
      } catch (error) {
        console.error(`  [${pageNumber}/${catalog.pages.length}] Failed to process: ${error.message}`);
      }
    }
  }

  console.log('\nExtraction complete.');
}

extractCatalog(catalogPath, outputFolder).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
