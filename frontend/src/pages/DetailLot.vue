<script setup lang="ts">
import { onMounted, ref } from "vue";

import { api, ErreurApi } from "../api/client";
import EcheanceLot from "../components/EcheanceLot.vue";
import FormulaireEnchere from "../components/FormulaireEnchere.vue";
import HistoriqueEncheres from "../components/HistoriqueEncheres.vue";
import { useSondage } from "../composables/sondage";
import type { AnnonceDetail, ReponseEnchere } from "../types/api";
import {
  formaterDateHeure,
  formaterMontant,
  libelleEncheres,
  referenceCourte,
} from "../utils/format";

/*
 * Page détail d'un lot.
 *
 * L'identifiant vient du routeur (`props: true` sur la route), pas d'un accès
 * direct à `useRoute()` : le composant reste testable en lui passant simplement
 * une chaîne.
 */

const props = defineProps<{ id: string }>();

/** Assez court pour rester utile, assez long pour ne pas marteler l'API. */
const INTERVALLE_SONDAGE = 15_000;

const annonce = ref<AnnonceDetail | null>(null);
const chargement = ref(true);
const erreur = ref<ErreurApi | null>(null);
const derniereActualisation = ref<Date | null>(null);

async function charger(): Promise<void> {
  chargement.value = true;
  erreur.value = null;

  try {
    annonce.value = await api.consulterAnnonce(props.id);
    derniereActualisation.value = new Date();
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

/*
 * Le POST renvoie déjà l'annonce à jour : on remplace l'état local avec sa
 * réponse au lieu de relancer un GET. Une requête de moins, et surtout aucune
 * fenêtre pendant laquelle l'écran afficherait des données périmées.
 */
function surEncherePlacee(reponse: ReponseEnchere): void {
  annonce.value = reponse.annonce;
  derniereActualisation.value = new Date();
}

/**
 * Rafraîchissement d'arrière-plan : il ne touche ni à `chargement` ni à
 * `erreur`.
 *
 * Un sondage qui échoue — coupure réseau passagère, API redémarrée — ne doit
 * ni vider l'écran ni afficher une erreur que l'utilisateur n'a pas provoquée.
 * Il se contente de ne rien mettre à jour et retentera au tic suivant.
 */
async function rafraichirEnSilence(): Promise<void> {
  // Plus rien ne bouge sur une vente close : inutile de continuer à interroger.
  if (annonce.value?.statut === "terminee") {
    arreterSondage();
    return;
  }

  try {
    annonce.value = await api.consulterAnnonce(props.id);
    derniereActualisation.value = new Date();
  } catch {
    /* silencieux, par conception */
  }
}

const { arreter: arreterSondage } = useSondage(rafraichirEnSilence, INTERVALLE_SONDAGE);

onMounted(charger);
</script>

<template>
  <p v-if="chargement" class="aide">Chargement du lot…</p>

  <div v-else-if="erreur || !annonce" class="alerte">
    <p>{{ erreur?.message ?? "Lot introuvable." }}</p>
    <p><RouterLink class="retour" to="/">Retour au registre</RouterLink></p>
  </div>

  <article v-else class="lot">
    <RouterLink class="retour donnee" to="/">← Retour au registre</RouterLink>

    <div class="lot__grille">
      <div class="lot__principal">
        <header class="lot__tete">
          <p class="surtitre">Lot réf. {{ referenceCourte(annonce.id) }}</p>
          <h1 class="lot__titre titre-lot">{{ annonce.titre }}</h1>
          <span
            class="pastille"
            :class="annonce.statut === 'en_cours' ? 'pastille--ouvert' : 'pastille--clos'"
          >
            {{ annonce.statut === "en_cours" ? "En cours" : "Terminée" }}
          </span>
        </header>

        <p class="lot__description">{{ annonce.description }}</p>

        <dl class="fiche">
          <div class="fiche__ligne">
            <dt>Prix de départ</dt>
            <dd class="donnee">{{ formaterMontant(annonce.prixDepart) }}</dd>
          </div>
          <div class="fiche__ligne">
            <dt>Pas d'enchère</dt>
            <dd class="donnee">{{ formaterMontant(annonce.pasEnchere) }}</dd>
          </div>
          <div class="fiche__ligne">
            <dt>Clôture</dt>
            <dd class="donnee">{{ formaterDateHeure(annonce.dateFin) }}</dd>
          </div>
          <div class="fiche__ligne">
            <dt>Offres reçues</dt>
            <dd class="donnee">{{ libelleEncheres(annonce.nombreEncheres) }}</dd>
          </div>
        </dl>

        <HistoriqueEncheres
          :encheres="annonce.encheres"
          :montant-minimum="annonce.montantMinimum"
        />
      </div>

      <aside class="lot__panneau">
        <section class="chiffre-cle">
          <p class="surtitre">
            {{ annonce.nombreEncheres > 0 ? "Meilleure enchère" : "Prix de départ" }}
          </p>
          <p class="montant-fort chiffre-cle__valeur">
            {{ formaterMontant(annonce.meilleureEnchere) }}
          </p>
          <EcheanceLot :date-fin="annonce.dateFin" />
          <p v-if="annonce.statut === 'en_cours'" class="aide petit">
            Prochaine offre à partir de {{ formaterMontant(annonce.montantMinimum) }}
          </p>
        </section>

        <FormulaireEnchere :annonce="annonce" @enchere-placee="surEncherePlacee" />

        <p v-if="derniereActualisation" class="actualisation donnee">
          Actualisé à {{ derniereActualisation.toLocaleTimeString("fr-FR") }}
        </p>
      </aside>
    </div>
  </article>
</template>

<style scoped>
.retour {
  display: inline-block;
  margin-block-end: var(--e5);
  font-size: var(--txt-sm);
  color: var(--encre-douce);
  text-decoration: none;
}

.retour:hover {
  color: var(--accent);
}

.lot__grille {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21rem;
  gap: var(--e7);
  align-items: start;
}

.lot__principal {
  display: flex;
  flex-direction: column;
  gap: var(--e5);
  min-width: 0;
}

.lot__tete {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--e2);
  padding-block-end: var(--e4);
  border-block-end: 2px solid var(--encre);
}

.lot__titre {
  font-size: var(--txt-3xl);
}

.lot__description {
  color: var(--encre-douce);
  max-width: 60ch;
}

/* Fiche technique : deux colonnes alignées, comme un bordereau. */
.fiche {
  display: grid;
  gap: 0;
  border-block-start: 1px solid var(--trait-appuye);
}

.fiche__ligne {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: var(--e4);
  padding-block: var(--e3);
  border-block-end: 1px solid var(--trait);
  font-size: var(--txt-sm);
}

.fiche__ligne dt {
  font-family: var(--police-donnees);
  font-size: var(--txt-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--encre-tenue);
}

.fiche__ligne dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.lot__panneau {
  display: flex;
  flex-direction: column;
  gap: var(--e4);
  position: sticky;
  top: var(--e5);
}

.chiffre-cle {
  display: flex;
  flex-direction: column;
  gap: var(--e1);
  padding-block-end: var(--e4);
  border-block-end: 1px solid var(--trait);
}

.chiffre-cle__valeur {
  font-size: var(--txt-3xl);
  line-height: 1.05;
}

.petit {
  font-size: var(--txt-xs);
}

.actualisation {
  font-size: var(--txt-xs);
  color: var(--encre-tenue);
  text-align: end;
}

@media (max-width: 56rem) {
  .lot__grille {
    grid-template-columns: 1fr;
    gap: var(--e6);
  }

  .lot__panneau {
    position: static;
  }

  .fiche__ligne {
    grid-template-columns: 1fr;
    gap: var(--e1);
  }
}
</style>
