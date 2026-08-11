<script setup lang="ts">
import { ref, watch } from "vue";

import { api, ErreurApi } from "../api/client";
import type { AnnonceDetail, ReponseEnchere } from "../types/api";
import { formaterMontant } from "../utils/format";

/*
 * Bordereau d'enchère.
 *
 * Le composant ne décide de rien : il envoie la demande, affiche ce que l'API
 * répond, et prévient le parent en cas de succès. Toutes les règles restent
 * côté serveur — dupliquer ici « le montant doit dépasser X » créerait deux
 * vérités qui finiraient par diverger.
 */

const props = defineProps<{ annonce: AnnonceDetail }>();

const emit = defineEmits<{ "enchere-placee": [reponse: ReponseEnchere] }>();

const pseudo = ref("");
const montant = ref(String(props.annonce.montantMinimum));
const envoiEnCours = ref(false);
const erreur = ref<ErreurApi | null>(null);
const confirmation = ref<string | null>(null);

// Après une enchère réussie, le montant minimum a changé : on repositionne la
// saisie sur la nouvelle borne plutôt que de laisser une valeur périmée.
watch(
  () => props.annonce.montantMinimum,
  (nouveauMinimum) => {
    montant.value = String(nouveauMinimum);
  },
);

/** Message d'erreur propre à un champ, renvoyé par la validation du serveur. */
function erreurDuChamp(nom: "pseudo" | "montant"): string | undefined {
  return erreur.value?.corps.champs?.[nom];
}

function utiliserMontantMinimum(): void {
  const minimum = erreur.value?.corps.montantMinimum ?? props.annonce.montantMinimum;
  montant.value = String(minimum);
}

async function soumettre(): Promise<void> {
  envoiEnCours.value = true;
  erreur.value = null;
  confirmation.value = null;

  try {
    // Le champ de saisie renvoie une chaîne ; le contrat d'API attend un
    // nombre. La conversion est explicite plutôt que laissée au serveur.
    const reponse = await api.placerEnchere(props.annonce.id, {
      pseudo: pseudo.value,
      montant: Number(montant.value),
    });

    confirmation.value = `Enchère de ${formaterMontant(reponse.enchere.montant)} enregistrée.`;
    emit("enchere-placee", reponse);
  } catch (probleme) {
    erreur.value =
      probleme instanceof ErreurApi
        ? probleme
        : new ErreurApi(0, {
            code: "ERREUR_INTERNE",
            message: "Une erreur inattendue est survenue.",
          });
  } finally {
    envoiEnCours.value = false;
  }
}
</script>

<template>
  <section class="bordereau">
    <h2 class="surtitre">Placer une enchère</h2>

    <p v-if="annonce.statut === 'terminee'" class="aide">
      Cette vente est close depuis le
      {{ new Date(annonce.dateFin).toLocaleDateString("fr-FR") }}. Elle n'accepte plus
      d'enchères.
    </p>

    <form v-else class="formulaire" novalidate @submit.prevent="soumettre">
      <div class="champ">
        <label for="pseudo">Votre pseudo</label>
        <input
          id="pseudo"
          v-model="pseudo"
          name="pseudo"
          autocomplete="nickname"
          :aria-invalid="Boolean(erreurDuChamp('pseudo'))"
          :aria-describedby="erreurDuChamp('pseudo') ? 'erreur-pseudo' : undefined"
        />
        <p v-if="erreurDuChamp('pseudo')" id="erreur-pseudo" class="erreur-champ">
          {{ erreurDuChamp("pseudo") }}
        </p>
      </div>

      <div class="champ">
        <label for="montant">Montant en euros</label>
        <input
          id="montant"
          v-model="montant"
          name="montant"
          type="number"
          inputmode="numeric"
          :min="annonce.montantMinimum"
          :step="annonce.pasEnchere"
          :aria-invalid="Boolean(erreurDuChamp('montant'))"
          :aria-describedby="erreurDuChamp('montant') ? 'erreur-montant' : 'aide-montant'"
        />
        <p v-if="erreurDuChamp('montant')" id="erreur-montant" class="erreur-champ">
          {{ erreurDuChamp("montant") }}
        </p>
        <p v-else id="aide-montant" class="aide petit">
          Minimum {{ formaterMontant(annonce.montantMinimum) }} — pas de
          {{ formaterMontant(annonce.pasEnchere) }}.
        </p>
      </div>

      <button type="submit" class="bouton" :disabled="envoiEnCours">
        {{ envoiEnCours ? "Envoi…" : "Enchérir" }}
      </button>
    </form>

    <!-- `role="alert"` : le message est annoncé aux lecteurs d'écran dès qu'il
         apparaît, sans avoir à déplacer le focus. -->
    <div v-if="erreur" class="alerte" role="alert">
      <p>{{ erreur.message }}</p>
      <button
        v-if="erreur.corps.montantMinimum"
        type="button"
        class="lien-action donnee"
        @click="utiliserMontantMinimum"
      >
        Utiliser {{ formaterMontant(erreur.corps.montantMinimum) }}
      </button>
    </div>

    <p v-if="confirmation" class="confirmation" role="status">{{ confirmation }}</p>
  </section>
</template>

<style scoped>
.bordereau {
  display: flex;
  flex-direction: column;
  gap: var(--e4);
  padding: var(--e5);
  border: 1px solid var(--trait-appuye);
  border-radius: var(--rayon);
  background: var(--papier-releve);
}

.formulaire {
  display: flex;
  flex-direction: column;
  gap: var(--e4);
}

.petit {
  font-size: var(--txt-xs);
}

.erreur-champ {
  font-size: var(--txt-xs);
  color: var(--alerte-texte);
}

.lien-action {
  margin-block-start: var(--e2);
  padding: 0;
  border: none;
  background: none;
  font-size: var(--txt-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 3px;
  color: inherit;
  cursor: pointer;
}

.confirmation {
  padding: var(--e3) var(--e4);
  border-left: 3px solid var(--accent);
  background: var(--accent-voile);
  color: var(--accent);
  font-size: var(--txt-sm);
}
</style>
