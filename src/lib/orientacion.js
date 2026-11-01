// Utilidades para forzar y bloquear la orientación vertical (portrait) en dispositivos móviles

export function iniciarBloqueoOrientacion() {
  if (typeof window === "undefined") return;

  const bloquear = async () => {
    try {
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock("portrait");
      } else if (window.screen?.lockOrientation) {
        window.screen.lockOrientation("portrait");
      } else if (window.screen?.mozLockOrientation) {
        window.screen.mozLockOrientation("portrait");
      } else if (window.screen?.msLockOrientation) {
        window.screen.msLockOrientation("portrait");
      }
    } catch (_) {
      // Ignorar si el navegador o modo de visualización restringe el bloqueo programático
    }
  };

  bloquear();

  // Muchos navegadores móviles (Chrome/Android/WebKit) exigen un gesto de usuario para activar orientation.lock
  const intentarEnInteraccion = () => {
    bloquear();
  };

  window.addEventListener("pointerdown", intentarEnInteraccion, { passive: true });
  window.addEventListener("touchstart", intentarEnInteraccion, { passive: true });
  window.addEventListener("orientationchange", bloquear, { passive: true });
  document.addEventListener("fullscreenchange", bloquear, { passive: true });

  if (window.screen?.orientation) {
    window.screen.orientation.addEventListener("change", bloquear, { passive: true });
  }
}

export function esDispositivoMovilHorizontal() {
  if (typeof window === "undefined") return false;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Si no está en horizontal (ancho mayor que alto), no aplica
  if (w <= h) return false;

  const tieneTouch = "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const dimensionMenorPantalla = Math.min(
    window.screen?.width || w,
    window.screen?.height || h
  );

  // Teléfonos móviles en horizontal: altura reducida (<= 550px) y con touch o pantalla compacta (<= 600px)
  const esAlturaCelular = h <= 550;
  const esPantallaCelular = dimensionMenorPantalla <= 600;

  return esAlturaCelular && (tieneTouch || esPantallaCelular);
}
