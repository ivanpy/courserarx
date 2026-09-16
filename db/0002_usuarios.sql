-- Reemplaza el passphrase único compartido (Fase 5, interino) por cuentas reales.
-- `rol` acá es el rol de SISTEMA del usuario (quién puede entrar a /tpm), no
-- tiene relación con `rol` de `tareas`/`tarifas` (Fullstack/Backend/etc. — el
-- perfil técnico de una tarea del backlog). Dos dominios distintos a propósito.
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol           VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
