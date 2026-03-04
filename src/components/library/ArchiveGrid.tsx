import React from 'react';
import { MangaArchive } from '../../types';
import { ArchiveCard } from './ArchiveCard';

interface ArchiveGridProps {
    archives: MangaArchive[];
    selectedIds: Set<string>;
    isSelectionMode: boolean;
    onSelectManga: (manga: MangaArchive) => void;
    onToggleSelection: (id: string) => void;
    onDeleteArchive: (manga: MangaArchive) => void;
    onEditArchive: (manga: MangaArchive) => void;
}

export function ArchiveGrid({
    archives,
    selectedIds,
    isSelectionMode,
    onSelectManga,
    onToggleSelection,
    onDeleteArchive,
    onEditArchive
}: ArchiveGridProps) {
    if (archives.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em]">Your library is empty</p>
                    <p className="text-xs font-medium text-zinc-700">Add an archive to start reading</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 p-6">
            {archives.map(archive => (
                <ArchiveCard
                    key={archive.id}
                    archive={archive}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(archive.id)}
                    onSelect={onSelectManga}
                    onToggleSelection={onToggleSelection}
                    onDeleteIconClick={onDeleteArchive}
                    onEditIconClick={onEditArchive}
                />
            ))}
        </div>
    );
}
