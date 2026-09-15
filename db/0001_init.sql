-- Copia literal de .claude/rules/database-schema.md — ese archivo es la fuente
-- de verdad; este .sql es lo que efectivamente se aplica, no una reescritura.

-- Requisitos previos

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Proyectos y adjuntos

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

-- 2. Catálogo de tarifas

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

CREATE UNIQUE INDEX idx_tarifas_vigente_unica
  ON tarifas (rol, seniority, moneda)
  WHERE vigente_hasta IS NULL;

CREATE TABLE roles_seniority_default (
  rol               VARCHAR(50) PRIMARY KEY
                    CHECK (rol IN ('Fullstack','Frontend','Backend','DevOps','QA','UI/UX','Otro')),
  seniority_default VARCHAR(20) NOT NULL
                    CHECK (seniority_default IN ('Junior','Semi','Senior')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Propuestas

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

-- 4. Backlog

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

-- 5. Consultoría

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

-- 7. Índices requeridos

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

-- 8. Datos semilla

INSERT INTO roles_seniority_default (rol, seniority_default) VALUES
  ('Fullstack','Semi'), ('Frontend','Semi'), ('Backend','Semi'),
  ('DevOps','Senior'), ('QA','Junior'), ('UI/UX','Semi'), ('Otro','Semi');
