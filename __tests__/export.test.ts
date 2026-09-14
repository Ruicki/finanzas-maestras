import { generateTransactionsCSV, generateSnapshotCSV } from '../lib/export';
import type { DatosExportables } from '../app/actions/export';

/**
 * Lo que importa de una exportacion es que no se pierda nada y que los importes
 * tengan el signo correcto: es el archivo con el que alguien se lleva sus
 * finanzas, y un error aqui no se nota hasta que ya no tiene la app.
 */
function datos(parcial: Partial<DatosExportables> = {}): DatosExportables {
    return {
        cuentas: [],
        tarjetas: [],
        prestamos: [],
        metas: [],
        transferencias: [],
        salarios: [],
        ingresos: [],
        gastos: [],
        categorias: [],
        nombresCuenta: {},
        nombresTarjeta: {},
        ...parcial,
    } as DatosExportables;
}

const fecha = new Date('2026-03-15T12:00:00Z');

describe('generateTransactionsCSV', () => {
    it('incluye las transferencias, que antes se quedaban fuera', () => {
        const csv = generateTransactionsCSV(datos({
            transferencias: [{
                fecha, monto: 250, montoDestino: 250,
                origen: 'Banco General', destino: 'Ahorros', descripcion: 'Para el viaje',
            }],
        }));
        expect(csv).toContain('Transferencia');
        expect(csv).toContain('Banco General');
        expect(csv).toContain('Ahorros');
        expect(csv).toContain('Para el viaje');
    });

    it('anota el importe acreditado cuando hubo tipo de cambio', () => {
        // Sale 100 del origen pero entran 96 al destino: sin esto el CSV daria
        // a entender que el dinero se evaporo.
        const csv = generateTransactionsCSV(datos({
            transferencias: [{
                fecha, monto: 100, montoDestino: 96,
                origen: 'Dólares', destino: 'Euros', descripcion: '',
            }],
        }));
        expect(csv).toContain('entran 96');
    });

    it('escribe los gastos en negativo y los ingresos en positivo', () => {
        const csv = generateTransactionsCSV(datos({
            gastos: [{ fecha, nombre: 'Alquiler', monto: 650, categoriaId: 1, cuentaId: 1, tarjetaId: null, proyectado: false }],
            salarios: [{ fecha, neto: 2000, bruto: 2400, empresa: 'ACME' }],
            categorias: [{ id: 1, nombre: 'Vivienda' }],
            nombresCuenta: { 1: 'Banco General' },
        }));
        expect(csv).toContain(',-650,');
        expect(csv).toContain(',2000,');
    });

    it('resuelve el nombre de la categoría desde categoryId', () => {
        const csv = generateTransactionsCSV(datos({
            gastos: [{ fecha, nombre: 'Gasolina', monto: 40, categoriaId: 9, cuentaId: null, tarjetaId: null, proyectado: false }],
            categorias: [{ id: 9, nombre: 'Transporte' }],
        }));
        expect(csv).toContain('Transporte');
    });

    it('marca los gastos proyectados aparte de los reales', () => {
        const csv = generateTransactionsCSV(datos({
            gastos: [{ fecha, nombre: 'Luz', monto: 55, categoriaId: null, cuentaId: null, tarjetaId: null, proyectado: true }],
        }));
        expect(csv).toContain('Gasto proyectado');
    });

    it('entrecomilla los campos que llevan comas', () => {
        const csv = generateTransactionsCSV(datos({
            gastos: [{ fecha, nombre: 'Cena, con postre', monto: 30, categoriaId: null, cuentaId: null, tarjetaId: null, proyectado: false }],
        }));
        expect(csv).toContain('"Cena, con postre"');
    });

    it('ordena del más reciente al más antiguo', () => {
        const csv = generateTransactionsCSV(datos({
            gastos: [
                { fecha: new Date('2026-01-05T12:00:00Z'), nombre: 'Viejo', monto: 10, categoriaId: null, cuentaId: null, tarjetaId: null, proyectado: false },
                { fecha: new Date('2026-06-20T12:00:00Z'), nombre: 'Nuevo', monto: 10, categoriaId: null, cuentaId: null, tarjetaId: null, proyectado: false },
            ],
        }));
        expect(csv.indexOf('Nuevo')).toBeLessThan(csv.indexOf('Viejo'));
    });
});

describe('generateSnapshotCSV', () => {
    it('incluye saldos, deudas y metas, que el histórico no cubre', () => {
        const csv = generateSnapshotCSV(datos({
            cuentas: [{ nombre: 'Banco General', tipo: 'BANK', proposito: 'SPENDING', saldo: 1500, moneda: 'USD' }],
            tarjetas: [{ nombre: 'Visa', banco: 'BAC', saldo: 300, limite: 2000, diaCorte: 15, diaPago: 5, tasaInteres: 24 }],
            prestamos: [{ nombre: 'Carro', prestamista: 'Banco X', tipo: 'BANK', montoTotal: 12000, saldoActual: 8000, tasaInteres: 9, cuotaMensual: 250 }],
            metas: [{ nombre: 'Viaje', objetivo: 3000, acumulado: 1200, fechaLimite: fecha, prioridad: 'HIGH', pausada: false }],
        }));
        expect(csv).toContain('Banco General');
        expect(csv).toContain('Visa');
        expect(csv).toContain('Carro');
        expect(csv).toContain('Viaje');
    });

    it('calcula cuánto falta para cada meta', () => {
        const csv = generateSnapshotCSV(datos({
            metas: [{ nombre: 'Viaje', objetivo: 3000, acumulado: 1200, fechaLimite: null, prioridad: '', pausada: false }],
        }));
        expect(csv).toContain('1800');
    });

    it('nunca muestra un faltante negativo en una meta ya cumplida', () => {
        const csv = generateSnapshotCSV(datos({
            metas: [{ nombre: 'Colchón', objetivo: 1000, acumulado: 1400, fechaLimite: null, prioridad: '', pausada: false }],
        }));
        expect(csv).not.toContain('-400');
    });
});
