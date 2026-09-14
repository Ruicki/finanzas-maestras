import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const esProduccion = process.env.NODE_ENV === 'production';

const formatoLegible = printf(({ level, message, timestamp, stack, ...resto }) => {
    // En desarrollo el contexto se imprime al final y solo si lo hay, para que
    // la linea siga siendo legible de un vistazo.
    const contexto = Object.keys(resto).length ? ` ${JSON.stringify(resto)}` : '';
    return `${timestamp} [${level}]: ${stack || message}${contexto}`;
});

/**
 * En produccion emite JSON, una linea por evento. Vercel captura la salida
 * estandar, asi que asi los fallos quedan buscables por campo —perfil, accion,
 * ruta— en vez de ser texto suelto que hay que leer a ojo.
 *
 * En desarrollo se mantiene el formato con color, que es lo comodo en la
 * terminal.
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: esProduccion
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(
              timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              errors({ stack: true }),
              formatoLegible,
          ),
    transports: [
        new winston.transports.Console({
            format: esProduccion
                ? undefined
                : combine(colorize(), formatoLegible),
        }),
    ],
});

/** Datos que acompañan a un fallo para poder encontrarlo despues. */
export interface ContextoError {
    /** Que se estaba intentando hacer, en terminos del dominio: 'crear gasto'. */
    accion: string;
    /** A quien le paso. Nunca el correo ni el nombre: solo el identificador. */
    profileId?: number;
    /** Identificador de la entidad implicada, si aplica. */
    targetId?: number;
    /** Cualquier otro dato util que NO sea personal ni un secreto. */
    [clave: string]: unknown;
}

/**
 * Punto unico para reportar un fallo del servidor. Existe para que todos los
 * errores salgan con la misma forma: hasta ahora unos iban por console.error y
 * otros por logger.error, con mensajes libres, asi que no habia manera de
 * filtrar "todos los fallos al pagar una tarjeta" ni de saber a quien le paso.
 *
 * No incluyas aqui correos, contraseñas ni tokens: esto acaba en los registros
 * de Vercel, que son mas accesibles que la base de datos.
 *
 * Devuelve el error para poder escribir `throw reportError(e, {...})` sin
 * romper el flujo de la funcion.
 */
export function reportError(error: unknown, contexto: ContextoError): unknown {
    const esError = error instanceof Error;
    logger.error(esError ? error.message : String(error), {
        ...contexto,
        ...(esError && error.stack ? { stack: error.stack } : {}),
    });
    return error;
}
