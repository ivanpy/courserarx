# Esquema de Base de Datos PostgreSQL

Especificación técnica de la base de datos. Este archivo es la fuente literal de
`db/0001_init.sql`: lo que está aquí es el DDL que se aplica, no una descripción de él.

## Requisitos previos

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 1. Proyectos y adjuntos

```sql
CREATE TABLE proyectos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre              VARCHAR(255) NOT NULL,
  descripcion_notas   TEXT,
  system_instructions TEXT,
  modelo_ia           VARCHAR(100) NOT NULL DEFAULT 'gemini-3.5-flash',
  temperatura         NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE proyecto_adjuntos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id    UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  tamano_bytes   BIGINT,
  storage_url    TEXT,
  contenido_svg  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Catálogo de tarifas

Las tarifas se definen por **rol × seniority × moneda**. Cada fila tiene un período de
vigencia, de modo que subir una tarifa no destruye la anterior.

```sql
CREATE TABLE tarifas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rol           VARCHAR(50) NOT NULL
                CHECK (rol IN ('Fullstack','Frontend','Backend','DevOps','QA','UI/UX','Otro')),
  seniority     VARCHAR(20) NOT NULL
                CHECK (seniority IN ('Junior','Semi','Senior')),
  moneda        CHAR(3) NOT NULL CHECK (moneda IN ('USD','ARS')),
  monto_hora    NUMERIC(12,2) NOT NULL CHECK (monto_hora > 0),
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  vigente_hasta DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
  UNIQUE (rol, seniority, moneda, vigente_desde)
);
```

`NUMERIC(12,2)` y no `(8,2)` porque un monto por hora en pesos supera con holgura el
rango de ocho dígitos. `vigente_hasta IS NULL` significa tarifa vigente.

Solo puede haber una tarifa abierta por combinación:

```sql
CREATE UNIQUE INDEX idx_tarifas_vigente_unica
  ON tarifas (rol, seniority, moneda)
  WHERE vigente_hasta IS NULL;
