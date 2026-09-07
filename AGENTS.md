# Guía de Desarrollo para Agentes de IA — Finanzas Maestras

> Este archivo define las directrices obligatorias, estándares de arquitectura, seguridad y protocolos de operación para cualquier agente de IA o desarrollador que trabaje en el repositorio **Finanzas Maestras**.

---

## 1. Contexto del Sistema

**Finanzas Maestras** es una plataforma SaaS de finanzas personales diseñada para el mercado panameño (cálculo de salario con deducciones de ley: Seguro Social, Seguro Educativo, Impuesto Sobre la Renta y Décimo Tercer Mes).

### Stack Tecnológico
* **Framework:** Next.js 16 (App Router) con React 19 y Server Actions.
* **Lenguaje:** TypeScript 5 (Modo estricto, sin `any`).
* **Estilos:** Tailwind CSS v4 con variables CSS y tema oscuro/claro (`next-themes`).
* **ORM & DB:** Prisma ORM 5.10 sobre PostgreSQL (Neon DB, connection pooling y direct url).
* **Autenticación:** Tokens JWT firmados con Jose en cookies `httpOnly`, hashing con `bcryptjs`.
* **UI & Animaciones:** Radix UI primitives, Lucide Icons, Framer Motion, Recharts, Sonner (toasts).
* **Testing:** Jest + ts-jest.

---

## 2. Metodología Obligatoria: Spec-Driven Development (SDD)

Cualquier cambio que involucre lógica de negocio, refactorización o corrección estructural debe seguir el ciclo de vida SDD:

1. **Análisis:** Desglosar requerimientos y verificar impacto sistémico antes de modificar código.
2. **Planeación y Documentación (`.specs/`):**
   * `.specs/requirements.md`: Definición de necesidades y criterios de aceptación.
   * `.specs/design.md`: Decisiones de diseño, diagramas de flujo y arquitectura.
   * `.specs/tasks.md`: Desglose granular de tareas ejecutables con checklist.
3. **Validación:** Presentar el plan al usuario y esperar confirmación explícita.
4. **Ejecución:** Implementación limpia, modular y basada en el plan aprobado.
5. **Verificación:** Ejecución de linters, compilación TypeScript y tests unitarios.

---

## 3. Reglas de Seguridad Innegociables

1. **Secretos y Variables de Entorno:**
   * **PROHIBIDO** dejar valores por defecto o fallbacks hardcodeados para secretos (ej. `process.env.JWT_SECRET || 'secret-key-change-me-in-prod'` es una vulnerabilidad crítica).
   * Validar la presencia de variables de entorno críticas al arranque en `lib/env.ts`.
   * El archivo `.env` jamás debe versionarse ni exponerse.
2. **Control de Acceso y Aislamiento Multitenant (Anti-IDOR):**
   * En cada Server Action, **es obligatorio** verificar la identidad del usuario en sesión (`requireAuth` / `requireOwnership`).
   * Al manipular recursos vinculados (ej. `accountId`, `linkedCardId`, `categoryId`, `goalId`), verificar que dichos recursos pertenezcan efectivamente al `profileId` del usuario autenticado para evitar acceso horizontal indebido.
3. **Validación de Entradas:**
   * Todo parámetro proveniente del cliente debe validarse mediante esquemas de **Zod** antes de interactuar con la base de datos o lógica financiera.
   * Rechazar strings no sanitizados, montos negativos, desbordamientos de enteros o tipos erróneos.
4. **Protección contra Fuerza Bruta:**
   * Las operaciones críticas (`login`, `register`, `claimProfile`) deben contar con Rate Limiting distribuido (basado en IP y Redis para entornos serverless).

---

## 4. Estándares Técnicos y de Código

