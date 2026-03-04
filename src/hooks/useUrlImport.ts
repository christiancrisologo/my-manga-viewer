import { useEffect, useRef } from 'react';
import { MangaPage } from '../types';

interface UseUrlImportProps {
    processFiles: (files: File[], password?: string) => Promise<{ pages: MangaPage[]; name: string }>;
    onArchiveReady: (name: string, pages: MangaPage[]) => void;
    onPasswordRequired: (file: File) => void;
}

export function useUrlImport({
    processFiles,
    onArchiveReady,
    onPasswordRequired
}: UseUrlImportProps) {
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;

        const params = new URLSearchParams(window.location.search);
        const archiveParam = params.get('a');

        if (archiveParam) {
            hasRun.current = true;
            console.log(`[useUrlImport] Detected archive param: ${archiveParam}`);

            const loadFromPublic = async () => {
                try {
                    // Start by trying .cbz
                    console.log(`[useUrlImport] Attempting to fetch /${archiveParam}.cbz...`);
                    let response = await fetch(`/${archiveParam}.cbz`);
                    let fileName = `${archiveParam}.cbz`;

                    // If it's 404 OR it returned index.html (SPA fallback), try .zip
                    const contentType = response.headers.get('Content-Type') || '';
                    const isHtml = contentType.includes('text/html');

                    if (!response.ok || isHtml) {
                        console.log(`[useUrlImport] .cbz not found or returned HTML (${response.status}, ${contentType}). Trying .zip...`);
                        response = await fetch(`/${archiveParam}.zip`);
                        fileName = `${archiveParam}.zip`;
                    }

                    // Check again for the zip result
                    const finalContentType = response.headers.get('Content-Type') || '';
                    const isStillHtml = finalContentType.includes('text/html');

                    if (!response.ok || isStillHtml) {
                        console.error(`[useUrlImport] Failed to find binary archive. Status: ${response.status}, Content-Type: ${finalContentType}`);
                        throw new Error(`Could not find a valid binary archive for "${archiveParam}" in public folder (tried .cbz and .zip)`);
                    }

                    console.log(`[useUrlImport] Found archive: ${fileName} (${response.status}, ${finalContentType})`);
                    const buffer = await response.arrayBuffer();
                    const file = new File([buffer], fileName, {
                        type: finalContentType || 'application/zip'
                    });

                    console.log(`[useUrlImport] Processing file: ${fileName}, size: ${buffer.byteLength} bytes`);
                    try {
                        const { pages, name } = await processFiles([file]);
                        console.log(`[useUrlImport] Archive processed successfully: ${name}, ${pages.length} pages`);
                        onArchiveReady(name, pages);
                    } catch (err: any) {
                        if (err.message === 'PASSWORD_REQUIRED') {
                            console.log(`[useUrlImport] Password required for ${fileName}`);
                            onPasswordRequired(file);
                        } else {
                            throw err;
                        }
                    }

                    // Clear URL parameter
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (err) {
                    console.error('[useUrlImport] Error during import:', err);
                }
            };
            loadFromPublic();
        }
    }, [processFiles, onArchiveReady, onPasswordRequired]);
}
