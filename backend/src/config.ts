/**
 * Configuration lue depuis l'environnement, avec des valeurs par défaut
 * qui permettent de lancer le projet sans créer de fichier .env.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),

  /** Origine autorisée par CORS : le serveur de dev de Vite. */
  origineFrontend: process.env.ORIGINE_FRONTEND ?? "http://localhost:5173",
};
