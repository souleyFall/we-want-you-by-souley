import { erreurs } from "../domain/erreurs";
import type { Annonce } from "../domain/types";
import { annoncesRepository } from "../repository/annonces.repository";

/*
 * Service de consultation. Volontairement mince : la seule règle qu'il porte
 * est « une annonce demandée par identifiant doit exister ».
 *
 * Il existe malgré tout, plutôt que de laisser les routes appeler directement
 * le repository, pour que la dépendance reste à sens unique
 * (routes → services → repository) et qu'un seul endroit soit à modifier
 * le jour où consulter une annonce demande autre chose qu'une lecture.
 */

export function listerAnnonces(): Annonce[] {
  return annoncesRepository.lister();
}

/** @throws {ErreurMetier} `ANNONCE_INTROUVABLE` si aucune annonce ne porte cet identifiant. */
export function consulterAnnonce(id: string): Annonce {
  const annonce = annoncesRepository.trouverParId(id);

  if (!annonce) {
    throw erreurs.annonceIntrouvable(id);
  }

  return annonce;
}
