import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Entités stockées                                                            */
/* -------------------------------------------------------------------------- */

/*
 * Ces schémas décrivent la forme exacte de `data/annonces.json`.
 * On les écrit en Zod plutôt qu'en interfaces pour avoir une seule source de
 * vérité : le type TypeScript est déduit du schéma via `z.infer`, donc il ne
 * peut pas diverger de ce qu'on valide réellement à l'exécution.
 */

export const enchereSchema = z.object({
  pseudo: z.string(),
  montant: z.number(),
  date: z.iso.datetime(),
});

export const annonceSchema = z.object({
  id: z.string(),
  titre: z.string(),
  description: z.string(),
  prixDepart: z.number(),
  pasEnchere: z.number(),
  dateFin: z.iso.datetime(),
  encheres: z.array(enchereSchema),
});

export type Enchere = z.infer<typeof enchereSchema>;
export type Annonce = z.infer<typeof annonceSchema>;

/* -------------------------------------------------------------------------- */
/* DTO exposés par l'API                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Ce qu'on stocke et ce qu'on expose sont deux choses différentes :
 * `statut` et `meilleureEnchere` n'existent pas dans le fichier de données,
 * ils sont recalculés à chaque lecture. Les garder hors du modèle interne
 * évite d'avoir deux représentations de la même information à synchroniser.
 */

export type StatutAnnonce = "en_cours" | "terminee";

/** Ce que renvoie `GET /api/annonces` : tout sauf l'historique. */
export interface AnnonceResumeDto {
  id: string;
  titre: string;
  description: string;
  prixDepart: number;
  pasEnchere: number;
  dateFin: string;
  statut: StatutAnnonce;
  /** Montant de la meilleure enchère, ou prix de départ s'il n'y en a aucune. */
  meilleureEnchere: number;
  /** Permet au client de distinguer « aucune enchère » de « une enchère au prix de départ ». */
  nombreEncheres: number;
  /** Montant minimal acceptable pour la prochaine enchère. */
  montantMinimum: number;
}

/** Ce que renvoie `GET /api/annonces/:id` : le résumé + l'historique. */
export interface AnnonceDetailDto extends AnnonceResumeDto {
  /** Trié de la plus récente à la plus ancienne. */
  encheres: Enchere[];
}
