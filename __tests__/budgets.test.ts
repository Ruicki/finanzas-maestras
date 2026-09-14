import {
    limiteDelMes,
    mesAnterior,
    sobranteDelMesAnterior,
    estadoDeCategorias,
    resumenDePresupuesto,
    costeAnualDeSuscripciones,
    montoPendienteEsteMes,
} from '../lib/budgets';

/** Marzo de 2026: mes 2 en base 0. */
const MES = 2;
const AÑO = 2026;

const enMarzo = (dia: number) => new Date(AÑO, MES, dia, 12);
const enFebrero = (dia: number) => new Date(AÑO, MES - 1, dia, 12);

const comida = {
    id: 1,
    monthlyLimit: 400,
    isRollover: true,
    budgets: [{ year: AÑO, month: 3, limit: 500 }],
};

describe('limiteDelMes', () => {
    it('prefiere el presupuesto del mes al límite general', () => {
        expect(limiteDelMes(comida, AÑO, 3)).toBe(500);
    });

    it('usa el límite general para los meses sin presupuesto propio', () => {
        expect(limiteDelMes(comida, AÑO, 4)).toBe(400);
    });

    it('da cero cuando no hay ni una cosa ni la otra', () => {
        expect(limiteDelMes({ id: 9 }, AÑO, 3)).toBe(0);
        expect(limiteDelMes({ id: 9, monthlyLimit: null }, AÑO, 3)).toBe(0);
    });
});

describe('mesAnterior', () => {
    it('retrocede dentro del mismo año', () => {
        expect(mesAnterior(5, 2026)).toEqual({ month0: 4, year: 2026 });
    });

    it('cruza enero bajando el año', () => {
        expect(mesAnterior(0, 2026)).toEqual({ month0: 11, year: 2025 });
    });
});

describe('sobranteDelMesAnterior', () => {
    it('arrastra lo que no se gastó', () => {
        // Febrero tenía 400 de límite general y se gastaron 150.
        const sobrante = sobranteDelMesAnterior(
            comida,
            [{ categoryId: 1, amount: 150, createdAt: enFebrero(10) }],
            MES, AÑO,
        );
        expect(sobrante).toBe(250);
    });

    it('no arrastra nada si la categoría no lo tiene activado', () => {
        // Antes se sumaba el sobrante a TODAS las categorías, tuviera el
        // usuario la opción puesta o no, e inflaba el presupuesto solo.
        const sinArrastre = { ...comida, isRollover: false };
        expect(sobranteDelMesAnterior(sinArrastre, [], MES, AÑO)).toBe(0);
    });

    it('nunca arrastra un número negativo', () => {
        const sobrante = sobranteDelMesAnterior(
            comida,
            [{ categoryId: 1, amount: 900, createdAt: enFebrero(10) }],
            MES, AÑO,
        );
        expect(sobrante).toBe(0);
    });

    it('ignora los gastos proyectados, que aún no han salido', () => {
        const sobrante = sobranteDelMesAnterior(
            comida,
            [{ categoryId: 1, amount: 400, createdAt: enFebrero(10), isProjected: true }],
            MES, AÑO,
        );
        expect(sobrante).toBe(400);
    });

    it('no cuenta los gastos de otras categorías ni de otros meses', () => {
        const sobrante = sobranteDelMesAnterior(
            comida,
            [
                { categoryId: 2, amount: 300, createdAt: enFebrero(10) },
                { categoryId: 1, amount: 300, createdAt: enMarzo(10) },
            ],
            MES, AÑO,
        );
        expect(sobrante).toBe(400);
    });
});

describe('estadoDeCategorias', () => {
    it('suma el arrastre al límite del mes', () => {
        const [estado] = estadoDeCategorias(
            [comida],
            [{ categoryId: 1, amount: 120, createdAt: enMarzo(3) }],
            [{ categoryId: 1, amount: 100, createdAt: enFebrero(3) }],
            MES, AÑO,
        );
        expect(estado.gastado).toBe(120);
        expect(estado.arrastre).toBe(300);       // 400 de febrero - 100 gastados
        expect(estado.efectivo).toBe(800);       // 500 de marzo + 300
    });

    it('no cuenta lo proyectado como gastado', () => {
        const [estado] = estadoDeCategorias(
            [{ id: 1, monthlyLimit: 200 }],
            [
                { categoryId: 1, amount: 50, createdAt: enMarzo(3) },
                { categoryId: 1, amount: 999, createdAt: enMarzo(4), isProjected: true },
            ],
            [], MES, AÑO,
        );
        expect(estado.gastado).toBe(50);
    });
});

