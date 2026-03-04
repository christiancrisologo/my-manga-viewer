import React from 'react';
import { Link } from 'lucide-react';
import { Modal } from '../../shared/Modal';

interface UrlImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    setUrl: (val: string) => void;
    onImport: () => void;
    isUploading: boolean;
}

export function UrlImportModal({
    isOpen,
    onClose,
    url,
    setUrl,
    onImport,
    isUploading
}: UrlImportModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import from URL"
            description="Direct link to image or archive"
            icon={<Link size={24} />}
        >
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">URL</label>
                    <input
                        type="url"
                        placeholder="https://example.com/manga.cbz"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onImport()}
                        autoFocus
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                        onClick={onImport}
                        disabled={!url || isUploading}
                        className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        {isUploading ? 'Downloading...' : 'Import'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
