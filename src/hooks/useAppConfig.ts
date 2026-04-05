import { useState, useEffect, useCallback } from 'react';

export interface FavoriteItem {
    id: string;
    name: string;
}

export interface AppConfig {
    uploadLocalFile: boolean;
    supportedUploadableFiles: string[];
    importFromUrl: boolean;
    importableFilesFromUrl: string[];
    webExtractor: boolean;
    jsonCatalogEditor: boolean;
    imageToSpeech: boolean;
    autoNextChapter: boolean;
    slideShowDelay: number;
    viewMode: 'single' | 'scroll';
    favorites: FavoriteItem[];
}

const LOCAL_STORAGE_KEY = 'manga_viewer_config_overrides';

const DEFAULT_CONFIG: AppConfig = {
    uploadLocalFile: true,
    supportedUploadableFiles: ['cbz', 'zip', 'rar', 'cbr', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
    importFromUrl: true,
    importableFilesFromUrl: ['cbz', 'zip'],
    webExtractor: true,
    jsonCatalogEditor: true,
    imageToSpeech: false,
    autoNextChapter: false,
    slideShowDelay: 3000,
    viewMode: 'single',
    favorites: [],
};

function loadLocalOverrides(): Partial<AppConfig> {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveLocalOverrides(overrides: Partial<AppConfig>) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
        // ignore
    }
}

// Module-level listeners so all hook instances stay in sync
const listeners = new Set<(config: AppConfig) => void>();
let cachedConfig: AppConfig | null = null;

function broadcastConfig(config: AppConfig) {
    cachedConfig = config;
    listeners.forEach(fn => fn(config));
}

export function useAppConfig() {
    const [config, setConfig] = useState<AppConfig>(cachedConfig ?? DEFAULT_CONFIG);
    const [isLoaded, setIsLoaded] = useState(!!cachedConfig);

    useEffect(() => {
        listeners.add(setConfig);
        return () => { listeners.delete(setConfig); };
    }, []);

    useEffect(() => {
        if (cachedConfig) return;
        const base = import.meta.env.BASE_URL;
        fetch(`${base}settings.json`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to load settings.json');
                return res.json();
            })
            .then((data: Partial<AppConfig>) => {
                const localOverrides = loadLocalOverrides();
                const merged: AppConfig = { ...DEFAULT_CONFIG, ...data, ...localOverrides };
                broadcastConfig(merged);
                setIsLoaded(true);
            })
            .catch(() => {
                const localOverrides = loadLocalOverrides();
                const merged: AppConfig = { ...DEFAULT_CONFIG, ...localOverrides };
                broadcastConfig(merged);
                setIsLoaded(true);
            });
    }, []);

    const updateConfig = useCallback((updates: Partial<AppConfig>) => {
        const current = cachedConfig ?? DEFAULT_CONFIG;
        const next: AppConfig = { ...current, ...updates };
        // Persist user-controlled overrides to localStorage
        const existing = loadLocalOverrides();
        saveLocalOverrides({ ...existing, ...updates });
        broadcastConfig(next);
    }, []);

    return { config, isLoaded, updateConfig };
}
