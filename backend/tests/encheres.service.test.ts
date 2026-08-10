import { beforeEach, describe, expect, it } from "vitest";

import { ErreurMetier } from "../src/domain/erreurs";
import { annoncesRepository } from "../src/repository/annonces.repository";
import { placerEnchere } from "../src/services/encheres.service";

/*
 * Ces tests appellent directement le service : aucun serveur n'est démarré,
 * aucune requête HTTP n'est simulée. C'est précisément ce que permet le fait
 * que le service ne connaisse ni `req` ni `res`.
 *
 * Chaque test correspond à une ligne de la table de décision de NOTES.md.
 */

/** Prix de départ 3500, pas 100, deux enchères, meilleure à 3800 → minimum 3900. */
const ANNONCE_EN_COURS = "a1f4c2d0-0001-4b6e-9c11-000000000001";

/** Prix de départ 200, pas 20, aucune enchère → minimum 220. */
const ANNONCE_SANS_ENCHERE = "a1f4c2d0-0002-4b6e-9c11-000000000002";

/** Date de fin en 2020 : déjà terminée. */
const ANNONCE_TERMINEE = "a1f4c2d0-0004-4b6e-9c11-000000000004";

/**
 * Exécute l'action et renvoie l'ErreurMetier attendue.
 *
 * Passer par un helper plutôt que par `expect(...).toThrow()` permet d'inspecter
 * le code métier et les détails de l'erreur, pas seulement son message.
 */
function capturerErreurMetier(action: () => unknown): ErreurMetier {
  try {
    action();
  } catch (erreur) {
    if (erreur instanceof ErreurMetier) return erreur;
    throw erreur;
  }
  throw new Error("Aucune ErreurMetier n'a été levée alors qu'on en attendait une.");
}

// Le repository est un singleton en mémoire : sans remise à zéro, la première
// enchère placée fausserait tous les tests suivants.
beforeEach(() => {
  annoncesRepository.reinitialiser();
});

describe("placerEnchere — cas de refus", () => {
  it("refuse une annonce qui n'existe pas", () => {
    const erreur = capturerErreurMetier(() =>
      placerEnchere("identifiant-inconnu", { pseudo: "souley", montant: 10_000 }),
    );

    expect(erreur.code).toBe("ANNONCE_INTROUVABLE");
  });

  it("refuse une annonce dont la date de fin est dépassée", () => {
    const erreur = capturerErreurMetier(() =>
      placerEnchere(ANNONCE_TERMINEE, { pseudo: "souley", montant: 5_000 }),
    );

    expect(erreur.code).toBe("ANNONCE_TERMINEE");
  });

  it("refuse un montant inférieur ou égal à la meilleure enchère", () => {
    const erreur = capturerErreurMetier(() =>
      placerEnchere(ANNONCE_EN_COURS, { pseudo: "souley", montant: 3_800 }),
    );

    expect(erreur.code).toBe("MONTANT_TROP_BAS");
    expect(erreur.details).toMatchObject({ meilleureEnchere: 3_800, montantMinimum: 3_900 });
  });

  it("refuse un montant qui n'augmente pas d'au moins le pas d'enchère", () => {
    // 3850 dépasse bien la meilleure enchère (3800) mais n'atteint pas 3800 + 100.
    const erreur = capturerErreurMetier(() =>
      placerEnchere(ANNONCE_EN_COURS, { pseudo: "souley", montant: 3_850 }),
    );

    expect(erreur.code).toBe("PAS_ENCHERE_NON_RESPECTE");
    expect(erreur.details).toMatchObject({ pasEnchere: 100, montantMinimum: 3_900 });
  });

  it("refuse un pseudo vide", () => {
    const erreur = capturerErreurMetier(() =>
      placerEnchere(ANNONCE_EN_COURS, { pseudo: "   ", montant: 4_000 }),
    );

    expect(erreur.code).toBe("PAYLOAD_INVALIDE");
  });

  it("refuse un montant négatif ou non numérique", () => {
    expect(
      capturerErreurMetier(() =>
        placerEnchere(ANNONCE_EN_COURS, { pseudo: "souley", montant: -50 }),
      ).code,
    ).toBe("PAYLOAD_INVALIDE");

    expect(
      capturerErreurMetier(() =>
        placerEnchere(ANNONCE_EN_COURS, { pseudo: "souley", montant: "beaucoup" }),
      ).code,
    ).toBe("PAYLOAD_INVALIDE");
  });
});

describe("placerEnchere — cas nominal", () => {
  it("accepte une enchère valide et l'ajoute à l'historique", () => {
    const { annonce, enchere } = placerEnchere(ANNONCE_EN_COURS, {
      pseudo: "souley",
      montant: 3_900,
    });

    expect(enchere).toMatchObject({ pseudo: "souley", montant: 3_900 });
    expect(annonce.encheres).toHaveLength(3);
    expect(annonce.encheres.at(-1)).toStrictEqual(enchere);
  });

  it("nettoie les espaces autour du pseudo", () => {
    const { enchere } = placerEnchere(ANNONCE_EN_COURS, {
      pseudo: "  souley  ",
      montant: 3_900,
    });

    expect(enchere.pseudo).toBe("souley");
  });

  it("exige prix de départ + un pas pour la toute première enchère", () => {
    // Hypothèse assumée dans NOTES.md : 200 seul ne suffit pas, il faut 220.
    expect(
      capturerErreurMetier(() =>
        placerEnchere(ANNONCE_SANS_ENCHERE, { pseudo: "souley", montant: 200 }),
      ).code,
    ).toBe("MONTANT_TROP_BAS");

    const { enchere } = placerEnchere(ANNONCE_SANS_ENCHERE, {
      pseudo: "souley",
      montant: 220,
    });

    expect(enchere.montant).toBe(220);
  });
});

describe("placerEnchere — gestion du temps", () => {
  it("refuse une annonce encore ouverte si on avance l'horloge après sa date de fin", () => {
    // L'annonce se termine le 31/12/2099 : elle est acceptée aujourd'hui…
    expect(() =>
      placerEnchere(ANNONCE_EN_COURS, { pseudo: "souley", montant: 3_900 }),
    ).not.toThrow();

    annoncesRepository.reinitialiser();

    // …et refusée si l'on se place après cette date, sans toucher à l'horloge système.
    const erreur = capturerErreurMetier(() =>
      placerEnchere(
        ANNONCE_EN_COURS,
        { pseudo: "souley", montant: 3_900 },
        new Date("2100-01-01T00:00:00Z"),
      ),
    );

    expect(erreur.code).toBe("ANNONCE_TERMINEE");
  });
});
