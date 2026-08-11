import type { ErrorRequestHandler, RequestHandler } from "express";

import { ErreurMetier, type CodeErreur } from "../domain/erreurs";

/**
 * Correspondance code métier → statut HTTP.
 *
 * C'est le seul endroit du projet qui connaisse à la fois le métier et HTTP.
 * Le tableau est typé `Record<CodeErreur, number>` : ajouter un code métier
 * sans lui donner de statut devient une erreur de compilation, pas un 500
 * découvert en production.
 *
 * La règle appliquée :
 *   400 — la requête est mal formée, elle n'atteint pas les règles métier ;
 *   404 — la ressource n'existe pas ;
 *   409 — l'état de l'annonce rend l'opération impossible (aucun montant ne passerait) ;
 *   422 — la requête est bien formée mais la valeur viole une règle métier.
 *
 * 403 est volontairement absent : il signifie « identité connue, droits
 * insuffisants », or l'application n'a aucune notion d'identité.
 */
const STATUTS_HTTP: Record<CodeErreur, number> = {
  PAYLOAD_INVALIDE: 400,
  ANNONCE_INTROUVABLE: 404,
  ANNONCE_TERMINEE: 409,
  MONTANT_TROP_BAS: 422,
  PAS_ENCHERE_NON_RESPECTE: 422,
};

/** Corps JSON illisible : Express lève une SyntaxError portant la propriété `body`. */
function estJsonMalforme(erreur: unknown): boolean {
  return erreur instanceof SyntaxError && "body" in erreur;
}

/** Attrapé après toutes les routes : aucune n'a répondu. */
export const routeIntrouvable: RequestHandler = (req, res) => {
  res.status(404).json({
    erreur: {
      code: "ROUTE_INTROUVABLE",
      message: `La route ${req.method} ${req.originalUrl} n'existe pas.`,
    },
  });
};

/**
 * Point de sortie unique de toutes les erreurs de l'API.
 *
 * Le frontend n'a donc qu'un seul format à savoir lire, et les services
 * n'ont jamais à manipuler `res` : ils lèvent une erreur métier, ce middleware
 * la traduit.
 */
export const gestionErreurs: ErrorRequestHandler = (erreur, _req, res, _next) => {
  if (erreur instanceof ErreurMetier) {
    res.status(STATUTS_HTTP[erreur.code]).json({
      erreur: {
        code: erreur.code,
        message: erreur.message,
        ...erreur.details,
      },
    });
    return;
  }

  if (estJsonMalforme(erreur)) {
    res.status(400).json({
      erreur: {
        code: "PAYLOAD_INVALIDE",
        message: "Le corps de la requête n'est pas un JSON valide.",
      },
    });
    return;
  }

  // Tout ce qui arrive ici est un bug, pas un refus métier : on le journalise
  // côté serveur et on ne renvoie aucun détail interne au client.
  console.error("Erreur inattendue :", erreur);

  res.status(500).json({
    erreur: {
      code: "ERREUR_INTERNE",
      message: "Une erreur inattendue est survenue.",
    },
  });
};
