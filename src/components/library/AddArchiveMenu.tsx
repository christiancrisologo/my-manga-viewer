import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Link, Wand2, FileCode, Download } from 'lucide-react';
import { useAppConfig } from '../../hooks/useAppConfig';

interface AddArchiveMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOptionSelect: (option: string) => void;
}

export function AddArchiveMenu({
    isOpen,
    onClose,
    onOptionSelect
}: AddArchiveMenuProps) {
    const { config } = useAppConfig();

    const allOptions = [
        { id: 'local', enabled: config.uploadLocalFile, icon: <Upload size={20} />, label: 'Upload Local File', desc: 'ZIP, CBZ, CBR, RAR, Images' },
        { id: 'url', enabled: config.importFromUrl, icon: <Link size={20} />, label: 'Import from URL', desc: 'Direct link to archive' },
        { id: 'web', enabled: config.webExtractor, icon: <Wand2 size={20} />, label: 'Web Extractor', desc: 'Extract images from website' },
        { id: 'json', enabled: config.jsonCatalogEditor, icon: <FileCode size={20} />, label: 'JSON Catalog', desc: 'Import single catalog via JSON' },
    ];

    const options = allOptions.filter(opt => opt.enabled);

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
                        className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-3xl p-3 shadow-2xl z-50 overflow-hidden"
                    >
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
