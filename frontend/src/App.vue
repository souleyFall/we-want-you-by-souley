<script setup lang="ts">
/*
 * Coquille de l'application : en-tête, zone de contenu confiée au routeur,
 * pied de page. Aucun état, aucun appel réseau — chaque page gère le sien.
 */
</script>

<template>
  <a class="hors-ecran" href="#contenu">Aller au contenu</a>

  <header class="entete">
    <div class="conteneur entete__interieur">
      <RouterLink class="entete__identite" to="/">
        <span class="surtitre">Service des domaines</span>
        <span class="entete__marque">Enchères publiques</span>
      </RouterLink>

      <p class="entete__mention donnee">Cession de matériel réformé</p>
    </div>
  </header>

  <main id="contenu" class="conteneur zone">
    <RouterView />
  </main>

  <footer class="pied">
    <div class="conteneur pied__interieur">
      <p class="donnee">Prototype — données de démonstration</p>
      <p class="donnee">Aucune vente réelle n'est engagée</p>
    </div>
  </footer>
</template>

<style scoped>
/* Filet double sous l'en-tête : un trait épais doublé d'un trait fin, le
   marquage classique des documents administratifs imprimés. */
.entete {
  position: relative;
  border-bottom: 2px solid var(--encre);
  background: var(--papier-releve);
}

.entete::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: -5px;
  height: 1px;
  background: var(--trait);
}

.entete__interieur {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--e3);
  padding-block: var(--e5) var(--e4);
}

.entete__identite {
  display: flex;
  flex-direction: column;
  gap: var(--e1);
  text-decoration: none;
}

.entete__marque {
  font-family: var(--police-titre);
  font-size: var(--txt-2xl);
  line-height: 1.1;
}

.entete__identite:hover .entete__marque {
  color: var(--accent);
}

.entete__mention {
  font-size: var(--txt-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--encre-tenue);
}

.zone {
  padding-block: var(--e7) var(--e8);
}

.pied {
  border-top: 1px solid var(--trait);
  padding-block: var(--e4);
}

.pied__interieur {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--e2);
  font-size: var(--txt-xs);
  color: var(--encre-tenue);
}
</style>
