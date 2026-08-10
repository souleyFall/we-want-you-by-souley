import { creerApp } from "./app";
import { config } from "./config";

const app = creerApp();

app.listen(config.port, () => {
  console.log(`API des enchères démarrée sur http://localhost:${config.port}`);
});
