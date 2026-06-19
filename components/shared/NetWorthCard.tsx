'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface NetWorthCardProps {
    accounts: { balance: number }[];
    creditCards: { balance: number }[];
    loans: { currentBalance: number }[];
}

export function NetWorthCard({ accounts, creditCards, loans }: NetWorthCardProps) {
    // Calcular Patrimonio Neto
    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalLiabilities =
        creditCards.reduce((sum, card) => sum + card.balance, 0) +
        loans.reduce((sum, loan) => sum + loan.currentBalance, 0);

    const netWorth = totalAssets - totalLiabilities;
    const isPositive = netWorth >= 0;

    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
                <span className={isPositive ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                    {isPositive ? "▲" : "▼"}
                </span>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(netWorth)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Activos: {formatCurrency(totalAssets)} | Pasivos: {formatCurrency(totalLiabilities)}
                </p>
            </CardContent>
        </Card>
    );
}
