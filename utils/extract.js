import path from 'path';
import {
  parseCliArgs,
  sleep,
  randomDelay,
  generateId,
  writeJson,
  ensureDir,
  DEFAULT_USER_AGENT,
  isDirectImageUrl,
  downloadImageFile,
  getSharp,
  convertImage,
  createCatalog,
  createPage,
  createSelectorRegex,
  extractImageUrlsFromHtml,
  extractTitleFromHtml,
} from './shared/index.js';

/**
 * Standalone Utility to extract images from given URLs using simple fetch and regex.
 * Usage:
 *   node extract.js [-g=groupId] [-s=selector] [-x1=prefix] [-x2=start] [-x3=end] [-dwn=true] [-dwn-dir=dir] [-convert=format] [-pn=3] <URL1> [URL2] ...
 */


const { flags, positionals } = parseCliArgs(process.argv.slice(2));

const groupId = flags.g || 'default-group';
const paddedNumber = flags.pn || 0;
const prefix = flags.x1 || '';
const sp = flags.sp ?? (prefix.endsWith('-') ? '' : '-');
const suffix = flags.suffix || '';
const minChapter = Number(flags.x2) || 1;
const maxChapter = Number(flags.x3) || 10;
const downloadImages = flags.dwn === 'true' || flags.dwn === true;
const downloadDir = flags['dwn-dir'] || '';
const convertFormat = (flags.convert || '').toLowerCase();
const urls = [...positionals];

let selectorRegex;
if (flags.s) {
  console.log(`Using selector/class filter: ${flags.s}`);
  selectorRegex = createSelectorRegex(flags.s);
} else if (flags.rx) {
  selectorRegex = new RegExp(flags.rx, 'gi');
}

if (prefix) {
  console.log(`Using prefix: ${prefix}`);
}
if (convertFormat) {
  console.log(`Image conversion enabled: ${convertFormat.toUpperCase()}`);
}

if (urls.length === 0 && !prefix) {
  console.error('Error: Please provide at least one URL.');
  console.log('Usage: node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...');
  process.exit(1);
}

/**
 * Download a batch of image URLs to disk and optionally convert format using Sharp.
 * @param {string[]} imageUrls
 * @param {string} outputDir
 * @param {string} group
 * @param {string} targetFormat
 * @returns {Promise<string[]>}
 */
async function downloadAndProcessImages(imageUrls, outputDir, group, targetFormat) {
  if (!outputDir || imageUrls.length === 0) return [];
  ensureDir(outputDir);

  const dateStr = new Date().toISOString().split('T')[0];
  let downloadedPaths = [];

  // Phase 1: Download
  console.log(`Downloading ${imageUrls.length} images to ${outputDir}...`);
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const originalExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const uniqueId = generateId();
    const filename = `${group}-${dateStr}-${uniqueId}.${originalExt}`;
    const targetPath = path.resolve(outputDir, filename);

    const savedPath = await downloadImageFile(imageUrl, targetPath);
    if (savedPath) {
      downloadedPaths.push(savedPath);
    }

    if (i < imageUrls.length - 1) {
      await sleep(3000);
    }
  }
  console.log(
    `✓ Phase 1 Complete: Downloaded ${downloadedPaths.length}/${imageUrls.length} images`
  );

  // Phase 2: Convert format if requested
  if (targetFormat && (await getSharp())) {
    console.log(
      `\nPhase 2: Converting ${downloadedPaths.length} images to ${targetFormat.toUpperCase()}...`
    );
    const convertedPaths = [];

    for (let i = 0; i < downloadedPaths.length; i++) {
      const filepath = downloadedPaths[i];
      try {
        const filename = path.basename(filepath);
        const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const convertedFilename = `${filenameWithoutExt}.${targetFormat}`;
        const convertedFilepath = path.resolve(outputDir, convertedFilename);

        console.log(`  ⟳ Converting (${i + 1}/${downloadedPaths.length}): ${filename}`);
        await convertImage(filepath, convertedFilepath, targetFormat, {
          quality: 90,
          progressive: true,
        });
        console.log(`  ✓ Converted: ${convertedFilename}`);
        convertedPaths.push(convertedFilepath);
      } catch (error) {
        console.error(`  ⚠ Conversion failed for ${path.basename(filepath)}: ${error.message}`);
        convertedPaths.push(filepath);
      }
    }
    console.log(`✓ Phase 2 Complete: Converted ${convertedPaths.length} images`);
    downloadedPaths = convertedPaths;
  }

  return downloadedPaths;
}

