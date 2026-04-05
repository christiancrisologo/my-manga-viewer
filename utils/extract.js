import { writeFileSync } from 'fs';

/**
 * Standalone Utility to extract images from given URLs using simple fetch and regex.
 * Usage:
 *   node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...
 */

const args = process.argv.slice(2);
let groupId = 'default-group';
let selector = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
let prefix = '';
let minChapter = 0;
let maxChapter = 0;
const urls = [];

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-g=')) {
        groupId = args[i].split('=')[1];
    } else if (args[i].startsWith('-s=')) {
        selector = new RegExp(args[i].split('=')[1], 'gi');
    } else if (args[i].startsWith('-x1=')) {
        console.log(`Using prefix: ${args[i].split('=')[1]}`);
        prefix = args[i].split('=')[1];
    } else if (args[i].startsWith('-x2=')) {
        minChapter = Number(args[i].split('=')[1]) || 1;
    } else if (args[i].startsWith('-x3=')) {
        maxChapter = Number(args[i].split('=')[1]) || 10;
    } else {
        urls.push(args[i]);
    }
}

if (urls.length === 0 && prefix === '') {
    console.error('Error: Please provide at least one URL.');
    console.log('Usage: node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...');
    process.exit(1);
}

function extractImageUrls(html, targetUrl, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi) {
    const images = [];
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
        let src = match[1];

        // Also check for data-src, data-lazy-src, etc.
        const dataSrcMatch = match[0].match(/data-src=["']([^"']+)["']/);
        const dataLazyMatch = match[0].match(/data-lazy-src=["']([^"']+)["']/);
        const dataOriginalMatch = match[0].match(/data-original-src=["']([^"']+)["']/);
        const srcsetMatch = match[0].match(/srcset=["']([^"'\s]+)/);

        if (dataSrcMatch) src = dataSrcMatch[1];
        else if (dataLazyMatch) src = dataLazyMatch[1];
        else if (dataOriginalMatch) src = dataOriginalMatch[1];
        else if (srcsetMatch) src = srcsetMatch[1];

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
    }

    // Fallback for manga sites - look for specific classes
    const mangaRegex = /<img[^>]+class="[^"]*(?:wp-manga-chapter-img|page-break|reading-content)[^"]*"[^>]+src=["']([^"']+)["'][^>]*>/gi;
    while ((match = mangaRegex.exec(html)) !== null) {
        const src = match[1];
        if (src) {
            try {
                const absoluteUrl = new URL(src, targetUrl).href;
                if (!images.includes(absoluteUrl)) {
                    images.push(absoluteUrl);
                }
            } catch (e) {
                // ignore
            }
        }
    }

    return images;
}

function extractTitle(html, targetUrl) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : targetUrl;
}

async function extractImages(targetUrl, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi) {
    try {
        console.log(`Fetching: ${targetUrl}...`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const title = extractTitle(html, targetUrl);
        const images = extractImageUrls(html, targetUrl, imgRegex);

        // Create Catalog JSON format
        const catalog = {
            id: Math.random().toString(36).substring(7),
            name: title,
            pages: images.map((url, i) => ({
                id: Math.random().toString(36).substring(7),
                name: `Page ${i + 1}`,
                url: url
            })),
            groupId: groupId,
            createdAt: Date.now()
        };

        console.log(`\n--- CATALOG FOR ${targetUrl} ---`);
        console.log(JSON.stringify(catalog, null, 2));

        return catalog;
    } catch (error) {
        console.error(`\nError extracting from ${targetUrl}: ${error.message}`);
        return null;
    }
}

async function extractMultiple(urls, imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi) {
    const catalogs = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const randomDelay = (to) => 1000 + Math.random() * to; // 1-3 seconds

    for (const url of urls) {
        console.log(`\nProcessing: ${url}`);
        await delay(randomDelay(5000)); // Add delay between requests to be polite
        const catalog = await extractImages(url, imgRegex);
        if (catalog) {
            catalogs.push(catalog);
        }
    }

    // Create filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const uiid = Math.random().toString(36).substring(7); // Random ID
    const filename = `${dateStr}-catalogs-${groupId}-${uiid}.json`;

    // Write to file
    const jsonContent = JSON.stringify(catalogs, null, 2);
    writeFileSync(filename, jsonContent);

    console.log(`\n--- CATALOGS SAVED TO FILE: ${filename} ---`);
    console.log(`Summary: Processed ${urls.length} URLs, extracted ${catalogs.length} catalogs.`);
    console.log(`File location: ${process.cwd()}/${filename}`);
}

if (prefix) {
    const generatedUrls = [];
    for (let i = minChapter; i <= maxChapter; i++) {
        generatedUrls.push(`${prefix}${i}`);
    }
    console.log(`Generated URLs from prefix: ${generatedUrls.length} URLs`);
    extractMultiple(generatedUrls, selector);
} else {
    extractMultiple(urls, selector);
}
