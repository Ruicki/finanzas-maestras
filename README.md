# Gestor de Salarios y Finanzas Personales

Una aplicación web moderna para tomar el control de tus finanzas. Gestiona salarios, ingresos adicionales, gastos, tarjetas de crédito, deudas y metas de ahorro en una interfaz intuitiva y elegante.

## Características Principales

- **Gestión de Ingresos:** Registra múltiples salarios y fuentes de ingresos adicionales.
- **Control de Gastos:** Categorización detallada con iconos personalizados.
- **Tarjetas de Crédito:** Seguimiento de saldos, límites y fechas de corte. Protege tu historial de crédito.
- **Deudas y Préstamos:** Visualiza tus obligaciones y monitorea el progreso de pago.
- **Metas de Ahorro:** Establece objetivos financieros y realiza un seguimiento automático.
- **Análisis (Insights):** Gráficos y resúmenes para entender a dónde va tu dinero.

## Tecnologías

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Lenguaje:** TypeScript
- **Base de Datos:** SQLite / PostgreSQL (vía Prisma ORM)
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React

## Cómo Iniciar

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar Base de Datos:**
    Asegúrate de tener tu archivo `.env` configurado. Luego ejecuta:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

3.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```

    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Despliegue

Este proyecto está optimizado para ser desplegado en [Vercel](https://vercel.com). Consulta la [documentación de Next.js](https://nextjs.org/docs/deployment) para más detalles.

## System Architecture

La aplicación sigue principios de Clean Code y una arquitectura por capas para garantizar escalabilidad, seguridad y modularidad:

1. **Client (Next.js App Router):** Componentes visuales y Server Components. Interfaces con alta densidad de información estructurada bajo roles (RBAC).
2. **Next.js Server Actions (`app/actions/`):** Puntos de entrada para las peticiones del cliente (API sin rutas). Solo actúan como orquestadores.
3. **Financial Engine (`lib/financial-engine.ts` y Strategies):** Toda la lógica pesada y los cálculos de deducciones suceden aquí con el **Pattern Strategy** y **Unit Tests** rigurosos.
4. **Data Access (Repositories):** Los accesos de Prisma están encapsulados en un Patrón Repositorio (`lib/repositories/`) para que la lógica de negocio descanse independientemente de si la BD es PostgreSQL o SQLite.
5. **Database:** Bases de Datos manejadas mediante transacciones estables (`prisma.$transaction`) asegurando requerimientos transaccionales (ACID).

---

## Contribution Guide
1. **Ramas (`Git Flow`):** Evita commitear a `main`. Usa ramas `feature/nombre-del-cambio`, `bugfix/nombre-del-error`.
2. **Clean Code:** Por favor evita a toda costa el uso de tipos `any`. Usa nuestro contenedor estricto de interfaces almacenado en `types/finance.d.ts`.
3. **Testing:** Cualquier modifcación nueva a los cálculos financieros estrictos debe venir acompañada por su correspondiente PR con pruebas Unitarias en Jest (`__tests__/`). 
4. **Observabilidad:** Ante un flujo transaccional crítico, no olvides invocar el `logger.info()` o `logger.error()` importado de `lib/logger.ts`.
