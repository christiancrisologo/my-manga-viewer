import React from 'react';
import { Wand2, Globe, CheckCircle2, Circle, X } from 'lucide-react';
import { Modal } from '../../shared/Modal';
import { cn } from '../../../lib/utils';

interface WebExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    setUrl: (val: string) => void;
    rule: string;
    setRule: (val: string) => void;
    hostname: string;
    setHostname: (val: string) => void;
    onExtract: () => void;
    isExtracting: boolean;
    extractedImages: string[];
    selectedUrls: Set<string>;
    toggleUrlSelection: (url: string) => void;
    selectAll: () => void;
    extractTitle: string;
    setExtractTitle: (val: string) => void;
    onCreateCatalog: () => void;
}

export function WebExtractionModal({
    isOpen,
    onClose,
    url,
    setUrl,
    rule,
    setRule,
    hostname,
    setHostname,
    onExtract,
    isExtracting,
    extractedImages,
    selectedUrls,
    toggleUrlSelection,
    selectAll,
    extractTitle,
    setExtractTitle,
    onCreateCatalog
}: WebExtractionModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Web Extractor"
            description="Extract images from any website using CSS rules"
            icon={<Wand2 size={24} />}
            maxWidth="max-w-4xl"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Target URL</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                <input
                                    type="url"
                                    placeholder="https://example-manga.com/chapter-1"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">CSS Selector (Optional)</label>
                            <input
                                type="text"
                                placeholder=".chapter-content img"
                                value={rule}
                                onChange={e => setRule(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Proxy Hostname</label>
                            <input
                                type="text"
                                placeholder="https://proxy.example.com"
                                value={hostname}
                                onChange={e => setHostname(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono text-xs"
                            />
                        </div>

                        <button
                            onClick={onExtract}
                            disabled={!url || isExtracting}
                            className="w-full py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {isExtracting ? 'Extracting Images...' : 'Begin Extraction'}
                        </button>
                    </div>

                    <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Extraction Helper
                        </h4>
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-medium capitalize">
                            enter the URL of the manga page and an optional CSS selector to target specific images. if left empty, the extractor will attempt to find all relevant images automatically.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                            Results Found <span className="text-emerald-500 ml-2">{extractedImages.length}</span>
                        </h4>
                        {extractedImages.length > 0 && (
                            <button
                                onClick={selectAll}
                                className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400"
                            >
                                Select All
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 overflow-y-auto no-scrollbar max-h-[400px]">
                        {extractedImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-4 opacity-50">
                                <Globe size={48} strokeWidth={1} />
                                <p className="text-[10px] uppercase font-bold tracking-widest">No results yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {extractedImages.map((imgUrl, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                            selectedUrls.has(imgUrl) ? "border-emerald-500 scale-95" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                        onClick={() => toggleUrlSelection(imgUrl)}
                                    >
                                        <img src={imgUrl} className="w-full h-full object-cover" alt={`Result ${idx}`} />
                                        <div className={cn(
                                            "absolute top-2 left-2 p-1 rounded-full",
                                            selectedUrls.has(imgUrl) ? "bg-emerald-500 text-zinc-950" : "bg-black/40 text-white/40"
                                        )}>
                                            {selectedUrls.has(imgUrl) ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedUrls.size > 0 && (
                        <div className="mt-6 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl animate-in slide-in-from-bottom-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Catalog Title</label>
                                    <input
                                        type="text"
                                        placeholder="Collection Name"
                                        value={extractTitle}
                                        onChange={e => setExtractTitle(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={onCreateCatalog}
                                    disabled={!extractTitle}
                                    className="sm:self-end px-8 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    Create Collection ({selectedUrls.size})
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
