import React from 'react';
import type { WidgetTaskHandler, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickAddWidget } from './QuickAddWidget';

/**
 * Android llama esto (fuera del ciclo de vida normal de la app, incluso con
 * la app cerrada) cuando el widget se agrega, se redibuja o cambia de
 * tamaño. No hay nada que calcular — el widget es siempre los mismos dos
 * botones — así que solo renderiza QuickAddWidget en cada caso que lo
 * requiere.
 */
export const widgetTaskHandler: WidgetTaskHandler = async (props: WidgetTaskHandlerProps) => {
    switch (props.widgetAction) {
        case 'WIDGET_ADDED':
        case 'WIDGET_UPDATE':
        case 'WIDGET_RESIZED':
            props.renderWidget(React.createElement(QuickAddWidget));
            break;
        default:
            break;
    }
};
