import React, { useRef } from 'react';
import { FileCode, Play, Upload } from 'lucide-react';
import { Modal } from '../../shared/Modal';
import { SAMPLE_JSON } from '../../../constants';

interface JsonImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    content: string;
    setContent: (val: string) => void;
    onImport: () => void;
}

export function JsonImportModal({
    isOpen,
    onClose,
    title = "Import from JSON",
    description = "Paste a JSON catalog structure or upload a file",
    content,
    setContent,
    onImport
}: JsonImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setContent(text);
        };
        reader.readAsText(file);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            icon={<FileCode size={24} />}
            maxWidth="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="relative">
                    <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Catalog JSON</label>
                        <div className="flex gap-3">
                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 text-[9px] text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider transition-colors"
                            >
                                <Upload size={12} />
                                <span>Upload File</span>
                            </button>
                            <button
                                onClick={() => setContent(SAMPLE_JSON)}
                                className="text-[9px] text-zinc-500 hover:text-zinc-400 font-bold uppercase tracking-wider transition-colors"
                            >
                                Load Sample
                            </button>
                        </div>
                    </div>
                    <textarea
                        rows={15}
                        value={content}
                        onChange={e => setContent(e.target.value)}
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
                        onClick={onImport}
                        disabled={!content}
                        className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Play size={18} fill="currentColor" />
                        <span>Validate & Import</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
}
