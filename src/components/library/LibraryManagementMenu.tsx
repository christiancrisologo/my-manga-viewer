import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, FileDown, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LibraryManagementMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOptionSelect: (option: string) => void;
}

export function LibraryManagementMenu({
    isOpen,
    onClose,
    onOptionSelect
}: LibraryManagementMenuProps) {
    const options = [
        { id: 'import_library', icon: <FileDown size={20} />, label: 'Import Collection', desc: 'Merge another JSON library' },
        { id: 'export_library', icon: <Download size={20} />, label: 'Export Library', desc: 'Backup all catalogs to JSON' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-14 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-3xl p-3 shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-3 mb-2 border-b border-zinc-800/50">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers size={12} className="text-emerald-500" />
                                Library Management
                            </h4>
                        </div>
                        <div className="grid gap-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        onOptionSelect(opt.id);
                                        onClose();
                                    }}
                                    className="w-full text-left p-4 rounded-2xl hover:bg-emerald-500 transition-all group flex items-start gap-4"
                                >
                                    <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 group-hover:bg-zinc-950/20 group-hover:text-zinc-950 transition-colors">
                                        {opt.icon}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white group-hover:text-zinc-950 uppercase tracking-widest">{opt.label}</p>
                                        <p className="text-[10px] text-zinc-500 group-hover:text-zinc-950/70 font-medium mt-0.5">{opt.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
