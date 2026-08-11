import type {
  AnnonceDetail,
  AnnonceResume,
  CorpsErreur,
  ReponseEnchere,
} from "../types/api";

/** Surchargeable au build (`VITE_URL_API=…`) pour pointer ailleurs qu'en local. */
const URL_API: string = import.meta.env.VITE_URL_API ?? "http://localhost:3000";

/**
 * Erreur portant le corps renvoyé par l'API.
 *
 * L'interface peut donc réagir au `code` (désactiver le formulaire sur
 * `ANNONCE_TERMINEE`, surligner un champ sur `PAYLOAD_INVALIDE`) et pas
 * seulement afficher un message.
 */
export class ErreurApi extends Error {
  constructor(
    /** Statut HTTP, ou 0 si la requête n'a pas abouti. */
    readonly statut: number,
    readonly corps: CorpsErreur,
  ) {
    super(corps.message);
    this.name = "ErreurApi";
  }
}

async function appeler<T>(chemin: string, options?: RequestInit): Promise<T> {
  let reponse: Response;

  try {
    reponse = await fetch(`${URL_API}${chemin}`, options);
  } catch {
    // `fetch` ne rejette que si la requête n'a pas abouti du tout : serveur
    // éteint, DNS, CORS. On traduit ça en une erreur du même type que les
    // autres pour que l'interface n'ait qu'un seul cas à gérer.
    throw new ErreurApi(0, {
      code: "RESEAU_INDISPONIBLE",
      message: "Impossible de joindre le serveur. Vérifiez que l'API est démarrée.",
    });
  }

  if (!reponse.ok) {
    // Piège classique : `fetch` ne rejette PAS sur un 404 ou un 422. Sans ce
    // test, une réponse d'erreur serait traitée comme un succès.
    const corps = (await reponse.json().catch(() => null)) as { erreur?: CorpsErreur } | null;

    throw new ErreurApi(
      reponse.status,
      corps?.erreur ?? {
        code: "ERREUR_INTERNE",
        message: `Le serveur a répondu ${reponse.status} sans détail exploitable.`,
      },
    );
  }

  return (await reponse.json()) as T;
}

export const api = {
  listerAnnonces: () => appeler<AnnonceResume[]>("/api/annonces"),

  consulterAnnonce: (id: string) =>
    appeler<AnnonceDetail>(`/api/annonces/${encodeURIComponent(id)}`),

  placerEnchere: (id: string, corps: { pseudo: string; montant: number }) =>
    appeler<ReponseEnchere>(`/api/annonces/${encodeURIComponent(id)}/encheres`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    }),
};
