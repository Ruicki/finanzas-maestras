# Documento de Requisitos — Finanzas Maestras

## Introducción

**Finanzas Maestras** es una aplicación web de gestión de finanzas personales orientada al mercado panameño. Construida con Next.js 16 (App Router), React 19, TypeScript 5, Prisma ORM sobre PostgreSQL (Neon DB) y desplegada en Vercel. Implementa cálculo de salario panameño (SS, Educación, ISR, Décimo), gestión de cuentas, tarjetas de crédito, préstamos, metas de ahorro, presupuestos con sinking funds y un sistema de autenticación con roles y auditoría.

Este documento sirve como referencia completa del estado actual del proyecto, vulnerabilidades de seguridad detectadas y los requisitos de las fases futuras del roadmap.

---

## Glosario

- **System**: La aplicación Finanzas Maestras en su totalidad.
- **Auth_Module**: Módulo de autenticación (login, register, logout, claim).
- **Server_Action**: Función de servidor de Next.js que ejecuta lógica de negocio.
- **Profile**: Entidad de usuario con roles USER o ADMIN.
- **Salary_Calculator**: Módulo de cálculo de salario bruto/neto con deducciones panameñas.
- **Account**: Cuenta bancaria, de efectivo o de ahorro del usuario.
- **Expense**: Gasto registrado por el usuario, vinculado a categoría y método de pago.
- **Category**: Categoría de gasto con límite mensual opcional y soporte de rollover/sinking fund.
- **Goal**: Meta de ahorro de tipo FIXED o VARIABLE con aportes automáticos.
- **CreditCard**: Tarjeta de crédito con tasa de interés, anualidad y seguro de deuda.
- **Loan**: Préstamo con tabla de amortización y fecha de libertad financiera.
- **Transfer**: Transferencia de fondos entre cuentas del mismo usuario.
- **AuditLog**: Registro inmutable de acciones administrativas en base de datos.
- **Validator**: Capa de validación de inputs antes de persistencia.
- **Rate_Limiter**: Mecanismo de limitación de intentos por IP/usuario en endpoints sensibles.
- **ITaxStrategy**: Interfaz del patrón Strategy para cálculo de impuestos.
- **PanamaTaxStrategy**: Implementación concreta de ITaxStrategy para deducciones panameñas.
- **Repository**: Patrón de acceso a datos (AccountRepository, SalaryRepository).
- **Middleware**: Middleware de Next.js para protección de rutas autenticadas.
- **JWT**: Token de autenticación almacenado en cookie httpOnly.
- **AccessCode**: Código de 6 caracteres para reclamar un perfil existente.
- **Impersonation**: Funcionalidad admin para operar como otro usuario.
- **CSP**: Content Security Policy, cabecera HTTP de seguridad.
- **CSRF**: Cross-Site Request Forgery, ataque de falsificación de solicitudes.
- **Zod**: Librería de validación y parsing de esquemas TypeScript.

---

## Estado Actual del Proyecto

### Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.1 |
| UI | React | 19 |
| Lenguaje | TypeScript | 5 |
| ORM | Prisma | 5.10 |
| Base de datos | PostgreSQL (Neon DB) | — |
| Estilos | Tailwind CSS | v4 |
| Componentes | Radix UI + Lucide React | — |
| Gráficas | Recharts | — |
| Animaciones | Framer Motion | — |
| Auth tokens | Jose (JWT) | — |
| Hashing | bcryptjs | — |
| Notificaciones UI | Sonner | — |
| Logging | Winston | — |
| Testing | Jest + ts-jest | — |
| Deploy | Vercel | — |

### Arquitectura

- App Router de Next.js con Server Actions (sin API routes tradicionales)
- Patrón Repository: `AccountRepository`, `SalaryRepository`
- Strategy Pattern para impuestos: `ITaxStrategy` → `PanamaTaxStrategy`
- JWT en cookies httpOnly gestionado con Jose
- Middleware de Next.js para protección de rutas
- AuditLog en base de datos para acciones administrativas
- Impersonación de usuarios como feature exclusiva de ADMIN

