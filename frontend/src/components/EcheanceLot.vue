<script setup lang="ts">
import { computed } from "vue";

import { useHorloge } from "../composables/horloge";
import { calculerTempsRestant, formaterDateHeure } from "../utils/format";

/*
 * Échéance d'un lot : « Clôture dans 04 h 12 min 05 s », « Clôture dans 2 ans »,
 * ou « Clôturée ».
 *
 * Chaque instance s'abonne à `useHorloge`, mais le composable ne crée qu'une
 * seule minuterie pour toute l'application — cinq lignes de registre ne font
 * pas cinq `setInterval`.
 *
 * L'élément rendu est un `<time datetime>` : la date exacte reste lisible par
 * une machine même quand le texte affiché est relatif.
 */

const props = defineProps<{ dateFin: string }>();

const maintenant = useHorloge();

const temps = computed(() => calculerTempsRestant(props.dateFin, maintenant.value));
</script>

<template>
  <time
    class="echeance donnee"
    :class="{ 'echeance--urgent': temps.urgent }"
    :datetime="dateFin"
    :title="`Clôture le ${formaterDateHeure(dateFin)}`"
  >
    {{ temps.texte }}
  </time>
</template>

<style scoped>
.echeance {
  font-size: var(--txt-xs);
  color: var(--encre-tenue);
}

/* Moins de 24 h : l'échéance devient l'information la plus urgente de la ligne. */
.echeance--urgent {
  color: var(--alerte-texte);
  font-weight: 600;
}
</style>
