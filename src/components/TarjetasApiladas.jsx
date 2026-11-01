import React from "react";
import { CardVisual } from "./Tarjetas.jsx";
import PilaApilada from "./PilaApilada.jsx";

// Envoltorio de PilaApilada específico para tarjetas de crédito — mantiene
// esta API simple para los lugares que ya la usan (Tarjetas.jsx, QuickGasto).
export default function TarjetasApiladas({ tarjetas, onChangeFrente, onTapFrente }) {
  return (
    <PilaApilada
      items={tarjetas}
      renderItem={(t) => <CardVisual tarjeta={t} />}
      onChangeFrente={onChangeFrente}
      onTapFrente={onTapFrente}
      mensajeVacio="No hay tarjetas activas."
    />
  );
}
