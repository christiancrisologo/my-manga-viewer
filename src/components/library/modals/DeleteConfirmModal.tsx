import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../../shared/Modal';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    isMultiple?: boolean;
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    itemName,
    isMultiple = false
}: DeleteConfirmModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isMultiple ? "Delete Collections?" : "Delete Collection?"}
            icon={<Trash2 size={32} className="text-red-500" />}
            maxWidth="max-w-sm"
        >
            <div className="flex flex-col items-center text-center p-2">
                <p className="text-sm text-zinc-400 mb-8">
                    {isMultiple ? (
                        "Are you sure you want to delete the selected collections? This action cannot be undone."
                    ) : (
                        <>
                            Are you sure you want to delete <span className="text-white font-semibold">"{itemName}"</span>? This action cannot be undone.
                        </>
                    )}
                </p>
                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-zinc-800 text-zinc-300 rounded-2xl font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
}
