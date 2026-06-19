'use client';

import React, { useRef } from 'react';

interface SmartMoneyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onMoneyChange: (value: string) => void;
    value: string | number;
}

export const SmartMoneyInput = ({ onMoneyChange, value, className, ...props }: SmartMoneyInputProps) => {
    // Convierte el valor actual string/number a formato visual
    // Si viene 12.34 se muestra como 12.34

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Obtenemos solo los dígitos del nuevo valor
        const rawValue = e.target.value.replace(/\D/g, '');

        // Si no hay dígitos, es 0
        if (!rawValue) {
            onMoneyChange('0.00');
            return;
        }

        // Convertimos a número y dividimos por 100 para desplazar el punto decimal
        const numericValue = parseInt(rawValue, 10) / 100;

        onMoneyChange(numericValue.toFixed(2));
    };

    return (
        <input
            {...props}
            type="text" // Usamos text para controlar el formateo nosotros mismos
            inputMode="numeric"
            value={typeof value === 'number' ? value.toFixed(2) : value}
            onChange={handleChange}
            className={className}
        />
    );
};