### A. Principios SOLID y Clean Code
* **Principio de Responsabilidad Única (SRP):** Desacoplar vistas gigantes (como tabs de más de 400 líneas) en subcomponentes atómicos (tarjetas, modales, formularios, calculadoras).
* **Cero Componentes Anidados:** **NUNCA** declarar componentes funcionales de React dentro del cuerpo de otro componente funcional. Provoca la recreación de la identidad del componente en cada render y destruye el árbol DOM (pérdida de foco en inputs, reseteo de animaciones).
* **Naming Semántico:** Nombres de funciones que describan la acción exacta (`executeReclaimGoalFunds`, `calculatePanamaIncomeTax`). Evitar abreviaturas ambiguas.

### B. Manejo Financiero y Matemático
* **Precisión Decimal:** En JavaScript, el punto flotante binario (`0.1 + 0.2 = 0.30000000000000004`) es inaceptable para dinero. Realizar cálculos monetarios en centavos enteros o utilizar aritmética de precisión (`Decimal.js`).
* **Atomicidad:** Toda operación que afecte múltiples balances (ej. registrar un gasto y debitar de una cuenta bancaria, o abonar a una tarjeta) **DEBE** ejecutarse dentro de un `prisma.$transaction`.
* **Inputs de Moneda:** En la interfaz de usuario, utilizar consistentemente `SmartMoneyInput` para mantener el comportamiento RTL decimal con dos decimales y teclado adaptado a móviles.

### C. Base de Datos e Integridad Referencial
* **Indexación:** Cada relación de clave foránea (`profileId`, `accountId`, `categoryId`, `createdAt`) debe contar con un índice explícito (`@@index`) en `prisma/schema.prisma` para optimizar consultas en PostgreSQL.
* **Eliminaciones y Cascada:** Manejar la eliminación de entidades padre con reglas claras de integridad (`onDelete: Cascade` o validación previa de dependencias con saldo).

---

## 5. Estructura de Directorios Clave

```text
Finanzas-Maestras/
├── .specs/                     # Documentación activa Spec-Driven
├── app/
│   ├── (auth)/                 # Rutas públicas de autenticación (login, register)
│   ├── actions/                # Server Actions organizadas por dominio
│   │   ├── budget/             # Cuentas, gastos, metas, tarjetas, categorías
│   │   ├── auth.ts             # Acciones de autenticación y sesión
│   │   └── salary.ts           # Acciones de salario y cálculo panameño
│   └── page.tsx                # Dashboard principal y landing condicional
├── components/
│   ├── dashboard/              # Componentes del dashboard
│   │   └── tabs/               # Pestañas de dominio (Accounts, Goals, Debts, etc.)
│   └── shared/                 # Componentes reutilizables (SmartMoneyInput, Modals)
├── lib/
│   ├── auth-utils.ts           # Funciones criptográficas y extracción de sesión
│   ├── financial-engine.ts     # Motor de cálculo financiero, amortización y fechas
│   ├── prisma.ts               # Instancia singleton de PrismaClient
│   ├── repositories/           # Capa de acceso a datos desacoplada
│   └── strategies/             # Estrategias de cálculo fiscal (Strategy Pattern)
├── prisma/
│   └── schema.prisma           # Esquema de base de datos relacional
└── middleware.ts               # Protección global de rutas en el Edge
```

---

## 6. Comandos de Verificación para Agentes

Antes de dar por concluida cualquier intervención:
```bash
# 1. Comprobar errores de tipado TypeScript
npx tsc --noEmit

# 2. Ejecutar linter
npm run lint

# 3. Ejecutar pruebas unitarias
npm test

# 4. Validar esquema de Prisma
npx prisma validate
```

---

## 7. Protocolo de Comunicación del Agente

* **Directo y Riguroso (Zero-Fluff):** Sin introducciones vacías ni halagos. Explicar qué falla, por qué falla arquitectónicamente y cómo se corrige.
* **Proponer soluciones completas:** No parches temporales. Si un componente está mal estructurado, aislarlo y modularizarlo correctamente.
* **Preguntar ante la ambigüedad:** Si una regla de negocio panameña o financiera no está especificada, consultar antes de asumir.
