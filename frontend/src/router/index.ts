import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

import RegistreLots from "../pages/RegistreLots.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "registre",
    component: RegistreLots,
  },
  {
    path: "/lots/:id",
    name: "lot",
    // Chargée à la demande : la page détail n'est pas dans le bundle initial.
    component: () => import("../pages/DetailLot.vue"),
    // `props: true` passe le paramètre d'URL en prop : la page n'a pas besoin
    // de connaître le routeur pour fonctionner.
    props: true,
  },
  // Toute URL inconnue ramène au registre plutôt que d'afficher une page vide.
  {
    path: "/:chemin(.*)*",
    redirect: { name: "registre" },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // Sans ça, on garderait la position de défilement de la page précédente.
  scrollBehavior: () => ({ top: 0 }),
});
