import React from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../../shared/Modal';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    password: string;
    setPassword: (val: string) => void;
    onConfirm: () => void;
}

export function PasswordModal({
    isOpen,
    onClose,
    password,
    setPassword,
    onConfirm
}: PasswordModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Archive Password"
            description="This archive is encrypted. Please enter the password to extract images."
            icon={<Lock size={24} />}
        >
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Password</label>
                    <input
                        type="password"
                        placeholder="Enter password..."
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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
                        disabled={!password}
                        className="flex-1 py-4 bg-emerald-500 text-zinc-950 rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                        Unlock
                    </button>
                </div>
            </div>
        </Modal>
    );
}
