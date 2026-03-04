import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MangaPage } from '../../types';
import { cn } from '../../lib/utils';

interface ThumbnailStripProps {
    pages: MangaPage[];
    currentIndex: number;
    onPageSelect: (index: number) => void;
    isOpen: boolean;
}

export function ThumbnailStrip({
    pages,
    currentIndex,
    onPageSelect,
    isOpen
}: ThumbnailStripProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const activeThumb = containerRef.current.children[currentIndex] as HTMLElement;
            if (activeThumb) {
                activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [currentIndex, isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={containerRef}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full overflow-x-auto no-scrollbar flex gap-2 py-2 px-4 bg-black/40 backdrop-blur-md border-t border-white/5"
                    onClick={e => e.stopPropagation()}
                >
                    {pages.map((page, index) => (
                        <button
                            key={page.id}
                            onClick={() => onPageSelect(index)}
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
    );
}
