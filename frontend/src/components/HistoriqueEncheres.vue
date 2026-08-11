<script setup lang="ts">
import type { Enchere } from "../types/api";
import { formaterDateCourte, formaterMontant } from "../utils/format";

/*
 * Historique en tableau plutôt qu'en liste : ce sont des colonnes de chiffres
 * à comparer, un tableau est la structure honnête pour ça — et c'est aussi ce
 * qu'un lecteur d'écran annoncera correctement.
 *
 * L'API renvoie déjà l'historique trié du plus récent au plus ancien : le
 * composant ne retrie rien, il affiche.
 */

defineProps<{
  encheres: Enchere[];
  montantMinimum: number;
}>();
</script>

<template>
  <section class="historique">
    <h2 class="surtitre">Historique des enchères</h2>

    <p v-if="encheres.length === 0" class="aide">
      Aucune enchère pour ce lot. Les offres sont ouvertes à partir de
      {{ formaterMontant(montantMinimum) }}.
    </p>

    <div v-else class="historique__cadre">
      <table class="historique__table">
        <caption class="hors-ecran">
          Enchères du lot, de la plus récente à la plus ancienne
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Enchérisseur</th>
            <th scope="col" class="alignement-droit">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(enchere, rang) in encheres" :key="`${enchere.date}-${enchere.pseudo}`">
            <td class="donnee cellule-discrete">{{ formaterDateCourte(enchere.date) }}</td>
            <td class="donnee">
              {{ enchere.pseudo }}
              <span v-if="rang === 0" class="marque-tete">en tête</span>
            </td>
            <td class="donnee alignement-droit" :class="{ 'cellule-tete': rang === 0 }">
              {{ formaterMontant(enchere.montant) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.historique {
  display: flex;
  flex-direction: column;
  gap: var(--e3);
}

/* Les tableaux larges défilent dans leur propre cadre : le corps de page ne
   doit jamais partir en défilement horizontal. */
.historique__cadre {
  overflow-x: auto;
}

.historique__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--txt-sm);
}

.historique__table th {
  padding: var(--e2) var(--e3);
  border-block-end: 1px solid var(--trait-appuye);
  font-family: var(--police-donnees);
  font-size: var(--txt-xs);
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: start;
  color: var(--encre-tenue);
  white-space: nowrap;
}

.historique__table td {
  padding: var(--e3);
  border-block-end: 1px solid var(--trait);
  font-variant-numeric: tabular-nums;
}

.historique__table tbody tr:last-child td {
  border-block-end: none;
}

.alignement-droit {
  text-align: end;
}

.cellule-discrete {
  color: var(--encre-douce);
  white-space: nowrap;
}

.cellule-tete {
  font-weight: 600;
}

.marque-tete {
  margin-inline-start: var(--e2);
  font-size: var(--txt-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}
</style>
