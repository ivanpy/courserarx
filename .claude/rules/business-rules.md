---

### 5. Archivo Modular: `.claude/rules/business-rules.md`

Para la lógica de cálculo en la UI y el benchmark de validación:

```markdown
# Reglas de Negocio, UX y Benchmark de Pruebas

## 1. Cálculos de la UI (Panel Ejecutivo)
- **Tarifa:** definida por **rol × seniority (Junior/Semi/Senior) × moneda (USD/ARS)** en la tabla `tarifas` (ver `database-schema.md`). La referencia de `$35 USD/h` corresponde al perfil **Fullstack Semi**; el resto se configura desde el panel Admin/TPM.
- **Capacidad semanal:** `40 horas` (1 FTE).
- **Sprints:** Ciclos de 2 semanas (`teamCapacityWeekly * 2 = 80h`).
- **Cronograma incremental:** Calcular fecha estimada de cada hito sumando el acumulado de horas de los hitos previos dividido por la capacidad semanal a partir de `startDate`.

## 2. Exportación Excel (.xlsx)
- Librería: `write-excel-file/browser`
- Nombre de hoja: `"Hitos y Backlog Técnico"`
- Cabecera: `Hito / Meta`, `Tarea`, `Descripción Técnica`, `Rol Recomendado`, `Horas Estimadas`.
- Estilo Cabecera: Negrita, fondo `#1E293B`, texto `#FFFFFF`.
- Fila final: Etiqueta `"TOTAL HORAS VALIDADAS"` con celda de suma en negrita.

## 3. Benchmark de Aceptación Obligatorio ("Turnero Clínico")
Al ejecutar el flujo de prueba sobre este caso:
- **Notas:** 1 sola sede, DNI y teléfono obligatorios (rechazar CUIL y obra social), intervalos fijos de 30 minutos.
- **Bocetos:** Muestran 5 sucursales, solicitan CUIL/obra social y grilla en bloques de 15 minutos.
- **Resultado esperado del test:**
  1. Hitos generados con exactamente **79 horas base**.
  2. Identificar las **3 contradicciones** exactas en `alertas_conflictos`.
  3. Desviar la lógica multisucursal a `extras_opcionales` con **0 horas asignadas**.