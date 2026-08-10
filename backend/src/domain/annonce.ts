import type {
  Annonce,
  AnnonceDetailDto,
  AnnonceResumeDto,
  StatutAnnonce,
} from "./types";

/*
 * Toutes les fonctions de ce fichier sont pures : elles ne lisent aucun état
 * global et ne modifient pas l'annonce reçue. L'instant courant est un
 * paramètre (avec une valeur par défaut) plutôt qu'un `new Date()` caché à
 * l'intérieur, ce qui permet aux tests de figer le temps.
 */

/**
 * Une annonce est terminée dès que sa date de fin est atteinte.
 *
 * Le statut n'est jamais stocké : aucune tâche planifiée ne viendrait mettre
 * un champ à jour au moment où la date est franchie, et l'annonce resterait
 * indéfiniment « en cours ». Une donnée dérivée ne se stocke que si l'on
 * maîtrise tous les événements qui la font changer — le temps qui passe n'en
 * est pas un.
 */
export function estTerminee(annonce: Annonce, maintenant: Date = new Date()): boolean {
  return Date.parse(annonce.dateFin) <= maintenant.getTime();
}

export function calculerStatut(annonce: Annonce, maintenant: Date = new Date()): StatutAnnonce {
  return estTerminee(annonce, maintenant) ? "terminee" : "en_cours";
}

/**
 * Meilleure enchère de l'annonce, ou prix de départ s'il n'y en a aucune.
 *
 * On prend le maximum plutôt que la dernière enchère du tableau : les règles
 * métier garantissent déjà que les montants sont croissants, mais s'appuyer
 * sur l'ordre d'insertion rendrait le calcul faux le jour où les enchères
 * seraient rechargées dans un ordre différent.
 */
export function meilleureEnchere(annonce: Annonce): number {
  return annonce.encheres.reduce(
    (maximum, enchere) => Math.max(maximum, enchere.montant),
    annonce.prixDepart,
  );
}

/**
 * Montant minimal acceptable pour la prochaine enchère.
 *
 * La formule est la même qu'il y ait déjà des enchères ou non, puisque
 * `meilleureEnchere` retombe sur le prix de départ dans ce cas : la première
 * enchère doit donc valoir au moins `prixDepart + pasEnchere`.
 */
export function montantMinimum(annonce: Annonce): number {
  return meilleureEnchere(annonce) + annonce.pasEnchere;
}

/* -------------------------------------------------------------------------- */
/* Passage du modèle interne aux DTO                                           */
/* -------------------------------------------------------------------------- */

export function versResumeDto(annonce: Annonce, maintenant: Date = new Date()): AnnonceResumeDto {
  return {
    id: annonce.id,
    titre: annonce.titre,
    description: annonce.description,
    prixDepart: annonce.prixDepart,
    pasEnchere: annonce.pasEnchere,
    dateFin: annonce.dateFin,
    statut: calculerStatut(annonce, maintenant),
    meilleureEnchere: meilleureEnchere(annonce),
    nombreEncheres: annonce.encheres.length,
    montantMinimum: montantMinimum(annonce),
  };
}

export function versDetailDto(annonce: Annonce, maintenant: Date = new Date()): AnnonceDetailDto {
  return {
    ...versResumeDto(annonce, maintenant),
    // On copie le tableau avant de trier : `sort` modifie sur place, et on
    // réordonnerait sinon les enchères détenues par le repository.
    encheres: [...annonce.encheres].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date),
    ),
  };
}
