# Seguimiento de Tareas - Corrección Input GoalsTab

- [ ] **Fase 1: Preparación y Validación**
  - [x] Diagnosticar causa raíz de la falla del input en `GoalsTab.tsx`
  - [x] Crear estructura `.specs/` con `requirements.md`, `design.md` y `tasks.md`
  - [ ] Generar Plan de Implementación formal (`implementation_plan.md`) y solicitar validación del usuario

- [ ] **Fase 2: Ejecución**
  - [ ] Extraer la función `GoalCard` fuera del componente principal `GoalsTab` para evitar el desmontaje del DOM en cada pulsación
  - [ ] Integrar `SmartMoneyInput` en la sección "Gestionar Fondos" de `GoalCard`
  - [ ] Aislar los valores de monto y cuenta de la transacción para evitar colisiones
  - [ ] Asegurar accesibilidad (labels y focus dentro del contenedor)

- [ ] **Fase 3: Verificación y Cierre**
  - [ ] Ejecutar verificación de tipos / linter en el proyecto
  - [ ] Actualizar `.specs/tasks.md` y generar `walkthrough.md`
