/**
 * Codes d'erreur du contrat d'API.
 *
 * Ils sont stables et lisibles par la machine : le frontend s'appuie dessus
 * plutôt que sur le texte du message, qui peut être reformulé ou traduit.
 */
export type CodeErreur =
  | "ANNONCE_INTROUVABLE"
  | "ANNONCE_TERMINEE"
  | "MONTANT_TROP_BAS"
  | "PAS_ENCHERE_NON_RESPECTE"
  | "PAYLOAD_INVALIDE";

/**
 * Erreur métier levée par les services.
 *
 * Elle ne porte volontairement **aucun code HTTP** : le service ignore qu'il
 * est exposé derrière une API REST. La correspondance code métier → statut
 * HTTP est faite au seul endroit qui connaît HTTP, le middleware d'erreurs.
 * Exposer la même règle en GraphQL ou en file de messages ne demanderait donc
 * pas de toucher au métier.
 */
export class ErreurMetier extends Error {
  constructor(
    readonly code: CodeErreur,
    message: string,
    /** Données structurées reprises telles quelles dans la réponse HTTP. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ErreurMetier";
  }
}

/**
 * Fabriques d'erreurs, pour que les messages et les détails soient définis à
 * un seul endroit plutôt que dispersés dans les services.
 */
export const erreurs = {
  annonceIntrouvable: (id: string) =>
    new ErreurMetier(
      "ANNONCE_INTROUVABLE",
      `Aucune annonce ne correspond à l'identifiant "${id}".`,
      { id },
    ),

  annonceTerminee: (dateFin: string) =>
    new ErreurMetier(
      "ANNONCE_TERMINEE",
      "Cette vente est terminée, elle n'accepte plus d'enchères.",
      { dateFin },
    ),

  montantTropBas: (meilleureEnchere: number, montantMinimum: number) =>
    new ErreurMetier(
      "MONTANT_TROP_BAS",
      `Votre montant doit dépasser l'enchère actuelle de ${meilleureEnchere} €.`,
      { meilleureEnchere, montantMinimum },
    ),

  pasEnchereNonRespecte: (pasEnchere: number, montantMinimum: number) =>
    new ErreurMetier(
      "PAS_ENCHERE_NON_RESPECTE",
      `Le pas d'enchère est de ${pasEnchere} €, enchérissez au moins ${montantMinimum} €.`,
      { pasEnchere, montantMinimum },
    ),

  payloadInvalide: (champs: Record<string, string>) =>
    new ErreurMetier("PAYLOAD_INVALIDE", "Les données envoyées sont invalides.", {
      champs,
    }),
};
