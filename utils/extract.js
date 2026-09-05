import { writeFileSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';
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
  extractTitleFromHtml
} from './shared/index.js';

// Try to import Sharp for image conversion
let sharp;
try {
    sharp = await import('sharp');
    sharp = sharp.default;
} catch (e) {
    console.warn('Sharp not installed. Image conversion disabled. Install with: npm install sharp');
}

/**
 * Standalone Utility to extract images from given URLs using simple fetch and regex.
 * Usage:
 *   node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...
 *   node extract.js [-g=groupId] [-s=selector] [-x1=prefix] [-x2=start] [-x3=end] [-dwn=true] [-dwn-dir=dir] [-convert=format] <URL1> [URL2] ...
 */

// node extract  -x1=https://www.junmeitu.com/beauty/shaling_joyful_17sui_lvli_houbian-.html -s -x2=1 -x3=10 -dwn=true -dwn-dir=downloads
const { flags, positionals } = parseCliArgs(process.argv.slice(2));

const args = process.argv.slice(2);
let groupId = 'default-group';
let selector = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
let prefix = '';
let minChapter = 0;
let maxChapter = 0;
let downloadImages = false;
let downloadDir = '';
let convertFormat = '';  // For image conversion (e.g., 'jpg', 'png')
const urls = [];
const groupId = flags.g || 'default-group';
const prefix = flags.x1 || '';
const minChapter = Number(flags.x2) || 1;
const maxChapter = Number(flags.x3) || 10;
const downloadImages = flags.dwn === 'true' || flags.dwn === true;
const downloadDir = flags['dwn-dir'] || '';
const convertFormat = (flags.convert || '').toLowerCase();
const urls = [...positionals];

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-g=')) {
        groupId = args[i].split('=')[1];
    } else if (args[i].startsWith('-s=')) {
        const selectorValue = args[i].split('=')[1];
        // Create a regex that prioritizes matching images with the specified class/selector
        // Handles both attribute orders: class before src OR src before class
        const classFirst = `<img[^>]*class="[^"]*${selectorValue}[^"]*"[^>]*src=["']([^"']+)["'][^>]*>`;
        const srcFirst = `<img[^>]*src=["']([^"']+)["'][^>]*class="[^"]*${selectorValue}[^"]*"[^>]*>`;
        selector = new RegExp(`(?:${classFirst})|(?:${srcFirst})`, 'gi');
        console.log(`Using selector/class filter: ${selectorValue}`);
    } else if (args[i].startsWith('-rx=')) {
        selector = new RegExp(args[i].split('=')[1], 'gi');
    } else if (args[i].startsWith('-x1=')) {
        console.log(`Using prefix: ${args[i].split('=')[1]}`);
        prefix = args[i].split('=')[1];
    } else if (args[i].startsWith('-x2=')) {
        minChapter = Number(args[i].split('=')[1]) || 1;
    } else if (args[i].startsWith('-x3=')) {
        maxChapter = Number(args[i].split('=')[1]) || 10;
    } else if (args[i].startsWith('-dwn=')) {
        downloadImages = args[i].split('=')[1].toLowerCase() === 'true';
    } else if (args[i].startsWith('-dwn-dir=')) {
        downloadDir = args[i].split('=')[1];
    } else if (args[i].startsWith('-convert=')) {
        convertFormat = args[i].split('=')[1].toLowerCase();
        console.log(`Image conversion enabled: ${convertFormat.toUpperCase()}`);
    } else {
        urls.push(args[i]);
    }
let selectorRegex;
if (flags.s) {
  console.log(`Using selector/class filter: ${flags.s}`);
  selectorRegex = createSelectorRegex(flags.s);
} else if (flags.rx) {
  selectorRegex = new RegExp(flags.rx, 'gi');
}

