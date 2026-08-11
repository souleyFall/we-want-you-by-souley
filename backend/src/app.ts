import cors from "cors";
import express, { type Express } from "express";

import { config } from "./config";
import { gestionErreurs, routeIntrouvable } from "./middlewares/gestionErreurs";
import { annoncesRouter } from "./routes/annonces.routes";

/**
 * Construit l'application Express sans la démarrer.
 *
 * La séparation avec `index.ts` (qui, lui, appelle `listen`) permet aux tests
 * d'intégration de passer l'application à Supertest sans jamais ouvrir de port.
 */
export function creerApp(): Express {
  const app = express();

  app.use(cors({ origin: config.origineFrontend }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ statut: "ok" });
  });

  app.use("/api/annonces", annoncesRouter);

  // L'ordre compte : ces deux middlewares doivent être déclarés en dernier,
  // après toutes les routes. Le premier attrape les URL inconnues, le second
  // toutes les erreurs levées en amont.
  app.use(routeIntrouvable);
  app.use(gestionErreurs);

  return app;
}
