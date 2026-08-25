'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@animateicons/react/lucide';

interface MonthSelectorProps {
    currentDate: Date | null;
    onMonthChange: (newDate: Date) => void;
}

export default function MonthSelector({ currentDate, onMonthChange }: MonthSelectorProps) {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => setNow(new Date()), []);

    const safeDate = currentDate ?? now;

    const handlePrevMonth = () => {
        if (!safeDate) return;
        const newDate = new Date(safeDate);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() - 1);
        onMonthChange(newDate);
    };

    const handleNextMonth = () => {
        if (!safeDate) return;
        const newDate = new Date(safeDate);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + 1);
        onMonthChange(newDate);
    };

    const isCurrentMonth = now && safeDate
        ? safeDate.getMonth() === now.getMonth() && safeDate.getFullYear() === now.getFullYear()
        : false;

    return (
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm">
            <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors"
            >
                <ChevronLeftIcon size={20} />
            </button>

            <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                <CalendarIcon size={16} className="text-zinc-400" />
                <span className="font-bold text-zinc-700 dark:text-zinc-200 capitalize">
                    {safeDate ? safeDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '\u00A0'}
                </span>
            </div>

            <button
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
                className={`p-2 rounded-xl text-zinc-500 transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
                <ChevronRightIcon size={20} />
            </button>
        </div>
    );
}
