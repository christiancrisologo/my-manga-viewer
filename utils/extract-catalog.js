import fs from 'fs';
import path from 'path';
import {
  sleep,
  randomDelay,
  readJson,
  writeJson,
  ensureDir,
  fetchBuffer,
  isImageMime,
  isJpegMime,
  convertImage,
  createCatalog,
  createPage,
  parseChapterNumber,
  normalizeCatalogBase,
  getOutputFilename,
  mergeArchives
} from './shared/index.js';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node utils/extract-catalog.js <catalog.json> [output-folder]');
  process.exit(1);
}

const catalogPath = path.resolve(args[0]);
const fallbackOutputFolder = path.basename(catalogPath, path.extname(catalogPath));
const outputFolder = path.resolve(args[1] ? args[1] : fallbackOutputFolder);

async function updateExistingCatalogIndex(folder, newCatalogs) {
  const existingFiles = ['catalogs.json', 'catalog.json'];

  for (const filename of existingFiles) {
    const filePath = path.join(folder, filename);
    try {
      const existingData = await readJson(filePath);
      const existingArchives = Array.isArray(existingData)
        ? existingData
        : existingData && existingData.pages
          ? [existingData]
          : [];

      const merged = mergeArchives(existingArchives, newCatalogs);
      await writeJson(filePath, merged);
      console.log(`Updated existing catalog index: ${filename}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Could not update existing catalog file ${filename}: ${error.message}`);
      }
    }
  }
}

async function extractCatalog(catalogFile, targetFolder) {
  const data = await readJson(catalogFile);
  const baseName = normalizeCatalogBase(catalogFile);

  // Handle both single catalog and array of catalogs
  const catalogs = Array.isArray(data) ? data : [data];

  ensureDir(targetFolder);

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
    console.log(
      `\nProcessing catalog: "${catalog.name}" (Chapter ${chapterNumber}, ${catalog.pages.length} pages)`
    );

    const savedPages = [];

    for (let index = 0; index < catalog.pages.length; index += 1) {
      const page = catalog.pages[index];
      const pageNumber = index + 1;
      const outputFilename = getOutputFilename(baseName, chapterNumber, index, 'jpg');
      const outputFile = path.join(targetFolder, outputFilename);

      if (!page || !page.url) {
        console.warn(`  Skipping page ${pageNumber}: missing URL`);
        continue;
      }

      const delayMs = randomDelay(2000, 4000);
      console.log(`  [${pageNumber}/${catalog.pages.length}] Waiting ${delayMs}ms before downloading...`);
      await sleep(delayMs);

      try {
        const { buffer, contentType } = await fetchBuffer(page.url);

        if (!isImageMime(contentType)) {
          console.warn(`  [${pageNumber}/${catalog.pages.length}] URL did not resolve to an image (${page.url})`);
          continue;
        }

        const pageExt = path.extname(new URL(page.url).pathname).toLowerCase();
        const shouldConvert =
          !isJpegMime(contentType) ||
          pageExt === '.webp' ||
          pageExt === '.png' ||
          pageExt === '.gif';

        if (shouldConvert) {
          await convertImage(buffer, outputFile, 'jpeg', { quality: 90 });
          console.log(`  [${pageNumber}/${catalog.pages.length}] Converted and saved: ${outputFilename}`);
        } else {
          await fs.promises.writeFile(outputFile, buffer);
          console.log(`  [${pageNumber}/${catalog.pages.length}] Saved: ${outputFilename}`);
        }

        savedPages.push(
          createPage({
            id: page.id || `${baseName}-chapter-${chapterNumber}-page-${pageNumber}`,
            name: page.name || `Page ${pageNumber}`,
            url: outputFilename
          })
        );
      } catch (error) {
        console.error(`  [${pageNumber}/${catalog.pages.length}] Failed to process: ${error.message}`);
      }
    }

    if (savedPages.length > 0) {
      extractedCatalogs.push(
        createCatalog({
          ...catalog,
          id: catalog.id,
          name: catalog.name || `Chapter ${catalog.chapter || 1}`,
          pages: savedPages
        })
      );
    } else {
      console.warn(`No pages were saved for catalog "${catalog.name}". Skipping catalog entry.`);
    }
  }

  if (extractedCatalogs.length > 0) {
    const outputPath = path.join(targetFolder, 'catalog.json');
    await writeJson(outputPath, extractedCatalogs);
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
