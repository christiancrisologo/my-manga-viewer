import * as cheerio from 'cheerio';
import fs from 'fs';

/**
 * Utility to extract images from HTML content.
 * Usage: 
 *   node extract-html.js <file-path>
 *   cat index.html | node extract-html.js
 */

const filePath = process.argv[2];

async function run() {
    let html = '';

    if (filePath) {
        // Read from file
        try {
            html = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.error(`Error reading file: ${err.message}`);
            process.exit(1);
        }
    } else {
        // Read from stdin
        if (process.stdin.isTTY) {
            console.error('Error: Please provide a file path or pipe HTML content to this script.');
            console.log('Usage:');
            console.log('  node extract-html.js <file-path>');
            console.log('  cat index.html | node extract-html.js');
            process.exit(1);
        }

        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        html = Buffer.concat(chunks).toString('utf8');
    }

    if (!html) {
        console.error('Error: No HTML content provided.');
        process.exit(1);
    }

    const $ = cheerio.load(html);
    const images = new Set();

    $('img').each((_, el) => {
        const src = $(el).attr('src') ||
            $(el).attr('data-src') ||
            $(el).attr('data-lazy-src') ||
            $(el).attr('srcset')?.split(' ')[0];

        if (src && !src.startsWith('data:')) {
            images.add(src);
        }
    });

    const imageList = Array.from(images);

    // Create Catalog JSON format
    const catalog = {
        id: Math.random().toString(36).substring(7),
        name: $('title').text() || 'HTML Collection',
        pages: imageList.map((url, i) => ({
            id: Math.random().toString(36).substring(7),
            name: `Page ${i + 1}`,
            url: url
        })),
        createdAt: Date.now()
    };

    console.log('\n--- CATALOG JSON START ---');
    console.log(JSON.stringify(catalog, null, 2));
    console.log('--- CATALOG JSON END ---\n');

    console.log(`Summary: Found ${imageList.length} images.`);
}

run();
