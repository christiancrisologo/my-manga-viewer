import { writeFileSync } from 'fs';

/**
 * Standalone Utility to extract images from given URLs using simple fetch and regex.
 * Usage:
 *   node . [-g=groupId] [-s=selector] <URL1> [URL2] [URL3] ...
 */

const args = process.argv.slice(2);
let groupId = 'default-group';
let selector = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const urls = [];

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-g=')) {
        groupId = args[i].split('=')[1];
    } else if (args[i].startsWith('-s=')) {
        selector = new RegExp(args[i].split('=')[1], 'gi');
    } else {
        urls.push(args[i]);
    }
}

if (urls.length === 0) {
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
    for (const url of urls) {
        console.log(`\nProcessing: ${url}`);
        const catalog = await extractImages(url, imgRegex);
        if (catalog) {
            catalogs.push(catalog);
        }
    }

    // Create filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${dateStr}-catalogs.json`;

    // Write to file
    const jsonContent = JSON.stringify(catalogs, null, 2);
    writeFileSync(filename, jsonContent);

    console.log(`\n--- CATALOGS SAVED TO FILE: ${filename} ---`);
    console.log(`Summary: Processed ${urls.length} URLs, extracted ${catalogs.length} catalogs.`);
    console.log(`File location: ${process.cwd()}/${filename}`);
}

extractMultiple(urls, selector);
