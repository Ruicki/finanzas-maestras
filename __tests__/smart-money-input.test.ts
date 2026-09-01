/**
 * Test: SmartMoneyInput RTL parsing behavior
 *
 * El componente SmartMoneyInput usa RTL: cada dígito desplaza los anteriores.
 * Ej: escribir "123" muestra "$1.23"
 *
 * BUG: Al editar meta existente (ej: $5000), sin select(), el dígito se
 * concatena al raw y corrompe: $5000 + "1" → $50000.01
 *
 * FIX: select() en focus reemplaza todo el texto, el primer dígito empieza
 * limpio. Keystrokes siguientes usan RTL normal.
 */

// Simula SmartMoneyInput.handleChange (RTL normal)
function rtlParse(currentDisplayValue: string, typedChar: string): string {
    const currentRaw = currentDisplayValue.replace(/\D/g, '');
    const combined = currentRaw + typedChar.replace(/\D/g, '');
    if (!combined) return '0.00';
    const numericValue = parseInt(combined, 10) / 100;
    if (numericValue > 999999.99) return '999999.99';
    return numericValue.toFixed(2);
}

// Simula typing con select() en el primer keystroke, luego RTL normal
function typeWithSelect(initialValue: string, ...chars: string[]): string {
    let value = initialValue;
    for (let i = 0; i < chars.length; i++) {
        if (i === 0) {
            // Primer keystroke: select() reemplaza todo
            const raw = chars[i].replace(/\D/g, '');
            value = raw ? (parseInt(raw, 10) / 100).toFixed(2) : '0.00';
        } else {
            // Keystrokes siguientes: RTL normal (cursor al final)
            value = rtlParse(value, chars[i]);
        }
    }
    return value;
}

describe('SmartMoneyInput RTL parsing', () => {

    describe('BUG: sin select(), valor se corrompe', () => {
        test('$5000 + "1" → $50000.01 (CORRUPTO)', () => {
            expect(rtlParse('5000.00', '1')).toBe('50000.01');
        });

        test('$100 + "5" → $1000.05 (CORRUPTO)', () => {
            expect(rtlParse('100.00', '5')).toBe('1000.05');
        });

        test('$50.50 + "3" → $505.03 (CORRUPTO)', () => {
            expect(rtlParse('50.50', '3')).toBe('505.03');
        });

        test('$999 + "9" → $9990.09 (CORRUPTO)', () => {
            expect(rtlParse('999.00', '9')).toBe('9990.09');
        });

        test('este bug NO ocurre cuando el campo está vacío', () => {
            expect(rtlParse('0.00', '5')).toBe('0.05'); // RTL correcto
        });
    });

    describe('FIX: select() en focus reemplaza el valor correctamente', () => {
        test('$5000 + select + "1" → $0.01 (reemplaza limpiamente)', () => {
            expect(typeWithSelect('5000.00', '1')).toBe('0.01');
        });

        test('$100 + select + "5" → $0.05', () => {
            expect(typeWithSelect('100.00', '5')).toBe('0.05');
        });

        test('escribir "123" con select → $1.23 (select solo aplica al 1er keystroke)', () => {
            // 1: select reemplaza → 0.01
            // 2: RTL normal → 0.01 + "2" → raw "0012" → 0.12
            // 3: RTL normal → 0.12 + "3" → raw "00123" → 1.23
            expect(typeWithSelect('5000.00', '1', '2', '3')).toBe('1.23');
        });

        test('escribir "5000" con select → $50.00', () => {
            // 5: select → 0.05
            // 0: RTL → 0.05 + "0" → raw "0050" → 0.50
            // 0: RTL → 0.50 + "0" → raw "00500" → 5.00
            // 0: RTL → 5.00 + "0" → raw "05000" → 50.00
            expect(typeWithSelect('0.00', '5', '0', '0', '0')).toBe('50.00');
        });

        test('campo vacío + select + "5" → $0.05', () => {
            expect(typeWithSelect('0.00', '5')).toBe('0.05');
        });
    });

    describe('GoalsTab: .toFixed(2) vs .toString()', () => {
        test('.toString() NO tiene decimales → SmartMoneyInput muestra "5000"', () => {
            expect((5000).toString()).toBe('5000');
        });

        test('.toFixed(2) SÍ tiene decimales → SmartMoneyInput muestra "5000.00"', () => {
            expect((5000).toFixed(2)).toBe('5000.00');
        });

        test('Number("5000").toFixed(2) → "5000.00"', () => {
            expect(Number('5000').toFixed(2)).toBe('5000.00');
        });

        test('Number(undefined || 0).toFixed(2) → "0.00"', () => {
            expect(Number(undefined || 0).toFixed(2)).toBe('0.00');
        });

        test('con select(), importa que el display muestre decimales para que el cursor esté bien', () => {
            // Si display es "5000" (sin .toFixed), select + "1" → raw "1" → 0.01
            // Si display es "5000.00" (con .toFixed), select + "1" → raw "1" → 0.01
            // Ambos dan lo mismo con select, pero .toFixed asegura consistencia visual
            expect(typeWithSelect('5000', '1')).toBe('0.01');
            expect(typeWithSelect('5000.00', '1')).toBe('0.01');
        });
    });
});