if (urls.length === 0 && prefix === '') {
    console.error('Error: Please provide at least one URL.');
    console.log('Usage: node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...');
    process.exit(1);
if (prefix) {
  console.log(`Using prefix: ${prefix}`);
}
if (convertFormat) {
  console.log(`Image conversion enabled: ${convertFormat.toUpperCase()}`);
}

function extractImageUrls(html, targetUrl, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi) {
    const images = [];
    let match;
    let selectorMatches = 0;
if (urls.length === 0 && !prefix) {
  console.error('Error: Please provide at least one URL.');
  console.log('Usage: node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...');
  process.exit(1);
}

    while ((match = imgRegex.exec(html)) !== null) {
        // Handle both capture groups from alternation patterns (match[1] or match[2])
        let src = match[1] || match[2];
        selectorMatches++;
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

        // Also check for data-src, data-lazy-src, etc.
        const dataSrcMatch = match[0].match(/data-src=["']([^"']+)["']/);
        const dataLazyMatch = match[0].match(/data-lazy-src=["']([^"']+)["']/);
        const dataOriginalMatch = match[0].match(/data-original-src=["']([^"']+)["']/);
        const srcsetMatch = match[0].match(/srcset=["']([^"'\s]+)/);
  const dateStr = new Date().toISOString().split('T')[0];
  let downloadedPaths = [];

        if (dataSrcMatch) src = dataSrcMatch[1];
        else if (dataLazyMatch) src = dataLazyMatch[1];
        else if (dataOriginalMatch) src = dataOriginalMatch[1];
        else if (srcsetMatch) src = srcsetMatch[1];
  // Phase 1: Download
  console.log(`Downloading ${imageUrls.length} images to ${outputDir}...`);
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    const originalExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const uniqueId = generateId();
    const filename = `${group}-${dateStr}-${uniqueId}.${originalExt}`;
    const targetPath = path.resolve(outputDir, filename);

        if (src && !src.startsWith('data:') && !src.includes('favicon')) {
            try {
                const absoluteUrl = new URL(src, targetUrl).href;
                if (!images.includes(absoluteUrl)) {
                    images.push(absoluteUrl);
                }
            } catch (e) {
                console.error(`Failed to parse URL: ${src}`);
            }
        }
    const savedPath = await downloadImageFile(imageUrl, targetPath);
    if (savedPath) {
      downloadedPaths.push(savedPath);
    }

    if (selectorMatches > 0) {
        console.log(`  ✓ Selector matched ${selectorMatches} image(s)`);
    } else {
        console.log(`  ⚠ Selector did not match any images, trying fallback patterns...`);
    if (i < imageUrls.length - 1) {
      await sleep(3000);
    }
  }
  console.log(`✓ Phase 1 Complete: Downloaded ${downloadedPaths.length}/${imageUrls.length} images`);

    // Fallback for manga sites - look for specific classes
    const mangaRegex = /<img[^>]+class="[^"]*(?:wp-manga-chapter-img|page-break|reading-content)[^"]*"[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let fallbackMatches = 0;
    while ((match = mangaRegex.exec(html)) !== null) {
        const src = match[1];
        if (src) {
            try {
                const absoluteUrl = new URL(src, targetUrl).href;
                if (!images.includes(absoluteUrl)) {
                    images.push(absoluteUrl);
                    fallbackMatches++;
                }
            } catch (e) {
                // ignore
            }
        }
    }
  // Phase 2: Convert format if requested
  if (targetFormat && (await getSharp())) {
    console.log(`\nPhase 2: Converting ${downloadedPaths.length} images to ${targetFormat.toUpperCase()}...`);
    const convertedPaths = [];

    if (fallbackMatches > 0) {
        console.log(`  ✓ Fallback matched ${fallbackMatches} additional image(s)`);
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
          progressive: true
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

    return images;
  return downloadedPaths;
}

function extractTitle(html, targetUrl) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : targetUrl;
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

// Check if URL is a direct image file (not a page to parse)
function isDirectImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg', '.avif'];
    const lowerUrl = url.toLowerCase().split('?')[0]; // Remove query params
    return imageExtensions.some(ext => lowerUrl.endsWith(ext));
}
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT }
    });

async function downloadImage(imageUrl, outputDir, filename) {
    try {
        console.log(`  ↓ Downloading: ${imageUrl}`);
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const filepath = resolve(outputDir, filename);
        writeFileSync(filepath, Buffer.from(buffer));
        console.log(`  ✓ Saved: ${filename}`);
        
        return filepath;
    } catch (error) {
        console.error(`  ✗ Failed to download ${filename}: ${error.message}`);
        return null;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
}

async function extractImages(targetUrl, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi, outputDir = '') {
    try {
        console.log(`\nFetching: ${targetUrl}...`);
        console.log(`Waiting for page to load...`);
    const html = await response.text();
    await sleep(2000);
    console.log(`Page loaded.`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
    const title = extractTitleFromHtml(html, targetUrl);
    const images = extractImageUrlsFromHtml(html, targetUrl, {
      selectorRegex: imgRegex,
      verbose: true
    });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    if (images.length === 0) {
      console.log(`  ⚠ No images found on this page`);
      return null;
    }

        const html = await response.text();
        
        // Add delay to simulate page load time (for lazy-loaded content)
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Page loaded.`);
        
    const title = extractTitle(html, targetUrl);
    const images = extractImageUrls(html, targetUrl, imgRegex);
    let downloadedPaths = [];
    if (downloadImages && outputDir) {
      downloadedPaths = await downloadAndProcessImages(images, outputDir, groupId, convertFormat);
    }

        if (images.length === 0) {
            console.log(`  ⚠ No images found on this page`);
            return null;
        }
    const catalog = createCatalog({
      name: title,
      pages: images.map((imgUrl, i) =>
        createPage({
          name: `Page ${i + 1}`,
          url: downloadImages && downloadedPaths[i] ? downloadedPaths[i] : imgUrl
        })
      ),
      groupId
    });

        // Download images if enabled
        let downloadedPaths = [];
        
        if (downloadImages && outputDir) {
            mkdirSync(outputDir, { recursive: true });
            console.log(`Downloading ${images.length} images to ${outputDir}...`);
            
            // Generate date for filename
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Phase 1: Download all images
            for (let i = 0; i < images.length; i++) {
                const imageUrl = images[i];
                // Always use original extension for download, conversion happens after
                const originalExt = imageUrl.split('.').pop().split('?')[0] || 'jpg';
                // Filename format: <groupId>-<date>-<uniqueId>.<extension>
                const uniqueId = Math.random().toString(36).substring(7);
                const filename = `${groupId}-${dateStr}-${uniqueId}.${originalExt}`;
                const downloadPath = await downloadImage(imageUrl, outputDir, filename);
                if (downloadPath) {
                    downloadedPaths.push(downloadPath);
                }
                // Add delay between downloads to be polite to server (min 3 secs)
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            console.log(`✓ Phase 1 Complete: Downloaded ${downloadedPaths.length}/${images.length} images`);
            
            // Phase 2: Convert all downloaded images (if conversion is enabled)
            if (convertFormat && sharp) {
                console.log(`\nPhase 2: Converting ${downloadedPaths.length} images to ${convertFormat.toUpperCase()}...`);
                const convertedPaths = [];
                
                for (let i = 0; i < downloadedPaths.length; i++) {
                    const filepath = downloadedPaths[i];
                    try {
                        const filename = basename(filepath);
                        const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
                        const convertedFilename = `${filenameWithoutExt}.${convertFormat}`;
                        const convertedFilepath = resolve(outputDir, convertedFilename);
                        
                        console.log(`  ⟳ Converting (${i + 1}/${downloadedPaths.length}): ${filename}`);
                        
                        // Normalize format name (jpg -> jpeg for Sharp)
                        const formatMap = {
                            'jpg': 'jpeg',
                            'jpeg': 'jpeg',
                            'png': 'png',
                            'webp': 'webp',
                            'gif': 'gif',
                            'tiff': 'tiff',
                            'avif': 'avif'
                        };
                        const sharpFormat = formatMap[convertFormat] || convertFormat;
                        
                        // Use toFormat method for conversion
                        await sharp(filepath)
                            .toFormat(sharpFormat, {
                                quality: 90,
                                progressive: true
                            })
                            .toFile(convertedFilepath);
                        
                        console.log(`  ✓ Converted: ${convertedFilename}`);
                        convertedPaths.push(convertedFilepath);
                    } catch (error) {
                        console.error(`  ⚠ Conversion failed for ${basename(filepath)}: ${error.message}`);
                        convertedPaths.push(filepath); // Keep original if conversion fails
                    }
                }
                console.log(`✓ Phase 2 Complete: Converted ${convertedPaths.length} images`);
                downloadedPaths = convertedPaths;
            }
            
            console.log(`✓ Completed all operations - ${downloadedPaths.length} files ready`);
        }
    console.log(`\n--- CATALOG FOR ${targetUrl} ---`);
    console.log(JSON.stringify(catalog, null, 2));
    return catalog;
  } catch (error) {
    console.error(`\nError extracting from ${targetUrl}: ${error.message}`);
    return null;
  }
}

        // Create Catalog JSON format
        const catalog = {
            id: Math.random().toString(36).substring(7),
            name: title,
            pages: images.map((url, i) => ({
                id: Math.random().toString(36).substring(7),
                name: `Page ${i + 1}`,
                url: downloadImages && downloadedPaths[i] ? downloadedPaths[i] : url
            })),
            groupId: groupId,
            createdAt: Date.now()
        };
/**
 * Process multiple URLs (pages or direct images) and save catalog index.
 * @param {string[]} targetUrls
 * @param {RegExp} [regex]
 */
async function extractMultiple(targetUrls, regex) {
  const catalogs = [];
  const finalDownloadDir =
    downloadImages && !downloadDir ? Date.now().toString() : downloadDir;

        console.log(`\n--- CATALOG FOR ${targetUrl} ---`);
        console.log(JSON.stringify(catalog, null, 2));
  for (const url of targetUrls) {
    console.log(`\nProcessing: ${url}`);

        return catalog;
    } catch (error) {
        console.error(`\nError extracting from ${targetUrl}: ${error.message}`);
        return null;
    }
}
    if (isDirectImageUrl(url)) {
      console.log(`  ℹ Direct image URL detected`);

async function extractMultiple(urls, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi) {
    const catalogs = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const randomDelay = (to) => 1000 + Math.random() * to; // 1-3 seconds
      if (downloadImages && finalDownloadDir) {
        console.log(`  ↓ Downloading direct image...`);
        const downloaded = await downloadAndProcessImages(
          [url],
          finalDownloadDir,
          groupId,
          convertFormat
        );

    // Use current timestamp as default download directory if not specified
    let finalDownloadDir = downloadDir;
    if (downloadImages && !finalDownloadDir) {
        finalDownloadDir = Date.now().toString();
    }

    for (const url of urls) {
        console.log(`\nProcessing: ${url}`);
        
        // Check if URL is a direct image
        if (isDirectImageUrl(url)) {
            console.log(`  ℹ Direct image URL detected`);
            
            // Check if this is a sequential image (has -x2 and -x3)
            if (minChapter > 0 && maxChapter > 0) {
                console.log(`  ℹ Sequential images: generating ${minChapter} to ${maxChapter}`);
                
                // Generate sequential image URLs
                const sequentialUrls = [];
                const extensionMatch = url.match(/(\.\w+)(\?.*)?$/); // Match extension and query params
                const extension = extensionMatch ? extensionMatch[1] : '.jpg';
                const queryParams = extensionMatch && extensionMatch[2] ? extensionMatch[2] : '';
                const baseUrl = url.replace(/(\.\w+)(\?.*)?$/, ''); // Remove extension and query params
                
                // for (let i = minChapter; i <= maxChapter; i++) {
                //     sequentialUrls.push(`${baseUrl}-${i}${extension}${queryParams}`);
                // }

                sequentialUrls.push(`${baseUrl}${extension}${queryParams}`);
                
                // console.log(`  Generated ${sequentialUrls.length} image URLs`);
                // console.log(`  First: ${sequentialUrls[0]}`);
                // console.log(`  Last: ${sequentialUrls[sequentialUrls.length - 1]}`);
                
                // Download each sequential image
                if (downloadImages && finalDownloadDir) {
                    mkdirSync(finalDownloadDir, { recursive: true });
                    
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    const downloadedPaths = [];
                    
                    for (const seqUrl of sequentialUrls) {
                        const uniqueId = Math.random().toString(36).substring(7);
                        const ext = seqUrl.split('.').pop().split('?')[0] || 'jpg';
                        const filename = `${groupId}-${dateStr}-${uniqueId}.${ext}`;
                        
                        const downloadPath = await downloadImage(seqUrl, finalDownloadDir, filename);
                        if (downloadPath) {
                            downloadedPaths.push(downloadPath);
                        }
                        
                        // Add delay between downloads
                        await delay(randomDelay(3000));
                    }
                    
                    // Convert if enabled
                    if (convertFormat && sharp) {
                        console.log(`\n  ⟳ Converting ${downloadedPaths.length} images to ${convertFormat.toUpperCase()}...`);
                        const convertedPaths = [];
                        
                        for (let i = 0; i < downloadedPaths.length; i++) {
                            const filepath = downloadedPaths[i];
                            try {
                                const filename = basename(filepath);
                                const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
                                const convertedFilename = `${filenameWithoutExt}.${convertFormat}`;
                                const convertedFilepath = resolve(finalDownloadDir, convertedFilename);
                                
                                const formatMap = {
                                    'jpg': 'jpeg',
                                    'jpeg': 'jpeg',
                                    'png': 'png',
                                    'webp': 'webp',
                                    'gif': 'gif',
                                    'tiff': 'tiff',
                                    'avif': 'avif'
                                };
                                const sharpFormat = formatMap[convertFormat] || convertFormat;
                                
                                await sharp(filepath)
                                    .toFormat(sharpFormat, {
                                        quality: 90,
                                        progressive: true
                                    })
                                    .toFile(convertedFilepath);
                                
                                console.log(`    ✓ Converted (${i + 1}/${downloadedPaths.length}): ${convertedFilename}`);
                                convertedPaths.push(convertedFilepath);
                            } catch (error) {
                                console.error(`    ⚠ Conversion failed: ${error.message}`);
                                convertedPaths.push(filepath);
                            }
                        }
                        downloadedPaths.length = 0;
                        downloadedPaths.push(...convertedPaths);
                    }
                    
                    // Create catalog
                    const catalog = {
                        id: Math.random().toString(36).substring(7),
                        name: `Sequential Images - ${minChapter} to ${maxChapter}`,
                        pages: downloadedPaths.map((filePath, i) => ({
                            id: Math.random().toString(36).substring(7),
                            name: `Page ${i + 1}`,
                            url: filePath
                        })),
                        groupId: groupId,
                        createdAt: Date.now()
                    };
                    catalogs.push(catalog);
                    console.log(`  ✓ Downloaded and cataloged ${downloadedPaths.length} sequential images`);
                }
            } else {
                // Single direct image download
                if (downloadImages && finalDownloadDir) {
                    mkdirSync(finalDownloadDir, { recursive: true });
                    
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];
                    const uniqueId = Math.random().toString(36).substring(7);
                    const ext = url.split('.').pop().split('?')[0] || 'jpg';
                    const filename = `${groupId}-${dateStr}-${uniqueId}.${ext}`;
                    
                    console.log(`  ↓ Downloading direct image...`);
                    const downloadPath = await downloadImage(url, finalDownloadDir, filename);
                    
                    if (downloadPath) {
                        let finalPath = downloadPath;
                        
                        // Convert if enabled
                        if (convertFormat && sharp) {
                            try {
                                const filenameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
                                const convertedFilename = `${filenameWithoutExt}.${convertFormat}`;
                                const convertedFilepath = resolve(finalDownloadDir, convertedFilename);
                                
                                console.log(`  ⟳ Converting: ${filename}`);
                                
                                const formatMap = {
                                    'jpg': 'jpeg',
                                    'jpeg': 'jpeg',
                                    'png': 'png',
                                    'webp': 'webp',
                                    'gif': 'gif',
                                    'tiff': 'tiff',
                                    'avif': 'avif'
                                };
                                const sharpFormat = formatMap[convertFormat] || convertFormat;
                                
                                await sharp(downloadPath)
                                    .toFormat(sharpFormat, {
                                        quality: 90,
                                        progressive: true
                                    })
                                    .toFile(convertedFilepath);
                                
                                console.log(`  ✓ Converted: ${convertedFilename}`);
                                finalPath = convertedFilepath;
                            } catch (error) {
                                console.error(`  ⚠ Conversion failed: ${error.message}`);
                                finalPath = downloadPath;
                            }
                        }
                        
                        // Create catalog for single image
                        const catalog = {
                            id: Math.random().toString(36).substring(7),
                            name: `Direct Image - ${filename}`,
                            pages: [{
                                id: Math.random().toString(36).substring(7),
                                name: 'Page 1',
                                url: finalPath
                            }],
                            groupId: groupId,
                            createdAt: Date.now()
                        };
                        catalogs.push(catalog);
                    }
                }
            }
        } else {
            // Parse page as before
            await delay(randomDelay(5000));
            const catalog = await extractImages(url, imgRegex, finalDownloadDir);
            if (catalog) {
                catalogs.push(catalog);
            }
        if (downloaded.length > 0) {
          const finalPath = downloaded[0];
          const filename = path.basename(finalPath);
          const catalog = createCatalog({
            name: `Direct Image - ${filename}`,
            pages: [createPage({ name: 'Page 1', url: finalPath })],
            groupId
          });
          catalogs.push(catalog);
        }
      }
    } else {
      await sleep(randomDelay(1000, 3000));
      const catalog = await extractImagesFromPage(url, regex, finalDownloadDir);
      if (catalog) {
        catalogs.push(catalog);
      }
    }
  }

    // Create filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const uiid = Math.random().toString(36).substring(7); // Random ID
    const filename = `${dateStr}-catalogs-${groupId}-${uiid}.json`;
  // Save catalogs to file
  const dateStr = new Date().toISOString().split('T')[0];
  const uiid = generateId();
  const filename = `${dateStr}-catalogs-${groupId}-${uiid}.json`;

    // Write to file
    const jsonContent = JSON.stringify(catalogs, null, 2);
    writeFileSync(filename, jsonContent);
  await writeJson(filename, catalogs);

    console.log(`\n--- CATALOGS SAVED TO FILE: ${filename} ---`);
    console.log(`Summary: Processed ${urls.length} URLs, extracted ${catalogs.length} catalogs.`);
    console.log(`File location: ${process.cwd()}/${filename}`);
    if (downloadImages) {
        console.log(`Images downloaded to: ${process.cwd()}/${finalDownloadDir}`);
    }
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
    
    // Check if prefix has a file extension (page extensions or image extensions)
    const extensionMatch = prefix.match(/\.(html|php|aspx|jsp|xml|shtml|jpg|jpeg|png|webp|gif|bmp|tiff|avif|svg)$/i);
    let basePrefix = prefix;
    let extension = '';
    
    if (extensionMatch) {
        extension = extensionMatch[0];
        basePrefix = prefix.slice(0, -extension.length);
        console.log(`Detected extension: ${extension}, base prefix: ${basePrefix}`);
    }
  const generatedUrls = [];
  const extensionMatch = prefix.match(
    /\.(html|php|aspx|jsp|xml|shtml|jpg|jpeg|png|webp|gif|bmp|tiff|avif|svg)$/i
  );
  let basePrefix = prefix;
  let extension = '';

    for (let i = minChapter; i <= maxChapter; i++) {
        generatedUrls.push(`${basePrefix}-${i}${extension}`);
    }
    
    console.log(`Generated URLs from prefix: ${generatedUrls.length} URLs`);
    console.log(`First URL: ${generatedUrls[0]}`);
    console.log(`Last URL: ${generatedUrls[generatedUrls.length - 1]}`);
    extractMultiple(generatedUrls, selector);
  if (extensionMatch) {
    extension = extensionMatch[0];
    basePrefix = prefix.slice(0, -extension.length);
    console.log(`Detected extension: ${extension}, base prefix: ${basePrefix}`);
  }

  for (let i = minChapter; i <= maxChapter; i++) {
    generatedUrls.push(`${basePrefix}-${i}${extension}`);
  }

  console.log(`Generated URLs from prefix: ${generatedUrls.length} URLs`);
  console.log(`First URL: ${generatedUrls[0]}`);
  console.log(`Last URL: ${generatedUrls[generatedUrls.length - 1]}`);
  extractMultiple(generatedUrls, selectorRegex);
} else {
    extractMultiple(urls, selector);
  extractMultiple(urls, selectorRegex);
}
