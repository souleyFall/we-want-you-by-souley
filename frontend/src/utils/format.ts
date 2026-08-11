/*
 * Mise en forme destinée à l'affichage.
 *
 * Les formateurs `Intl` sont créés une seule fois au chargement du module :
 * les instancier à chaque appel serait coûteux dans une liste, et plus encore
 * dans un compte à rebours qui se recalcule toutes les secondes.
 */

const formateurEuro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formateurDateLongue = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

const formateurDateCourte = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formateurRelatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export function formaterMontant(montant: number): string {
  return formateurEuro.format(montant);
}

export function formaterDateHeure(iso: string): string {
  return formateurDateLongue.format(new Date(iso));
}

export function formaterDateCourte(iso: string): string {
  return formateurDateCourte.format(new Date(iso));
}

/**
 * Référence lisible d'un lot.
 *
 * On n'invente pas un numéro d'ordre : on raccourcit l'identifiant réel, pour
 * que ce qui est affiché à l'écran corresponde à ce qui circule dans l'URL et
 * dans l'API.
 */
export function referenceCourte(id: string): string {
  return id.slice(-4);
}

export function libelleEncheres(nombre: number): string {
  if (nombre === 0) return "Aucune enchère";
  return nombre === 1 ? "1 enchère" : `${nombre} enchères`;
}

/* -------------------------------------------------------------------------- */
/* Temps restant avant clôture                                                */
/* -------------------------------------------------------------------------- */

const SECONDE = 1_000;
const MINUTE = 60 * SECONDE;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;
const MOIS = 30 * JOUR;
const AN = 365.25 * JOUR;

/** En deçà de ce seuil, on décompte à la seconde ; au-delà, un ordre de grandeur suffit. */
const SEUIL_DECOMPTE = 7 * JOUR;

/** En deçà, la clôture est imminente et l'affichage doit le signaler. */
const SEUIL_URGENCE = JOUR;

export interface TempsRestant {
  texte: string;
  /** Vrai quand il reste moins de 24 h : l'interface passe en couleur d'alerte. */
  urgent: boolean;
  terminee: boolean;
}

function deuxChiffres(valeur: number): string {
  return String(valeur).padStart(2, "0");
}

/**
 * Ordre de grandeur pour les échéances lointaines : « dans 3 mois », « dans 2 ans ».
 *
 * `Intl.RelativeTimeFormat` fait l'accord et le pluriel tout seul — le écrire à
 * la main reviendrait à réimplémenter une partie de la locale française.
 */
function ordreDeGrandeur(restant: number): string {
  if (restant >= AN) return formateurRelatif.format(Math.round(restant / AN), "year");
  if (restant >= MOIS) return formateurRelatif.format(Math.round(restant / MOIS), "month");
  return formateurRelatif.format(Math.round(restant / JOUR), "day");
}

/**
 * Temps restant avant la clôture d'une annonce.
 *
 * L'instant courant est un paramètre, comme côté serveur : la fonction reste
 * pure et testable, et c'est le composable `useHorloge` qui fournit le tic.
 */
export function calculerTempsRestant(dateFin: string, maintenant: number): TempsRestant {
  const restant = Date.parse(dateFin) - maintenant;

  if (restant <= 0) {
    return { texte: "Clôturée", urgent: false, terminee: true };
  }

  if (restant > SEUIL_DECOMPTE) {
    return { texte: `Clôture ${ordreDeGrandeur(restant)}`, urgent: false, terminee: false };
  }

  const jours = Math.floor(restant / JOUR);
  const heures = Math.floor((restant % JOUR) / HEURE);
  const minutes = Math.floor((restant % HEURE) / MINUTE);
  const secondes = Math.floor((restant % MINUTE) / SECONDE);

  // Au-delà d'une journée, la seconde n'apporte rien ; en deçà, elle est
  // l'information la plus utile de la page.
  const decompte =
    jours > 0
      ? `${jours} j ${deuxChiffres(heures)} h ${deuxChiffres(minutes)} min`
      : `${deuxChiffres(heures)} h ${deuxChiffres(minutes)} min ${deuxChiffres(secondes)} s`;

  return {
    texte: `Clôture dans ${decompte}`,
    urgent: restant < SEUIL_URGENCE,
    terminee: false,
  };
}
