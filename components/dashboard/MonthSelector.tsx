'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthSelectorProps {
    currentDate: Date | null;
    onMonthChange: (newDate: Date) => void;
}

export default function MonthSelector({ currentDate, onMonthChange }: MonthSelectorProps) {

    const safeDate = currentDate ?? new Date();

    const handlePrevMonth = () => {
        const newDate = new Date(safeDate);
        newDate.setDate(1); // Avoid rollover issues (Jan 31 -> Feb 28/29)
        newDate.setMonth(newDate.getMonth() - 1);
        onMonthChange(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(safeDate);
        newDate.setDate(1); // Avoid rollover issues
        newDate.setMonth(newDate.getMonth() + 1);
        onMonthChange(newDate);
    };

    const isCurrentMonth = () => {
        const now = new Date();
        return safeDate.getMonth() === now.getMonth() && safeDate.getFullYear() === now.getFullYear();
    };

    return (
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm">
            <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                <Calendar size={16} className="text-zinc-400" />
                <span className="font-bold text-zinc-700 dark:text-zinc-200 capitalize">
                    {safeDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
            </div>

            <button
                onClick={handleNextMonth}
                disabled={isCurrentMonth()} // Optional: Disable future? Or allow planning? User might want to plan future. Let's keep it enabled but maybe style differently if future.
                className={`p-2 rounded-xl text-zinc-500 transition-colors ${isCurrentMonth() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
