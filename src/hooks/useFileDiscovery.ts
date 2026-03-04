import { useState } from 'react';
import { BlobReader, ZipReader, BlobWriter } from '@zip.js/zip.js';
import { createExtractorFromData } from 'node-unrar-js';
import { MangaPage } from '../types';

export function useFileDiscovery() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processFiles = async (fileList: File[], password?: string): Promise<{ pages: MangaPage[]; name: string }> => {
        setIsProcessing(true);
        setError(null);
        try {
            let pages: MangaPage[] = [];
            let name = "";

            for (const file of fileList) {
                if (!name) name = file.name.replace(/\.[^/.]+$/, "");

                if (file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.cbz') || file.name.toLowerCase().endsWith('.coz')) {
                    const reader = new ZipReader(new BlobReader(file), { password });
                    try {
                        const entries = await reader.getEntries();
                        const imageEntries = entries.filter(entry =>
                            entry.filename && /\.(jpg|jpeg|png|webp|avif)$/i.test(entry.filename) && !entry.directory
                        ).sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

                        for (const entry of imageEntries) {
                            // After filtering !entry.directory, entry is effectively a FileEntry
                            const fileEntry = entry as any;
                            if (fileEntry.getData) {
                                const blob = await fileEntry.getData(new BlobWriter());
                                pages.push({
                                    id: crypto.randomUUID(),
                                    name: fileEntry.filename.split('/').pop() || fileEntry.filename,
                                    data: blob
                                });
                            }
                        }
                    } catch (err: any) {
                        console.error('ZIP Error:', err);
                        // Check for encrypted ZIP error
                        if (err.message?.includes('encrypted') || err.message?.includes('password') || err.name === 'EncryptedZipError') {
                            throw new Error('PASSWORD_REQUIRED');
                        }
                        throw err;
                    } finally {
                        await reader.close();
                    }
                } else if (file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.cbr')) {
                    const buffer = await file.arrayBuffer();
                    const extractor = await createExtractorFromData({ data: new Uint8Array(buffer) as any, password });
                    const list = extractor.getFileList();
                    const fileHeaders = Array.from(list.fileHeaders);

                    const imageHeaders = fileHeaders.filter(header =>
                        /\.(jpg|jpeg|png|webp|avif)$/i.test(header.name) && !header.flags.directory
                    ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

                    const extracted = extractor.extract({ files: imageHeaders.map(h => h.name) });
                    for (const fileItem of extracted.files) {
                        if (fileItem.extraction) {
                            pages.push({
                                id: crypto.randomUUID(),
                                name: fileItem.fileHeader.name.split('/').pop() || fileItem.fileHeader.name,
                                data: new Blob([fileItem.extraction as any])
                            });
                        }
                    }
                } else if (file.type.startsWith('image/')) {
                    pages.push({
                        id: crypto.randomUUID(),
                        name: file.name,
                        data: file
                    });
                }
            }

            if (pages.length === 0) {
                throw new Error('No images found.');
            }

            return { pages, name };
        } catch (err: any) {
            console.error('File processing error:', err);
            setError(err.message || 'Failed to process file');
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        error,
        processFiles
    };
}
