import fs from 'fs';
import path from 'path';
import { ensureDir } from './helpers.js';

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tiff',
  '.svg',
  '.avif'
];

/**
 * Check whether a URL points directly to an image file based on its extension.
 * @param {string} url
 * @returns {boolean}
 */
export function isDirectImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().split('?')[0].split('#')[0];
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Safely resolve a potentially relative URL against a base URL.
 * @param {string} relativeOrAbsolute
 * @param {string} baseUrl
 * @returns {string | null}
 */
export function resolveUrl(relativeOrAbsolute, baseUrl) {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Fetch a remote URL and return its raw buffer and content type.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ buffer: Buffer, contentType: string, status: number }>}
 */
export async function fetchBuffer(url, options = {}) {
  const headers = {
    'User-Agent': DEFAULT_USER_AGENT,
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const arrayBuf = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  return { buffer, contentType, status: response.status };
}

/**
 * Download a remote image URL directly to a file on disk.
 * @param {string} url
 * @param {string} targetPath
 * @param {{ headers?: Record<string, string>, silent?: boolean }} [options]
 * @returns {Promise<string | null>} Returns targetPath if successful, or null on error
 */
export async function downloadImageFile(url, targetPath, options = {}) {
  try {
    if (!options.silent) {
      console.log(`  ↓ Downloading: ${url}`);
    }
    const { buffer } = await fetchBuffer(url, { headers: options.headers });
    ensureDir(path.dirname(targetPath));
    await fs.promises.writeFile(targetPath, buffer);
    if (!options.silent) {
      console.log(`  ✓ Saved: ${path.basename(targetPath)}`);
    }
    return targetPath;
  } catch (error) {
    if (!options.silent) {
      console.error(`  ✗ Failed to download ${path.basename(targetPath)}: ${error.message}`);
    }
    return null;
  }
}
