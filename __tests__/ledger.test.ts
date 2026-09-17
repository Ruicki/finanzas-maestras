import {
    decrementAccountBalance,
    decrementCreditCardBalance,
    decrementLoanBalance,
} from '../lib/ledger';
import type { Prisma } from '@prisma/client';

/**
 * Los tres helpers hacen un UPDATE condicionado (WHERE saldo >= monto) en vez de
 * "leer, validar, decrementar". Lo que se verifica aqui es justamente eso: que la
 * condicion viaja dentro del WHERE —si no, dos peticiones concurrentes pasan la
 * validacion con el mismo saldo— y que un count de 0 se convierte en error en vez
 * de dejar pasar la operacion como si hubiera funcionado.
 */
type UpdateManyArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

function makeTx(model: 'account' | 'creditCard' | 'loan', count: number) {
    const calls: UpdateManyArgs[] = [];
    const updateMany = jest.fn(async (args: UpdateManyArgs) => {
        calls.push(args);
        return { count };
    });
    return { tx: { [model]: { updateMany } } as unknown as Prisma.TransactionClient, calls };
}

describe('decrementAccountBalance', () => {
    it('condiciona el UPDATE al saldo disponible en vez de leer y luego escribir', async () => {
        const { tx, calls } = makeTx('account', 1);
        await decrementAccountBalance(tx, 7, 50);
        expect(calls).toHaveLength(1);
        expect(calls[0].where).toEqual({ id: 7, balance: { gte: 50 } });
        expect(calls[0].data).toEqual({ balance: { decrement: 50 } });
    });

    it('lanza error si no alcanzo el saldo (count 0), sin dejar pasar la operacion', async () => {
        const { tx } = makeTx('account', 0);
        await expect(decrementAccountBalance(tx, 7, 50)).rejects.toThrow('Fondos insuficientes');
    });

    it('nombra la cuenta en el error cuando se le pasa', async () => {
        const { tx } = makeTx('account', 0);
        await expect(decrementAccountBalance(tx, 7, 50, 'Banco General')).rejects.toThrow(
            'Fondos insuficientes en la cuenta "Banco General"',
        );
    });
});

describe('decrementCreditCardBalance', () => {
    it('no permite dejar el saldo de la tarjeta en negativo', async () => {
        // count 0 = el WHERE balance >= amount no encontro fila, o sea que el
        // cargo ya estaba pagado y no queda saldo que revertir.
        const { tx } = makeTx('creditCard', 0);
        await expect(decrementCreditCardBalance(tx, 3, 120)).rejects.toThrow(
            'El pago excede el saldo actual de la tarjeta',
        );
    });

    it('usa el mensaje del caso concreto cuando se le pasa uno', async () => {
        // deleteExpense/updateExpense explican que el cargo ya fue pagado, que no
        // es lo mismo que un pago que excede el saldo.
        const { tx } = makeTx('creditCard', 0);
        await expect(
            decrementCreditCardBalance(tx, 3, 120, 'el cargo ya fue pagado'),
        ).rejects.toThrow('el cargo ya fue pagado');
    });

    it('decrementa cuando si hay saldo que revertir', async () => {
        const { tx, calls } = makeTx('creditCard', 1);
        await expect(decrementCreditCardBalance(tx, 3, 120)).resolves.toBeUndefined();
        expect(calls[0].where).toEqual({ id: 3, balance: { gte: 120 } });
    });
});

describe('decrementLoanBalance', () => {
    it('condiciona sobre currentBalance, no sobre balance', async () => {
        const { tx, calls } = makeTx('loan', 1);
        await decrementLoanBalance(tx, 9, 300);
        expect(calls[0].where).toEqual({ id: 9, currentBalance: { gte: 300 } });
    });

    it('lanza error si el pago excede el saldo del prestamo', async () => {
        const { tx } = makeTx('loan', 0);
        await expect(decrementLoanBalance(tx, 9, 300)).rejects.toThrow(
            'El pago excede el saldo actual del préstamo',
        );
    });
});
