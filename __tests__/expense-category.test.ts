import {
    nombreCategoria,
    esDeCategoria,
    esPagoDeDeuda,
    SIN_CATEGORIA,
} from '../lib/expense-category';

/**
 * El caso que motiva todo esto: un gasto guarda la categoria dos veces y las dos
 * pueden decir cosas distintas. Lo que se prueba aqui es cual gana.
 */
describe('nombreCategoria', () => {
    it('cree a la relación antes que al texto cuando discrepan', () => {
        // Pasa en cuanto alguien renombra: los gastos ya escritos conservan el
        // nombre viejo en la columna de texto.
        expect(nombreCategoria({
            categoryId: 3,
            category: 'Comida',
            categoryRel: { name: 'Alimentación' },
        })).toBe('Alimentación');
    });

    it('usa el texto cuando el gasto no tiene relación', () => {
        // Gastos anteriores a que existiera Category, y los que se quedaron sin
        // relación al borrarla: el texto es lo unico que queda de lo que fueron.
        expect(nombreCategoria({ categoryId: null, category: 'Transporte' }))
            .toBe('Transporte');
    });

    it('no deja huecos cuando no hay ni relación ni texto', () => {
        expect(nombreCategoria({})).toBe(SIN_CATEGORIA);
        expect(nombreCategoria({ category: '   ' })).toBe(SIN_CATEGORIA);
        expect(nombreCategoria({ category: null, categoryRel: null })).toBe(SIN_CATEGORIA);
    });
});

describe('esDeCategoria', () => {
    const alimentacion = { id: 1, name: 'Alimentación' };
    const ocio = { id: 2, name: 'Ocio' };

    it('empareja por relación', () => {
        expect(esDeCategoria({ categoryId: 1, category: 'Alimentación' }, alimentacion)).toBe(true);
        expect(esDeCategoria({ categoryId: 1, category: 'Alimentación' }, ocio)).toBe(false);
    });

    it('no cuenta un gasto en dos presupuestos por un nombre viejo', () => {
        // El gasto es de Alimentación (id 1), pero su texto quedó en "Ocio"
        // porque asi se llamaba antes. Con la comparacion antigua —relacion O
        // texto— sumaba en los dos presupuestos y el mes cuadraba de mas.
        const gasto = { categoryId: 1, category: 'Ocio' };
        expect(esDeCategoria(gasto, alimentacion)).toBe(true);
        expect(esDeCategoria(gasto, ocio)).toBe(false);
    });

    it('cae al texto solo si el gasto no tiene relación', () => {
        expect(esDeCategoria({ categoryId: null, category: 'Ocio' }, ocio)).toBe(true);
        expect(esDeCategoria({ categoryId: null, category: 'Ocio' }, alimentacion)).toBe(false);
    });
});

describe('esPagoDeDeuda', () => {
    it('reconoce los movimientos que crea la app sola, por la marca, no por el nombre de categoría', () => {
        // Contarlos como gasto del mes duplicaria el dinero: ya estan en el
        // saldo de la tarjeta o del prestamo.
        expect(esPagoDeDeuda({ categoryId: 7, categoryRel: { name: 'Deudas' }, isDebtSettlement: true })).toBe(true);
        expect(esPagoDeDeuda({ categoryId: 8, categoryRel: { name: 'Pagos Tarjeta' }, isDebtSettlement: true })).toBe(true);
    });

    it('deja pasar un gasto normal', () => {
        expect(esPagoDeDeuda({ categoryId: 1, categoryRel: { name: 'Alimentación' } })).toBe(false);
        expect(esPagoDeDeuda({})).toBe(false);
    });

    it('NO lo marca solo por el nombre de la categoría', () => {
        // El bug real: un usuario con su propia categoría "Deudas" para gastos
        // personales (ej. pagarle a un amigo) no debe perder ese gasto de
        // Gastos y del total del mes — isDebtSettlement, no el nombre, decide.
        expect(esPagoDeDeuda({ categoryId: 7, categoryRel: { name: 'Deudas' } })).toBe(false);
        expect(esPagoDeDeuda({ category: 'Pagos Tarjeta' })).toBe(false);
    });
});
