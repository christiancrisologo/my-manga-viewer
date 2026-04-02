import React, { useState } from 'react';
import Library from './components/Library';
import Viewer from './components/Viewer';
import { MangaArchive } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [selectedManga, setSelectedManga] = useState<MangaArchive | null>(null);
  const [currentQueue, setCurrentQueue] = useState<MangaArchive[]>([]);

  const handleNextCatalog = () => {
    if (!selectedManga || currentQueue.length === 0) return;
    const currentIndex = currentQueue.findIndex(m => m.id === selectedManga.id);
    if (currentIndex >= 0 && currentIndex < currentQueue.length - 1) {
      setSelectedManga(currentQueue[currentIndex + 1]);
    } else {
      setSelectedManga(null);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 overflow-hidden flex flex-col relative">
      <div 
        className={cn("absolute inset-0 transition-opacity duration-300", selectedManga ? "opacity-0 pointer-events-none" : "opacity-100 z-10")}
      >
        <Library 
          onSelectManga={(manga, queue) => {
            setSelectedManga(manga);
            if (queue) setCurrentQueue(queue);
          }} 
        />
      </div>

      <AnimatePresence>
        {selectedManga && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-20"
          >
            <Viewer 
              manga={selectedManga} 
              onClose={() => setSelectedManga(null)} 
              onEndReached={handleNextCatalog}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Status Bar Spacer (Optional for PWA feel) */}
      <div className="h-[env(safe-area-inset-bottom)] bg-zinc-950 z-30" />
    </div>
  );
}
