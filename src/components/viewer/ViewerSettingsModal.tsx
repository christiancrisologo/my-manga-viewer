import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, ZoomIn, ZoomOut, Volume2, VolumeX, FastForward } from 'lucide-react';
import { ViewerSettings } from '../../types';
import { cn } from '../../lib/utils';
import { useAppConfig } from '../../hooks/useAppConfig';

interface ViewerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: ViewerSettings;
    onSettingsChange: (settings: ViewerSettings) => void;
}

export function ViewerSettingsModal({
    isOpen,
    onClose,
    settings,
    onSettingsChange
}: ViewerSettingsModalProps) {
    const { config } = useAppConfig();

    const toggleSetting = (key: keyof ViewerSettings) => {
        onSettingsChange({ ...settings, [key]: !settings[key] });
    };

    const updateZoom = (delta: number) => {
        onSettingsChange({ ...settings, zoom: Math.min(Math.max(settings.zoom + delta, 0.5), 5) });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8 text-white">
                            <h3 className="text-xl font-bold">Viewer Settings</h3>
                            <button onClick={onClose} className="text-zinc-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Slideshow Toggle */}
                            <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        settings.isSlideshowActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-400"
                                    )}>
                                        {settings.isSlideshowActive ? <Pause size={18} /> : <Play size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Slideshow</p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-medium">Auto-play pages</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSetting('isSlideshowActive')}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all relative",
                                        settings.isSlideshowActive ? "bg-emerald-500" : "bg-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        settings.isSlideshowActive ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {/* Auto Next Catalog */}
                            <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        settings.autoNextChapter ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-400"
                                    )}>
                                        <FastForward size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Auto Next Chapter</p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-medium">Jump to next chapter on end</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleSetting('autoNextChapter')}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all relative",
                                        settings.autoNextChapter ? "bg-emerald-500" : "bg-zinc-700"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        settings.autoNextChapter ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {/* Zoom Controls */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Zoom Level</label>
                                <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-2xl">
                                    <button onClick={() => updateZoom(-0.25)} className="p-3 hover:bg-zinc-700 rounded-xl text-zinc-300">
                                        <ZoomOut size={20} />
                                    </button>
                                    <span className="text-sm font-mono font-bold text-emerald-400">{(settings.zoom * 100).toFixed(0)}%</span>
                                    <button onClick={() => updateZoom(0.25)} className="p-3 hover:bg-zinc-700 rounded-xl text-zinc-300">
                                        <ZoomIn size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* TTS Toggle - only shown if enabled in config */}
                            {config.imageToSpeech && (
                                <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            settings.enableTTS ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-700 text-zinc-400"
                                        )}>
                                            {settings.enableTTS ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Image to Speech</p>
                                            <p className="text-[10px] text-zinc-500 uppercase font-medium">Experimental OCR</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleSetting('enableTTS')}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative",
                                            settings.enableTTS ? "bg-emerald-500" : "bg-zinc-700"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                            settings.enableTTS ? "left-7" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            )}

                            {/* Slideshow Speed */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Slideshow Speed (s)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1000"
                                        max="10000"
                                        step="500"
                                        value={settings.slideshowSpeed}
                                        onChange={(e) => onSettingsChange({ ...settings, slideshowSpeed: parseInt(e.target.value) })}
                                        className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <span className="text-sm font-mono font-bold text-zinc-300 w-12 text-right text-zinc-300">
                                        {(settings.slideshowSpeed / 1000).toFixed(1)}s
                                    </span>
                                </div>
                            </div>

                            {/* Fit Mode */}
                            <div className="space-y-3">
                                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Fit Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['contain', 'width', 'height'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => onSettingsChange({ ...settings, fitMode: mode })}
                                            className={cn(
                                                "py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                                                settings.fitMode === mode
                                                    ? "bg-emerald-500 border-emerald-500 text-zinc-950"
                                                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                                            )}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full mt-10 py-4 bg-zinc-100 text-zinc-950 rounded-2xl font-bold uppercase tracking-widest hover:bg-white transition-colors"
                        >
                            Apply Changes
                        </button>
                    </motion.div>
                </motion.div>
            )
            }
        </AnimatePresence >
    );
}
