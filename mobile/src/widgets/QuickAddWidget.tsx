import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * El widget en sí: dos botones ("+ Gasto" / "+ Ingreso") que abren la app
 * directo en la pantalla de alta rápida (quick-add.tsx) con el tipo
 * correspondiente, vía deep link (`OPEN_URI` → el scheme `finanzasmaestras`
 * configurado en app.json). No hay forma de tipear un monto dentro del
 * propio widget (RemoteViews de Android no da para un formulario real), así
 * que el widget es el atajo de 1 toque hacia el formulario, no el
 * formulario mismo.
 */
export function QuickAddWidget() {
    return (
        <FlexWidget
            style={{
                height: 'match_parent',
                width: 'match_parent',
                backgroundColor: '#F1ECE2',
                borderRadius: 20,
                padding: 8,
                flexDirection: 'row',
                flexGap: 8,
            }}
        >
            <FlexWidget
                clickAction="OPEN_URI"
                clickActionData={{ uri: 'finanzasmaestras://quick-add?tipo=gasto' }}
                style={{
                    flex: 1,
                    height: 'match_parent',
                    backgroundColor: '#2F6699',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <TextWidget text="+ Gasto" style={{ color: '#F1ECE2', fontSize: 15, fontWeight: 'bold' }} />
            </FlexWidget>
            <FlexWidget
                clickAction="OPEN_URI"
                clickActionData={{ uri: 'finanzasmaestras://quick-add?tipo=ingreso' }}
                style={{
                    flex: 1,
                    height: 'match_parent',
                    backgroundColor: '#63A0B5',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <TextWidget text="+ Ingreso" style={{ color: '#F1ECE2', fontSize: 15, fontWeight: 'bold' }} />
            </FlexWidget>
        </FlexWidget>
    );
}