### Modelos de Datos (Prisma)

- `Profile`: usuario con roles USER/ADMIN, email, password hasheado, accessCode
- `Salary`: salario bruto/neto, deducciones SS 9.75%, Educación 1.25%, ISR, Décimo
- `AdditionalIncome`: ingresos eventuales o recurrentes
- `Expense`: gastos con categorías, métodos de pago, vinculación a cuentas/tarjetas
- `Category`: categorías con límites mensuales, rollover/sinking funds
- `Goal`: metas FIXED/VARIABLE con aportes automáticos
- `CreditCard`: tarjetas con tasa de interés, anualidad, seguro de deuda
- `Loan`: préstamos con amortización y fecha de libertad financiera
- `Account`: cuentas bancarias/efectivo/ahorro con bloqueo de fondos
- `Transfer`: transferencias entre cuentas
- `AuditLog`: registro de acciones admin

### Fases Completadas

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Modelo de salario panameño (SS, Edu, ISR, Décimo) | ✅ Completada |
| Fase 2 | Metas inteligentes FIXED/VARIABLE con aportes automáticos | ✅ Completada |
| Fase 3 | Tarjetas de crédito con interés, anualidad y seguro | ✅ Completada |
| Fase 4 | Sinking Funds / Rollover de categorías | ✅ Completada |
| Fase 5 | Cuentas bancarias y transferencias con bloqueo de fondos | ✅ Completada |
| Fase 6 | Deudas y préstamos con amortización | ✅ Completada |
| Fase 7 | Audit Logs de acciones administrativas | ✅ Completada |
| Fase 8 | Auth completa: JWT, roles, impersonación, claim profile | ✅ Completada |

### Estado del Testing

- 1 archivo de tests: `__tests__/financial-engine.test.ts`
- 4 tests unitarios del motor de cálculo de salario
- Sin tests de integración, E2E, Server Actions ni seguridad

---

## Requisitos de Seguridad (Fase 9 — Crítico)

### Requisito 1: Protección de Credenciales en Repositorio

**User Story:** Como administrador del sistema, quiero que las credenciales de producción no estén expuestas en el repositorio, para que actores maliciosos no puedan acceder a la base de datos ni comprometer el sistema.

#### Criterios de Aceptación

1. THE System SHALL mantener el archivo `.env` en `.gitignore` y nunca commitearlo al repositorio.
2. THE System SHALL proveer un archivo `.env.example` con todas las variables requeridas sin valores reales.
3. THE System SHALL documentar el proceso de configuración de variables de entorno para nuevos entornos.
4. IF el archivo `.env` es detectado en el historial de git, THEN THE System SHALL requerir rotación inmediata de todas las credenciales expuestas.

### Requisito 2: JWT Secret Seguro

**User Story:** Como administrador del sistema, quiero que el JWT secret sea siempre una variable de entorno obligatoria, para que los tokens de autenticación no puedan ser falsificados con un valor por defecto conocido.

#### Criterios de Aceptación

1. THE Auth_Module SHALL leer el JWT secret exclusivamente desde la variable de entorno `JWT_SECRET`.
2. IF la variable de entorno `JWT_SECRET` no está definida al iniciar la aplicación, THEN THE System SHALL lanzar un error fatal y detener el arranque.
3. THE System SHALL rechazar cualquier valor de `JWT_SECRET` con menos de 32 caracteres de longitud.
4. THE System SHALL eliminar cualquier valor de fallback hardcodeado para `JWT_SECRET` en el código fuente.

### Requisito 3: Autorización en Server Actions

**User Story:** Como usuario, quiero que mis datos solo sean accesibles y modificables por mí, para que otros usuarios autenticados no puedan manipular mi información.

#### Criterios de Aceptación

