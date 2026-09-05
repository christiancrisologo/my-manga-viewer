import { resolveUrl } from './http.js';

/**
 * Extract title from HTML content.
 * @param {string} html
 * @param {string} [fallback]
 * @returns {string}
 */
export function extractTitleFromHtml(html, fallback = '') {
  if (!html) return fallback;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : fallback;
}

/**
 * Build a regular expression for a class name selector.
 * @param {string} selectorValue
 * @returns {RegExp}
 */
export function createSelectorRegex(selectorValue) {
  const classFirst = `<img[^>]*class="[^"]*${selectorValue}[^"]*"[^>]*src=["']([^"']+)["'][^>]*>`;
  const srcFirst = `<img[^>]*src=["']([^"']+)["'][^>]*class="[^"]*${selectorValue}[^"]*"[^>]*>`;
  return new RegExp(`(?:${classFirst})|(?:${srcFirst})`, 'gi');
}

/**
 * Extract image URLs from HTML without requiring external dependencies (like cheerio).
 * @param {string} html
 * @param {string} [targetUrl] - Base URL to resolve relative paths
 * @param {object} [options]
 * @param {RegExp} [options.selectorRegex] - Custom regex to match <img> elements
 * @param {boolean} [options.verbose] - Whether to log match diagnostics
 * @returns {string[]}
 */
export function extractImageUrlsFromHtml(html, targetUrl = '', options = {}) {
  if (!html) return [];

  const images = [];
  const addImage = (rawSrc) => {
    if (!rawSrc || rawSrc.startsWith('data:') || rawSrc.includes('favicon')) {
      return;
    }
    const cleanSrc = rawSrc.split(' ')[0].trim();
    const finalUrl = targetUrl ? resolveUrl(cleanSrc, targetUrl) : cleanSrc;
    if (finalUrl && !images.includes(finalUrl)) {
      images.push(finalUrl);
    }
  };

  const defaultRegex = /<img[^>]+>/gi;
  const regexToUse = options.selectorRegex || defaultRegex;

  let match;
  let selectorMatches = 0;

  // General tag matching
  const imgTagRegex = /<img\b([^>]*)>/gi;
  while ((match = imgTagRegex.exec(html)) !== null) {
    const tagAttrs = match[1];

    // If custom regex provided, verify tag matches
    if (options.selectorRegex && !options.selectorRegex.test(match[0])) {
      continue;
    }
    selectorMatches++;

    const dataSrcMatch = tagAttrs.match(/\bdata-src=["']([^"']+)["']/i);
    const dataLazyMatch = tagAttrs.match(/\bdata-lazy-src=["']([^"']+)["']/i);
    const dataOriginalMatch = tagAttrs.match(/\bdata-original-src=["']([^"']+)["']/i);
    const srcsetMatch = tagAttrs.match(/\bsrcset=["']([^"'\s,]+)/i);
    const srcMatch = tagAttrs.match(/\bsrc=["']([^"']+)["']/i);

    const src =
      dataSrcMatch?.[1] ||
      dataLazyMatch?.[1] ||
      dataOriginalMatch?.[1] ||
      srcsetMatch?.[1] ||
      srcMatch?.[1];

    addImage(src);
  }

  if (options.verbose) {
    if (selectorMatches > 0) {
      console.log(`  ✓ Matched ${selectorMatches} image element(s)`);
    } else {
      console.log(`  ⚠ Selector did not match any images, trying fallback patterns...`);
    }
  }

  // Fallback for common manga sites if nothing or few found
  if (images.length === 0) {
    const mangaRegex =
      /<img[^>]+class="[^"]*(?:wp-manga-chapter-img|page-break|reading-content)[^"]*"[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let fallbackMatches = 0;
    while ((match = mangaRegex.exec(html)) !== null) {
      if (match[1]) {
        addImage(match[1]);
        fallbackMatches++;
      }
    }
    if (options.verbose && fallbackMatches > 0) {
      console.log(`  ✓ Fallback matched ${fallbackMatches} additional image(s)`);
    }
  }

  return images;
}
