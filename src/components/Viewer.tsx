import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Settings, 
  Play, 
  Pause, 
  X,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  Volume2,
  VolumeX,
  Image as ImageIcon
} from 'lucide-react';
import { MangaArchive, ViewerSettings, MangaPage } from '../types';
import { cn } from '../lib/utils';
import { createUrl, revokeAllUrls } from '../services/storage';

interface ViewerProps {
  manga: MangaArchive;
  onClose: () => void;
}

export default function Viewer({ manga, onClose }: ViewerProps) {
  const [pages, setPages] = useState<MangaPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Generate URLs for all pages when viewer opens
    const pagesWithUrls = manga.pages.map(page => {
      const url = createUrl(page.data || page.url);
      return { ...page, url };
    }).filter(p => !!p.url); // Filter out pages that failed to generate a URL
    
    setPages(pagesWithUrls);

    return () => {
      // Cleanup URLs when viewer closes
      revokeAllUrls();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [manga]);

  const [settings, setSettings] = useState<ViewerSettings>({
    slideshowSpeed: 3000,
    isSlideshowActive: false,
    rotation: 0,
    zoom: 1,
    fitMode: 'contain',
    enableTTS: false
  });
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showPageNumber, setShowPageNumber] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  
  const touchState = useRef({
    initialDistance: 0,
    initialZoom: 1,
    initialOffset: { x: 0, y: 0 },
    lastTouch: { x: 0, y: 0 },
    startX: 0,
    startY: 0,
    isPinching: false,
    isPanning: false
  });

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setShowPageNumber(true);
    if (pageNumberTimeoutRef.current) clearTimeout(pageNumberTimeoutRef.current);
    pageNumberTimeoutRef.current = setTimeout(() => setShowPageNumber(false), 2000);

    // Preload next 3 pages
    const preloadCount = 3;
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = (currentIndex + i) % pages.length;
      if (pages[nextIdx]?.url) {
        const img = new Image();
        img.src = pages[nextIdx].url!;
      }
    }
  }, [currentIndex, pages]);

  const nextPage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % pages.length);
    setOffset({ x: 0, y: 0 });
    setSettings(s => ({ ...s, zoom: 1 }));
  }, [pages.length]);

  const prevPage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + pages.length) % pages.length);
    setOffset({ x: 0, y: 0 });
    setSettings(s => ({ ...s, zoom: 1 }));
  }, [pages.length]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (showThumbnails && thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex, showThumbnails]);

  const lastTapRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && e.touches.length === 1) {
      // Double tap detected
      setSettings(s => ({ ...s, zoom: 1, rotation: 0 }));
      setOffset({ x: 0, y: 0 });
      return;
    }
    lastTapRef.current = now;

    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      touchState.current = {
        ...touchState.current,
        initialDistance: distance,
        initialZoom: settings.zoom,
        isPinching: true,
        isPanning: false
      };
    } else if (e.touches.length === 1) {
      touchState.current = {
        ...touchState.current,
        lastTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialOffset: { ...offset },
        isPanning: settings.zoom > 1,
        isPinching: false
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchState.current.isPinching) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const zoomDelta = distance / touchState.current.initialDistance;
      
      setSettings(prev => ({
        ...prev,
        zoom: Math.min(Math.max(touchState.current.initialZoom * zoomDelta, 0.5), 5)
      }));
    } else if (e.touches.length === 1 && touchState.current.isPanning) {
      const deltaX = e.touches[0].clientX - touchState.current.lastTouch.x;
      const deltaY = e.touches[0].clientY - touchState.current.lastTouch.y;
      
      setOffset({
        x: touchState.current.initialOffset.x + deltaX,
        y: touchState.current.initialOffset.y + deltaY
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchState.current.isPinching && !touchState.current.isPanning && settings.zoom === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - touchState.current.startX;
      const deltaY = endY - touchState.current.startY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
        if (deltaX > 0) {
          prevPage();
        } else {
          nextPage();
        }
      } else if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 100) {
        if (deltaY > 0) {
          prevPage();
        } else {
          nextPage();
        }
      }
    }
    touchState.current.isPinching = false;
    touchState.current.isPanning = false;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (settings.isSlideshowActive) {
      interval = setInterval(nextPage, settings.slideshowSpeed);
    }
    return () => clearInterval(interval);
  }, [settings.isSlideshowActive, settings.slideshowSpeed, nextPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'Escape') onClose();
      if (e.key === 'f' || e.key === 'F') toggleFullScreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage, onClose]);

  const toggleControls = () => {
    setShowControls(prev => !prev);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  };

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!settings.isSlideshowActive) setShowControls(false);
    }, 2000);
  };

  const rotate = () => {
    setSettings(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const zoomIn = () => setSettings(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 3) }));
  const zoomOut = () => setSettings(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.5) }));

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none touch-none"
      onClick={handleInteraction}
      onMouseMove={handleInteraction}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-20"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X size={24} />
              </button>
              <div className="overflow-hidden max-w-[200px]">
                <h2 className="text-sm font-bold text-white truncate">{manga.name}</h2>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                  Page {currentIndex + 1} of {pages.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowThumbnails(prev => !prev); }} 
                className={cn("p-2 rounded-full transition-colors", showThumbnails ? "bg-emerald-500 text-zinc-950" : "hover:bg-white/10 text-white")}
                title="Toggle Thumbnails"
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }} 
                className="p-2 hover:bg-white/10 rounded-full text-white" 
                title="Toggle Fullscreen (F)"
              >
                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
              <button onClick={rotate} className="p-2 hover:bg-white/10 rounded-full text-white">
                <RotateCw size={20} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full text-white">
                <Settings size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewer Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: settings.zoom,
              rotate: settings.rotation,
              x: offset.x,
              y: offset.y
            }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full h-full flex items-center justify-center p-2"
          >
            {pages[currentIndex]?.url ? (
              <img 
                src={pages[currentIndex].url} 
                alt={`Page ${currentIndex + 1}`}
                className={cn(
                  "max-w-full max-h-full object-contain shadow-2xl transition-transform duration-300",
                  settings.fitMode === 'width' && "w-full h-auto",
                  settings.fitMode === 'height' && "h-full w-auto"
                )}
                draggable={false}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-zinc-500">
                <ImageIcon size={48} strokeWidth={1} />
                <p className="text-xs uppercase tracking-widest font-bold">Loading Page...</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <div className="absolute inset-y-0 left-1 flex items-center z-30 pointer-events-none">
          <button 
            onClick={(e) => { e.stopPropagation(); prevPage(); }}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all active:scale-90 pointer-events-auto"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <div className="absolute inset-y-0 right-1 flex items-center z-30 pointer-events-none">
          <button 
            onClick={(e) => { e.stopPropagation(); nextPage(); }}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all active:scale-90 pointer-events-auto"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Page Indicator Overlay */}
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

        {/* Tap areas for navigation */}
        <div className="absolute inset-0 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); prevPage(); }} />
          <div className="w-1/3 h-full cursor-pointer" onClick={toggleControls} />
          <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); nextPage(); }} />
        </div>
      </div>

      {/* Bottom Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-center px-6 z-20 pb-6 pt-10 gap-4"
          >
            {/* Thumbnail Strip */}
            <AnimatePresence>
              {showThumbnails && (
                <motion.div 
                  ref={thumbnailContainerRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full overflow-x-auto no-scrollbar flex gap-2 py-2 px-4"
                  onClick={e => e.stopPropagation()}
                >
                  {pages.map((page, index) => (
                    <button
                      key={page.id}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "flex-shrink-0 w-16 h-24 rounded-md overflow-hidden border-2 transition-all",
                        currentIndex === index ? "border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20" : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      <img 
                        src={page.url} 
                        alt={`Page ${index + 1}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Slider */}
            <div className="w-full max-w-md px-4 pb-2">
              <input 
                type="range" 
                min="0" 
                max={pages.length - 1} 
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-white">Viewer Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Slideshow Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      settings.isSlideshowActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-400"
                    )}>
                      {settings.isSlideshowActive ? <Pause size={18} /> : <Play size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Slideshow</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-medium">Auto-play pages</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, isSlideshowActive: !s.isSlideshowActive }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      settings.isSlideshowActive ? "bg-emerald-500" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.isSlideshowActive ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Zoom Level</label>
                  <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-2xl">
                    <button onClick={zoomOut} className="p-3 hover:bg-zinc-700 rounded-xl text-zinc-300">
                      <ZoomOut size={20} />
                    </button>
                    <span className="text-sm font-mono font-bold text-emerald-400">{(settings.zoom * 100).toFixed(0)}%</span>
                    <button onClick={zoomIn} className="p-3 hover:bg-zinc-700 rounded-xl text-zinc-300">
                      <ZoomIn size={20} />
                    </button>
                  </div>
                </div>

                {/* TTS Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      settings.enableTTS ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-400"
                    )}>
                      {settings.enableTTS ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Image to Speech</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-medium">Experimental OCR</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, enableTTS: !s.enableTTS }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      settings.enableTTS ? "bg-emerald-500" : "bg-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      settings.enableTTS ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                {/* Slideshow Speed */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Slideshow Speed (s)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1000" 
                      max="10000" 
                      step="500"
                      value={settings.slideshowSpeed}
                      onChange={(e) => setSettings(s => ({ ...s, slideshowSpeed: parseInt(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-sm font-mono font-bold text-zinc-300 w-12 text-right">
                      {(settings.slideshowSpeed / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Fit Mode */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Fit Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['contain', 'width', 'height'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSettings(s => ({ ...s, fitMode: mode }))}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                          settings.fitMode === mode 
                            ? "bg-emerald-500 border-emerald-500 text-zinc-950" 
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full mt-10 py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold uppercase tracking-widest hover:bg-white transition-colors"
              >
                Apply Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