1. WHEN una Server_Action recibe una solicitud, THE Server_Action SHALL verificar que el `profileId` del recurso solicitado pertenece al usuario autenticado en la sesión activa.
2. IF el `profileId` del recurso no coincide con el usuario autenticado, THEN THE Server_Action SHALL retornar un error de autorización 403 sin ejecutar la operación.
3. THE Server_Action `deleteProfile` SHALL verificar autorización de ownership o rol ADMIN antes de ejecutar la eliminación.
4. THE Server_Action `deleteExpense` SHALL verificar que el gasto pertenece al perfil del usuario autenticado antes de ejecutar la eliminación.
5. WHILE un usuario tiene rol USER, THE System SHALL impedir el acceso a Server_Actions exclusivas de ADMIN.

### Requisito 4: Rate Limiting en Autenticación

**User Story:** Como administrador del sistema, quiero limitar los intentos de login y registro por IP, para que ataques de fuerza bruta no puedan comprometer cuentas de usuario.

#### Criterios de Aceptación

1. WHEN un cliente realiza más de 10 intentos de login fallidos en un período de 15 minutos desde la misma IP, THE Rate_Limiter SHALL bloquear solicitudes adicionales de esa IP por 15 minutos.
2. WHEN un cliente realiza más de 5 intentos de registro en un período de 60 minutos desde la misma IP, THE Rate_Limiter SHALL rechazar solicitudes adicionales de esa IP por 60 minutos.
3. IF una solicitud es bloqueada por rate limiting, THEN THE System SHALL retornar HTTP 429 con un mensaje indicando el tiempo de espera restante.
4. THE Rate_Limiter SHALL registrar en AuditLog los eventos de bloqueo por rate limiting.

### Requisito 5: Validación de Inputs con Zod

**User Story:** Como desarrollador, quiero que todos los inputs de usuario sean validados antes de llegar a Prisma, para que datos malformados o maliciosos no corrompan la base de datos ni generen errores inesperados.

#### Criterios de Aceptación

1. THE Validator SHALL definir un esquema Zod para cada Server_Action que reciba datos del cliente.
2. WHEN una Server_Action recibe datos del cliente, THE Validator SHALL ejecutar la validación Zod antes de cualquier operación de base de datos.
3. IF la validación Zod falla, THEN THE Validator SHALL retornar los errores de validación al cliente sin ejecutar operaciones de base de datos.
4. THE System SHALL eliminar el uso del tipo `any` en parámetros de Server_Actions, reemplazándolo con tipos Zod inferidos.
5. THE Validator SHALL validar longitudes máximas, formatos de email, rangos numéricos y valores de enumeración en todos los campos de entrada.

### Requisito 6: Expiración de Cookie de Impersonación

**User Story:** Como administrador, quiero que la cookie de impersonación tenga una expiración definida, para que sesiones de impersonación no permanezcan activas indefinidamente.

#### Criterios de Aceptación

1. WHEN el sistema establece la cookie de impersonación, THE Auth_Module SHALL asignar una expiración máxima de 2 horas.
2. WHEN la cookie de impersonación expira, THE System SHALL redirigir al administrador a su sesión original automáticamente.
3. THE AuditLog SHALL registrar el inicio y fin de cada sesión de impersonación con timestamp y duración.

### Requisito 7: AccessCode Seguro

**User Story:** Como usuario, quiero que el código de acceso para reclamar mi perfil sea suficientemente complejo, para que no pueda ser adivinado por fuerza bruta.

#### Criterios de Aceptación

1. THE System SHALL generar AccessCodes con un mínimo de 12 caracteres alfanuméricos usando un generador criptográficamente seguro.
2. WHEN un AccessCode es utilizado exitosamente para reclamar un perfil, THE System SHALL invalidar el AccessCode inmediatamente.
3. THE Rate_Limiter SHALL limitar los intentos de claim a 5 por hora por IP.
4. THE System SHALL establecer una expiración de 72 horas para AccessCodes no utilizados.

### Requisito 8: Política de Contraseñas

