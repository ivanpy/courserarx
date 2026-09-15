---

### 4. Archivo Modular: `.claude/rules/database-schema.md`

Este archivo contiene la especificación técnica de la base de datos PostgreSQL:

```markdown
# Esquema de Base de Datos PostgreSQL

## Requisitos Previos
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

Definición de Tablas Relacionales
proyectos: id (UUID PK), nombre (VARCHAR 255), descripcion_notas (TEXT), system_instructions (TEXT), modelo_ia (VARCHAR 100 DEFAULT 'gemini-3.5-flash'), temperatura (NUMERIC(3,2) DEFAULT 0.10), timestamps.

proyecto_adjuntos: id (UUID PK), proyecto_id (FK proyectos ON DELETE CASCADE), nombre_archivo, mime_type, tamano_bytes (BIGINT), storage_url, contenido_svg (TEXT), created_at.

propuestas: id (UUID PK), proyecto_id (FK proyectos ON DELETE CASCADE), resumen_ejecutivo (TEXT), horas_totales_validadas (NUMERIC(8,2)), tarifa_hora_usd (NUMERIC(8,2) DEFAULT 35.00), capacidad_semanal_horas (INTEGER DEFAULT 40), fecha_inicio_proyectada (DATE), metadata_json (JSONB), created_at.

hitos: id (UUID PK), propuesta_id (FK propuestas ON DELETE CASCADE), orden (INTEGER), nombre_meta (VARCHAR 255), created_at.

tareas: id (UUID PK), hito_id (FK hitos ON DELETE CASCADE), orden (INTEGER), titulo, descripcion, rol (CHECK in 'Fullstack', 'Frontend', 'Backend', 'DevOps', 'QA', 'UI/UX', 'Otro'), horas (NUMERIC(6,2)), created_at.

alertas_conflictos: id (UUID PK), propuesta_id (FK propuestas ON DELETE CASCADE), titulo, descripcion, fuente_imagen, fuente_texto, recomendacion, resuelto (BOOLEAN DEFAULT FALSE), resolucion_aplicada, created_at.

extras_opcionales: id (UUID PK), propuesta_id (FK propuestas ON DELETE CASCADE), titulo, descripcion, horas_estimadas (NUMERIC(6,2) DEFAULT 0.00), origen_detectado, aprobado_por_cliente (BOOLEAN DEFAULT FALSE), created_at.

sugerencias_proactivas: id (UUID PK), propuesta_id (FK propuestas ON DELETE CASCADE), titulo, descripcion, impacto (CHECK in 'Alto', 'Medio', 'Bajo'), incorporado (BOOLEAN DEFAULT FALSE), created_at.

Índices Requeridos
idx_proyectos_created_at ON proyectos(created_at DESC)

idx_propuestas_proyecto_id ON propuestas(proyecto_id)

idx_hitos_propuesta_id ON hitos(propuesta_id)

idx_tareas_hito_id ON tareas(hito_id)

idx_alertas_propuesta_id ON alertas_conflictos(propuesta_id)