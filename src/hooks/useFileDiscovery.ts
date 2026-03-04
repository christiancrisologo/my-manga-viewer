import { useState } from 'react';
import JSZip from 'jszip';
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
                    const zip = new JSZip();
                    const contents = await zip.loadAsync(file);
                    const imageFiles = Object.keys(contents.files).filter(fileName =>
                        /\.(jpg|jpeg|png|webp|avif)$/i.test(fileName) && !contents.files[fileName].dir
                    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                    for (const fileName of imageFiles) {
                        const blob = await contents.files[fileName].async('blob');
                        pages.push({
                            id: crypto.randomUUID(),
                            name: fileName.split('/').pop() || fileName,
                            data: blob
                        });
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
