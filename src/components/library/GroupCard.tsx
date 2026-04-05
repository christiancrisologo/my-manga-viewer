import React from 'react';
import { FolderOpen, Image as ImageIcon, Circle, CheckCircle2, Trash2 } from 'lucide-react';
import { MangaArchive } from '../../types';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { createUrl } from '../../services/storage';

interface GroupCardProps {
    groupId: string;
    archives: MangaArchive[];
    onClick: (groupId: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (groupId: string) => void;
    onDeleteIconClick?: (groupId: string) => void;
    key?: React.Key;
}

export function GroupCard({ groupId, archives, onClick, isSelectionMode, isSelected, onToggleSelection, onDeleteIconClick }: GroupCardProps) {
    const covers = archives.slice(0, 3).map(a => a.pages[0]);
    // Use the first archive's name or the group ID as the label
    const label = archives[0]?.series || groupId;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden transition-all duration-500 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer aspect-[3/4.5]"
            onClick={() => isSelectionMode && onToggleSelection ? onToggleSelection(groupId) : onClick(groupId)}
        >
            {/* Stacked cover collage */}
            <div className="absolute inset-0">
                {covers.length >= 3 ? (
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
                        {covers[0] ? (
                            <div className="col-span-2 row-span-1 overflow-hidden">
                                <img
                                    src={createUrl(covers[0].data || covers[0].url)}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            </div>
                        ) : <div className="col-span-2 bg-zinc-800" />}
                        {covers[1] ? (
                            <div className="overflow-hidden">
                                <img src={createUrl(covers[1].data || covers[1].url)} alt="" className="w-full h-full object-cover" />
                            </div>
                        ) : <div className="bg-zinc-800" />}
                        {covers[2] ? (
                            <div className="overflow-hidden">
                                <img src={createUrl(covers[2].data || covers[2].url)} alt="" className="w-full h-full object-cover" />
                            </div>
                        ) : <div className="bg-zinc-800" />}
                    </div>
                ) : covers[0] ? (
                    <img
                        src={createUrl(covers[0].data || covers[0].url)}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                        <ImageIcon size={48} strokeWidth={1} />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent group-hover:via-zinc-950/50 transition-all duration-500" />
            </div>

            {/* Top Actions */}
            <div className={cn(
                "absolute top-4 left-4 right-4 flex justify-between items-start z-10 transition-all transform duration-300",
                "opacity-100 translate-y-0 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0"
            )}>
                <div className="flex gap-2"></div>
                {!isSelectionMode && onDeleteIconClick && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeleteIconClick(groupId); }}
                        className="p-2.5 bg-zinc-900/80 backdrop-blur-md text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all transform md:hover:scale-110 shadow-lg"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* Selection Checkmark */}
            {
                isSelectionMode && (
                    <div className="absolute top-4 left-4 z-20">
                        <div className={cn(
                            "p-2 rounded-full backdrop-blur-md transition-all",
                            isSelected ? "bg-emerald-500 text-zinc-950 scale-110 shadow-lg" : "bg-black/40 text-white/50 border border-white/10"
                        )}>
                            {isSelected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </div>
                    </div>
                )
            }

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight tracking-tight">
                    {label}
                </h4>
                <div className="flex items-center gap-1.5">
                    <FolderOpen size={10} className="text-emerald-400" />
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">{archives.length} Catalogs</span>
                </div>
            </div>
        </motion.div>
    );
}
