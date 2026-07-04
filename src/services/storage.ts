import { get, set, del } from 'idb-keyval';
import { MangaArchive, MangaPage } from '../types';

const ARCHIVES_KEY = 'manga_archives';
const OFFLINE_CACHE_PREFIX = 'manga_offline_cache_';

// Helper to manage blob URLs
const blobUrls = new Set<string>();

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read blob for offline cache'));
    reader.readAsDataURL(blob);
  });
}

function readOfflineCache(archiveId: string): MangaArchive | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${OFFLINE_CACHE_PREFIX}${archiveId}`);
    if (!raw) return null;
    return JSON.parse(raw) as MangaArchive;
  } catch {
    return null;
  }
}

function writeOfflineCache(archive: MangaArchive): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${OFFLINE_CACHE_PREFIX}${archive.id}`,
      JSON.stringify({ ...archive, isCached: true, cachedAt: Date.now() })
    );
  } catch {
    // ignore storage quota issues
  }
}

export function createUrl(data: Blob | string | undefined | null): string | undefined {
  if (!data) return undefined;

  if (typeof data === 'string') {
    return data;
  }

  if (!(data instanceof Blob)) {
    console.error('Invalid data provided to createUrl:', data);
    return undefined;
  }

  const url = URL.createObjectURL(data);
  blobUrls.add(url);
  return url;
}

export function revokeAllUrls() {
  blobUrls.forEach(url => URL.revokeObjectURL(url));
  blobUrls.clear();
}

export async function saveArchive(archive: MangaArchive): Promise<void> {
  const existing = await get<MangaArchive[]>(ARCHIVES_KEY) || [];
  // Merge: If ID exists, update. If not, append.
  const updated = [archive, ...existing.filter(a => a.id !== archive.id)];
  await set(ARCHIVES_KEY, updated);
}

export async function cacheArchiveForOffline(archive: MangaArchive): Promise<MangaArchive | null> {
  if (typeof window === 'undefined') return null;

  const nextPages = await Promise.all(archive.pages.map(async (page): Promise<MangaPage> => {
    if (page.dataUrl) {
      return { ...page, isCached: true };
    }

    if (page.data instanceof Blob) {
      const dataUrl = await blobToDataUrl(page.data);
      return { ...page, dataUrl, isCached: true };
    }

    if (page.url) {
      try {
        const parsedUrl = new URL(page.url, window.location.href);
        const isFetchable = ['http:', 'https:', 'blob:'].includes(parsedUrl.protocol);

        if (isFetchable) {
          const response = await fetch(parsedUrl.toString(), { cache: 'no-store' });
          if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await blobToDataUrl(blob);
            return { ...page, dataUrl, isCached: true };
          }
        }
      } catch {
        // Ignore CORS/network failures and fall back to the original URL.
      }
    }

    return { ...page, isCached: false };
  }));

  const didCacheAny = nextPages.some(page => page.isCached);
  const cachedArchive = {
    ...archive,
    pages: nextPages,
    isCached: didCacheAny,
    cachedAt: didCacheAny ? Date.now() : undefined
  };

  if (didCacheAny) {
    writeOfflineCache(cachedArchive);
    return cachedArchive;
  }

  clearOfflineArchiveCache(archive.id);
  return cachedArchive;
}

export function hasOfflineArchiveCache(archiveId: string): boolean {
  return !!readOfflineCache(archiveId);
}

export function getOfflineArchiveCache(archiveId: string): MangaArchive | null {
  return readOfflineCache(archiveId);
}

export function applyOfflineCacheToArchive(archive: MangaArchive): MangaArchive {
  const cached = readOfflineCache(archive.id);
  if (!cached) {
    return { ...archive, isCached: !!archive.isCached };
  }

  const mergedPages = archive.pages.map((page, index) => {
    const cachedPage = cached.pages?.[index];
    if (cachedPage?.dataUrl) {
      return { ...page, ...cachedPage, dataUrl: cachedPage.dataUrl, isCached: true };
    }
    return { ...page, isCached: !!page.dataUrl || !!page.data };
  });

  return {
    ...archive,
    ...cached,
    pages: mergedPages,
    isCached: true,
    cachedAt: cached.cachedAt ?? archive.cachedAt
  };
}

export function clearOfflineArchiveCache(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${OFFLINE_CACHE_PREFIX}${id}`);
  } catch {
    // ignore
  }
}

export async function saveArchives(newArchives: MangaArchive[]): Promise<{ added: number; skipped: number }> {
  const existing = await get<MangaArchive[]>(ARCHIVES_KEY) || [];
  const updated = [...existing];
  let added = 0;
  let skipped = 0;

  for (const archive of newArchives) {
    // Check if ID already exists or if Name + PageCount match (common for imports)
    const exists = updated.some(a =>
      a.id === archive.id ||
      (a.name === archive.name && a.pages.length === archive.pages.length)
    );

    if (exists) {
      skipped++;
      continue;
    }

    updated.unshift(archive);
    added++;
  }

  await set(ARCHIVES_KEY, updated);
  return { added, skipped };
}

export async function getArchives(): Promise<MangaArchive[]> {
  const archives = await get<MangaArchive[]>(ARCHIVES_KEY) || [];
  // When loading, we need to ensure we don't leak URLs if we call this multiple times
  // but usually we call it once on mount.
  return archives;
}

export async function deleteArchive(id: string): Promise<void> {
  const existing = await get<MangaArchive[]>(ARCHIVES_KEY) || [];
  const updated = existing.filter(a => a.id !== id);
  await set(ARCHIVES_KEY, updated);
}

export async function updateArchiveMetadata(id: string, metadata: Partial<MangaArchive>): Promise<void> {
  const existing = await get<MangaArchive[]>(ARCHIVES_KEY) || [];
  const updated = existing.map(a => {
    if (a.id === id) {
      return { ...a, ...metadata };
    }
    return a;
  });
  await set(ARCHIVES_KEY, updated);
}
