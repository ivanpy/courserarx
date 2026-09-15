# CONTEXTO DE DESARROLLO Y MIGRACIÓN: CONSTRUCTOR DE BACKLOG.IA

Este archivo contiene el contexto maestro de la aplicación, las reglas de arquitectura monolítica y las directrices de seguridad para el entorno local.

## 🚨 OBJETIVO INMEDIATO: MIGRACIÓN A NEXT.JS MONOLITO
- **Meta actual:** Migrar todo el proyecto hacia una **Arquitectura Monolítica en Next.js** utilizando **App Router (Server Components)** e integrando controles con herramientas de CLI de Next/Claude.
- **Seguridad y Estado:** Queda estrictamente prohibido exponer datos vulnerables o lógicas críticas de negocio en el lado del usuario (*Client-Side*). 

## 1. RESUMEN DEL PROYECTO
**Constructor de backlog.ia** es una herramienta de ingeniería de requerimientos y preventa técnica. Su objetivo es transformar entradas desestructuradas de clientes (transcripciones, notas, imágenes) en una propuesta técnica estructurada con estimación de horas, backlog atómico, alertas de gaps y resumen ejecutivo.

## 2. STACK TECNOLÓGICO Y PAUTAS DE ARQUITECTURA
- **Framework:** Next.js (App Router - Monolito)
- **Renderizado Principal:** Preferir **Next.js Server Components** para el procesamiento y operaciones con la IA, limitando los Client Components (`'use client'`) únicamente a interacciones mínimas de la interfaz.
- **Validaciones:** **100% del lado del Backend**. Toda entrada de datos debe ser saneada y validada en Server Actions o Route Handlers antes de interactuar con el SDK de la IA o persistir datos.
- **Gestor de paquetes:** npm sobre Node.js ≥ 22.18 (`package-lock.json` versionado; `npm ci` en CI). Se descartó Bun deliberadamente para evitar fricción con los despliegues y con DevOps. El CLI usa `node --conditions=react-server`, y Node ejecuta TypeScript de forma nativa por *type stripping*, sin paso de compilación.

## 3. PRINCIPIOS DE INGENIERÍA Y REGLAS DE NEGOCIO
Al generar código o modificar componentes, debes respetar estrictamente los siguientes pilares:
1. **Prioridad de la Verdad (Master Truth):** El texto y las notas del cliente mandan sobre las imágenes. Las imágenes son solo referencia visual secundaria.
2. **Aislamiento de Alcance (Scope Isolation):** Funciones de imágenes no pedidas en texto van a una categoría de *Extras Opcionales* con 0 horas.
3. **Atomicidad Técnico-Estructural:** Las tareas del backlog se desglosan explícitamente en: Frontend, Backend, Base de Datos, DevOps y QA.
4. **Consultoría Proactiva:** Identificación de procesos omitidos por el cliente (`sugerencias_proactivas`).
5. **Dualidad de Personas:** Separación limpia de componentes e interfaces para vista de *Admin/TPM* (configuración de prompts/modelos) y vista de *Stakeholder/Cliente* (ejecutiva y limpia).

## 4. INTEGRACIÓN DEL MOTOR IA (PROCESAMIENTO SEGURO)
- **SDK Oficial:** `@google/genai`
- **Modelos Principales:** `gemini-3.5-flash`, `gemini-3.8-flash` con lógica de fallback automático.
- **Seguridad en el Motor:** Las llamadas al SDK y las API Keys de Google deben permanecer ocultas de forma absoluta en el entorno del servidor. Ningún token o configuración de temperatura debe ser accesible desde las herramientas de desarrollo del navegador.
- **Configuración por Defecto:** Temperatura `0.1`, `topP: 0.95`, `topK: 40`.