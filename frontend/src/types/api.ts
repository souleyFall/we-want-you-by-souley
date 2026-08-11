/*
 * Contrat d'API vu du client.
 *
 * Ces types reprennent les DTO du backend. Ils sont volontairement dupliqués
 * plutôt que partagés : sur un vrai projet on extrairait un paquet commun dans
 * un monorepo, mais l'énoncé demande deux dossiers indépendants et une
 * plomberie de monorepo coûterait ici plus qu'elle ne rapporte.
 */

export type StatutAnnonce = "en_cours" | "terminee";

export interface Enchere {
  pseudo: string;
  montant: number;
  /** Date ISO 8601. */
  date: string;
}

/** Une annonce telle que renvoyée par `GET /api/annonces` : sans l'historique. */
export interface AnnonceResume {
  id: string;
  titre: string;
  description: string;
  prixDepart: number;
  pasEnchere: number;
  dateFin: string;
  statut: StatutAnnonce;
  meilleureEnchere: number;
  nombreEncheres: number;
  montantMinimum: number;
}

/** Une annonce telle que renvoyée par `GET /api/annonces/:id`. */
export interface AnnonceDetail extends AnnonceResume {
  /** Triée de la plus récente à la plus ancienne. */
  encheres: Enchere[];
}

/** Réponse de `POST /api/annonces/:id/encheres`. */
export interface ReponseEnchere {
  enchere: Enchere;
  annonce: AnnonceDetail;
}

/**
 * Codes d'erreur du contrat. On s'appuie sur eux plutôt que sur le texte du
 * message, qui peut être reformulé côté serveur sans casser le client.
 *
 * `RESEAU_INDISPONIBLE` est le seul à ne pas venir de l'API : il est fabriqué
 * par le client quand la requête n'a même pas abouti.
 */
export type CodeErreur =
  | "ANNONCE_INTROUVABLE"
  | "ANNONCE_TERMINEE"
  | "MONTANT_TROP_BAS"
  | "PAS_ENCHERE_NON_RESPECTE"
  | "PAYLOAD_INVALIDE"
  | "ROUTE_INTROUVABLE"
  | "ERREUR_INTERNE"
  | "RESEAU_INDISPONIBLE";

/** Corps d'erreur, aplati : les `details` du serveur sont au même niveau que le code. */
export interface CorpsErreur {
  code: CodeErreur;
  message: string;
  meilleureEnchere?: number;
  montantMinimum?: number;
  pasEnchere?: number;
  dateFin?: string;
  /** Renseigné pour `PAYLOAD_INVALIDE` : `{ montant: "Le montant doit être…" }`. */
  champs?: Record<string, string>;
}
