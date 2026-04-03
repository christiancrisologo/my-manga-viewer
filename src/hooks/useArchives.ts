import { useState, useEffect } from 'react';
import { MangaArchive } from '../types';
import { getArchives, saveArchive, deleteArchive, updateArchiveMetadata, createUrl, revokeAllUrls } from '../services/storage';

export function useArchives() {
    const [archives, setArchives] = useState<MangaArchive[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadArchives = async (allowDefaultFetch = false) => {
        setIsLoading(true);
        setError(null);
        revokeAllUrls();
        try {
            // 1. Initial Load from Local DB
            let data = await getArchives();
            const existingIds = new Set(data.map(a => a.id));

            // 2. Discovery Phase: Fetch manifest of public catalogs
            if (allowDefaultFetch) {
                try {
                    const base = import.meta.env.BASE_URL;
                    const manifestResponse = await fetch(`${base}catalogs-manifest.json`);
                    if (manifestResponse.ok) {
                        const manifest: string[] = await manifestResponse.json();
                        
                        // For each file in manifest, check if it contains missing archives
                        for (const path of manifest) {
                            try {
                                const catalogResponse = await fetch(`${base}${path}`);
                                if (catalogResponse.ok) {
                                    const archivesInFile: MangaArchive[] = await catalogResponse.json();
                                    for (const archive of archivesInFile) {
                                        if (archive.id && !existingIds.has(archive.id)) {
                                            console.log(`Discovering new archive: ${archive.name} (ID: ${archive.id})`);
                                            await saveArchive({
                                                ...archive,
                                                createdAt: archive.createdAt || Date.now()
                                            });
                                            existingIds.add(archive.id); // Prevent re-adding within this loop
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn(`Failed to process catalog at ${path}:`, e);
                            }
                        }
                        
                        // Refresh data after potentially saving new ones
                        data = await getArchives();
                    }
                } catch (discoveryErr) {
                    console.warn('Catalog discovery failed or skipped:', discoveryErr);
                }
            }

            // Fallback for legacy catalogs.json if still present and discovered data is still empty
            if (data.length === 0 && allowDefaultFetch) {
                try {
                    const base = import.meta.env.BASE_URL;
                    const response = await fetch(`${base}catalogs.json`);
                    if (response.ok) {
                        const primaryCatalogs: MangaArchive[] = await response.json();
                        for (const archive of primaryCatalogs) {
                            if (archive.name && archive.pages) {
                                await saveArchive({
                                    ...archive,
                                    id: archive.id || crypto.randomUUID(),
                                    createdAt: archive.createdAt || Date.now()
                                });
                            }
                        }
                        data = await getArchives();
                    }
                } catch (fetchErr) {
                    // skip
                }
            }

            const archivesWithUrls = data.map(archive => ({
                ...archive,
                pages: archive.pages.map((page, i) => {
                    if (i === 0) {
                        return { ...page, url: createUrl(page.data || page.url) };
                    }
                    return page;
                })
            }));
            setArchives(archivesWithUrls);
        } catch (err) {
            console.error('Failed to load archives:', err);
            setError('Failed to load archives');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadArchives(true);
        return () => revokeAllUrls();
    }, []);

    const handleDeleteArchive = async (id: string) => {
        try {
            await deleteArchive(id);
            await loadArchives();
        } catch (err) {
            console.error('Failed to delete archive:', err);
            setError('Failed to delete archive');
        }
    };

    const handleUpdateMetadata = async (id: string, metadata: any) => {
        try {
            await updateArchiveMetadata(id, metadata);
            await loadArchives();
        } catch (err) {
            console.error('Failed to update metadata:', err);
            setError('Failed to update metadata');
        }
    };

    return {
        archives,
        isLoading,
        error,
        loadArchives,
        handleDeleteArchive,
        handleUpdateMetadata
    };
}
