import fs from 'fs';
import {
  extractImageUrlsFromHtml,
  extractTitleFromHtml,
  createCatalog,
  createPage,
} from './shared/index.js';

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
    try {
      html = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
  } else {
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

  const title = extractTitleFromHtml(html, 'HTML Collection');
  const imageList = extractImageUrlsFromHtml(html);

  const catalog = createCatalog({
    name: title,
    pages: imageList.map((url, i) =>
      createPage({
        name: `Page ${i + 1}`,
        url,
      })
    ),
  });

  console.log('\n--- CATALOG JSON START ---');
  console.log(JSON.stringify(catalog, null, 2));
  console.log('--- CATALOG JSON END ---\n');

  console.log(`Summary: Found ${imageList.length} images.`);
}

run();
