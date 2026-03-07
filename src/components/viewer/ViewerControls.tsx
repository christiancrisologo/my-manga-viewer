import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutGrid, Maximize, Minimize, RotateCw, Settings, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { MangaArchive } from '../../types';
import { cn } from '../../lib/utils';

interface ViewerControlsProps {
    isOpen: boolean;
    manga: MangaArchive;
    currentIndex: number;
    totalPageCount: number;
    onClose: () => void;
    onToggleThumbnails: () => void;
    showThumbnails: boolean;
    onToggleFullScreen: () => void;
    isFullScreen: boolean;
    onRotate: () => void;
    onOpenSettings: () => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    onSlideChange: (val: number) => void;
    onToggleSlideshow: () => void;
    isSlideshowActive: boolean;
}

export function ViewerControls({
    isOpen,
    manga,
    currentIndex,
    totalPageCount,
    onClose,
    onToggleThumbnails,
    showThumbnails,
    onToggleFullScreen,
    isFullScreen,
    onRotate,
    onOpenSettings,
    onPrevPage,
    onNextPage,
    onSlideChange,
    onToggleSlideshow,
    isSlideshowActive
}: ViewerControlsProps) {
    // Hide all UI when in fullscreen AND slideshow is active
    const shouldHideUI = isFullScreen && isSlideshowActive;

    return (
        <>
            <AnimatePresence>
                {isOpen && !shouldHideUI && (
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
                            <div className="overflow-hidden max-w-[200px] text-white">
                                <h2 className="text-sm font-bold truncate">{manga.name}</h2>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                                    Page {currentIndex + 1} of {totalPageCount}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleSlideshow}
                                className={cn("p-2 rounded-full transition-colors", isSlideshowActive ? "bg-emerald-500 text-zinc-950" : "hover:bg-white/10 text-white")}
                                title="Toggle Slideshow (Space)"
                            >
                                {isSlideshowActive ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                            <button
                                onClick={onToggleThumbnails}
                                className={cn("p-2 rounded-full transition-colors", showThumbnails ? "bg-emerald-500 text-zinc-950" : "hover:bg-white/10 text-white")}
                                title="Toggle Thumbnails"
                            >
                                <LayoutGrid size={20} />
                            </button>
                            <button
                                onClick={onToggleFullScreen}
                                className="p-2 hover:bg-white/10 rounded-full text-white"
                                title="Toggle Fullscreen (F)"
                            >
                                {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                            <button onClick={onRotate} className="p-2 hover:bg-white/10 rounded-full text-white">
                                <RotateCw size={20} />
                            </button>
                            <button onClick={onOpenSettings} className="p-2 hover:bg-white/10 rounded-full text-white">
                                <Settings size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!shouldHideUI && (
                <>
                    <div className="absolute inset-y-0 left-1 flex items-center z-30 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrevPage(); }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all active:scale-90 pointer-events-auto"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    </div>
                    <div className="absolute inset-y-0 right-1 flex items-center z-30 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onNextPage(); }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all active:scale-90 pointer-events-auto"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </>
            )}

            <AnimatePresence>
                {isOpen && !shouldHideUI && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-center px-6 z-20 pb-6 pt-10 gap-4"
                    >
                        <div className="w-full max-w-md px-4 pb-2">
                            <input
                                type="range"
                                min="0"
                                max={totalPageCount - 1}
                                value={currentIndex}
                                onChange={(e) => onSlideChange(parseInt(e.target.value))}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
