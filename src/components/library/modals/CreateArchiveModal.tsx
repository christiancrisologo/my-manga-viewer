import React from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../shared/Modal';

interface CreateArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    setTitle: (val: string) => void;
    pageCount: number;
    onConfirm: () => void;
}

export function CreateArchiveModal({
    isOpen,
    onClose,
    title,
    setTitle,
    pageCount,
    onConfirm
}: CreateArchiveModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Catalog"
            description={`${pageCount} images selected`}
            icon={<Plus size={24} />}
        >
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog Title</label>
                    <input
                        type="text"
                        placeholder="Enter title..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onConfirm()}
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
                        onClick={onConfirm}
                        disabled={!title}
                        className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        Create
                    </button>
                </div>
            </div>
        </Modal>
    );
}
