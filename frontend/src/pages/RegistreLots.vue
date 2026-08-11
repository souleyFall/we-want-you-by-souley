<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { api, ErreurApi } from "../api/client";
import type { AnnonceResume } from "../types/api";
import {
  formaterDateHeure,
  formaterMontant,
  libelleEncheres,
  referenceCourte,
} from "../utils/format";

/*
 * Page registre : la liste des lots.
 *
 * L'état de chargement est géré avec trois `ref` plutôt qu'une bibliothèque
 * dédiée. Sur deux écrans, l'abstraction coûterait plus qu'elle ne rapporte,
 * et chaque ligne reste explicable.
 */

const annonces = ref<AnnonceResume[]>([]);
const chargement = ref(true);
const erreur = ref<ErreurApi | null>(null);

const nombreOuverts = computed(
  () => annonces.value.filter((annonce) => annonce.statut === "en_cours").length,
);

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

    <ol v-else class="lots">
      <li v-for="annonce in annonces" :key="annonce.id">
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
            <span class="lot__echeance donnee">
              Clôture le {{ formaterDateHeure(annonce.dateFin) }}
            </span>
          </span>
        </RouterLink>
      </li>
    </ol>
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

.lot__echeance {
  font-size: var(--txt-xs);
  color: var(--encre-tenue);
}

@media (max-width: 44rem) {
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
