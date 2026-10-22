import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import BloqueoOrientacionVertical from "./components/BloqueoOrientacionVertical.jsx";
import "./styles.css";
import { iniciarBloqueoOrientacion } from "./lib/orientacion";

iniciarBloqueoOrientacion();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BloqueoOrientacionVertical />
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // si falla el registro, la app sigue funcionando normal, solo sin caché offline
      });
  });
}
