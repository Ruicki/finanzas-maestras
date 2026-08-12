
import { prisma } from "@/lib/prisma";

async function checkNetWorth() {
    const profiles = await prisma.profile.findMany({
        include: {
            accounts: true,
            goals: true,
            creditCards: true
        }
    });

    console.log(`\n\n--- COMPROBACIÓN PATRIMONIO NETO ---\n`);

    for (const profile of profiles) {
        let liquidity = profile.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
        let totalSavings = profile.goals.reduce((sum, goal) => sum + Number(goal.currentAmount), 0);
        let totalDebt = profile.creditCards.reduce((sum, card) => sum + Number(card.balance), 0);

        let netWorth = liquidity + totalSavings - totalDebt;

        console.log(`Perfil: ${profile.name}`);
        console.log(`------------------------------`);
        console.log(`(+) Liquidez (Cuentas):   $${liquidity.toFixed(2)}`);
        // Desglose de cuentas
        profile.accounts.forEach(acc => {
            console.log(`    - ${acc.name}: $${acc.balance.toFixed(2)}`);
        });

        console.log(`(+) Ahorros (Metas):      $${totalSavings.toFixed(2)}`);
        // Desglose de metas
        profile.goals.forEach(goal => {
            console.log(`    - ${goal.name}: $${goal.currentAmount.toFixed(2)}`);
        });

        console.log(`(-) Deudas (Tarjetas):    $${totalDebt.toFixed(2)}`);
        // Desglose de deudas
        profile.creditCards.forEach(card => {
            console.log(`    - ${card.name}: $${card.balance.toFixed(2)}`);
        });

        console.log(`------------------------------`);
        console.log(`(=) PATRIMONIO NETO:      $${netWorth.toFixed(2)}`);
        console.log(`\n`);
    }
}

checkNetWorth();
