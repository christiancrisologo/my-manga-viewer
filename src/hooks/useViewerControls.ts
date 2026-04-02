import { useState, useEffect, useCallback, useRef } from 'react';
import { MangaPage, ViewerSettings } from '../types';
import { VIEWER_DEFAULTS } from '../constants';

export function useViewerControls(pages: MangaPage[], onEndReached?: () => void) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [settings, setSettings] = useState<ViewerSettings>({
        slideshowSpeed: VIEWER_DEFAULTS.SLIDESHOW_SPEED,
        isSlideshowActive: false,
        rotation: 0,
        zoom: VIEWER_DEFAULTS.ZOOM,
        fitMode: VIEWER_DEFAULTS.FIT_MODE,
        enableTTS: false,
        offset: { x: 0, y: 0 },
        autoNextCatalog: false
    });
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const nextPage = useCallback(() => {
        if (pages.length === 0) return;
        setCurrentIndex((prev) => {
            if (prev === pages.length - 1) {
                if (settings.autoNextCatalog && onEndReached) {
                    onEndReached();
                    return prev;
                }
                return 0; // loop
            }
            return prev + 1;
        });
        setSettings(s => ({ ...s, zoom: 1, offset: { x: 0, y: 0 } }));
    }, [pages.length, settings.autoNextCatalog, onEndReached]);

    const prevPage = useCallback(() => {
        if (pages.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + pages.length) % pages.length);
        setSettings(s => ({ ...s, zoom: 1, offset: { x: 0, y: 0 } }));
    }, [pages.length]);

    const goToPage = useCallback((index: number) => {
        if (index >= 0 && index < pages.length) {
            setCurrentIndex(index);
            setSettings(s => ({ ...s, zoom: 1, offset: { x: 0, y: 0 } }));
        }
    }, [pages.length]);

    const toggleSlideshow = useCallback(() => {
        setSettings(prev => ({ ...prev, isSlideshowActive: !prev.isSlideshowActive }));
    }, []);

    const handleInteraction = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!settings.isSlideshowActive) setShowControls(false);
        }, 2000);
    }, [settings.isSlideshowActive]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (settings.isSlideshowActive) {
            interval = setInterval(nextPage, settings.slideshowSpeed);
        }
        return () => clearInterval(interval);
    }, [settings.isSlideshowActive, settings.slideshowSpeed, nextPage]);

    return {
        currentIndex,
        setCurrentIndex,
        settings,
        setSettings,
        showControls,
        setShowControls,
        nextPage,
        prevPage,
        goToPage,
        toggleSlideshow,
        handleInteraction
    };
}
