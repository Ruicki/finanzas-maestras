'use client';

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface DeleteConfirmationProps {
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    message?: string;
}

export function DeleteConfirmation({ onConfirm, onCancel, title = "¿Eliminar registro?", message = "Esta acción no se puede deshacer." }: DeleteConfirmationProps) {
    const confirmBtnRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { confirmBtnRef.current?.focus(); }, []);

    return (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 flex flex-col gap-3 min-w-[300px]">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                </div>
                <div><p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{title}</p><p className="text-zinc-500 text-xs">{message}</p></div>
            </div>
            <div className="flex gap-2 justify-end mt-1">
                <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-700 font-medium px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                <button ref={confirmBtnRef} onClick={onConfirm} className="text-xs bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-lg transition-colors shadow-sm ring-offset-2 focus:ring-2 focus:ring-red-500">Eliminar</button>
            </div>
        </div>
    );
}

export function confirmDelete(onConfirm: () => Promise<void> | void, title?: string, message?: string) {
    toast.custom((t) => (
        <DeleteConfirmation
            title={title}
            message={message}
            onCancel={() => toast.dismiss(t)}
            onConfirm={async () => {
                toast.dismiss(t);
                await onConfirm();
            }}
        />
    ));
}
