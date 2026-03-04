import React from 'react';
import { Search, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { APP_NAME, AUTHOR_NAME } from '../../constants';

interface LibraryHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSelectionMode: boolean;
    setIsSelectionMode: (mode: boolean) => void;
    selectedCount: number;
    onMultiDelete: () => void;
    onAddClick: () => void;
    showAddMenu: boolean;
}

export function LibraryHeader({
    searchQuery,
    setSearchQuery,
    isSelectionMode,
    setIsSelectionMode,
    selectedCount,
    onMultiDelete,
    onAddClick,
    showAddMenu
}: LibraryHeaderProps) {
    return (
        <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-6 h-6 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-black text-white tracking-tight leading-none uppercase">{APP_NAME}</h1>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] uppercase mt-1">By {AUTHOR_NAME}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 flex-1 md:max-w-xl">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your collection..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                        <>
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <span className="text-xs font-bold text-emerald-500">{selectedCount} Selected</span>
                            </div>
                            <button
                                onClick={onMultiDelete}
                                disabled={selectedCount === 0}
                                className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-red-500/20"
                            >
                                <Trash2 size={20} />
                            </button>
                            <button
                                onClick={() => setIsSelectionMode(false)}
                                className="px-4 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-colors"
                                title="Cancel selection"
                            >
                                Done
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsSelectionMode(true)}
                                className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-700 transition-all"
                                title="Bulk Selection"
                            >
                                <CheckCircle2 size={20} />
                            </button>
                            <button
                                onClick={onAddClick}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg",
                                    showAddMenu ? "bg-zinc-800 text-zinc-300" : "bg-emerald-500 text-zinc-950 shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5"
                                )}
                            >
                                <Plus size={18} />
                                <span>Add Archive</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
