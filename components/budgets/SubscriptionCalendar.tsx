'use client';

import React from 'react';
import { formatMoney } from '@/lib/utils';

interface SubscriptionCalendarProps {
    subscriptions: any[];
}

const RECURRENCE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensual',
    ANNUAL: 'Anual',
};

function normalizeToMonthly(amount: number, type?: string | null): number {
    // ANNUAL: show full amount in the month it's charged (don't divide)
    return amount;
}

export default function SubscriptionCalendar({ subscriptions }: SubscriptionCalendarProps) {
    if (subscriptions.length === 0) return null;

    const today = new Date().getDate();

    // Group subscriptions by day (normalize amounts to monthly)
    const subsByDay: Record<number, any[]> = {};
    subscriptions.forEach(sub => {
        const day = sub.dueDate || 1;
        if (!subsByDay[day]) subsByDay[day] = [];
        subsByDay[day].push(sub);
    });

    // Total per day (normalized to monthly)
    const totalPerDay: Record<number, number> = {};
    Object.entries(subsByDay).forEach(([day, subs]) => {
        totalPerDay[Number(day)] = subs.reduce((s, sub) => s + normalizeToMonthly(Number(sub.amount), sub.recurrenceType), 0);
    });

    // Days with subscriptions
    const activeDays = Object.keys(subsByDay).map(Number).sort((a, b) => a - b);

    // Find max daily total for bar scaling
    const maxDailyTotal = Math.max(...Object.values(totalPerDay), 1);

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Calendario de Cobros</p>
                <p className="text-[10px] text-zinc-400">{activeDays.length} días con cobros</p>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
                {/* Day labels */}
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-zinc-400 py-1">{d}</div>
                ))}

                {/* Calendar days (1-31) */}
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const hasSubs = subsByDay[day];
                    const dayTotal = totalPerDay[day] || 0;
                    const barHeight = hasSubs ? (dayTotal / maxDailyTotal) * 100 : 0;
                    const isToday = day === today;

                    return (
                        <div
                            key={day}
                            className={`relative rounded-lg p-1 min-h-[44px] flex flex-col items-center justify-end transition-all ${
                                hasSubs
                                    ? isToday
                                        ? 'bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-400 dark:border-indigo-500/50'
                                        : 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                                    : isToday
                                        ? 'bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600'
                                        : 'bg-zinc-50 dark:bg-zinc-800/50'
                            }`}
                            title={hasSubs ? `${day}: ${subsByDay[day].map(s => `${s.name} (${RECURRENCE_LABELS[s.recurrenceType] || 'Mensual'})`).join(', ')} - ${formatMoney(dayTotal)}/mes` : `Día ${day}`}
                        >
                            <span className={`text-[10px] font-bold mb-0.5 ${hasSubs ? 'text-indigo-600 dark:text-indigo-400' : isToday ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                                {day}
                            </span>
                            {hasSubs && (
                                <div className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-t-sm" style={{ height: `${Math.max(barHeight, 8)}%` }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            {activeDays.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-wrap gap-2">
                        {activeDays.slice(0, 8).map(day => (
                            <div key={day} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-lg">
                                <span className="text-[10px] font-bold text-indigo-500">Día {day}</span>
                                <span className="text-[10px] text-zinc-500">{subsByDay[day].length} {subsByDay[day].length === 1 ? 'sub' : 'subs'}</span>
                                <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{formatMoney(totalPerDay[day])}</span>
                            </div>
                        ))}
                        {activeDays.length > 8 && (
                            <span className="text-[10px] text-zinc-400 py-1">+{activeDays.length - 8} más</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