**User Story:** Como usuario, quiero que el sistema requiera contraseñas con complejidad mínima, para que mi cuenta esté protegida contra ataques de diccionario.

#### Criterios de Aceptación

1. THE Auth_Module SHALL requerir contraseñas con un mínimo de 8 caracteres.
2. THE Auth_Module SHALL requerir que las contraseñas contengan al menos una letra mayúscula, una minúscula y un número.
3. IF una contraseña no cumple la política de complejidad, THEN THE Auth_Module SHALL retornar un mensaje descriptivo indicando los requisitos no cumplidos.
4. THE Auth_Module SHALL aplicar la misma política en registro, cambio de contraseña y reset de contraseña.

### Requisito 9: Content Security Policy

**User Story:** Como administrador del sistema, quiero que la aplicación envíe cabeceras CSP, para que ataques XSS no puedan ejecutar scripts maliciosos en el navegador del usuario.

#### Criterios de Aceptación

1. THE System SHALL configurar cabeceras `Content-Security-Policy` en `next.config.js` para todas las respuestas HTTP.
2. THE System SHALL configurar cabeceras `X-Frame-Options: DENY` para prevenir clickjacking.
3. THE System SHALL configurar cabeceras `X-Content-Type-Options: nosniff`.
4. THE System SHALL configurar cabeceras `Referrer-Policy: strict-origin-when-cross-origin`.

### Requisito 10: Limpieza de Archivos de Debug

**User Story:** Como administrador del sistema, quiero que los archivos de debug y scripts de diagnóstico no estén presentes en el repositorio de producción, para que no expongan información interna del sistema.

#### Criterios de Aceptación

1. THE System SHALL eliminar del repositorio los archivos `check_roles.ts`, `debug-net-worth.ts` y cualquier script de diagnóstico en la raíz del proyecto.
2. THE System SHALL mover scripts de utilidad legítimos al directorio `/scripts` con documentación clara de su propósito.
3. THE System SHALL agregar patrones de archivos de debug a `.gitignore`.

---

## Requisitos de Mejora de Testing (Fase 9 — Paralelo)

### Requisito 11: Tests de Server Actions

**User Story:** Como desarrollador, quiero tests automatizados para las Server Actions críticas, para que regresiones de lógica de negocio sean detectadas antes de llegar a producción.

#### Criterios de Aceptación

1. THE System SHALL tener tests de integración para las Server Actions de autenticación (login, register, logout).
2. THE System SHALL tener tests de integración para las Server Actions de autorización que verifiquen el rechazo de acceso no autorizado.
3. THE System SHALL tener tests unitarios para el `Salary_Calculator` cubriendo casos de SS, Educación, ISR y Décimo.
4. WHEN se ejecuta la suite de tests, THE System SHALL reportar cobertura de código mínima del 60% en módulos críticos de negocio.

### Requisito 12: Tests de Seguridad

**User Story:** Como desarrollador, quiero tests automatizados que verifiquen los controles de seguridad, para que vulnerabilidades de autorización no sean introducidas por regresión.

#### Criterios de Aceptación

1. THE System SHALL tener tests que verifiquen que Server_Actions rechazan solicitudes de usuarios no autenticados.
2. THE System SHALL tener tests que verifiquen que un usuario USER no puede acceder a recursos de otro usuario.
3. THE System SHALL tener tests que verifiquen que el rate limiting bloquea solicitudes excesivas.
4. THE System SHALL tener tests de validación que verifiquen el rechazo de inputs malformados.

---

## Requisitos de Roadmap Futuro

### Requisito 13: Notificaciones y Alertas (Fase 10)

**User Story:** Como usuario, quiero recibir alertas cuando me acerco a los límites de mis categorías o metas, para que pueda tomar decisiones financieras a tiempo.

#### Criterios de Aceptación