describe('resumenDePresupuesto', () => {
    const estados = estadoDeCategorias(
        [
            { id: 1, monthlyLimit: 300 },
            { id: 2, monthlyLimit: 100 },
            { id: 3 }, // sin límite
        ],
        [
            { categoryId: 1, amount: 250, createdAt: enMarzo(2) },
            { categoryId: 2, amount: 180, createdAt: enMarzo(5) },
            { categoryId: 3, amount: 60, createdAt: enMarzo(7) },
        ],
        [], MES, AÑO,
    );

    it('suma lo gastado y lo asignado', () => {
        const r = resumenDePresupuesto(estados);
        expect(r.gastado).toBe(490);
        expect(r.asignado).toBe(400);
    });

    it('cuenta como excedida solo la que pasó su límite', () => {
        expect(resumenDePresupuesto(estados).excedidas).toBe(1);
    });

    it('no marca como excedida una categoría sin límite', () => {
        // La categoría 3 gastó 60 sin límite puesto. Sin límite no hay nada que
        // exceder, y marcarla llenaría la app de alertas que no significan nada.
        const soloSinLimite = estadoDeCategorias(
            [{ id: 3 }],
            [{ categoryId: 3, amount: 999, createdAt: enMarzo(7) }],
            [], MES, AÑO,
        );
        expect(resumenDePresupuesto(soloSinLimite).excedidas).toBe(0);
    });
});

describe('costeAnualDeSuscripciones', () => {
    it('multiplica las mensuales por doce y deja las anuales como están', () => {
        // Multiplicar una anual por 12 es el error obvio aquí, y convierte una
        // suscripción de 120 al año en 1.440.
        expect(costeAnualDeSuscripciones([
            { amount: 10, recurrenceType: 'MONTHLY' },
            { amount: 120, recurrenceType: 'ANNUAL' },
        ])).toBe(240);
    });

    it('trata como mensual lo que no dice su frecuencia', () => {
        expect(costeAnualDeSuscripciones([{ amount: 10 }])).toBe(120);
    });

    it('da cero sin suscripciones', () => {
        expect(costeAnualDeSuscripciones([])).toBe(0);
    });
});

describe('montoPendienteEsteMes', () => {
    const hoy = new Date(2026, 2, 20); // 20 marzo 2026

    it('excluye una suscripción ya pagada este ciclo', () => {
        const pagada = { amount: 15, dueDate: 15, graceDays: null, lastPaidAt: new Date(2026, 2, 15) };
        expect(montoPendienteEsteMes([pagada], hoy)).toBe(0);
    });

    it('incluye una suscripción pendiente (aún no llega su día de cobro este ciclo... o ya pasó sin pagar)', () => {
        const pendiente = { amount: 12, dueDate: 25, graceDays: null, lastPaidAt: null };
        expect(montoPendienteEsteMes([pendiente], hoy)).toBe(12);
    });

    it('incluye una suscripción vencida', () => {
        const vencida = { amount: 8, dueDate: 5, graceDays: null, lastPaidAt: null };
        expect(montoPendienteEsteMes([vencida], hoy)).toBe(8);
    });

    it('suma varias, dejando fuera solo las ya pagadas', () => {
        const pagada = { amount: 15, dueDate: 15, graceDays: null, lastPaidAt: new Date(2026, 2, 15) };
        const pendiente = { amount: 12, dueDate: 25, graceDays: null, lastPaidAt: null };
        const vencida = { amount: 8, dueDate: 5, graceDays: null, lastPaidAt: null };
        expect(montoPendienteEsteMes([pagada, pendiente, vencida], hoy)).toBe(20);
    });

    it('da cero sin suscripciones', () => {
        expect(montoPendienteEsteMes([], hoy)).toBe(0);
    });
});
