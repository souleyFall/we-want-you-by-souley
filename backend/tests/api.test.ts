import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { creerApp } from "../src/app";
import { annoncesRepository } from "../src/repository/annonces.repository";

/*
 * Tests d'intégration : ils traversent toute la chaîne, du routage HTTP au
 * repository, en passant par les services et le middleware d'erreurs.
 *
 * Supertest reçoit l'application construite par `creerApp()` et non un serveur
 * démarré : aucun port n'est ouvert, aucun test ne peut rester bloqué à la fin
 * de la suite. C'est ce que permet la séparation entre `app.ts` et `index.ts`.
 *
 * Les tests unitaires vérifient déjà chaque règle métier ; ici on vérifie ce
 * qu'eux ne peuvent pas voir : les statuts HTTP, le format des réponses et le
 * contenu réel des DTO.
 */

const app = creerApp();

const ANNONCE_EN_COURS = "a1f4c2d0-0001-4b6e-9c11-000000000001";
const ANNONCE_TERMINEE = "a1f4c2d0-0004-4b6e-9c11-000000000004";

beforeEach(() => {
  annoncesRepository.reinitialiser();
});

describe("GET /api/annonces", () => {
  it("renvoie les annonces avec leur statut et leur meilleure enchère", async () => {
    const reponse = await request(app).get("/api/annonces").expect(200);

    expect(reponse.body).toHaveLength(5);
    expect(reponse.body[0]).toMatchObject({
      id: ANNONCE_EN_COURS,
      statut: "en_cours",
      meilleureEnchere: 3_800,
      montantMinimum: 3_900,
      nombreEncheres: 2,
    });
  });

  it("marque comme terminée une annonce dont la date de fin est passée", async () => {
    const reponse = await request(app).get("/api/annonces").expect(200);

    const terminee = reponse.body.find(
      (annonce: { id: string }) => annonce.id === ANNONCE_TERMINEE,
    );

    expect(terminee.statut).toBe("terminee");
  });

  it("n'expose pas l'historique des enchères dans la liste", async () => {
    const reponse = await request(app).get("/api/annonces").expect(200);

    expect(reponse.body[0]).not.toHaveProperty("encheres");
  });
});

describe("GET /api/annonces/:id", () => {
  it("renvoie le détail avec l'historique trié du plus récent au plus ancien", async () => {
    const reponse = await request(app).get(`/api/annonces/${ANNONCE_EN_COURS}`).expect(200);

    expect(reponse.body.encheres).toHaveLength(2);
    expect(reponse.body.encheres.map((e: { pseudo: string }) => e.pseudo)).toStrictEqual([
      "garage-leblanc",
      "brico77",
    ]);
  });

  it("renvoie 404 pour un identifiant inconnu", async () => {
    const reponse = await request(app).get("/api/annonces/identifiant-inconnu").expect(404);

    expect(reponse.body.erreur.code).toBe("ANNONCE_INTROUVABLE");
  });
});

describe("POST /api/annonces/:id/encheres", () => {
  it("crée l'enchère et renvoie 201 avec l'annonce à jour", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "souley", montant: 3_900 })
      .expect(201);

    expect(reponse.body.enchere).toMatchObject({ pseudo: "souley", montant: 3_900 });
    expect(reponse.body.annonce.meilleureEnchere).toBe(3_900);
    expect(reponse.body.annonce.montantMinimum).toBe(4_000);
    // L'historique renvoyé est trié : la nouvelle enchère est donc en tête.
    expect(reponse.body.annonce.encheres[0].pseudo).toBe("souley");
  });

  it("persiste l'enchère pour les requêtes suivantes", async () => {
    await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "souley", montant: 3_900 })
      .expect(201);

    const reponse = await request(app).get(`/api/annonces/${ANNONCE_EN_COURS}`).expect(200);

    expect(reponse.body.meilleureEnchere).toBe(3_900);
    expect(reponse.body.nombreEncheres).toBe(3);
  });

  it("renvoie 404 sur une annonce inexistante", async () => {
    const reponse = await request(app)
      .post("/api/annonces/identifiant-inconnu/encheres")
      .send({ pseudo: "souley", montant: 3_900 })
      .expect(404);

    expect(reponse.body.erreur.code).toBe("ANNONCE_INTROUVABLE");
  });

  it("renvoie 409 sur une annonce terminée", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_TERMINEE}/encheres`)
      .send({ pseudo: "souley", montant: 5_000 })
      .expect(409);

    expect(reponse.body.erreur.code).toBe("ANNONCE_TERMINEE");
  });

  it("renvoie 422 quand le montant n'excède pas la meilleure enchère", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "souley", montant: 3_800 })
      .expect(422);

    expect(reponse.body.erreur).toMatchObject({
      code: "MONTANT_TROP_BAS",
      montantMinimum: 3_900,
    });
  });

  it("renvoie 422 quand le pas d'enchère n'est pas respecté", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "souley", montant: 3_850 })
      .expect(422);

    expect(reponse.body.erreur).toMatchObject({
      code: "PAS_ENCHERE_NON_RESPECTE",
      pasEnchere: 100,
      montantMinimum: 3_900,
    });
  });

  it("renvoie 400 quand le pseudo est vide", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "", montant: 3_900 })
      .expect(400);

    expect(reponse.body.erreur.code).toBe("PAYLOAD_INVALIDE");
    expect(reponse.body.erreur.champs).toHaveProperty("pseudo");
  });

  it("renvoie 400 quand le montant n'est pas un nombre", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .send({ pseudo: "souley", montant: "3900" })
      .expect(400);

    expect(reponse.body.erreur.champs).toHaveProperty("montant");
  });

  it("renvoie 400 quand le corps JSON est illisible", async () => {
    const reponse = await request(app)
      .post(`/api/annonces/${ANNONCE_EN_COURS}/encheres`)
      .set("Content-Type", "application/json")
      .send("{ pseudo: souley }")
      .expect(400);

    expect(reponse.body.erreur.code).toBe("PAYLOAD_INVALIDE");
  });
});

describe("routes inconnues", () => {
  it("renvoie 404 avec le même format d'erreur que le reste de l'API", async () => {
    const reponse = await request(app).get("/api/inexistant").expect(404);

    expect(reponse.body.erreur.code).toBe("ROUTE_INTROUVABLE");
  });
});