```

### Seniority por defecto

El TPM no asigna seniority tarea por tarea: cada rol trae uno por defecto, y solo se
corrige cuando hace falta.

```sql
CREATE TABLE roles_seniority_default (
  rol               VARCHAR(50) PRIMARY KEY
                    CHECK (rol IN ('Fullstack','Frontend','Backend','DevOps','QA','UI/UX','Otro')),
  seniority_default VARCHAR(20) NOT NULL
                    CHECK (seniority_default IN ('Junior','Semi','Senior')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Propuestas

```sql
CREATE TABLE propuestas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proyecto_id             UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  resumen_ejecutivo       TEXT,
  horas_totales_validadas NUMERIC(8,2) NOT NULL DEFAULT 0,
  moneda_cotizacion       CHAR(3) NOT NULL DEFAULT 'USD'
                          CHECK (moneda_cotizacion IN ('USD','ARS')),
  tipo_cambio_usd_ars     NUMERIC(14,4) CHECK (tipo_cambio_usd_ars > 0),
  tipo_cambio_fecha       DATE,
  capacidad_semanal_horas INTEGER NOT NULL DEFAULT 40 CHECK (capacidad_semanal_horas > 0),
  fecha_inicio_proyectada DATE,
  metadata_json           JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

La columna `tarifa_hora_usd` desaparece: ya no hay una tarifa única por propuesta. El
tipo de cambio es opcional y queda **congelado** junto con su fecha, para que el total en
la otra moneda no se mueva solo cuando el mercado cambie.

### Tarifas aplicadas — la foto histórica

Esta es la tabla que protege las cifras ya presentadas al cliente.

```sql
CREATE TABLE propuesta_tarifas_aplicadas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  rol          VARCHAR(50) NOT NULL,
  seniority    VARCHAR(20) NOT NULL,
  moneda       CHAR(3) NOT NULL CHECK (moneda IN ('USD','ARS')),
  monto_hora   NUMERIC(12,2) NOT NULL CHECK (monto_hora > 0),
  tarifa_id    UUID REFERENCES tarifas(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (propuesta_id, rol, seniority)
);
```

**`monto_hora` se copia, no se resuelve por JOIN.** El presupuesto de una propuesta se
calcula siempre contra esta tabla, nunca contra `tarifas`. `tarifa_id` existe solo para
trazabilidad —saber de qué fila salió el número— y es `ON DELETE SET NULL` a propósito:
borrar una tarifa del catálogo no puede destruir el histórico de lo que ya se cotizó.

Sin esta separación, editar una tarifa reescribiría en silencio el presupuesto de todas
las propuestas pasadas.

---

## 4. Backlog

```sql
CREATE TABLE hitos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL DEFAULT 0,
  nombre_meta  VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tareas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hito_id          UUID NOT NULL REFERENCES hitos(id) ON DELETE CASCADE,
  orden            INTEGER NOT NULL DEFAULT 0,
  titulo           VARCHAR(255) NOT NULL,
  descripcion      TEXT,
  rol              VARCHAR(50) NOT NULL
                   CHECK (rol IN ('Fullstack','Frontend','Backend','DevOps','QA','UI/UX','Otro')),
  seniority        VARCHAR(20) NOT NULL
                   CHECK (seniority IN ('Junior','Semi','Senior')),
  seniority_origen VARCHAR(10) NOT NULL DEFAULT 'default'
                   CHECK (seniority_origen IN ('default','manual')),
  horas            NUMERIC(6,2) NOT NULL CHECK (horas > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`seniority_origen` distingue el valor heredado del default del que el TPM corrigió a
mano. Al regenerar una propuesta se conservan los `'manual'` y se recalculan los
`'default'`, para no pisar decisiones deliberadas.

El motor de IA **no emite `seniority`**: lo asigna el servidor desde
`roles_seniority_default` al persistir. El contrato de datos del modelo no cambia.

---

## 5. Consultoría

```sql
CREATE TABLE alertas_conflictos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id        UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  titulo              VARCHAR(255) NOT NULL,
  descripcion         TEXT,
  fuente_imagen       TEXT,
  fuente_texto        TEXT,
  recomendacion       TEXT,
  resuelto            BOOLEAN NOT NULL DEFAULT FALSE,
  resolucion_aplicada TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extras_opcionales (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id         UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  titulo               VARCHAR(255) NOT NULL,
  descripcion          TEXT,
  horas_estimadas      NUMERIC(6,2) NOT NULL DEFAULT 0.00 CHECK (horas_estimadas = 0),
  origen_detectado     TEXT,
  aprobado_por_cliente BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sugerencias_proactivas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id UUID NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
  titulo       VARCHAR(255) NOT NULL,
  descripcion  TEXT,
  impacto      VARCHAR(10) CHECK (impacto IN ('Alto','Medio','Bajo')),
  incorporado  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

El `CHECK (horas_estimadas = 0)` hace de INV-01 (Aislamiento de Alcance) una garantía de
base de datos y no solo del motor: un extra con horas no puede llegar a persistirse.

---

## 6. Resolución de tarifa

Para cada tarea, el servidor resuelve el monto por hora en este orden:

1. Tarifa vigente para `(tarea.rol, tarea.seniority, propuesta.moneda_cotizacion)`.
2. Si no existe, la vigente en la otra moneda, convertida con `propuestas.tipo_cambio_usd_ars`.
3. Si tampoco hay tipo de cambio, **error de configuración**: no se cotiza con un número
   inventado ni se cae a una tarifa por defecto silenciosa.

El resultado se escribe en `propuesta_tarifas_aplicadas` dentro de la misma transacción
que crea la propuesta. A partir de ahí:

```
costo_tarea = tareas.horas × propuesta_tarifas_aplicadas.monto_hora   (match por rol + seniority)
```

---

## 7. Índices requeridos

```sql
CREATE INDEX idx_proyectos_created_at        ON proyectos(created_at DESC);
CREATE INDEX idx_adjuntos_proyecto_id        ON proyecto_adjuntos(proyecto_id);
CREATE INDEX idx_propuestas_proyecto_id      ON propuestas(proyecto_id);
CREATE INDEX idx_hitos_propuesta_id          ON hitos(propuesta_id);
CREATE INDEX idx_tareas_hito_id              ON tareas(hito_id);
CREATE INDEX idx_alertas_propuesta_id        ON alertas_conflictos(propuesta_id);
CREATE INDEX idx_extras_propuesta_id         ON extras_opcionales(propuesta_id);
CREATE INDEX idx_sugerencias_propuesta_id    ON sugerencias_proactivas(propuesta_id);
CREATE INDEX idx_tarifas_lookup              ON tarifas(rol, seniority, moneda, vigente_desde DESC);
CREATE INDEX idx_tarifas_aplicadas_propuesta ON propuesta_tarifas_aplicadas(propuesta_id);
```

---

## 8. Datos semilla

Valores iniciales de `business-rules.md`. La tarifa de referencia de `$35 USD/h`
corresponde al perfil **Fullstack Semi**; el resto se escala a partir de ella y es
configurable desde el panel Admin/TPM.

```sql
INSERT INTO roles_seniority_default (rol, seniority_default) VALUES
  ('Fullstack','Semi'), ('Frontend','Semi'), ('Backend','Semi'),
  ('DevOps','Senior'), ('QA','Junior'), ('UI/UX','Semi'), ('Otro','Semi');
```
