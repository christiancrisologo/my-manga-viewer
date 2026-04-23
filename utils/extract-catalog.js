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

async function readJsonFile(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function createCatalogEntry(originalCatalog, pages) {
  return {
    id: originalCatalog.id || crypto.randomUUID(),
    name: originalCatalog.name || `Chapter ${originalCatalog.chapter || 1}`,
    pages,
    createdAt: originalCatalog.createdAt || Date.now(),
    author: originalCatalog.author,
    genre: originalCatalog.genre,
    description: originalCatalog.description,
    series: originalCatalog.series,
    volume: originalCatalog.volume,
    chapter: originalCatalog.chapter,
    season: originalCatalog.season,
    released: originalCatalog.released,
    size: originalCatalog.size,
    groupId: originalCatalog.groupId
  };
}

function mergeArchives(existingArchives, newArchives) {
  const updated = [...existingArchives];
  const indexById = new Map();
  const indexByChapter = new Map();
  const indexByName = new Map();

  existingArchives.forEach((archive, index) => {
    if (archive.id) indexById.set(archive.id, index);
    if (archive.chapter !== undefined && archive.chapter !== null) {
      indexByChapter.set(String(archive.chapter).toLowerCase(), index);
    }
    if (archive.name) {
      indexByName.set(archive.name.trim().toLowerCase(), index);
    }
  });

  for (const archive of newArchives) {
    let existingIndex;

    if (archive.id && indexById.has(archive.id)) {
      existingIndex = indexById.get(archive.id);
    } else if (archive.chapter !== undefined && archive.chapter !== null && indexByChapter.has(String(archive.chapter).toLowerCase())) {
      existingIndex = indexByChapter.get(String(archive.chapter).toLowerCase());
    } else if (archive.name && indexByName.has(archive.name.trim().toLowerCase())) {
      existingIndex = indexByName.get(archive.name.trim().toLowerCase());
    }

    if (existingIndex !== undefined) {
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        ...archive,
        pages: archive.pages
      };
    } else {
      updated.push(archive);
    }
  }

  return updated;
}

async function writeCatalogFile(folder, catalogs) {
  const outputPath = path.join(folder, 'catalog.json');
  await fs.promises.writeFile(outputPath, JSON.stringify(catalogs, null, 2), 'utf8');
  return outputPath;
}

async function updateExistingCatalogIndex(folder, newCatalogs) {
  const existingFiles = ['catalogs.json', 'catalog.json'];

  for (const filename of existingFiles) {
    const filePath = path.join(folder, filename);
    try {
      const existingData = await readJsonFile(filePath);
      const existingArchives = Array.isArray(existingData)
        ? existingData
        : existingData && existingData.pages ? [existingData]
        : [];

      const merged = mergeArchives(existingArchives, newCatalogs);
      await fs.promises.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf8');
      console.log(`Updated existing catalog index: ${filename}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Could not update existing catalog file ${filename}: ${error.message}`);
      }
    }
  }
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

  const extractedCatalogs = [];

  for (const catalog of catalogs) {
    if (!catalog.pages || !Array.isArray(catalog.pages)) {
      console.warn(`Skipping catalog "${catalog.name}": no valid pages array.`);
      continue;
    }

    const chapterNumber = parseChapterNumber(catalogFile, catalog.name);
    console.log(`\nProcessing catalog: "${catalog.name}" (Chapter ${chapterNumber}, ${catalog.pages.length} pages)`);

    const savedPages = [];

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

        savedPages.push({
          id: page.id || `${baseName}-chapter-${chapterNumber}-page-${pageNumber}`,
          name: page.name || `Page ${pageNumber}`,
          url: outputFilename
        });
      } catch (error) {
        console.error(`  [${pageNumber}/${catalog.pages.length}] Failed to process: ${error.message}`);
      }
    }

    if (savedPages.length > 0) {
      extractedCatalogs.push(createCatalogEntry(catalog, savedPages));
    } else {
      console.warn(`No pages were saved for catalog "${catalog.name}". Skipping catalog entry.`);
    }
  }

  if (extractedCatalogs.length > 0) {
    const outputPath = await writeCatalogFile(targetFolder, extractedCatalogs);
    console.log(`\nWrote extracted catalog index: ${outputPath}`);
    await updateExistingCatalogIndex(targetFolder, extractedCatalogs);
  } else {
    console.warn('\nNo extracted catalogs to write.');
  }

  console.log('\nExtraction complete.');
}

extractCatalog(catalogPath, outputFolder).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
