/*
 * Mise en forme destinée à l'affichage.
 *
 * Les formateurs `Intl` sont créés une seule fois au chargement du module :
 * les instancier à chaque appel serait coûteux dans une liste.
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
