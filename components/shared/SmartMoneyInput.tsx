'use client';

import React, { useRef, useCallback } from 'react';

interface SmartMoneyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onMoneyChange: (value: string) => void;
    value: string | number;
    selectOnFocus?: boolean;
}

/**
 * Input de dinero con formato de derecha a izquierda (RTL decimal).
 * Al escribir "123" muestra "$1.23", al escribir "1234" muestra "$12.34".
 * Siempre mantiene 2 decimales.
 */
export const SmartMoneyInput = ({ onMoneyChange, value, className, selectOnFocus = true, ...props }: SmartMoneyInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const displayValue = typeof value === 'number'
        ? value.toFixed(2)
        : (value || '0.00');

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');

        if (!raw) {
            onMoneyChange('0.00');
            return;
        }

        // RTL: cada dígito nuevo desplaza los existentes a la izquierda del punto
        const numericValue = parseInt(raw, 10) / 100;

        // Limitar a 999999.99
        if (numericValue > 999999.99) {
            onMoneyChange('999999.99');
            return;
        }

        onMoneyChange(numericValue.toFixed(2));
    }, [onMoneyChange]);

    const handleFocus = useCallback(() => {
        if (!selectOnFocus) return;
        inputRef.current?.select();
    }, [selectOnFocus]);

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            className={className}
        />
    );
};
