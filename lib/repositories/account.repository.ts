import { PrismaClient } from '@prisma/client';
import { FinancialTransaction } from '../../types/finance';

export class AccountRepository {
    static async modifyBalance(tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">, transactionInput: FinancialTransaction) {
        if (!transactionInput.accountId) return;

        const { accountId, amount, type } = transactionInput;

        // Ensuring we maintain data integrity using atomic increment/decrement operations 
        // provided by prisma without race conditions
        const updateData = type === 'CREDIT'
            ? { increment: amount }
            : { decrement: amount };

        await tx.account.update({
            where: { id: accountId },
            data: { balance: updateData }
        });
    }
}
