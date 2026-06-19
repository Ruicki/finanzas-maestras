'use client';
import * as React from "react"
import { cn } from "@/lib/utils"

const Dialog = ({ open, onOpenChange, children }: any) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => onOpenChange(false)} />
            {children}
        </div>
    );
}

const DialogContent = ({ className, children, ...props }: any) => (
    <div className={cn(
        "relative z-50 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col overflow-y-auto",
        className
    )} {...props}>
        {children}
    </div>
)

const DialogHeader = ({ className, ...props }: any) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogFooter = ({ className, ...props }: any) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)

const DialogTitle = ({ className, ...props }: any) => (
    <div className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle }
