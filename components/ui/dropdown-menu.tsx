'use client';
import * as React from "react"
import { cn } from "@/lib/utils"

// Context to handle open state
const DropdownContext = React.createContext<{ open: boolean; setOpen: (o: boolean) => void }>({ open: false, setOpen: () => { } });

const DropdownMenu = ({ children }: any) => {
    const [open, setOpen] = React.useState(false);
    return (
        <DropdownContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownContext.Provider>
    )
}

const DropdownMenuTrigger = ({ children, asChild }: any) => {
    const { open, setOpen } = React.useContext(DropdownContext);
    return (
        <div onClick={() => setOpen(!open)} className="cursor-pointer">
            {children}
        </div>
    )
}

const DropdownMenuContent = ({ className, align, children }: any) => {
    const { open, setOpen } = React.useContext(DropdownContext);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, setOpen]);

    if (!open) return null;

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 mt-2 min-w-32 overflow-hidden rounded-md border border-zinc-200 bg-white p-1 text-zinc-950 shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
                align === 'end' ? 'right-0' : 'left-0',
                className
            )}
        >
            {children}
        </div>
    )
}

const DropdownMenuItem = ({ className, onClick, children, ...props }: any) => {
    const { setOpen } = React.useContext(DropdownContext);
    return (
        <div
            className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 focus:text-zinc-900 data-disabled:pointer-events-none data-disabled:opacity-50",
                className
            )}
            onClick={(e) => {
                onClick?.(e);
                setOpen(false);
            }}
            {...props}
        >
            {children}
        </div>
    )
}

const DropdownMenuLabel = ({ className, children }: any) => (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
        {children}
    </div>
)

const DropdownMenuSeparator = ({ className }: any) => (
    <div className={cn("-mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800", className)} />
)

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
}
