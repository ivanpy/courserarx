import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { ejecutarMotor, MotorError } from "@/lib/engine";
import { obtenerCatalogoPublico } from "@/lib/engine/models";

// `quiet` silencia el "tip" promocional aleatorio que dotenv v17 imprime en
// cada arranque (node_modules/dotenv/lib/main.js) — no afecta la carga de
// variables de entorno, solo el ruido en el log del servidor.
dotenv.config({quiet: true});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON parser with generous limits for multiple screenshot uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // D-11: ya no revela hasGeminiKey al cliente. Autenticación real es la Fase 5.
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // DTO ModeloPublico (§4.1, §4.2 Nivel 1, Fase 2): lo único sobre modelos
  // que cruza al cliente. Reemplaza el <select> hardcodeado del navegador
  // por una única fuente de verdad server-side; topK/topP/temperature no
  // tienen representación aquí.
  app.get("/api/modelos", (_req, res) => {
    res.json({ modelos: obtenerCatalogoPublico() });
  });

  // Adaptador fino (§12): leer entrada -> ejecutarMotor() -> serializar. Toda
  // la lógica de negocio vive en src/lib/engine/* (Fase 1 del plan de
  // migración); este handler no la repite.
  app.post("/api/analyze", async (req, res) => {
    try {
      const resultado = await ejecutarMotor(req.body);
      res.json(resultado);
    } catch (error) {
      if (error instanceof MotorError) {
        return res.status(error.status).json(error.toPublic());
      }

      // Salvaguarda: ninguna excepción no clasificada debe filtrar stack ni
      // internals al cliente (RES-08 / D-09).
      console.error("[server] Error no clasificado en /api/analyze:", error);
      res.status(500).json({
        error: "Ocurrió un error inesperado.",
        errorType: "UNHANDLED_ERROR",
        isRateLimitOrDemand: false,
        requestId: "n/a",
        timestamp: new Date().toISOString()
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
