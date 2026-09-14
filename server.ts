import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON parser with generous limits for multiple screenshot uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString()
    });
  });

  // Main TPM / Technical Proposal Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    let requestedModel = req.body?.model || "gemini-3.5-flash";
    let uniqueModels: string[] = [requestedModel];

    try {
      const {
        projectName,
        notes,
        images = [],
        systemInstructions,
        temperature = 0.1,
        model = requestedModel
      } = req.body;
      requestedModel = model;

      if (!notes || notes.trim() === "") {
        return res.status(400).json({
          error: "Las notas o análisis preliminar son obligatorios para establecer la 'Verdad Maestra' (Master Truth)."
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY no encontrada en las variables de entorno del servidor. Por favor configúrala en Settings > Secrets.",
          isApiKeyMissing: true
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Prepare parts for multimodal input
      const parts: any[] = [];

      // Add image or vector design parts if provided
      if (Array.isArray(images) && images.length > 0) {
        for (const img of images) {
          if (!img.base64Data) continue;

          let rawData = String(img.base64Data);
          let mimeType = img.mimeType || "";

          // Extract MIME and data from data URL if present
          if (rawData.startsWith("data:")) {
            const commaIdx = rawData.indexOf(",");
            if (commaIdx !== -1) {
              const prefix = rawData.substring(0, commaIdx);
              const matchedMime = prefix.match(/^data:([^;,]+)/)?.[1];
              if (matchedMime) {
                mimeType = matchedMime;
              }
              rawData = rawData.substring(commaIdx + 1);
            }
          }

          const isSvg =
            mimeType.includes("svg") ||
            rawData.includes("%3Csvg") ||
            rawData.includes("<svg") ||
            Boolean(img.name && img.name.toLowerCase().endsWith(".svg"));

          if (isSvg) {
            // Decode SVG markup cleanly to XML text
            let svgText = "";
            try {
              if (rawData.includes("%3C") || rawData.includes("%20")) {
                svgText = decodeURIComponent(rawData);
              } else if (rawData.trim().startsWith("<")) {
                svgText = rawData;
              } else {
                // Check if it's base64-encoded SVG
                const decoded = Buffer.from(rawData, "base64").toString("utf-8");
                if (decoded.includes("<svg") || decoded.includes("<?xml") || decoded.includes("<text")) {
                  svgText = decoded;
                } else {
                  svgText = rawData;
                }
              }
            } catch {
              svgText = rawData;
            }

            // Provide the SVG specification directly as a structured text part.
            // This provides Gemini with complete textual and semantic comprehension
            // of every label, input field, and button inside the wireframe/mockup.
            parts.push({
              text: `[Boceto / Wireframe SVG adjunto: "${img.name || "diseño.svg"}"]\nEstructura y contenido visual del mockup:\n\`\`\`xml\n${svgText}\n\`\`\``
            });
          } else {
            // Raster image (PNG, JPEG, WEBP, GIF, etc.)
            const cleanBase64 = rawData.replace(/\s+/g, "");

            // Gemini supports image/png, image/jpeg, image/webp, image/heic, image/heif
            const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
            let normalizedMime = mimeType.toLowerCase();
            if (normalizedMime === "image/jpg") normalizedMime = "image/jpeg";
            if (!validMimes.includes(normalizedMime)) {
              normalizedMime = "image/png";
            }

            // Guard: ensure it's valid base64 (A-Z, a-z, 0-9, +, /, =)
            const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanBase64.slice(0, 1000));
            if (isBase64 && cleanBase64.length > 20) {
              parts.push({
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64
                }
              });
            }
          }
        }
      }

      // Add the User Prompt text part strictly following the TPM prompt structure
      const promptText = `Analiza los archivos adjuntos (capturas de pantalla y bocetos) y procésalos junto con mi análisis preliminar que detallo a continuación.

PROYECTO: ${projectName || "Proyecto Sin Nombre"}
MI ANÁLISIS PRELIMINAR Y NOTAS:
${notes}

Genera la propuesta y el backlog detallado siguiendo las instrucciones del sistema. Aplica estrictamente la Prioridad de Verdad (Master Truth), Aislamiento de Alcance (0 horas para extras detectados en capturas pero no pedidos en notas), Desglose Técnico Atómico, Detección de Gaps (sugerencias proactivas), Alertas de Conflicto y Asignación de Roles.`;

      parts.push({
        text: promptText
      });

      const effectiveSystemInstruction = systemInstructions || `Actúa como un Senior Technical Product Manager y Arquitecto de Software Fullstack experto en metodologías Ágiles. Tu misión es transformar requerimientos caóticos (imágenes y notas) en una propuesta profesional y un backlog técnico.

REGLAS DE PROCESAMIENTO:
1. PRIORIDAD DE VERDAD (Master Truth): El texto proporcionado por el usuario manda sobre las imágenes. Si una imagen muestra algo que no está en el texto, considéralo 'Referencia Estética' y no lo incluyas en el presupuesto base.
2. AISLAMIENTO DE ALCANCE: Solo asigna horas a tareas validadas por el texto. Si detectas funciones en las imágenes que NO fueron pedidas en el texto, lístalas en una sección aparte llamada 'extras_opcionales' con 0 horas.
3. DESGLOSE TÉCNICO DETALLADO: No generes tareas genéricas. Divide cada hito en pasos técnicos ejecutables (ej: 'Crear tabla de turnos en DB', 'Validar solapamiento de horarios en Backend', 'Desarrollar selector de fechas en Frontend').
4. DETECCIÓN DE GAPS (Modo Consultor): Identifica procesos omitidos (ej: anulaciones, confirmaciones por email, feriados) y lístalos en 'sugerencias_proactivas'.
5. ALERTAS DE CONFLICTO: Si hay una contradicción evidente entre una imagen y las notas, lístala en 'alertas_conflictos' y no asumas una solución.
6. ASIGNACIÓN DE ROLES: Sugiere el perfil técnico necesario (ej: Fullstack, DevOps, QA, Frontend, Backend) para cada tarea.

FORMATO DE SALIDA (JSON PURO): Responde exclusivamente con la estructura solicitada.`;

      // Format contents for @google/genai with proper user role parts
      const contentsPayload = [
        {
          role: "user",
          parts: parts
        }
      ];

      // Multi-model resilience: try primary requested model, then fallback candidates if 503/429/demand spike occurs
      const candidateModels = [
        model,
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-3.8-flash",
        "gemini-flash-latest"
      ].filter(Boolean) as string[];

      // remove duplicates while preserving priority order
      uniqueModels = Array.from(new Set(candidateModels));

      let response: any = null;
      let lastModelError: any = null;
      let usedModel = uniqueModels[0];

      for (const m of uniqueModels) {
        try {
          console.log(`[Gemini] Intentando generar propuesta con modelo: ${m}`);
          response = await ai.models.generateContent({
            model: m,
            contents: contentsPayload,
            config: {
              systemInstruction: effectiveSystemInstruction,
              temperature: typeof temperature === "number" ? temperature : 0.1,
              topK: 40,
              topP: 0.95,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  resumen_ejecutivo: {
                    type: Type.STRING,
                    description: "Texto narrativo profesional para el cliente resumiendo el alcance, arquitectura y decisiones clave."
                  },
                  hitos: {
                    type: Type.ARRAY,
                    description: "Lista de hitos del proyecto con sus respectivas tareas técnicas atómicas.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nombre_meta: { type: Type.STRING },
                        tareas: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              titulo: { type: Type.STRING },
                              descripcion: { type: Type.STRING },
                              rol: {
                                type: Type.STRING,
                                description: "Perfil técnico recomendado: Fullstack, Frontend, Backend, DevOps, QA, etc."
                              },
                              horas: {
                                type: Type.NUMBER,
                                description: "Estimación de horas de esfuerzo para esta tarea específica."
                              }
                            },
                            required: ["titulo", "descripcion", "rol", "horas"]
                          }
                        }
                      },
                      required: ["nombre_meta", "tareas"]
                    }
                  },
                  sugerencias_proactivas: {
                    type: Type.ARRAY,
                    description: "Procesos omitidos o gaps detectados por el consultor (anulaciones, emails, logs, etc.).",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        titulo: { type: Type.STRING },
                        descripcion: { type: Type.STRING },
                        impacto: { type: Type.STRING }
                      },
                      required: ["titulo", "descripcion"]
                    }
                  },
                  extras_opcionales: {
                    type: Type.ARRAY,
                    description: "Funciones presentes en las imágenes que NO fueron pedidas en el texto (0 horas estimadas).",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        titulo: { type: Type.STRING },
                        descripcion: { type: Type.STRING },
                        horas_estimadas: { type: Type.NUMBER },
                        origen_detectado: { type: Type.STRING }
                      },
                      required: ["titulo", "descripcion"]
                    }
                  },
                  alertas_conflictos: {
                    type: Type.ARRAY,
                    description: "Contradicciones evidentes detectadas entre las capturas/bocetos y las notas de texto.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        titulo: { type: Type.STRING },
                        descripcion: { type: Type.STRING },
                        fuente_imagen: { type: Type.STRING },
                        fuente_texto: { type: Type.STRING },
                        recomendacion: { type: Type.STRING }
                      },
                      required: ["titulo", "descripcion"]
                    }
                  },
                  horas_totales_validadas: {
                    type: Type.NUMBER,
                    description: "Suma total de horas únicamente de tareas validadas por el texto."
                  }
                },
                required: [
                  "resumen_ejecutivo",
                  "hitos",
                  "sugerencias_proactivas",
                  "extras_opcionales",
                  "alertas_conflictos",
                  "horas_totales_validadas"
                ]
              }
            }
          });
          usedModel = m;
          console.log(`[Gemini] Generación exitosa con modelo: ${m}`);
          break; // Succeeded!
        } catch (mErr: any) {
          console.warn(`[Gemini] Falló intento con modelo ${m}:`, mErr?.message || mErr);
          lastModelError = mErr;
          // Continue loop to fallback model
        }
      }

      if (!response && lastModelError) {
        throw lastModelError;
      }

      const rawJson = response.text || "{}";
      let parsedData: any;

      try {
        parsedData = JSON.parse(rawJson);
      } catch (parseError) {
        // In case model wraps in markdown codeblock
        const cleaned = rawJson
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        parsedData = JSON.parse(cleaned);
      }

      // Re-sum hours to guarantee mathematical accuracy
      let computedTotal = 0;
      if (Array.isArray(parsedData.hitos)) {
        for (const hito of parsedData.hitos) {
          if (Array.isArray(hito.tareas)) {
            for (const tarea of hito.tareas) {
              computedTotal += Number(tarea.horas) || 0;
            }
          }
        }
      }

      if (computedTotal > 0) {
        parsedData.horas_totales_validadas = computedTotal;
      }

      const isAutoResolved = usedModel !== model;

      parsedData.metadata = {
        proyecto: projectName || "Proyecto Sin Nombre",
        fechaGeneracion: new Date().toISOString(),
        modeloUsado: usedModel || model || "gemini-3.5-flash",
        modeloOriginal: model,
        autoResolvedFallback: isAutoResolved,
        resolucionAutomatica: isAutoResolved
          ? `Se recuperó automáticamente de la alta demanda o límite de cuota en ${model} utilizando el modelo disponible ${usedModel}.`
          : null,
        cantidadImagenes: Array.isArray(images) ? images.length : 0
      };

      return res.json(parsedData);
    } catch (error: any) {
      console.error("Error al procesar con Gemini:", error);

      let userFriendlyMessage = error?.message || "Error al invocar la API de Gemini";
      let isRateLimitOrDemand = false;

      // Extract nested JSON error if present from Gemini SDK
      try {
        if (typeof userFriendlyMessage === "string" && userFriendlyMessage.includes("{")) {
          const jsonStart = userFriendlyMessage.indexOf("{");
          const parsed = JSON.parse(userFriendlyMessage.substring(jsonStart));
          if (parsed?.error?.message) {
            userFriendlyMessage = parsed.error.message;
          }
          if (parsed?.error?.code === 429 || parsed?.error?.status === "RESOURCE_EXHAUSTED") {
            isRateLimitOrDemand = true;
          } else if (parsed?.error?.code === 503 || parsed?.error?.status === "UNAVAILABLE") {
            isRateLimitOrDemand = true;
          }
        }
      } catch {
        // keep userFriendlyMessage as is
      }

      if (
        String(error).includes("429") ||
        String(error).includes("RESOURCE_EXHAUSTED") ||
        String(error).includes("quota") ||
        String(error).includes("503") ||
        String(error).includes("high demand")
      ) {
        isRateLimitOrDemand = true;
      }

      return res.status(isRateLimitOrDemand ? 429 : 500).json({
        error: isRateLimitOrDemand
          ? "La API de Gemini superó temporalmente la cuota gratuita o experimenta alta demanda. Por favor, intenta de nuevo en unos momentos o selecciona otro modelo como Gemini 3.5 Flash / Gemini 3.1 Flash Lite."
          : userFriendlyMessage,
        isRateLimitOrDemand,
        rawMessage: userFriendlyMessage,
        details: error?.stack || error?.toString?.() || "",
        errorType: isRateLimitOrDemand ? "KNOWN_RATE_LIMIT_OR_DEMAND" : "UNHANDLED_ERROR",
        timestamp: new Date().toISOString(),
        modelAttempted: requestedModel,
        triedModels: uniqueModels
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TPM Backlog Server running on port ${PORT}`);
  });
}

startServer();
