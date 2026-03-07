import React, { useState, useEffect } from 'react';
import { Pencil, X, Link, Upload } from 'lucide-react';
import { Modal } from '../../shared/Modal';
import { MangaArchive } from '../../../types';
import { cn } from '../../../lib/utils';
import { createUrl } from '../../../services/storage';

interface EditArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    manga: MangaArchive | null;
    onSave: (data: any) => Promise<void>;
    isUploading: boolean;
    onDeletePage: (pageId: string) => void;
    onAddUrlPages: (url?: string) => void;
    onAddFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
    urlInput: string;
    setUrlInput: (val: string) => void;
    jsonContent: string;
    setJsonContent: (val: string) => void;
    isJsonMode: boolean;
    setIsJsonMode: (val: boolean) => void;
}

export function EditArchiveModal({
    isOpen,
    onClose,
    manga,
    onSave,
    isUploading,
    onDeletePage,
    onAddUrlPages,
    onAddFiles,
    urlInput,
    setUrlInput,
    jsonContent,
    setJsonContent,
    isJsonMode,
    setIsJsonMode
}: EditArchiveModalProps) {
    const [editForm, setEditForm] = useState({
        name: '',
        author: '',
        genre: '',
        description: '',
        series: '',
        volume: '',
        chapter: '',
        season: '',
        released: ''
    });

    useEffect(() => {
        if (manga) {
            setEditForm({
                name: manga.name,
                author: manga.author || '',
                genre: manga.genre?.join(', ') || '',
                description: manga.description || '',
                series: manga.series || '',
                volume: manga.volume || '',
                chapter: manga.chapter || '',
                season: manga.season || '',
                released: manga.released || ''
            });
        }
    }, [manga]);

    if (!manga) return null;

    const handleSave = () => {
        if (isJsonMode) {
            onSave(null);
        } else {
            onSave(editForm);
        }
    };

    const headerActions = (
        <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
            <button
                onClick={() => setIsJsonMode(false)}
                className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    !isJsonMode ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                Form
            </button>
            <button
                onClick={() => setIsJsonMode(true)}
                className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    isJsonMode ? "bg-emerald-500 text-zinc-950 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                JSON
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Catalog"
            description={`${manga.pages.length} pages in collection`}
            icon={<Pencil size={24} />}
            maxWidth="max-w-2xl"
            headerActions={headerActions}
        >
            {isJsonMode ? (
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog JSON</label>
                        <textarea
                            rows={15}
                            value={jsonContent}
                            onChange={e => setJsonContent(e.target.value)}
                            placeholder='{ "name": "...", "pages": [...] }'
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4 text-xs font-mono text-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none scrollbar-thin scrollbar-thumb-zinc-800"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isUploading}
                            className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            {isUploading ? 'Validating...' : 'Validate & Apply'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column — metadata form */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog Title</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Author</label>
                                <input
                                    type="text"
                                    value={editForm.author}
                                    onChange={e => setEditForm({ ...editForm, author: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Genres</label>
                                <input
                                    type="text"
                                    value={editForm.genre}
                                    onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Series</label>
                            <input
                                type="text"
                                value={editForm.series}
                                onChange={e => setEditForm({ ...editForm, series: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Volume</label>
                                <input
                                    type="text"
                                    placeholder="Vol. 1"
                                    value={editForm.volume}
                                    onChange={e => setEditForm({ ...editForm, volume: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Chapter</label>
                                <input
                                    type="text"
                                    placeholder="Ch. 1"
                                    value={editForm.chapter}
                                    onChange={e => setEditForm({ ...editForm, chapter: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Season</label>
                                <input
                                    type="text"
                                    placeholder="S1"
                                    value={editForm.season}
                                    onChange={e => setEditForm({ ...editForm, season: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Released</label>
                            <input
                                type="text"
                                placeholder="e.g. 2024, Spring 2024"
                                value={editForm.released}
                                onChange={e => setEditForm({ ...editForm, released: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Description</label>
                            <textarea
                                rows={3}
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* Right column — pages & actions */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Manage Pages</h4>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800/20 rounded-2xl no-scrollbar border border-zinc-800/50">
                                {manga.pages.map((page, idx) => (
                                    <div key={page.id} className="relative aspect-[3/4] bg-zinc-800 rounded-lg overflow-hidden group/page">
                                        <img
                                            src={createUrl(page.data || page.url)}
                                            alt={page.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/page:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeletePage(page.id);
                                                }}
                                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                title="Delete Page"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 px-1">
                                            <span className="text-[8px] text-white/70 block text-center truncate">{idx + 1}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Add More Images</h4>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-2xl hover:bg-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer group">
                                    <Upload size={18} className="text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300 uppercase tracking-wider">Upload from Device</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".zip,.cbz,.cbr,.coz,image/*"
                                        className="hidden"
                                        onChange={onAddFiles}
                                    />
                                </label>
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Paste image URL here..."
                                            value={urlInput}
                                            onChange={e => setUrlInput(e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        />
                                    </div>
                                    <button
                                        onClick={() => onAddUrlPages()}
                                        disabled={!urlInput || isUploading}
                                        className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-emerald-500 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50 border border-emerald-500/20"
                                    >
                                        {isUploading ? 'Adding...' : 'Add from URL'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6">
                            <button
                                onClick={onClose}
                                className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}