/**
 * Fetch and extract images and metadata from a web page URL.
 * @param {string} targetUrl
 * @param {RegExp} [imgRegex]
 * @param {string} [outputDir]
 * @returns {Promise<object | null>}
 */
async function extractImagesFromPage(targetUrl, imgRegex, outputDir = '') {
  try {
    console.log(`\nFetching: ${targetUrl}...`);
    console.log(`Waiting for page to load...`);

    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    await sleep(2000);
    console.log(`Page loaded.`);

    const title = extractTitleFromHtml(html, targetUrl);
    const images = extractImageUrlsFromHtml(html, targetUrl, {
      selectorRegex: imgRegex,
      verbose: true,
    });

    if (images.length === 0) {
      console.log(`  ⚠ No images found on this page`);
      return null;
    }

    let downloadedPaths = [];
    if (downloadImages && outputDir) {
      downloadedPaths = await downloadAndProcessImages(images, outputDir, groupId, convertFormat);
    }

    const catalog = createCatalog({
      name: title,
      pages: images.map((imgUrl, i) =>
        createPage({
          name: `Page ${i + 1}`,
          url: downloadImages && downloadedPaths[i] ? downloadedPaths[i] : imgUrl,
        })
      ),
      groupId,
    });

    console.log(`\n--- CATALOG FOR ${targetUrl} ---`);
    console.log(JSON.stringify(catalog, null, 2));
    return catalog;
  } catch (error) {
    console.error(`\nError extracting from ${targetUrl}: ${error.message}`);
    return null;
  }
}

/**
 * Process multiple URLs (pages or direct images) and save catalog index.
 * @param {string[]} targetUrls
 * @param {RegExp} [regex]
 */
async function extractMultiple(targetUrls, regex) {
  const catalogs = [];
  const finalDownloadDir = downloadImages && !downloadDir ? Date.now().toString() : downloadDir;

  for (const url of targetUrls) {
    console.log(`\nProcessing: ${url}`);

    if (isDirectImageUrl(url)) {
      console.log(`  ℹ Direct image URL detected`);

      if (downloadImages && finalDownloadDir) {
        console.log(`  ↓ Downloading direct image...`);
        await sleep(randomDelay(3000, 5000));
        const downloaded = await downloadAndProcessImages(
          [url],
          finalDownloadDir,
          groupId,
          convertFormat
        );

        if (downloaded.length > 0) {
          const finalPath = downloaded[0];
          const filename = path.basename(finalPath);
          const catalog = createCatalog({
            name: `Direct Image - ${filename}`,
            pages: [createPage({ name: 'Page 1', url: finalPath })],
            groupId,
          });
          catalogs.push(catalog);
        }
      }
    } else {
      await sleep(randomDelay(3000, 5000));
      const catalog = await extractImagesFromPage(url, regex, finalDownloadDir);
      if (catalog) {
        catalogs.push(catalog);
      }
    }
  }

  // Save catalogs to file
  const dateStr = new Date().toISOString().split('T')[0];
  const uiid = generateId();
  const filename = `${dateStr}-catalogs-${groupId}-${uiid}.json`;

  await writeJson(filename, catalogs);

  console.log(`\n--- CATALOGS SAVED TO FILE: ${filename} ---`);
  console.log(
    `Summary: Processed ${targetUrls.length} URLs, extracted ${catalogs.length} catalogs.`
  );
  console.log(`File location: ${path.resolve(filename)}`);
  if (downloadImages) {
    console.log(`Images downloaded to: ${path.resolve(finalDownloadDir)}`);
  }
}

// Main execution
if (prefix) {
  const generatedUrls = [];
  const extensionMatch = prefix.match(
    /\.(html|php|aspx|jsp|xml|shtml|jpg|jpeg|png|webp|gif|bmp|tiff|avif|svg)$/i
  );
  let basePrefix = prefix;
  let extension = '';

  if (extensionMatch) {
    extension = extensionMatch[0];
    basePrefix = prefix.slice(0, -extension.length);
    console.log(`Detected extension: ${extension}, base prefix: ${basePrefix}`);
  }


  for (let i = minChapter; i <= maxChapter; i++) {
    const inc = paddedNumber ? String(i).padStart(3, '0') : i;

    generatedUrls.push(`${basePrefix}${sp}${inc}${extension}${suffix}`);
  }

  console.log(`Generated URLs from prefix: ${generatedUrls.length} URLs`);
  console.log(`First URL: ${generatedUrls[0]}`);
  console.log(`Last URL: ${generatedUrls[generatedUrls.length - 1]}`);
  extractMultiple(generatedUrls, selectorRegex);
} else {
  extractMultiple(urls, selectorRegex);
}
