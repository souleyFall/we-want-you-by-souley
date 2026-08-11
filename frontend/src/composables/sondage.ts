import { onMounted, onUnmounted } from "vue";

/*
 * Répétition d'une action à intervalle régulier — ici, aller redemander la
 * meilleure enchère au serveur.
 *
 * Trois choses que le `setInterval` naïf ne fait pas :
 *
 * 1. Il s'arrête au démontage du composant. Sans ça, quitter la page détail
 *    laisserait une requête partir toutes les quinze secondes, indéfiniment.
 * 2. Il se met en pause quand l'onglet passe en arrière-plan. Un onglet oublié
 *    pendant une nuit, c'est 5 760 requêtes pour personne.
 * 3. Il rattrape immédiatement au retour de l'onglet, plutôt que de faire
 *    patienter l'utilisateur jusqu'au prochain tic.
 *
 * Le polling reste un choix par défaut, pas un choix idéal : voir NOTES.md
 * pour ce qu'on ferait à l'échelle (SSE ou WebSocket).
 */
export function useSondage(action: () => unknown, intervalleMs: number) {
  let minuterie: ReturnType<typeof setInterval> | undefined;

  function demarrer(): void {
    if (minuterie !== undefined) return;
    minuterie = setInterval(action, intervalleMs);
  }

  function arreter(): void {
    if (minuterie === undefined) return;
    clearInterval(minuterie);
    minuterie = undefined;
  }

  function surChangementDeVisibilite(): void {
    if (document.hidden) {
      arreter();
      return;
    }

    action();
    demarrer();
  }

  onMounted(() => {
    demarrer();
    document.addEventListener("visibilitychange", surChangementDeVisibilite);
  });

  onUnmounted(() => {
    arreter();
    document.removeEventListener("visibilitychange", surChangementDeVisibilite);
  });

  return { demarrer, arreter };
}
