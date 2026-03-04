import React, { useState, useEffect } from 'react';
import { MangaArchive, ViewerSettings, MangaPage } from '../types';
import { createUrl, revokeAllUrls } from '../services/storage';
import { useViewerControls } from '../hooks/useViewerControls';
import { useTouchGestures } from '../hooks/useTouchGestures';
import { ViewerControls } from './viewer/ViewerControls';
import { PageRenderer } from './viewer/PageRenderer';
import { ThumbnailStrip } from './viewer/ThumbnailStrip';
import { ViewerSettingsModal } from './viewer/ViewerSettingsModal';
import { motion, AnimatePresence } from 'motion/react';

interface ViewerProps {
  manga: MangaArchive;
  onClose: () => void;
}

export default function Viewer({ manga, onClose }: ViewerProps) {
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showPageNumber, setShowPageNumber] = useState(false);

  const {
    currentIndex,
    setCurrentIndex,
    settings,
    setSettings,
    showControls,
    setShowControls,
    nextPage,
    prevPage,
    goToPage,
    handleInteraction
  } = useViewerControls(pages);

  const {
    offset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useTouchGestures({
    zoom: settings.zoom,
    setZoom: (val) => typeof val === 'function' ? setSettings(s => ({ ...s, zoom: val(s.zoom) })) : setSettings(s => ({ ...s, zoom: val })),
    nextPage,
    prevPage,
    toggleControls: () => setShowControls(prev => !prev)
  });

  useEffect(() => {
    const pagesWithUrls = manga.pages.map(page => ({
      ...page,
      url: createUrl(page.data || page.url)
    })).filter(p => !!p.url);

    setPages(pagesWithUrls);

    return () => {
      revokeAllUrls();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, [manga]);

  useEffect(() => {
    setShowPageNumber(true);
    const timeout = setTimeout(() => setShowPageNumber(false), 2000);

    // Preload next 3 pages
    const preloadCount = 3;
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = (currentIndex + i) % pages.length;
      if (pages[nextIdx]?.url) {
        const img = new Image();
        img.src = pages[nextIdx].url!;
      }
    }
    return () => clearTimeout(timeout);
  }, [currentIndex, pages]);

  useEffect(() => {
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') toggleFullScreen();
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextPage, prevPage, onClose]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none touch-none"
      onClick={handleInteraction}
      onMouseMove={handleInteraction}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <ViewerControls
        isOpen={showControls}
        manga={manga}
        currentIndex={currentIndex}
        totalPageCount={pages.length}
        onClose={onClose}
        onToggleThumbnails={() => setShowThumbnails(p => !p)}
        showThumbnails={showThumbnails}
        onToggleFullScreen={toggleFullScreen}
        isFullScreen={isFullScreen}
        onRotate={() => setSettings(s => ({ ...s, rotation: (s.rotation + 90) % 360 }))}
        onOpenSettings={() => setShowSettings(true)}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onSlideChange={goToPage}
      />

      <PageRenderer
        page={pages[currentIndex]}
        currentIndex={currentIndex}
        settings={settings}
        offset={offset}
      />

      <AnimatePresence>
        {showPageNumber && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 text-white/60 text-[10px] font-bold tracking-[0.2em] z-40 uppercase"
          >
            {currentIndex + 1} / {pages.length}
          </motion.div>
        )}
      </AnimatePresence>

      <ThumbnailStrip
        pages={pages}
        currentIndex={currentIndex}
        onPageSelect={goToPage}
        isOpen={showThumbnails}
      />

      <ViewerSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
