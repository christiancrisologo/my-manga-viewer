import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon } from 'lucide-react';
import { MangaPage, ViewerSettings } from '../../types';
import { cn } from '../../lib/utils';

interface PageRendererProps {
    page: MangaPage | undefined;
    currentIndex: number;
    settings: ViewerSettings;
    offset: { x: number; y: number };
}

export function PageRenderer({
    page,
    currentIndex,
    settings,
    offset
}: PageRendererProps) {
    return (
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
                    {page?.url ? (
                        <img
                            src={page.url}
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
        </div>
    );
}
