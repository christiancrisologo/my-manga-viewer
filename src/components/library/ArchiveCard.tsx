import React from 'react';
import { Trash2, Image as ImageIcon, CheckCircle2, Circle } from 'lucide-react';
import { MangaArchive } from '../../types';
import { cn, formatSize } from '../../lib/utils';
import { motion } from 'motion/react';

interface ArchiveCardProps {
    archive: MangaArchive;
    isSelected: boolean;
    isSelectionMode: boolean;
    onSelect: (manga: MangaArchive) => void;
    onToggleSelection: (id: string) => void;
    onDeleteIconClick: (manga: MangaArchive) => void;
    onEditIconClick: (manga: MangaArchive) => void;
}

export function ArchiveCard({
    archive,
    isSelected,
    isSelectionMode,
    onSelect,
    onToggleSelection,
    onDeleteIconClick,
    onEditIconClick
}: ArchiveCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden transition-all duration-500 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer aspect-[3/4.5]",
                isSelected && "border-emerald-500 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/20"
            )}
            onClick={() => isSelectionMode ? onToggleSelection(archive.id) : onSelect(archive)}
        >
            {/* Cover Image */}
            <div className="absolute inset-0">
                {archive.pages[0]?.url ? (
                    <img
                        src={archive.pages[0].url}
                        alt={archive.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                        <ImageIcon size={48} strokeWidth={1} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent group-hover:via-zinc-950/40 transition-all duration-500" />
            </div>

            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0 duration-300">
                <div className="flex gap-2">
                    {!isSelectionMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditIconClick(archive); }}
                            className="p-2.5 bg-zinc-900/80 backdrop-blur-md text-zinc-300 rounded-xl hover:bg-emerald-500 hover:text-zinc-950 transition-all transform hover:scale-110 shadow-lg"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteIconClick(archive); }}
                    className="p-2.5 bg-zinc-900/80 backdrop-blur-md text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Selection Checkmark */}
            {isSelectionMode && (
                <div className="absolute top-4 left-4 z-20">
                    <div className={cn(
                        "p-2 rounded-full backdrop-blur-md transition-all",
                        isSelected ? "bg-emerald-500 text-zinc-950 scale-110 shadow-lg" : "bg-black/40 text-white/50 border border-white/10"
                    )}>
                        {isSelected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <div className="">
                    {archive.genre && archive.genre.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                            {archive.genre.slice(0, 2).map(g => (
                                <span key={g} className="px-2 py-0.5 bg-emerald-500/20 backdrop-blur-md text-emerald-400 text-[8px] font-bold uppercase tracking-wider rounded-md border border-emerald-500/20">
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}
                    <h4 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight tracking-tight">
                        {archive.name}
                    </h4>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{archive.pages.length} Pages</span>
                        {archive.size && (
                            <>
                                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">{formatSize(archive.size)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
