import { z } from "zod";

import { estTerminee, meilleureEnchere, montantMinimum } from "../domain/annonce";
import { erreurs } from "../domain/erreurs";
import type { Annonce, Enchere } from "../domain/types";
import { annoncesRepository } from "../repository/annonces.repository";

/**
 * Forme attendue du corps de `POST /api/annonces/:id/encheres`.
 *
 * Le schéma ne vérifie que ce qui ne dépend d'aucun état : un pseudo non vide
 * et un montant strictement positif. Tout ce qui demande de connaître l'annonce
 * (est-elle terminée ? le montant dépasse-t-il l'enchère actuelle ?) relève des
 * règles métier plus bas, pas du schéma.
 *
 * Choix assumé : on n'accepte pas `"1250"` sous forme de chaîne. Le contrat
 * d'API demande un nombre, c'est au client de convertir la saisie du formulaire.
 */
const demandeEnchereSchema = z.object({
  pseudo: z.string("Le pseudo est obligatoire.").trim().min(1, "Le pseudo ne peut pas être vide."),
  montant: z
    .number("Le montant doit être un nombre.")
    .positive("Le montant doit être strictement positif."),
});

export type DemandeEnchere = z.infer<typeof demandeEnchereSchema>;

/** Transforme les problèmes signalés par Zod en `{ champ: message }`, plus simple à afficher. */
function champsInvalides(erreur: z.ZodError): Record<string, string> {
  const champs: Record<string, string> = {};

  for (const probleme of erreur.issues) {
    const champ = probleme.path.join(".") || "corps";
    champs[champ] ??= probleme.message;
  }

  return champs;
}

/**
 * Place une enchère sur une annonce, ou lève une `ErreurMetier` expliquant le refus.
 *
 * Ce service ne connaît ni Express, ni `req`, ni `res`, ni les codes HTTP : il
 * reçoit des valeurs, il renvoie des valeurs. C'est ce qui permet de tester les
 * cinq règles de refus par simple appel de fonction, sans démarrer de serveur.
 *
 * @param corps      corps de la requête, encore non validé.
 * @param maintenant instant de référence, injecté pour que les tests puissent figer le temps.
 */
export function placerEnchere(
  idAnnonce: string,
  corps: unknown,
  maintenant: Date = new Date(),
): { annonce: Annonce; enchere: Enchere } {
  const validation = demandeEnchereSchema.safeParse(corps);
  if (!validation.success) {
    throw erreurs.payloadInvalide(champsInvalides(validation.error));
  }

  const { pseudo, montant } = validation.data;

  const annonce = annoncesRepository.trouverParId(idAnnonce);
  if (!annonce) {
    throw erreurs.annonceIntrouvable(idAnnonce);
  }

  // L'état de l'annonce est vérifié avant le montant : si la vente est close,
  // aucun montant ne conviendrait, et annoncer « votre montant est trop bas »
  // enverrait l'utilisateur sur une fausse piste.
  if (estTerminee(annonce, maintenant)) {
    throw erreurs.annonceTerminee(annonce.dateFin);
  }

  const meilleure = meilleureEnchere(annonce);
  const minimum = montantMinimum(annonce);

  if (montant <= meilleure) {
    throw erreurs.montantTropBas(meilleure, minimum);
  }

  // Les deux règles partagent la même borne, mais on les distingue pour
  // renvoyer un message actionnable plutôt qu'un refus générique.
  if (montant < minimum) {
    throw erreurs.pasEnchereNonRespecte(annonce.pasEnchere, minimum);
  }

  const enchere: Enchere = {
    pseudo,
    montant,
    date: maintenant.toISOString(),
  };

  const annonceMiseAJour = annoncesRepository.ajouterEnchere(annonce.id, enchere);
  if (!annonceMiseAJour) {
    // Inatteignable en pratique : l'annonce vient d'être trouvée au-dessus.
    // On préfère cette vérification explicite à un `!` qui masquerait le cas.
    throw erreurs.annonceIntrouvable(idAnnonce);
  }

  return { annonce: annonceMiseAJour, enchere };
}
