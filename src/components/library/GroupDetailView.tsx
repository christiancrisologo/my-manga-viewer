import React from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { MangaArchive } from '../../types';
import { ArchiveGrid } from './ArchiveGrid';
import { motion, AnimatePresence } from 'motion/react';

interface GroupDetailViewProps {
    groupId: string;
    archives: MangaArchive[];
    selectedIds: Set<string>;
    isSelectionMode: boolean;
    onBack: () => void;
    onSelectManga: (manga: MangaArchive) => void;
    onToggleSelection: (id: string) => void;
    onDeleteArchive: (manga: MangaArchive) => void;
    onEditArchive: (manga: MangaArchive) => void;
    key?: React.Key;
}

export function GroupDetailView({
    groupId,
    archives,
    selectedIds,
    isSelectionMode,
    onBack,
    onSelectManga,
    onToggleSelection,
    onDeleteArchive,
    onEditArchive
}: GroupDetailViewProps) {
    const label = archives[0]?.series || groupId;

    return (
        <AnimatePresence>
            <motion.div
                key="group-detail"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col flex-1 min-h-0"
            >
                {/* Breadcrumb header */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-900">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-700 transition-all group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <FolderOpen size={18} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">{label}</h2>
                            <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">{archives.length} Catalogs in group</p>
                        </div>
                    </div>
                </div>

                {/* Archive grid for this group */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <ArchiveGrid
                        archives={archives}
                        selectedIds={selectedIds}
                        isSelectionMode={isSelectionMode}
                        onSelectManga={onSelectManga}
                        onToggleSelection={onToggleSelection}
                        onDeleteArchive={onDeleteArchive}
                        onEditArchive={onEditArchive}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
