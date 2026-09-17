import type { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

/**
 * Decrementa el saldo de una cuenta solo si alcanza para cubrir el monto, en una
 * única sentencia UPDATE condicionada (WHERE balance >= amount). Un simple
 * "leer saldo, validar, luego decrementar" dentro de una transacción no evita
 * que dos solicitudes concurrentes (doble clic, reintento de red) lean el mismo
 * saldo antes de que ninguna confirme y ambas pasen la validación — esto sí lo
 * evita, porque el propio UPDATE es la validación.
 */
export async function decrementAccountBalance(
    tx: TxClient,
    accountId: number,
    amount: number,
    accountName?: string,
): Promise<void> {
    const { count } = await tx.account.updateMany({
        where: { id: accountId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
    });
    if (count === 0) {
        throw new Error(`Fondos insuficientes${accountName ? ` en la cuenta "${accountName}"` : ''}`);
    }
}

/**
 * Mismo UPDATE condicionado para el saldo de una tarjeta. Ademas de cerrar la
 * carrera, impide dejar el saldo en negativo: un saldo de tarjeta negativo no
 * representa nada real y descuadra el patrimonio neto, que lo resta como deuda.
 * `message` permite explicar el caso concreto, porque no es lo mismo un pago
 * que excede el saldo que borrar un gasto que ya se pago.
 */
export async function decrementCreditCardBalance(
    tx: TxClient,
    cardId: number,
    amount: number,
    message = 'El pago excede el saldo actual de la tarjeta',
): Promise<void> {
    const { count } = await tx.creditCard.updateMany({
        where: { id: cardId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
    });
    if (count === 0) {
        throw new Error(message);
    }
}

export async function decrementLoanBalance(
    tx: TxClient,
    loanId: number,
    amount: number,
): Promise<void> {
    const { count } = await tx.loan.updateMany({
        where: { id: loanId, currentBalance: { gte: amount } },
        data: { currentBalance: { decrement: amount } },
    });
    if (count === 0) {
        throw new Error('El pago excede el saldo actual del préstamo');
    }
}
