// Efecto visual: una monedita que "vuela" desde donde tocaste hasta el
// trofeo de puntos en el encabezado, cuando ganas puntos por completar un
// hábito. Es un efecto puramente visual (DOM directo, sin estado de React)
// para que sea liviano y no dependa de en qué componente se dispare.

// Efecto visual: monedas que "vuelan" desde donde se generaron los puntos
// hasta el trofeo de puntos en el encabezado. La cantidad de monedas es
// proporcional a los puntos ganados (con un tope para no saturar la
// pantalla en bonos grandes).
export function lanzarMonedasHaciaTrofeo(origenX, origenY, puntosGanados = 5) {
  const cantidad = Math.min(Math.max(Math.round(puntosGanados / 5), 1), 10);
  for (let i = 0; i < cantidad; i++) {
    setTimeout(() => {
      const jitterX = origenX + (Math.random() - 0.5) * 40;
      const jitterY = origenY + (Math.random() - 0.5) * 20;
      lanzarMonedaHaciaTrofeo(jitterX, jitterY);
    }, i * 70);
  }
}

export function lanzarMonedaHaciaTrofeo(origenX, origenY) {
  const trofeo = document.getElementById("despensa-trofeo-header");
  if (!trofeo) return;

  const rectTrofeo = trofeo.getBoundingClientRect();
  const destinoX = rectTrofeo.left + rectTrofeo.width / 2;
  const destinoY = rectTrofeo.top + rectTrofeo.height / 2;

  const moneda = document.createElement("div");
  moneda.textContent = "🪙";
  moneda.style.position = "fixed";
  moneda.style.left = `${origenX}px`;
  moneda.style.top = `${origenY}px`;
  moneda.style.fontSize = "20px";
  moneda.style.zIndex = "9999";
  moneda.style.pointerEvents = "none";
  moneda.style.transform = "translate(-50%, -50%) scale(1)";
  moneda.style.transition = "transform 0.7s cubic-bezier(0.3, 0, 0.7, 1), opacity 0.7s ease-in";
  moneda.style.willChange = "transform, opacity";
  document.body.appendChild(moneda);

  // Fuerza un reflow antes de cambiar los estilos, para que la transición
  // realmente anime desde el punto de origen.
  // eslint-disable-next-line no-unused-expressions
  moneda.offsetHeight;

  requestAnimationFrame(() => {
    const dx = destinoX - origenX;
    const dy = destinoY - origenY;
    moneda.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - 30}px)) scale(0.35)`;
    moneda.style.opacity = "0.15";
  });

  setTimeout(() => {
    moneda.remove();
    // Pequeño "rebote" en el trofeo cuando la moneda llega.
    trofeo.style.transition = "transform 0.18s ease-out";
    trofeo.style.transform = "scale(1.15)";
    setTimeout(() => {
      trofeo.style.transform = "scale(1)";
    }, 180);
  }, 700);
}
