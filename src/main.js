// src/main.js
import { createViewer } from "./viewer.js";

const cfg = window.APP_CONFIG || {};

async function boot() {
  try {
    const viewer = await createViewer("cesium", cfg.ionToken);
    window.__viewer = viewer; // for manual poking during dev
    document.getElementById("searchBar").hidden = false;
  } catch (err) {
    if (err.message === "missing-ion-token") {
      document.getElementById("tokenError").hidden = false;
      document.getElementById("searchBar").hidden = true;
      document.getElementById("controls").hidden = true;
    } else {
      console.error(err);
    }
  }
}
boot();
