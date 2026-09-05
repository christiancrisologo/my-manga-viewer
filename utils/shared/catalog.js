import path from 'path';
import { generateId } from './helpers.js';

/**
 * Construct a standardized manga page item.
 * @param {{ id?: string, name?: string, url?: string, dataUrl?: string }} options
 * @returns {{ id: string, name: string, url: string, dataUrl?: string }}
 */
export function createPage({ id, name = 'Page', url = '', dataUrl }) {
  const page = {
    id: id || generateId(),
    name,
    url
  };
  if (dataUrl) {
    page.dataUrl = dataUrl;
  }
  return page;
}

/**
 * Construct a standardized manga catalog/archive entry.
 * @param {{ id?: string, name?: string, pages: any[], groupId?: string, createdAt?: number, [key: string]: any }} options
 * @returns {object}
 */
export function createCatalog({
  id,
  name = 'Untitled Archive',
  pages = [],
  groupId,
  createdAt,
  ...extra
}) {
  const catalog = {
    id: id || generateId(),
    name,
    pages,
    createdAt: createdAt || Date.now()
  };

  if (groupId) {
    catalog.groupId = groupId;
  }

  // Preserve any additional metadata properties
  const validExtraKeys = [
    'author',
    'genre',
    'description',
    'series',
    'volume',
    'chapter',
    'season',
    'released',
    'size',
    'isCached',
    'cachedAt'
  ];

  for (const key of validExtraKeys) {
    if (extra[key] !== undefined) {
      catalog[key] = extra[key];
    }
  }

  return catalog;
}

/**
 * Parse chapter number from filename or catalog title.
 * @param {string} catalogFile
 * @param {string} [catalogName]
 * @returns {number}
 */
export function parseChapterNumber(catalogFile, catalogName) {
  const fileMatch = path
    .basename(catalogFile, path.extname(catalogFile))
    .match(/chapter[-_]?([0-9]+)/i);
  if (fileMatch) return Number(fileMatch[1]);

  const nameMatch = (catalogName || '').match(/chapter\s*([0-9]+)/i);
  if (nameMatch) return Number(nameMatch[1]);

  return 1;
}

/**
 * Normalize a catalog filename into a clean slug base.
 * @param {string} catalogFile
 * @returns {string}
 */
export function normalizeCatalogBase(catalogFile) {
  return path
    .basename(catalogFile, path.extname(catalogFile))
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Generate output filename for a catalog page.
 * @param {string} baseName
 * @param {number} chapter
 * @param {number} pageIndex
 * @param {string} [ext]
 * @returns {string}
 */
export function getOutputFilename(baseName, chapter, pageIndex, ext = 'jpg') {
  return `${baseName}-chapter-${chapter}-page-${pageIndex + 1}.${ext}`;
}

/**
 * Merge new archives into an existing archives array, deduplicating by ID, chapter, or name.
 * @param {any[]} existingArchives
 * @param {any[]} newArchives
 * @returns {any[]}
 */
export function mergeArchives(existingArchives, newArchives) {
  const updated = [...existingArchives];
  const indexById = new Map();
  const indexByChapter = new Map();
  const indexByName = new Map();

  existingArchives.forEach((archive, index) => {
    if (archive.id) indexById.set(archive.id, index);
    if (archive.chapter !== undefined && archive.chapter !== null) {
      indexByChapter.set(String(archive.chapter).toLowerCase(), index);
    }
    if (archive.name) {
      indexByName.set(archive.name.trim().toLowerCase(), index);
    }
  });

  for (const archive of newArchives) {
    let existingIndex;

    if (archive.id && indexById.has(archive.id)) {
      existingIndex = indexById.get(archive.id);
    } else if (
      archive.chapter !== undefined &&
      archive.chapter !== null &&
      indexByChapter.has(String(archive.chapter).toLowerCase())
    ) {
      existingIndex = indexByChapter.get(String(archive.chapter).toLowerCase());
    } else if (archive.name && indexByName.has(archive.name.trim().toLowerCase())) {
      existingIndex = indexByName.get(archive.name.trim().toLowerCase());
    }

    if (existingIndex !== undefined) {
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        ...archive,
        pages: archive.pages
      };
    } else {
      updated.push(archive);
    }
  }

  return updated;
}
