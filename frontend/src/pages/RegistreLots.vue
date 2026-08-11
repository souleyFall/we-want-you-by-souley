<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { api, ErreurApi } from "../api/client";
import EcheanceLot from "../components/EcheanceLot.vue";
import type { AnnonceResume, StatutAnnonce } from "../types/api";
import { formaterMontant, libelleEncheres, referenceCourte } from "../utils/format";

/*
 * Page registre : la liste des lots, filtrable et triable.
 *
 * L'état de chargement est géré avec trois `ref` plutôt qu'une bibliothèque
 * dédiée. Sur deux écrans, l'abstraction coûterait plus qu'elle ne rapporte,
 * et chaque ligne reste explicable.
 */

const annonces = ref<AnnonceResume[]>([]);
const chargement = ref(true);
const erreur = ref<ErreurApi | null>(null);

/* --- Filtre et tri ------------------------------------------------------- */

type FiltreStatut = "tous" | StatutAnnonce;
type CritereTri = "cloture" | "montant-desc" | "montant-asc" | "titre";

const filtre = ref<FiltreStatut>("tous");
const tri = ref<CritereTri>("cloture");

const TRIS: { valeur: CritereTri; libelle: string }[] = [
  { valeur: "cloture", libelle: "Clôture la plus proche" },
  { valeur: "montant-desc", libelle: "Montant décroissant" },
  { valeur: "montant-asc", libelle: "Montant croissant" },
  { valeur: "titre", libelle: "Désignation (A → Z)" },
];

const nombreOuverts = computed(
  () => annonces.value.filter((annonce) => annonce.statut === "en_cours").length,
);

const filtres = computed(() => [
  { valeur: "tous" as const, libelle: "Tous", compte: annonces.value.length },
  { valeur: "en_cours" as const, libelle: "En cours", compte: nombreOuverts.value },
  {
    valeur: "terminee" as const,
    libelle: "Terminées",
    compte: annonces.value.length - nombreOuverts.value,
  },
]);

/**
 * Liste effectivement affichée.
 *
 * Le tri travaille sur une copie : `sort` modifie sur place et réordonnerait
 * sinon la source à chaque changement de critère.
 */
const lotsAffiches = computed<AnnonceResume[]>(() => {
  const retenus = annonces.value.filter(
    (annonce) => filtre.value === "tous" || annonce.statut === filtre.value,
  );

  return [...retenus].sort((a, b) => {
    switch (tri.value) {
      case "montant-desc":
        return b.meilleureEnchere - a.meilleureEnchere;
      case "montant-asc":
        return a.meilleureEnchere - b.meilleureEnchere;
      case "titre":
        // `localeCompare` gère les accents : « école » se classe bien après « eau ».
        return a.titre.localeCompare(b.titre, "fr");
      case "cloture":
      default:
        // Les ventes closes passent en fin de liste : leur date de fin est
        // dans le passé, un tri chronologique brut les remonterait en tête.
        if (a.statut !== b.statut) return a.statut === "en_cours" ? -1 : 1;
        return Date.parse(a.dateFin) - Date.parse(b.dateFin);
    }
  });
});

