import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // para imprimir el stack trace
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                logFormat
            )
        })
        // En el futuro, aquí se puede agregar winston.transports.File() o conectores a Sentry/Datadog.
    ],
});
