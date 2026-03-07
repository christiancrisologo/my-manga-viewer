import { useState, useEffect } from 'react';

export interface AppConfig {
    uploadLocalFile: boolean;
    supportedUploadableFiles: string[];
    importFromUrl: boolean;
    importableFilesFromUrl: string[];
    webExtractor: boolean;
    jsonCatalogEditor: boolean;
    imageToSpeech: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
    uploadLocalFile: true,
    supportedUploadableFiles: ['cbz', 'zip', 'rar', 'cbr', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
    importFromUrl: true,
    importableFilesFromUrl: ['cbz', 'zip'],
    webExtractor: true,
    jsonCatalogEditor: true,
    imageToSpeech: false,
};

let cachedConfig: AppConfig | null = null;

export function useAppConfig() {
    const [config, setConfig] = useState<AppConfig>(cachedConfig ?? DEFAULT_CONFIG);
    const [isLoaded, setIsLoaded] = useState(!!cachedConfig);

    useEffect(() => {
        if (cachedConfig) return;

        fetch('/settings.json')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load settings.json');
                return res.json();
            })
            .then((data: Partial<AppConfig>) => {
                const merged: AppConfig = { ...DEFAULT_CONFIG, ...data };
                cachedConfig = merged;
                setConfig(merged);
                setIsLoaded(true);
            })
            .catch(() => {
                // Fall back to defaults gracefully
                cachedConfig = DEFAULT_CONFIG;
                setIsLoaded(true);
            });
    }, []);

    return { config, isLoaded };
}