async function charger(): Promise<void> {
  chargement.value = true;
  erreur.value = null;

  try {
    annonces.value = await api.listerAnnonces();
  } catch (probleme) {
    erreur.value =
      probleme instanceof ErreurApi
        ? probleme
        : new ErreurApi(0, {
            code: "ERREUR_INTERNE",
            message: "Une erreur inattendue est survenue.",
          });
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);
</script>

<template>
  <section>
    <header class="tete">
      <p class="surtitre">Registre des lots</p>
      <h1 class="tete__titre">Matériel réformé mis en vente</h1>
      <p v-if="!chargement && !erreur" class="tete__compte donnee">
        {{ annonces.length }} lots enregistrés — {{ nombreOuverts }} encore ouverts
      </p>
    </header>

    <p v-if="chargement" class="aide">Chargement du registre…</p>

    <div v-else-if="erreur" class="alerte echec">
      <p>{{ erreur.message }}</p>
      <button type="button" class="bouton bouton--discret" @click="charger">
        Réessayer
      </button>
    </div>

    <template v-else>
      <div class="barre">
        <div class="barre__groupe" role="group" aria-label="Filtrer par statut">
          <span class="surtitre">Afficher</span>
          <button
            v-for="option in filtres"
            :key="option.valeur"
            type="button"
            class="onglet donnee"
            :class="{ 'onglet--actif': filtre === option.valeur }"
            :aria-pressed="filtre === option.valeur"
            @click="filtre = option.valeur"
          >
            {{ option.libelle }}
            <span class="onglet__compte">{{ option.compte }}</span>
          </button>
        </div>

        <div class="barre__groupe">
          <label class="surtitre" for="tri">Trier par</label>
          <select id="tri" v-model="tri" class="selecteur donnee">
            <option v-for="option in TRIS" :key="option.valeur" :value="option.valeur">
              {{ option.libelle }}
            </option>
          </select>
        </div>
      </div>

      <p v-if="lotsAffiches.length === 0" class="aide">
        Aucun lot ne correspond à ce filtre.
      </p>

      <ol v-else class="lots">
        <li v-for="annonce in lotsAffiches" :key="annonce.id">
          <RouterLink class="lot" :to="`/lots/${annonce.id}`">
            <span class="lot__reference donnee">
              <span class="hors-ecran">Référence du lot </span>{{ referenceCourte(annonce.id) }}
            </span>

            <span class="lot__corps">
              <span class="lot__titre titre-lot">{{ annonce.titre }}</span>
              <span class="lot__description">{{ annonce.description }}</span>
              <span class="lot__meta donnee">
                {{ libelleEncheres(annonce.nombreEncheres) }} · pas de
                {{ formaterMontant(annonce.pasEnchere) }}
              </span>
            </span>

            <span class="lot__chiffres">
              <span class="surtitre">
                {{ annonce.nombreEncheres > 0 ? "Meilleure enchère" : "Prix de départ" }}
              </span>
              <span class="montant-fort lot__montant">
                {{ formaterMontant(annonce.meilleureEnchere) }}
              </span>
              <span
                class="pastille"
                :class="annonce.statut === 'en_cours' ? 'pastille--ouvert' : 'pastille--clos'"
              >
                {{ annonce.statut === "en_cours" ? "En cours" : "Terminée" }}
              </span>
              <EcheanceLot :date-fin="annonce.dateFin" />
            </span>
          </RouterLink>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.tete {
  display: flex;
  flex-direction: column;
  gap: var(--e2);
  padding-block-end: var(--e5);
}

.tete__titre {
  font-family: var(--police-titre);
  font-size: var(--txt-3xl);
  font-weight: 400;
  line-height: 1.1;
  text-wrap: balance;
}

.tete__compte {
  font-size: var(--txt-sm);
  color: var(--encre-douce);
}

.echec {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e4);
}

/* Bandeau de commandes : la même logique de filets que le registre. */
.barre {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--e4);
  padding-block: var(--e3);
  border-block-start: 1px solid var(--trait-appuye);
}

.barre__groupe {
  display: flex;
  align-items: center;
  gap: var(--e3);
}

.onglet {
  display: inline-flex;
  align-items: baseline;
  gap: var(--e2);
  padding: var(--e1) var(--e2);
  border: none;
  border-block-end: 2px solid transparent;
  background: none;
  font-size: var(--txt-sm);
  color: var(--encre-douce);
  cursor: pointer;
}

.onglet:hover {
  color: var(--encre);
}

.onglet--actif {
  border-block-end-color: var(--accent);
  color: var(--encre);
}

.onglet__compte {
  font-size: var(--txt-xs);
  font-variant-numeric: tabular-nums;
  color: var(--encre-tenue);
}

.selecteur {
  padding: var(--e1) var(--e2);
  border: 1px solid var(--trait-appuye);
  border-radius: var(--rayon);
  background: var(--papier-releve);
  font-size: var(--txt-sm);
  cursor: pointer;
}

/* Le registre : des lignes séparées par des filets, pas des cartes. */
.lots {
  border-block: 1px solid var(--trait-appuye);
}

.lots > li + li {
  border-block-start: 1px solid var(--trait);
}

.lot {
  display: grid;
  grid-template-columns: 4.5rem 1fr minmax(11rem, auto);
  gap: var(--e5);
  padding-block: var(--e4);
  text-decoration: none;
  transition: background-color 120ms ease;
}

.lot:hover {
  background: var(--papier-releve);
}

.lot__reference {
  font-size: var(--txt-sm);
  color: var(--encre-tenue);
  letter-spacing: 0.08em;
  padding-block-start: 0.2rem;
  transition: color 120ms ease;
}

.lot:hover .lot__reference {
  color: var(--accent);
}

.lot__corps {
  display: flex;
  flex-direction: column;
  gap: var(--e1);
  min-width: 0;
}

.lot__titre {
  font-size: var(--txt-xl);
}

.lot__description {
  color: var(--encre-douce);
  font-size: var(--txt-sm);
  /* Deux lignes maximum : les descriptions ne doivent pas déséquilibrer la grille. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.lot__meta {
  font-size: var(--txt-xs);
  color: var(--encre-tenue);
  padding-block-start: var(--e1);
}

.lot__chiffres {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--e2);
}

.lot__montant {
  font-size: var(--txt-xl);
  line-height: 1;
}

@media (max-width: 44rem) {
  .barre {
    flex-direction: column;
    align-items: flex-start;
  }

  .lot {
    grid-template-columns: 1fr;
    gap: var(--e3);
  }

  .lot__chiffres {
    flex-flow: row wrap;
    align-items: baseline;
    gap: var(--e3);
  }
}
</style>
