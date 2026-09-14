'use server';

import { prisma } from '@/lib/prisma';
import { requireOwnership } from '@/lib/auth-utils';
import { reportError } from '@/lib/logger';

/**
 * Reune TODO lo del perfil para exportarlo.
 *
 * Va en una accion aparte y no en getProfileById porque las transferencias
 * cuelgan de las cuentas, no del perfil: pedirlas en la consulta del dashboard
 * las cargaria en cada visita para algo que se usa de vez en cuando.
 *
 * Los Decimal de Prisma se convierten a numero aqui, del lado del servidor: si
 * viajaran como Decimal al cliente, se serializarian como objeto y el CSV
 * saldria con "[object Object]" en cada importe.
 */
export async function getExportData(profileId: number) {
    await requireOwnership(profileId);

    try {
        const [perfil, transferencias] = await Promise.all([
            prisma.profile.findUnique({
                where: { id: profileId },
                include: {
                    accounts: true,
                    creditCards: true,
                    loans: true,
                    goals: true,
                    categories: true,
                    expenses: true,
                    incomes: true,
                    salaries: true,
                },
            }),
            prisma.transfer.findMany({
                where: {
                    OR: [
                        { sourceAccount: { profileId } },
                        { destinationAccount: { profileId } },
                    ],
                },
                include: {
                    sourceAccount: { select: { name: true } },
                    destinationAccount: { select: { name: true } },
                },
                orderBy: { date: 'desc' },
            }),
        ]);

        if (!perfil) throw new Error('Perfil no encontrado');

        const num = (v: unknown) => (v == null ? 0 : Number(v));

        return {
            cuentas: perfil.accounts.map((c) => ({
                nombre: c.name,
                tipo: c.type,
                proposito: c.purpose,
                saldo: num(c.balance),
                moneda: c.currency,
            })),
            tarjetas: perfil.creditCards.map((t) => ({
                nombre: t.name,
                banco: t.bank ?? '',
                saldo: num(t.balance),
                limite: num(t.limit),
                diaCorte: t.cutoffDay,
                diaPago: t.paymentDay,
                tasaInteres: num(t.interestRate),
            })),
            prestamos: perfil.loans.map((p) => ({
                nombre: p.name,
                prestamista: p.lender,
                tipo: p.type,
                montoTotal: num(p.totalAmount),
                saldoActual: num(p.currentBalance),
                tasaInteres: num(p.interestRate),
                cuotaMensual: num(p.monthlyPayment),
            })),
            metas: perfil.goals.map((m) => ({
                nombre: m.name,
                objetivo: num(m.targetAmount),
                acumulado: num(m.currentAmount),
                fechaLimite: m.deadline,
                prioridad: m.priority ?? '',
                pausada: m.isPaused,
            })),
            transferencias: transferencias.map((t) => ({
                fecha: t.date,
                monto: num(t.amount),
                // El importe acreditado en destino difiere del de origen cuando
                // hubo tipo de cambio; sin conversion destAmount es null.
                montoDestino: num(t.destAmount ?? t.amount),
                origen: t.sourceAccount.name,
                destino: t.destinationAccount.name,
                descripcion: t.description ?? '',
            })),
            salarios: perfil.salaries.map((s) => ({
                fecha: s.createdAt,
                neto: num(s.netVal),
                bruto: num(s.grossVal),
                empresa: s.company ?? '',
            })),
            ingresos: perfil.incomes.map((i) => ({
                fecha: i.createdAt,
                nombre: i.name,
                monto: num(i.amount),
                frecuencia: i.frequency,
                cuentaId: i.accountId,
            })),
            gastos: perfil.expenses.map((g) => ({
                fecha: g.createdAt,
                nombre: g.name,
                monto: num(g.amount),
                categoriaId: g.categoryId,
                cuentaId: g.accountId,
                tarjetaId: g.linkedCardId,
                proyectado: g.isProjected,
            })),
            categorias: perfil.categories.map((c) => ({ id: c.id, nombre: c.name })),
            nombresCuenta: Object.fromEntries(perfil.accounts.map((c) => [c.id, c.name])),
            nombresTarjeta: Object.fromEntries(perfil.creditCards.map((t) => [t.id, t.name])),
        };
    } catch (error) {
        throw reportError(error, { accion: 'reunir datos para exportar', profileId });
    }
}

export type DatosExportables = Awaited<ReturnType<typeof getExportData>>;
