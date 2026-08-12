import * as React from "react"
import { cn } from "@/lib/utils"

// Simple variant implementation
const buttonVariants = (variant?: string, className?: string) => {
    const base = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";

    if (variant === 'outline') {
        return cn(base, "border border-zinc-200 bg-transparent shadow-sm hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-50", className);
    }

    // Default
    return cn(base, "bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90", className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => {
    return (
        <button
            ref={ref}
            className={buttonVariants(variant, className)}
            {...props}
        />
    )
})
Button.displayName = "Button"

export { Button }