1. WHEN el gasto acumulado de una Category alcanza el 80% de su límite mensual, THE System SHALL generar una notificación para el usuario.
2. WHEN el gasto acumulado de una Category supera el 100% de su límite mensual, THE System SHALL generar una alerta de límite excedido.
3. WHEN una Goal de tipo FIXED no recibe el aporte esperado en el período configurado, THE System SHALL notificar al usuario.
4. THE System SHALL permitir al usuario configurar qué tipos de notificaciones desea recibir.
5. WHERE el usuario tiene notificaciones por email habilitadas, THE System SHALL enviar un resumen semanal de su situación financiera.

### Requisito 14: Soporte Multi-Moneda (Fase 11)

**User Story:** Como usuario con ingresos o gastos en múltiples monedas, quiero registrar transacciones en su moneda original, para que mis reportes reflejen la realidad de mis finanzas.

#### Criterios de Aceptación

1. THE System SHALL soportar registro de Expense, AdditionalIncome y Transfer en monedas distintas al USD.
2. WHEN se registra una transacción en moneda extranjera, THE System SHALL solicitar el tipo de cambio aplicado.
3. THE System SHALL mostrar el equivalente en la moneda base del usuario para todas las transacciones.
4. THE System SHALL permitir al usuario definir su moneda base (por defecto USD para Panamá).
5. WHERE el usuario tiene transacciones en múltiples monedas, THE System SHALL mostrar el desglose por moneda en los reportes.

### Requisito 15: Reportes y Exportación Avanzada (Fase 12)

**User Story:** Como usuario, quiero exportar mis datos financieros en múltiples formatos, para que pueda analizarlos en herramientas externas o compartirlos con un asesor financiero.

#### Criterios de Aceptación

1. THE System SHALL permitir exportar transacciones en formato CSV con filtros por rango de fechas y categoría.
2. THE System SHALL permitir exportar reportes en formato PDF con gráficas de distribución de gastos.
3. THE System SHALL generar un reporte mensual automático con resumen de ingresos, gastos, ahorro y progreso de metas.
4. WHEN un usuario ADMIN solicita exportación de datos, THE System SHALL exportar datos de todos los perfiles en formato estructurado.
5. THE System SHALL registrar en AuditLog cada operación de exportación con el usuario solicitante y el alcance de los datos exportados.

### Requisito 16: Progressive Web App (Fase 13)

**User Story:** Como usuario móvil, quiero instalar la aplicación en mi dispositivo y usarla sin conexión para consultas básicas, para que pueda revisar mis finanzas en cualquier momento.

#### Criterios de Aceptación

1. THE System SHALL implementar un Service Worker que cachee las páginas del dashboard para acceso offline.
2. THE System SHALL proveer un archivo `manifest.json` con íconos y configuración para instalación como PWA.
3. WHILE el dispositivo no tiene conexión a internet, THE System SHALL mostrar los últimos datos cacheados con indicador de modo offline.
4. WHEN el dispositivo recupera conexión, THE System SHALL sincronizar automáticamente los datos pendientes.
5. THE System SHALL obtener una puntuación mínima de 80 en la auditoría PWA de Lighthouse.

### Requisito 17: Presupuesto por Período Flexible (Fase 14)

**User Story:** Como usuario, quiero definir presupuestos por períodos distintos al mensual, para que mis categorías de gasto reflejen mis ciclos reales de pago.

#### Criterios de Aceptación

1. THE System SHALL permitir definir el período de una Category como semanal, quincenal, mensual, trimestral o anual.
2. WHEN el período de una Category cambia, THE System SHALL recalcular el límite prorrateado para el período actual.
3. THE System SHALL mostrar el progreso de gasto de cada Category normalizado a su período configurado.
4. WHILE una Category tiene período no mensual, THE System SHALL ajustar el cálculo de rollover/sinking fund al período correspondiente.

### Requisito 18: Integración Bancaria Open Banking (Fase 15)

**User Story:** Como usuario, quiero conectar mis cuentas bancarias reales para importar transacciones automáticamente, para que no tenga que registrar gastos manualmente.

#### Criterios de Aceptación

