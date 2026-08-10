import { readFileSync } from "node:fs";

import { annonceSchema, type Annonce, type Enchere } from "../domain/types";

/*
 * Stockage en mémoire, initialisé depuis le fichier de données fourni.
 *
 * Cette couche ne connaît aucune règle métier : elle sait lire et écrire, pas
 * décider. C'est aussi le seul fichier à remplacer le jour où l'on branche une
 * vraie base de données — ni les services ni les routes n'en sauraient rien.
 *
 * Conséquence assumée du choix : les enchères ajoutées sont perdues au
 * redémarrage du serveur.
 */

/** Résolu depuis l'emplacement de ce fichier, pas depuis le dossier courant. */
const CHEMIN_DONNEES = new URL("../../../data/annonces.json", import.meta.url);

function chargerDepuisFichier(): Annonce[] {
  const contenu = readFileSync(CHEMIN_DONNEES, "utf-8");

  // On valide le fichier au chargement : si les données ne respectent pas la
  // forme attendue, on veut une erreur explicite ici plutôt qu'un `undefined`
  // inexplicable trois couches plus loin.
  return annonceSchema.array().parse(JSON.parse(contenu));
}

let annonces: Annonce[] = chargerDepuisFichier();

export const annoncesRepository = {
  /** Copie du tableau : personne d'autre que le repository ne doit y ajouter ou retirer d'annonce. */
  lister(): Annonce[] {
    return [...annonces];
  },

  trouverParId(id: string): Annonce | undefined {
    return annonces.find((annonce) => annonce.id === id);
  },

  /**
   * Ajoute une enchère à une annonce et renvoie l'annonce mise à jour.
   *
   * L'opération est synchrone et ne contient aucun `await` : entre la
   * recherche et l'écriture, la boucle d'événements de Node ne peut pas passer
   * la main à une autre requête. Deux enchères simultanées sont donc traitées
   * l'une après l'autre — voir `NOTES.md` pour ce qu'il en serait avec une
   * vraie base de données et plusieurs instances.
   */
  ajouterEnchere(idAnnonce: string, enchere: Enchere): Annonce | undefined {
    const annonce = annonces.find((candidate) => candidate.id === idAnnonce);
    if (!annonce) return undefined;

    annonce.encheres.push(enchere);
    return annonce;
  },

  /** Recharge les données d'origine. Utilisé pour repartir d'un état propre entre deux tests. */
  reinitialiser(): void {
    annonces = chargerDepuisFichier();
  },
};
