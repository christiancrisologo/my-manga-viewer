import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    maxWidth?: string;
    icon?: React.ReactNode;
    footer?: React.ReactNode;
    headerActions?: React.ReactNode;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    maxWidth = "max-w-md",
    icon,
    footer,
    headerActions
}: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className={cn(
                            "bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
                            maxWidth
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <div className="flex items-center gap-4">
                                {icon && (
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                                        {icon}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-white">{title}</h3>
                                    {description && <p className="text-xs text-zinc-500">{description}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {headerActions}
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto no-scrollbar flex-1">
                            {children}
                        </div>

                        {footer && (
                            <div className="mt-6 pt-2 shrink-0">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
