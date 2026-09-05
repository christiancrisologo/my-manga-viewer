let cachedSharp = null;
let sharpLoadAttempted = false;

/**
 * Lazily load the sharp library if available.
 * @returns {Promise<any | null>}
 */
export async function getSharp() {
  if (sharpLoadAttempted) {
    return cachedSharp;
  }
  sharpLoadAttempted = true;
  try {
    const mod = await import('sharp');
    cachedSharp = mod.default || mod;
    return cachedSharp;
  } catch {
    console.warn('Sharp not installed. Image conversion disabled. Install with: npm install sharp');
    return null;
  }
}

export const FORMAT_MAP = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  gif: 'gif',
  tiff: 'tiff',
  avif: 'avif'
};

/**
 * Normalize format name for Sharp (e.g. 'jpg' -> 'jpeg').
 * @param {string} format
 * @returns {string}
 */
export function normalizeFormat(format) {
  const lower = (format || '').toLowerCase().replace(/^\./, '');
  return FORMAT_MAP[lower] || lower;
}

/**
 * Check if a MIME type represents an image.
 * @param {string} mime
 * @returns {boolean}
 */
export function isImageMime(mime) {
  return /^image\//i.test(mime || '');
}

/**
 * Check if a MIME type represents a JPEG image.
 * @param {string} mime
 * @returns {boolean}
 */
export function isJpegMime(mime) {
  return /^image\/(jpeg|jpg)$/i.test(mime || '');
}

/**
 * Convert an image file or Buffer to a target format using Sharp.
 * @param {Buffer | string} input - Filepath string or Buffer
 * @param {string} outputPath - Target file path
 * @param {string} targetFormat - Format like 'jpg', 'jpeg', 'webp', 'png'
 * @param {{ quality?: number, progressive?: boolean }} [options]
 * @returns {Promise<string>} Returns outputPath on success
 */
export async function convertImage(input, outputPath, targetFormat = 'jpeg', options = {}) {
  const sharp = await getSharp();
  if (!sharp) {
    throw new Error('Sharp is not available for image conversion.');
  }

  const normalized = normalizeFormat(targetFormat);
  const quality = options.quality ?? 90;
  const progressive = options.progressive ?? true;

  await sharp(input)
    .toFormat(normalized, { quality, progressive })
    .toFile(outputPath);

  return outputPath;
}
