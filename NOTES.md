# Notes du candidat

## Stack choisie

- [ ] Option A : C# / .NET + React
- [x] **Option B : Node.js + Vue 3**

Backend en **Express 5 + TypeScript**, exécuté par `tsx` (pas d'étape de build en dev), validation avec **Zod**, tests avec **Vitest** et **Supertest**. Frontend en **Vue 3** (Composition API, `<script setup>`) + **Vite**, sans bibliothèque d'état ni de composants.

J'ai choisi l'option B parce que le sujet dit que les règles métier sont le cœur du test, et qu'elles allaient donc atterrir dans le backend. Autant être à l'aise là où ça compte. Vue 3, je l'avais moins pratiqué que React, mais sur deux écrans le coût d'entrée est faible.

Les données sont chargées depuis `data/annonces.json` **en mémoire** au démarrage. Pas de base : le sujet l'autorise, et ça évite de passer une heure sur du Docker pour un prototype. Conséquence assumée : **les enchères placées disparaissent au redémarrage du serveur.**

## Lancer le projet

Deux terminaux. Le backend d'abord, sinon le front n'a personne à qui parler.

```bash
# Terminal 1 — API sur http://localhost:3000
cd backend
npm install
npm run dev

# Terminal 2 — interface sur http://localhost:5173
cd frontend
npm install
npm run dev

# Tests (25 tests, dans backend/)
cd backend
npm test
```

Autres scripts utiles : `npm run typecheck` des deux côtés, et `npm run build` côté frontend (il lance `vue-tsc` avant le bundle, donc une erreur de type casse la compilation).

Testé sur Node 24. Rien à configurer, aucun fichier `.env` nécessaire — les valeurs par défaut (ports 3000 et 5173) sont dans `backend/src/config.ts` et `frontend/src/api/client.ts`.

## Comment c'est organisé

Le backend suit trois couches, avec une dépendance à sens unique :

```
routes/       →  traduit HTTP ↔ métier. Aucune règle, aucun try/catch.
services/     →  toutes les règles. Ne connaît ni Express, ni req, ni res, ni les codes HTTP.
repository/   →  détient les données. Ne connaît aucune règle.
```

C'est la décision qui structure tout le reste, et elle a un bénéfice très concret : **les dix tests unitaires des règles métier appellent `placerEnchere()` comme une fonction ordinaire**, sans démarrer de serveur ni simuler une requête. Écrire ces tests a pris dix minutes.

Deux détails du même ordre :

- `app.ts` construit l'application Express, `index.ts` est le seul à appeler `listen()`. Supertest reçoit donc l'app sans qu'aucun port ne s'ouvre pendant les tests.
- L'erreur métier ne porte **aucun code HTTP**. Elle porte un code métier (`MONTANT_TROP_BAS`), et la table de correspondance vers les statuts vit dans le middleware d'erreurs, seul endroit du projet qui a le droit de connaître HTTP. Exposer les mêmes règles en GraphQL ou derrière une file de messages ne demanderait pas de toucher au métier.

## Les décisions que j'ai dû prendre

### Le statut est calculé, jamais stocké

Ça a l'air d'un détail, c'est en fait le premier piège du sujet. J'ai commencé par vouloir stocker `statut` pour éviter de le recalculer — puis j'ai réalisé que **personne ne viendrait le mettre à jour** au moment où la date de fin est franchie. Pas de tâche planifiée, pas de cron. L'annonce serait restée « en cours » pour toujours et l'API aurait accepté des enchères sur une vente close.

La règle que j'en retire : une donnée dérivée ne se stocke que si on maîtrise tous les événements qui la font changer. L'écoulement du temps n'en est pas un. Et le coût réel du calcul, c'est une comparaison de dates.

### La meilleure enchère aussi, mais pour une autre raison

Là, le raisonnement précédent ne s'applique pas : la meilleure enchère ne bouge que sur un `POST`, un événement que je contrôle entièrement. La stocker serait donc légitime.

Je la calcule quand même, pour garder **une seule source de vérité** — le tableau `encheres`. Avec deux représentations de la même information, on finit toujours par en oublier une le jour où on ajoute une fonctionnalité. Et ça rend la fonction pure, donc testable en une ligne.

C'est un choix de prototype et je l'assume comme tel : à l'échelle, je ferais l'inverse (voir la question 2 plus bas).

### Le montant minimum de la première enchère

Le sujet est ambigu : il dit à la fois « inférieur ou égal au prix de départ » et « n'augmente pas d'au moins le pas d'enchère ». Pour une annonce sans aucune enchère, faut-il accepter le prix de départ, ou exiger prix de départ + un pas ?

Les données tranchent implicitement. Sur l'annonce `…0001`, le prix de départ est 3 500, le pas 100, et la première enchère du jeu de données est à **3 600** — soit exactement `prixDepart + pas`. **J'ai donc retenu `prixDepart + pasEnchere`.** Si c'est l'inverse qui était attendu, c'est une ligne à changer, dans `montantMinimum()`.

Bénéfice de ce choix : la formule est la même avec ou sans enchère (`meilleureEnchere + pasEnchere`, où `meilleureEnchere` retombe sur le prix de départ), donc pas de cas particulier dans le code.

Autre point que les données m'ont appris : la deuxième enchère de cette même annonce passe de 3 600 à 3 800, soit deux pas d'un coup. Le pas est donc un **minimum**, pas un multiple.

### Les codes HTTP

J'ai hésité, et j'ai failli mettre des `403`. C'est une erreur : `403` veut dire « je sais qui tu es et tu n'as pas le droit », or **il n'y a aucune authentification dans ce projet** — le pseudo est une chaîne libre dans le corps de la requête. Sans notion d'identité, un 403 n'est pas justifiable.

La règle que j'ai finalement appliquée :

> **400** quand la requête est mal formée et n'atteint même pas les règles métier.
> **404** quand la ressource n'existe pas.
> **409** quand c'est l'**état** de l'annonce qui bloque — elle est close, aucun montant ne passerait.
> **422** quand c'est la **valeur** envoyée qui viole une règle — la requête est bien formée, une autre valeur serait acceptée.

| Condition | HTTP | Code métier |
|---|---|---|
| L'annonce n'existe pas | `404` | `ANNONCE_INTROUVABLE` |
| Date de fin dépassée | `409` | `ANNONCE_TERMINEE` |
| Montant ≤ meilleure enchère | `422` | `MONTANT_TROP_BAS` |
| Montant < meilleure + pas | `422` | `PAS_ENCHERE_NON_RESPECTE` |
| Pseudo vide, montant invalide | `400` | `PAYLOAD_INVALIDE` |

Une alternative défendable : mettre `409` sur « montant ≤ meilleure enchère », puisque cette valeur dépend de ce que les autres ont fait entre-temps. J'ai préféré `422` pour que le client distingue nettement « la vente est fermée » de « ton montant est trop bas ». C'est discutable, et je suis preneur de l'avis inverse.

Les cas 3 et 4 partagent la même borne de calcul, mais je les sépare volontairement pour renvoyer un message actionnable plutôt qu'un refus générique.

### Le format d'erreur, et ce que ça a rapporté

Toutes les erreurs sortent par un middleware unique, avec la même enveloppe :

```json
{
  "erreur": {
    "code": "PAS_ENCHERE_NON_RESPECTE",
    "message": "Le pas d'enchère est de 100 €, enchérissez au moins 3900 €.",
    "pasEnchere": 100,
    "montantMinimum": 3900
  }
}
```

Le `code` est stable et lisible par la machine : le frontend s'appuie dessus, jamais sur le texte. Et j'ai ajouté `montantMinimum` dans les détails presque par réflexe — ça s'est révélé être le meilleur investissement du projet. Côté interface, ça donne un bouton « Utiliser 3 900 € » sous le message d'erreur, au lieu d'un refus sec où l'utilisateur doit deviner. Trois lignes de code, et le formulaire passe de correct à utilisable.

### Zod, et où passe la frontière

Zod valide **la forme** du corps de requête : pseudo non vide (après `trim`), montant numérique et strictement positif. Les types TypeScript sont déduits des schémas par `z.infer`, donc il n'y a qu'une source de vérité entre validation à l'exécution et typage statique.

Tout ce qui demande de **connaître l'annonce** — est-elle close, le montant dépasse-t-il l'enchère actuelle — reste dans le service. Un schéma n'a pas accès à cet état.

J'ai mis le schéma dans le service et non dans la route, contrairement à ce que j'avais prévu au départ. Comme ça, les cinq règles de refus sont au même endroit et testables sans HTTP — sinon le cas « pseudo vide » n'aurait été vérifiable qu'en test d'intégration.

Un choix à signaler : `{"montant": "1250"}` est **refusé**. J'ai préféré ne pas mettre `z.coerce.number()`, qui avale silencieusement des saisies douteuses ; c'est au formulaire de convertir, et il le fait explicitement.

Le fichier `annonces.json` est lui aussi validé par Zod au chargement. Si les données changent de forme, on a une erreur explicite au démarrage plutôt qu'un `undefined` incompréhensible trois couches plus loin.

### Côté interface

L'interface se lit comme un **registre administratif** plutôt que comme une application grand public : des lignes séparées par des filets, pas de cartes flottantes, angles droits. Ça colle au sujet — une collectivité qui liquide du matériel réformé — et ça évite le look générique. Trois familles de polices système pour trois rôles : un serif pour les noms de lots, un sans pour la prose, un monospace pour **toute donnée chiffrée**, ce qui n'est pas décoratif : c'est lui qui porte `tabular-nums` et aligne les montants en colonne. Aucun webfont, donc rien à télécharger et aucun repli silencieux.

Thèmes clair et sombre gérés uniquement au niveau des variables CSS : aucun composant n'est restylé dans une media query.

Deux décisions plus structurelles :

**Aucune règle métier n'est dupliquée côté client.** Le formulaire n'écrit nulle part « le montant doit dépasser X » : il envoie, et affiche ce que l'API répond. Les attributs `min` et `step` sont une aide à la saisie, pas une validation. Deux vérités finissent toujours par diverger.

**Le `POST` renvoie l'annonce à jour**, donc l'écran se rafraîchit sans second appel. Un aller-retour économisé, et surtout aucune fenêtre pendant laquelle l'affichage serait périmé.

### Bonus traités

- **Filtre et tri** du registre (statut, montant, clôture, désignation). Le tri par clôture repousse les ventes closes en fin de liste : leur date de fin étant passée, un tri chronologique brut les remonterait en tête.
- **Compte à rebours** avant clôture, avec une horloge partagée : **un seul `setInterval` pour toute l'application**, quel que soit le nombre de comptes à rebours affichés. Sous sept jours l'échéance est décomptée à la seconde et passe en couleur d'alerte à moins de 24 h ; au-delà, un ordre de grandeur suffit (« clôture dans 4 mois »). Avec les données fournies, dont les échéances sont en 2099, tout affiche donc l'ordre de grandeur — pour voir le décompte à la seconde, il faut rapprocher une `dateFin` dans `data/annonces.json`.
- **Rafraîchissement automatique** de la meilleure enchère : toutes les 15 s sur la fiche, 20 s sur le registre. Il s'arrête au démontage, se met en pause quand l'onglet passe en arrière-plan, rattrape immédiatement au retour, et cesse sur une vente close. Les échecs sont silencieux par conception : un rafraîchissement d'arrière-plan qui rate ne doit ni vider l'écran ni afficher une erreur que l'utilisateur n'a pas provoquée.

## Difficultés rencontrées

**`vue-tsc` refuse de démarrer avec TypeScript 7.** La réécriture native du compilateur ne fournit plus le sous-chemin `./lib/tsc` qu'attend `vue-tsc`, d'où un `ERR_PACKAGE_PATH_NOT_EXPORTED` au premier `npm run build`. J'ai rétrogradé TypeScript en `^5.9` **sur le frontend uniquement** : les deux `package.json` sont indépendants, donc le backend garde la 7. C'est pour ça qu'il y a deux versions dans le dépôt.

**Le rafraîchissement automatique a introduit un bug que je n'avais pas vu venir.** Le formulaire repositionnait le montant sur le nouveau minimum à chaque changement — pratique après sa propre enchère, catastrophique quand c'est quelqu'un d'autre qui enchérit : la saisie en cours était écrasée sans explication. Le genre de bug qu'on ne reproduit jamais en démonstration et que les utilisateurs subissent tous les jours.

La correction distingue deux cas : si le champ est encore à sa valeur proposée, on le repositionne en silence ; si l'utilisateur a saisi quelque chose, **on n'y touche pas** et on l'avertit qu'une surenchère est arrivée, avec un bouton pour reprendre le nouveau montant s'il le souhaite. Signalé, jamais imposé.

**`sort` modifie le tableau sur place**, et je me suis fait avoir deux fois : une fois côté serveur en triant l'historique renvoyé (ce qui aurait réordonné les données détenues par le repository à chaque lecture), une fois côté client en triant le registre. Les deux corrigés par une copie, `[...tableau].sort(...)`.

**Une fausse alerte en testant le sondage.** Il ne se déclenchait pas. J'ai cherché un moment avant de comprendre que `document.hidden` valait `true` — l'onglet n'était pas au premier plan, donc le sondage s'était mis en pause tout seul. C'était la fonctionnalité qui marchait, pas un bug.

## Ce que je n'ai pas fait, et comment je m'y serais pris

**Aucun test côté frontend.** C'est le manque le plus évident. J'aurais commencé par `FormulaireEnchere` avec Vitest et `@vue/test-utils`, en simulant le client API : un test par code d'erreur pour vérifier l'affichage, et surtout un test sur la protection de la saisie en cours pendant une surenchère — c'est le comportement le plus subtil du composant. Ensuite `calculerTempsRestant`, qui est une fonction pure et se teste sans monter quoi que ce soit (je l'ai vérifiée à la main sur toute la plage de durées, mais ce n'est pas commité).

**Le filtre et le tri ne sont pas dans l'URL.** On ne peut pas partager un lien vers « les lots en cours, triés par montant ». Ça se règle en synchronisant les deux `ref` avec la query string du routeur, une quinzaine de lignes.

**Les montants sont des flottants.** Pour de l'argent c'est une mauvaise idée dès qu'on quitte les entiers ; en production je stockerais des centimes en entier et je ne formaterais qu'à l'affichage.

**Pas de bascule de thème manuelle.** Les variables `:root[data-theme]` sont déjà en place et prennent le pas sur la préférence système dans les deux sens ; il ne manque que le bouton et un `localStorage`.

**Les types de l'API sont dupliqués entre le backend et le frontend.** Sur un vrai projet j'extrairais un paquet partagé dans un monorepo. Ici l'énoncé demande deux dossiers indépendants, et la plomberie aurait coûté plus qu'elle n'aurait rapporté sur cinq heures.

**Pas de pagination, pas d'authentification, pas de limitation de débit sur le `POST`.** Hors périmètre d'un prototype, mais ce sont les trois premières choses que j'ajouterais avant de mettre ça devant de vrais utilisateurs.

## Réponses aux questions ouvertes

### 1. Deux utilisateurs qui enchérissent exactement en même temps

**Dans mon implémentation actuelle, ça se passe bien — mais par chance de conception, pas par mérite.**

`placerEnchere` est synchrone de bout en bout : entre le moment où je lis la meilleure enchère et celui où j'écris la nouvelle, il n'y a **aucun `await`**. La boucle d'événements de Node ne peut donc pas passer la main à une autre requête au milieu de la vérification. Les deux enchères sont traitées l'une après l'autre, et la seconde voit bien le montant de la première.

Cette garantie disparaît dès qu'on touche à deux choses, et les deux arrivent forcément en production :

- **une vraie base de données**, donc un `await` entre la lecture et l'écriture — la fenêtre s'ouvre ;
- **plusieurs processus** (cluster Node, plusieurs conteneurs derrière un load balancer) — même sans `await`, deux processus lisent en parallèle.

On retombe alors sur une *race condition* classique de type lecture-puis-écriture non atomique, et sur une *lost update* : les deux requêtes lisent 3 800 €, les deux jugent 3 900 € valide, les deux écrivent. Résultat : deux enchères au même montant, ou l'une qui écrase l'autre.

**En production, avec une vraie base**, trois approches, par ordre croissant d'élégance :

1. **Verrouillage pessimiste** — `SELECT … FOR UPDATE` sur la ligne de l'annonce, dans une transaction. Simple à raisonner, mais il sérialise tout le monde sur le lot le plus demandé : c'est-à-dire exactement là où ça fait mal.
2. **Verrouillage optimiste** — une colonne `version` sur l'annonce, et un `UPDATE … WHERE id = ? AND version = ?`. Si zéro ligne est affectée, quelqu'un est passé avant : on renvoie un 409 et le client rejoue. Aucun verrou tenu, mais il faut gérer le rejeu.
3. **Insertion atomique conditionnelle** — une seule requête qui insère l'enchère *seulement si* le montant respecte encore la règle, du type `INSERT INTO encheres (…) SELECT … WHERE :montant >= (SELECT COALESCE(MAX(montant), prix_depart) + pas FROM …)`. La base arbitre elle-même, il n'y a plus de fenêtre du tout. Avec une contrainte d'unicité ou de check en filet de sécurité.

**Ce que je choisirais ici :** l'option 3, avec l'option 2 en repli si la logique devient trop lourde pour une seule requête. La raison est propre au métier : les enchères sur un même lot sont rares… **sauf dans les dernières secondes**, où elles arrivent en rafale. Un verrou pessimiste transformerait précisément ce pic en file d'attente, au pire moment. Un rejet propre en 409 accompagné du nouveau montant minimum est bien plus honnête.

Et le client est déjà prêt à le recevoir : le formulaire sait afficher « quelqu'un vient d'enchérir, le minimum est passé à X € » sans écraser la saisie en cours. C'est exactement le même problème, vu depuis l'interface.

### 2. Des milliers d'annonces et d'utilisateurs

Par ordre de priorité, parce que tout n'a pas la même urgence.

**1. Sortir l'état du processus.** C'est le préalable à tout le reste : aujourd'hui les données vivent en mémoire, donc deux instances derrière un load balancer, ce sont deux vérités différentes. Rien ne peut monter en charge tant que ce n'est pas réglé. PostgreSQL, deux tables `annonces` et `encheres`. Le repository est le seul fichier à réécrire — ni les services ni les routes n'en sauront rien.

**2. Les index, choisis d'après les requêtes réelles.** Un index sur `encheres(annonce_id, montant DESC)` pour retrouver la meilleure enchère et paginer l'historique. Un index sur `annonces(date_fin)`, parce que le statut restant calculé, filtrer « en cours » revient à un `WHERE date_fin > now()` — sans index, c'est un scan complet à chaque affichage du registre.

**3. Dénormaliser la meilleure enchère.** Je la recalcule aujourd'hui à chaque lecture ; c'est parfait sur des historiques de deux lignes, intenable sur dix mille. Une colonne `meilleure_enchere` sur `annonces`, mise à jour **dans la même transaction** que l'insertion de l'enchère — c'est la transaction qui rend la dénormalisation sûre. C'est le choix inverse de celui que j'ai fait ici, et c'est assumé : le bon arbitrage n'est pas le même à cinq annonces et à cinquante mille.

**4. Paginer `GET /api/annonces`.** L'endpoint renvoie tout aujourd'hui. À 50 000 annonces, c'est une réponse de plusieurs mégaoctets. Pagination **par curseur** plutôt que par `OFFSET` : l'offset se dégrade en fin de liste et devient incohérent dès que des annonces s'insèrent pendant la navigation.

**5. Cacher, mais pas n'importe quoi.** Les fiches de ventes closes ne changent plus jamais : cache long, sans risque. La meilleure enchère d'un lot ouvert, elle, ne doit surtout pas être cachée plus de quelques secondes. Donc un TTL différencié selon le statut, jamais un cache global — c'est le genre d'optimisation qui, mal posée, affiche à un utilisateur un montant périmé au moment où il enchérit.

**6. Remplacer le sondage par du temps réel.** Mon rafraîchissement toutes les 15 s ne tient pas : 10 000 spectateurs sur un lot chaud, ça fait 666 requêtes par seconde pour des données le plus souvent inchangées. Je passerais en **SSE** — unidirectionnel, ce qui suffit ici, et qui traverse les proxies HTTP sans configuration particulière. Ça implique un bus de messages (Redis pub/sub) pour que l'instance qui reçoit l'enchère puisse prévenir les clients connectés aux autres instances.

**7. Enfin, ce qui n'est pas de la performance mais qui devient vital à cette échelle :** une limitation de débit sur le `POST` d'enchère, de l'observabilité (au minimum le taux de refus par code métier — une explosion de `MONTANT_TROP_BAS` signalerait un problème d'interface bien avant que les utilisateurs ne se plaignent), et une vraie authentification, qui n'existe pas du tout aujourd'hui.
