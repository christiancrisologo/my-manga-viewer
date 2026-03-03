import { get, set, del } from 'idb-keyval';
import { MangaArchive } from '../types';

const ARCHIVES_KEY = 'manga_archives';

// Helper to manage blob URLs
const blobUrls = new Set<string>();

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
  // We store the data as Blobs, which IndexedDB handles natively
  const updated = [archive, ...existing.filter(a => a.id !== archive.id)];
  await set(ARCHIVES_KEY, updated);
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
