import React from 'react';
import { Search, Plus, Trash2, CheckCircle2, X, Download, FolderOpen, LayoutGrid, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { APP_NAME, AUTHOR_NAME } from '../../constants';

interface LibraryHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isSelectionMode: boolean;
    setIsSelectionMode: (mode: boolean) => void;
    selectedCount: number;
    onMultiDelete: () => void;
    onDeselectAll: () => void;
    onSelectAll: () => void;
    onAddClick: () => void;
    showAddMenu: boolean;
    onLibraryClick: () => void;
    showLibraryMenu: boolean;
    viewMode: 'all' | 'groups';
    setViewMode: (mode: 'all' | 'groups') => void;
    favoriteArchives: any[];
    onFavoriteSelect: (archive: any) => void;
}

export function LibraryHeader({
    searchQuery,
    setSearchQuery,
    isSelectionMode,
    setIsSelectionMode,
    selectedCount,
    onMultiDelete,
    onDeselectAll,
    onSelectAll,
    onAddClick,
    showAddMenu,
    onLibraryClick,
    showLibraryMenu,
    viewMode,
    setViewMode,
    favoriteArchives,
    onFavoriteSelect
}: LibraryHeaderProps) {
    const [showFavorites, setShowFavorites] = React.useState(false);
    const favoritesRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
                setShowFavorites(false);
            }
        };

        if (showFavorites) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFavorites]);
    return (
        <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-4 flex flex-col gap-4">
            {/* Top Row: Brand and Main Actions */}
            <div className="flex items-center justify-between">
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

                <div className="flex items-center gap-2">
                    {isSelectionMode && viewMode !== 'groups' ? (
                        <>
                            <button
                                onClick={onSelectAll}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all group"
                                title="Select all visible catalogs"
                            >
                                <span className="text-xs font-bold text-emerald-500">Select All</span>
                            </button>
                            <button
                                onClick={onDeselectAll}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all group"
                                title="Click to deselect all"
                            >
                                <span className="text-xs font-bold text-emerald-500 group-hover:text-red-400 transition-colors">{selectedCount} Selected</span>
                                <X size={14} className="text-emerald-500/50 group-hover:text-red-400 transition-colors" />
                            </button>
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
                                onClick={onLibraryClick}
                                className={cn(
                                    "p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:text-white hover:border-zinc-700 transition-all",
                                    showLibraryMenu && "bg-zinc-800 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                )}
                                title="Library Management"
                            >
                                <Download size={20} />
                            </button>
                            <button
                                onClick={onAddClick}
                                className={cn(
                                    "p-3 rounded-xl transition-all shadow-lg flex items-center justify-center",
                                    showAddMenu ? "bg-zinc-800 text-zinc-300" : "bg-emerald-500 text-zinc-950 shadow-emerald-500/20 hover:bg-emerald-400 hover:-translate-y-0.5"
                                )}
                                title="Add Catalog"
                            >
                                <Plus size={24} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Row: Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search your collection..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                    />
                </div>

                {!isSelectionMode && (
                    <>
                        <div className="relative" ref={favoritesRef}>
                            <button
                                onClick={() => setShowFavorites(!showFavorites)}
                                className={cn(
                                    "p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:text-white hover:border-zinc-700 transition-all",
                                    favoriteArchives.length > 0 ? "text-red-400" : "text-zinc-400"
                                )}
                                title={favoriteArchives.length > 0 ? `${favoriteArchives.length} Favorites` : "No favorites yet"}
                            >
                                <Heart size={20} fill={favoriteArchives.length > 0 ? "currentColor" : "none"} />
                            </button>
                            {showFavorites && (
                                <div className="fixed inset-0 z-40" onClick={() => setShowFavorites(false)}>
                                    <div 
                                        className="absolute bg-zinc-900 border border-zinc-800 rounded-2xl p-2 min-w-64 shadow-xl z-50 max-h-80 overflow-y-auto"
                                        style={{
                                            top: favoritesRef.current ? favoritesRef.current.getBoundingClientRect().bottom + 8 : 'auto',
                                            right: favoritesRef.current ? window.innerWidth - favoritesRef.current.getBoundingClientRect().right : 'auto'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {favoriteArchives.length > 0 ? (
                                            <>
                                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2">Quick Launch</div>
                                                {favoriteArchives.map((archive, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            onFavoriteSelect(archive);
                                                            setShowFavorites(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
                                                        title={`Open ${archive.title}`}
                                                    >
                                                        <div className="font-medium truncate">{archive.title}</div>
                                                        {archive.groupId && (
                                                            <div className="text-xs text-zinc-500 truncate">{archive.groupId}</div>
                                                        )}
                                                    </button>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">No Favorites Yet</div>
                                                <div className="text-xs text-zinc-600">Mark archives as favorites using the heart icon</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {viewMode !== 'groups' && (
                            <button
                                onClick={() => setIsSelectionMode(true)}
                                className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl hover:text-white hover:border-zinc-700 transition-all"
                                title="Bulk Selection"
                            >
                                <CheckCircle2 size={20} />
                            </button>
                        )}
                        <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1 gap-1">
                            <button
                                onClick={() => setViewMode('all')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    viewMode === 'all' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                )}
                                title="Show all catalogs"
                            >
                                <LayoutGrid size={14} />
                                All
                            </button>
                            <button
                                onClick={() => setViewMode('groups')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                                    viewMode === 'groups' ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                )}
                                title="Show by group"
                            >
                                <FolderOpen size={14} />
                                Groups
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
