import { useState, useEffect } from 'react';
import { MangaArchive } from '../types';
import { getArchives, deleteArchive, updateArchiveMetadata, createUrl, revokeAllUrls } from '../services/storage';

export function useArchives() {
    const [archives, setArchives] = useState<MangaArchive[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadArchives = async () => {
        setIsLoading(true);
        setError(null);
        revokeAllUrls();
        try {
            const data = await getArchives();
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
        loadArchives();
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
