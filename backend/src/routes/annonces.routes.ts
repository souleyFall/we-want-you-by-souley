import { Router } from "express";

import { versDetailDto, versResumeDto } from "../domain/annonce";
import { consulterAnnonce, listerAnnonces } from "../services/annonces.service";
import { placerEnchere } from "../services/encheres.service";

/*
 * Couche HTTP. Elle ne contient aucune règle métier : elle lit la requête,
 * appelle un service, met la réponse en forme, et choisit le code de succès.
 *
 * Les refus ne sont pas gérés ici : les services lèvent une ErreurMetier
 * qu'Express transmet au middleware de gestion des erreurs. Pas un seul
 * try/catch dans ce fichier.
 */

export const annoncesRouter = Router();

/** GET /api/annonces — la liste, sans les historiques d'enchères. */
annoncesRouter.get("/", (_req, res) => {
  const annonces = listerAnnonces().map((annonce) => versResumeDto(annonce));

  res.json(annonces);
});

/** GET /api/annonces/:id — le détail, historique compris. */
annoncesRouter.get("/:id", (req, res) => {
  const annonce = consulterAnnonce(req.params.id);

  res.json(versDetailDto(annonce));
});

/**
 * POST /api/annonces/:id/encheres — place une enchère.
 *
 * Réponse 201 (une ressource a été créée) contenant l'enchère créée **et**
 * l'annonce à jour : le client peut rafraîchir son affichage sans enchaîner
 * une seconde requête.
 */
annoncesRouter.post("/:id/encheres", (req, res) => {
  const { annonce, enchere } = placerEnchere(req.params.id, req.body);

  res.status(201).json({
    enchere,
    annonce: versDetailDto(annonce),
  });
});
