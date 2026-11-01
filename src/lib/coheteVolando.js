import { reproducirSonidoCoheteDespegue, reproducirSonidoCoheteImpacto } from "./sonidos";

// Animación visual de cohete hacia los puntos generados al pagar una deuda.
// Se ejecuta directamente sobre el DOM sin bloquear React ni depender del estado local.

let ultimoLanzamientoTimestamp = 0;

/**
 * Lanza un cohete desde (origenX, origenY) hacia el elemento de puntos en el encabezado (#despensa-trofeo-header).
 * @param {number} [origenX] - Coordenada X inicial (en px de la ventana)
 * @param {number} [origenY] - Coordenada Y inicial (en px de la ventana)
 * @param {Object} [opciones] - Opciones adicionales
 * @param {number} [opciones.puntos] - Cantidad de puntos generados para mostrar en la burbuja
 * @param {string} [opciones.mensaje] - Mensaje adicional opcional
 * @param {boolean} [opciones.forzar] - Ignorar límite de tiempo entre lanzamientos
 */
export function lanzarCoheteHaciaPuntos(origenX, origenY, opciones = {}) {
  const ahora = Date.now();
  if (!opciones.forzar && ahora - ultimoLanzamientoTimestamp < 600) {
    return;
  }
  ultimoLanzamientoTimestamp = ahora;

  const puntos = Number(opciones.puntos) || 0;
  const trofeo = document.getElementById("despensa-trofeo-header");

  // Notifica al agente de la aplicación para que celebre el hito y esté listo para asesorar
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("agenteCelebrarPagoDeuda", {
          detail: {
            puntos,
            mensaje: opciones.mensaje || "Pago de deuda",
            origenX,
            origenY,
            timestamp: ahora,
          },
        })
      );
      sessionStorage.setItem(
        "ultimoPagoDeudaAgente",
        JSON.stringify({
          puntos,
          mensaje: opciones.mensaje || "Pago de deuda",
          timestamp: ahora,
        })
      );
    } catch (_) {}
  }

  let destinoX = window.innerWidth - 80;
  let destinoY = 30;

  if (trofeo) {
    const rect = trofeo.getBoundingClientRect();
    destinoX = rect.left + rect.width / 2;
    destinoY = rect.top + rect.height / 2;
  }

  // Si no se proporcionaron coordenadas de origen válidas, usamos el centro-inferior de la pantalla
  let startX = Number.isFinite(origenX) ? origenX : window.innerWidth / 2;
  let startY = Number.isFinite(origenY) ? origenY : window.innerHeight * 0.72;

  // Asegura que esté dentro de los límites visibles
  startX = Math.max(30, Math.min(window.innerWidth - 30, startX));
  startY = Math.max(80, Math.min(window.innerHeight - 30, startY));

  // Contenedor principal de la animación
  const contenedor = document.createElement("div");
  contenedor.style.position = "fixed";
  contenedor.style.left = "0";
  contenedor.style.top = "0";
  contenedor.style.width = "100vw";
  contenedor.style.height = "100vh";
  contenedor.style.pointerEvents = "none";
  contenedor.style.zIndex = "999999";
  contenedor.style.overflow = "hidden";
  document.body.appendChild(contenedor);

  // Cálculo del vector y ángulo hacia el destino
  const deltaX = destinoX - startX;
  const deltaY = destinoY - startY;
  // Ángulo de inclinación del cohete (el emoji 🚀 apunta originalmente en ~45deg hacia arriba a la derecha)
  // Calculamos la dirección real y ajustamos la orientación
  const anguloRad = Math.atan2(deltaY, deltaX);
  const anguloDeg = (anguloRad * 180) / Math.PI + 45; // compensar ángulo base de 🚀

  // Elemento del cohete
  const cohete = document.createElement("div");
  cohete.innerHTML = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: rotate(${anguloDeg}deg);">
      <span style="font-size: 32px; filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 20px rgba(239, 68, 68, 0.8));">🚀</span>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 14px; height: 14px; background: radial-gradient(circle, #f59e0b 0%, rgba(239,68,68,0.8) 50%, transparent 100%); border-radius: 50%; filter: blur(2px); animation: coheteFuego 0.15s infinite alternate;"></div>
    </div>
  `;
  cohete.style.position = "absolute";
  cohete.style.left = `${startX}px`;
  cohete.style.top = `${startY}px`;
  cohete.style.transform = "translate(-50%, -50%) scale(0.6)";
  cohete.style.opacity = "0";
  cohete.style.transition = "opacity 0.15s ease-out";
  cohete.style.willChange = "left, top, transform";
  contenedor.appendChild(cohete);

  // Generador de partículas de estela (chispas, fuego, estrellas)
  const generarEstela = (x, y) => {
    const particula = document.createElement("div");
    const simbolos = ["✨", "🔥", "⭐", "💫", "🟡"];
    const simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
    const jitterX = (Math.random() - 0.5) * 16;
    const jitterY = (Math.random() - 0.5) * 16;

    particula.textContent = simbolo;
    particula.style.position = "absolute";
    particula.style.left = `${x + jitterX}px`;
    particula.style.top = `${y + jitterY}px`;
    particula.style.fontSize = `${Math.floor(Math.random() * 10) + 12}px`;
    particula.style.transform = "translate(-50%, -50%) scale(1)";
    particula.style.opacity = "0.9";
    particula.style.transition = "transform 0.5s ease-out, opacity 0.5s ease-out";
    particula.style.pointerEvents = "none";
    contenedor.appendChild(particula);

    requestAnimationFrame(() => {
      particula.style.transform = `translate(calc(-50% + ${(Math.random() - 0.5) * 30}px), calc(-50% + ${Math.random() * 30 + 10}px)) scale(0.2)`;
      particula.style.opacity = "0";
    });

    setTimeout(() => {
      particula.remove();
    }, 550);
  };

  // Trayectoria de vuelo usando animación interpolada
  const duracionTotal = 850; // ms
  const tiempoInicio = performance.now();
  let intervaloEstela = null;

  // Punto de control para una ligera curva hacia arriba (efecto de despegue parabólico)
  const controlX = startX + deltaX * 0.45 - (deltaY > 0 ? 40 : -40);
  const controlY = Math.min(startY, destinoY) - 50;

  // Aparición inicial con pequeña vibración de encendido y sonido de propulsión
  requestAnimationFrame(() => {
    cohete.style.opacity = "1";
    cohete.style.transform = "translate(-50%, -50%) scale(1.15)";
    reproducirSonidoCoheteDespegue(duracionTotal / 1000);
  });

  // Emisión periódica de estela
  intervaloEstela = setInterval(() => {
    const rect = cohete.getBoundingClientRect();
    if (rect.width > 0) {
      generarEstela(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, 45);

  function animar(ahoraT) {
    const transcurrido = ahoraT - tiempoInicio;
    const t = Math.min(transcurrido / duracionTotal, 1);

    // Easing de aceleración (arranca con impulso y acelera hacia el objetivo)
    const progreso = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // Curva cuadrática Bézier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
    const currentX = (1 - progreso) * (1 - progreso) * startX + 2 * (1 - progreso) * progreso * controlX + progreso * progreso * destinoX;
    const currentY = (1 - progreso) * (1 - progreso) * startY + 2 * (1 - progreso) * progreso * controlY + progreso * progreso * destinoY;

    // Escala del cohete según se acerca al objetivo
    const escala = 1.15 - progreso * 0.25;

    cohete.style.left = `${currentX}px`;
    cohete.style.top = `${currentY}px`;
    cohete.style.transform = `translate(-50%, -50%) scale(${escala})`;

    if (t < 1) {
      requestAnimationFrame(animar);
    } else {
      // Llegada al destino
      clearInterval(intervaloEstela);
      cohete.remove();
      impactoEnTrofeo(destinoX, destinoY, trofeo, puntos, contenedor);
    }
  }

  requestAnimationFrame(animar);
}

/**
 * Efecto de impacto cuando el cohete llega al trofeo de puntos
 */
function impactoEnTrofeo(destinoX, destinoY, trofeo, puntos, contenedor) {
  // Sonido de explosión suave y fanfarria triunfal de puntos al impactar
  reproducirSonidoCoheteImpacto();

  // 1. Explosión de chispas y estrellas alrededor del trofeo
  const cantidadChispas = 14;
  for (let i = 0; i < cantidadChispas; i++) {
    const chispa = document.createElement("div");
    const iconos = ["✨", "🌟", "🪙", "⚡", "💥"];
    chispa.textContent = iconos[i % iconos.length];
    chispa.style.position = "absolute";
    chispa.style.left = `${destinoX}px`;
    chispa.style.top = `${destinoY}px`;
    chispa.style.fontSize = `${Math.floor(Math.random() * 8) + 14}px`;
    chispa.style.transform = "translate(-50%, -50%) scale(1.2)";
    chispa.style.opacity = "1";
    chispa.style.transition = "transform 0.65s cubic-bezier(0.15, 0.9, 0.35, 1), opacity 0.65s ease-out";
    chispa.style.pointerEvents = "none";
    contenedor.appendChild(chispa);

    const rad = (i / cantidadChispas) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
    const distancia = Math.random() * 45 + 35;
    const fX = Math.cos(rad) * distancia;
    const fY = Math.sin(rad) * distancia;

    requestAnimationFrame(() => {
      chispa.style.transform = `translate(calc(-50% + ${fX}px), calc(-50% + ${fY}px)) scale(0.3)`;
      chispa.style.opacity = "0";
    });

    setTimeout(() => {
      chispa.remove();
    }, 700);
  }

  // 2. Destello y rebote en el botón de trofeo
  if (trofeo) {
    const estiloOriginalTransition = trofeo.style.transition;
    const estiloOriginalTransform = trofeo.style.transform;
    const estiloOriginalShadow = trofeo.style.boxShadow;

    trofeo.style.transition = "transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.22s ease-out";
    trofeo.style.transform = "scale(1.28)";
    trofeo.style.boxShadow = "0 0 20px rgba(245, 158, 11, 0.9), 0 0 35px rgba(251, 191, 36, 0.6)";

    setTimeout(() => {
      trofeo.style.transform = "scale(1.08)";
      setTimeout(() => {
        trofeo.style.transform = estiloOriginalTransform || "scale(1)";
        trofeo.style.boxShadow = estiloOriginalShadow || "";
        trofeo.style.transition = estiloOriginalTransition || "";
      }, 180);
    }, 220);
  }

  // 3. Etiqueta flotante "+X pts" cerca del trofeo
  const etiquetaPuntos = document.createElement("div");
  const textoPuntos = puntos > 0 ? `+${puntos} pts` : `¡Deuda pagada! 🚀`;
  etiquetaPuntos.innerHTML = `
    <span style="display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-weight: 800; font-size: 13px; font-family: ui-monospace, monospace; padding: 4px 10px; border-radius: 999px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5), 0 0 10px rgba(255, 255, 255, 0.4); border: 1px solid rgba(255, 255, 255, 0.5); text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
      🚀 ${textoPuntos}
    </span>
  `;
  etiquetaPuntos.style.position = "absolute";
  etiquetaPuntos.style.left = `${destinoX}px`;
  etiquetaPuntos.style.top = `${destinoY + 18}px`;
  etiquetaPuntos.style.transform = "translate(-50%, 0) scale(0.6)";
  etiquetaPuntos.style.opacity = "0";
  etiquetaPuntos.style.transition = "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease-out";
  etiquetaPuntos.style.pointerEvents = "none";
  contenedor.appendChild(etiquetaPuntos);

  requestAnimationFrame(() => {
    etiquetaPuntos.style.transform = "translate(-50%, 14px) scale(1)";
    etiquetaPuntos.style.opacity = "1";
  });

  setTimeout(() => {
    etiquetaPuntos.style.transition = "transform 0.6s ease-in, opacity 0.6s ease-in";
    etiquetaPuntos.style.transform = "translate(-50%, 34px) scale(0.85)";
    etiquetaPuntos.style.opacity = "0";
  }, 1300);

  // Limpieza total del contenedor al terminar
  setTimeout(() => {
    contenedor.remove();
  }, 2100);
}

// Escuchador global de eventos para permitir disparar la animación desde cualquier módulo
if (typeof window !== "undefined") {
  window.addEventListener("lanzarCoheteDeuda", (e) => {
    const { origenX, origenY, puntos, mensaje, forzar } = e.detail || {};
    lanzarCoheteHaciaPuntos(origenX, origenY, { puntos, mensaje, forzar });
  });
}
