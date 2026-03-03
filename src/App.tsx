import React, { useState } from 'react';
import Library from './components/Library';
import Viewer from './components/Viewer';
import { MangaArchive } from './types';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [selectedManga, setSelectedManga] = useState<MangaArchive | null>(null);

  return (
    <div className="h-screen w-screen bg-zinc-950 overflow-hidden flex flex-col">
      <AnimatePresence mode="wait">
        {!selectedManga ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full"
          >
            <Library onSelectManga={setSelectedManga} />
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-full w-full"
          >
            <Viewer 
              manga={selectedManga} 
              onClose={() => setSelectedManga(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Status Bar Spacer (Optional for PWA feel) */}
      <div className="h-[env(safe-area-inset-bottom)] bg-zinc-950" />
    </div>
  );
}
