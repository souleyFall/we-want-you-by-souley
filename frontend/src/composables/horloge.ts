import { onUnmounted, readonly, ref } from "vue";

/*
 * Horloge partagée par toute l'application.
 *
 * Le point important : il n'y a **qu'un seul `setInterval`**, quel que soit le
 * nombre de composants qui affichent un compte à rebours. Une minuterie par
 * ligne de registre, ce serait cinq minuteries qui dérivent les unes par
 * rapport aux autres et qui continuent de tourner après le démontage.
 *
 * Le comptage d'abonnés démarre la minuterie au premier composant qui en a
 * besoin et l'arrête quand le dernier disparaît : rien ne tourne dans le vide.
 */

const maintenant = ref(Date.now());

let abonnes = 0;
let minuterie: ReturnType<typeof setInterval> | undefined;

export function useHorloge() {
  abonnes += 1;

  if (abonnes === 1) {
    maintenant.value = Date.now();
    minuterie = setInterval(() => {
      maintenant.value = Date.now();
    }, 1000);
  }

  onUnmounted(() => {
    abonnes -= 1;

    if (abonnes === 0 && minuterie !== undefined) {
      clearInterval(minuterie);
      minuterie = undefined;
    }
  });

  // En lecture seule : un composant affiche l'heure, il ne la remonte pas.
  return readonly(maintenant);
}