1. THE System SHALL integrarse con al menos un proveedor de Open Banking compatible con bancos panameños.
2. WHEN se importan transacciones bancarias, THE System SHALL sugerir una categoría basada en el historial de categorización del usuario.
3. THE System SHALL permitir al usuario revisar y confirmar transacciones importadas antes de persistirlas.
4. IF la conexión bancaria falla durante la sincronización, THEN THE System SHALL notificar al usuario y reintentar en el siguiente ciclo programado.
5. THE System SHALL almacenar tokens de acceso bancario cifrados y nunca en texto plano.
6. THE System SHALL permitir al usuario revocar el acceso bancario en cualquier momento desde la configuración.

---

## Requisitos de Infraestructura y DevOps

### Requisito 19: Logging Configurable

**User Story:** Como administrador del sistema, quiero que el nivel de logging sea configurable por entorno, para que los logs de producción no expongan información sensible y sean manejables en volumen.

#### Criterios de Aceptación

1. THE System SHALL leer el nivel de log (error, warn, info, debug) desde la variable de entorno `LOG_LEVEL`.
2. THE System SHALL implementar rotación de archivos de log con un máximo de 10MB por archivo y retención de 30 días.
3. IF el entorno es producción, THEN THE System SHALL omitir logs de nivel debug e info por defecto.
4. THE System SHALL nunca registrar en logs contraseñas, tokens JWT ni datos financieros sensibles.

### Requisito 20: Configuración de Entornos

**User Story:** Como desarrollador, quiero una configuración clara de variables de entorno por entorno, para que el despliegue en staging y producción sea reproducible y seguro.

#### Criterios de Aceptación

1. THE System SHALL documentar todas las variables de entorno requeridas en `.env.example` con descripción y formato esperado.
2. THE System SHALL validar al arranque que todas las variables de entorno obligatorias están definidas.
3. IF una variable de entorno obligatoria no está definida, THEN THE System SHALL lanzar un error descriptivo indicando qué variable falta.
4. THE System SHALL separar las configuraciones de base de datos para entornos de desarrollo, staging y producción.

---

## Priorización de Tareas

### Prioridad 1 — Crítico (Inmediato)

1. Rotar credenciales de base de datos expuestas en `.env` commiteado
2. Eliminar `.env` del historial de git con `git filter-branch` o BFG Repo Cleaner
3. Agregar `.env` a `.gitignore` y crear `.env.example`
4. Eliminar fallback hardcodeado de `JWT_SECRET` y hacerlo obligatorio
5. Implementar verificación de ownership en todas las Server Actions

### Prioridad 2 — Alto (Sprint 1)

6. Implementar validación Zod en todas las Server Actions
7. Implementar rate limiting en endpoints de login y register
8. Aumentar longitud mínima de AccessCode a 12 caracteres con generador criptográfico
9. Implementar política de contraseñas (mínimo 8 caracteres, complejidad)
10. Agregar expiración de 2 horas a cookie de impersonación

### Prioridad 3 — Medio (Sprint 2)

11. Configurar cabeceras CSP, X-Frame-Options, X-Content-Type-Options en `next.config.js`
12. Eliminar archivos de debug de la raíz del proyecto
13. Reemplazar tipo `any` en `updateProfile` con tipo Zod inferido
14. Escribir tests de integración para Server Actions de autenticación
15. Escribir tests de seguridad para verificar autorización

### Prioridad 4 — Bajo (Sprint 3)

16. Configurar rotación de logs con Winston
17. Configurar nivel de log por variable de entorno
18. Aumentar cobertura de tests al 60% en módulos críticos
19. Documentar arquitectura y decisiones de diseño

### Prioridad 5 — Roadmap (Futuro)

20. Fase 10: Sistema de notificaciones y alertas de límites
21. Fase 11: Soporte multi-moneda con tipos de cambio
22. Fase 12: Reportes PDF y exportación avanzada
23. Fase 13: PWA con soporte offline
24. Fase 14: Presupuesto por período flexible
25. Fase 15: Integración Open Banking
