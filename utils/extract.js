import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { URL } from 'url';

/**
 * Standalone Utility to extract images from a given URL using Puppeteer.
 * Usage: 
 *   node . <URL> [selector] [--no-headless]
 * 
 * --no-headless: Launches the browser visibly, allowing you to solve 
 *                Cloudflare challenges manually if needed.
 */

puppeteer.use(StealthPlugin());

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));
const isHeadless = !args.includes('--no-headless');
const customSelector = args.find(a => !a.startsWith('http') && !a.startsWith('--'));

if (!url) {
    console.error('Error: Please provide a URL.');
    console.log('Usage: node . <URL> [selector] [--no-headless]');
    process.exit(1);
}

async function extractImages(targetUrl, selector = 'img', headless = true) {
    let browser;
    try {
        console.log(`Launching ${headless ? 'headless' : 'visible'} browser: ${targetUrl}...`);

        browser = await puppeteer.launch({
            headless: headless ? 'new' : false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1200 });

        console.log('Navigating...');
        if (!headless) {
            console.log('--- VISIBLE MODE ---');
            console.log('If you see a "Just a moment" challenge, please solve it in the browser window.');
        }

        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 120000
        });

        // If headless, we might still be stuck on challenge. 
        // If not headless, the user might be solving it.
        // We wait for the body to contain something other than "Just a moment"
        console.log('Waiting for page content to load...');
        await page.waitForFunction(
            () => !document.title.includes('Just a moment') && document.body.innerText.length > 100,
            { timeout: headless ? 30000 : 300000 } // Give user 5 mins in visible mode
        ).catch(() => {
            if (headless) console.log('Stuck on Cloudflare challenge. Try running with --no-headless');
        });

        console.log(`Final Page Title: ${await page.title()}`);

        // Auto-scroll to trigger lazy-loading
        console.log('Scrolling to trigger lazy-loads...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 600;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight || totalHeight > 50000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Extracting images...');
        const images = await page.evaluate((sel) => {
            const results = [];
            const elements = document.querySelectorAll(sel || 'img');

            elements.forEach(el => {
                let src = el.src ||
                    el.getAttribute('data-src') ||
                    el.getAttribute('data-lazy-src') ||
                    el.getAttribute('data-original-src') ||
                    el.getAttribute('srcset')?.split(' ')[0];

                if (src && !src.startsWith('data:') && !src.includes('favicon')) {
                    results.push(src);
                }
            });

            // Fallback for manga sites
            if (results.length < 5) {
                const fallbacks = document.querySelectorAll('.wp-manga-chapter-img, .page-break img, .reading-content img');
                fallbacks.forEach(el => {
                    const src = el.src || el.getAttribute('data-src') || el.getAttribute('data-lazy-src');
                    if (src && !results.includes(src)) results.push(src);
                });
            }

            return results;
        }, selector);

        const uniqueImages = Array.from(new Set(images));
        const absoluteImages = uniqueImages.map(src => {
            try {
                return new URL(src, targetUrl).href;
            } catch (e) {
                return src;
            }
        });

        // Create Catalog JSON format
        const catalog = {
            id: Math.random().toString(36).substring(7),
            name: await page.title() || targetUrl,
            pages: absoluteImages.map((url, i) => ({
                id: Math.random().toString(36).substring(7),
                name: `Page ${i + 1}`,
                url: url
            })),
            createdAt: Date.now()
        };

        console.log('\n--- CATALOG JSON START ---');
        console.log(JSON.stringify(catalog, null, 2));
        console.log('--- CATALOG JSON END ---\n');

        console.log(`Summary: Found ${absoluteImages.length} images.`);
        await browser.close();
        return absoluteImages;
    } catch (error) {
        console.error(`\nError: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

extractImages(url, customSelector, isHeadless);
