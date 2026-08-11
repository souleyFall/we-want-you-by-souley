<script setup lang="ts">
/*
 * Coquille de l'application : en-tête, zone de contenu, pied de page.
 *
 * Le contenu sera remplacé par le routeur à l'étape suivante ; cette version
 * sert à vérifier que le socle Vite + Vue + le système de design tiennent
 * debout avant qu'on y branche des données.
 */
</script>

<template>
  <a class="hors-ecran" href="#contenu">Aller au contenu</a>

  <header class="entete">
    <div class="conteneur entete__interieur">
      <div>
        <p class="surtitre">Service des domaines</p>
        <p class="entete__marque">Enchères publiques</p>
      </div>

      <p class="entete__mention donnee">
        Cession de matériel réformé
      </p>
    </div>
  </header>

  <main id="contenu" class="conteneur zone">
    <p class="surtitre">Registre des lots</p>
    <p class="aide">Socle en place. Le registre est branché à l'étape suivante.</p>
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

.entete__marque {
  font-family: var(--police-titre);
  font-size: var(--txt-2xl);
  line-height: 1.1;
}

.entete__mention {
  font-size: var(--txt-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--encre-tenue);
}

.zone {
  padding-block: var(--e7) var(--e8);
  display: flex;
  flex-direction: column;
  gap: var(--e3);
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
