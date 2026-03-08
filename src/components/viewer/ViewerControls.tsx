import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutGrid, Maximize, Minimize, RotateCw, Settings, ChevronLeft, ChevronRight, Play, Pause, MoreHorizontal } from 'lucide-react';
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
    const [showMobileMenu, setShowMobileMenu] = React.useState(false);

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
                        className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-40"
                    >
                        <div className="flex items-center gap-4 flex-1 mr-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                            >
                                <X size={24} />
                            </button>
                            <div className="overflow-hidden text-white flex-1">
                                <h2 className="text-sm font-bold truncate">{manga.name}</h2>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                                    Page {currentIndex + 1} of {totalPageCount}
                                </p>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-1 sm:gap-2">
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

                            {/* Options Menu (Desktop: inline, Mobile: dropdown) */}
                            <div className="hidden sm:flex items-center gap-1">
                                <button onClick={onRotate} className="p-2 hover:bg-white/10 rounded-full text-white" title="Rotate">
                                    <RotateCw size={20} />
                                </button>
                                <button onClick={onOpenSettings} className="p-2 hover:bg-white/10 rounded-full text-white" title="Settings">
                                    <Settings size={20} />
                                </button>
                            </div>

                            <div className="sm:hidden relative">
                                <button
                                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                                    className={cn("p-2 rounded-full transition-colors", showMobileMenu ? "bg-zinc-700 text-white" : "hover:bg-white/10 text-white")}
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                <AnimatePresence>
                                    {showMobileMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute right-0 top-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-50 min-w-[160px]"
                                        >
                                            <button
                                                onClick={() => { onRotate(); setShowMobileMenu(false); }}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                                            >
                                                <RotateCw size={18} />
                                                <span>Rotate</span>
                                            </button>
                                            <button
                                                onClick={() => { onOpenSettings(); setShowMobileMenu(false); }}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                                            >
                                                <Settings size={18} />
                                                <span>More Options</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!shouldHideUI && (
                <>
                    <div className="absolute inset-y-0 left-2 flex items-center z-30 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrevPage(); }}
                            className="p-4 sm:p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-emerald-500 transition-all active:scale-95 pointer-events-auto border border-white/5"
                        >
                            <ChevronLeft size={36} className="sm:hidden" />
                            <ChevronLeft size={24} className="hidden sm:block" />
                        </button>
                    </div>
                    <div className="absolute inset-y-0 right-2 flex items-center z-30 pointer-events-none">
                        <button
                            onClick={(e) => { e.stopPropagation(); onNextPage(); }}
                            className="p-4 sm:p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/30 hover:text-emerald-500 transition-all active:scale-95 pointer-events-auto border border-white/5"
                        >
                            <ChevronRight size={36} className="sm:hidden" />
                            <ChevronRight size={24} className="hidden sm:block" />
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
