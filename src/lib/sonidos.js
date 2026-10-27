// Sistema de efectos de sonido sintetizados con Web Audio API.
// 100% nativo, sin dependencias externas ni descargas de archivos de audio,
// garantizando funcionamiento instantáneo, sin latencia y compatible offline.

let audioCtx = null;

/**
 * Obtiene o inicializa de forma segura el contexto de audio del navegador.
 */
function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Desbloquea el contexto de audio en la primera interacción del usuario
if (typeof window !== "undefined") {
  const desbloquearAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", desbloquearAudio, { once: true, passive: true });
  window.addEventListener("keydown", desbloquearAudio, { once: true, passive: true });
}

/**
 * Comprueba si los sonidos están activos según las preferencias del usuario.
 */
export function estanSonidosHabilitados() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("despensa_sonidos_silenciados") !== "true";
}

/**
 * Permite silenciar o reactivar los efectos de sonido.
 */
export function setSonidosHabilitados(habilitar) {
  if (typeof window === "undefined") return;
  localStorage.setItem("despensa_sonidos_silenciados", habilitar ? "false" : "true");
  window.dispatchEvent(new CustomEvent("despensaCambioSonido", { detail: { habilitado: habilitar } }));
}

/**
 * Reproduce el tintineo clásico, nítido y metálico de una moneda (🪙).
 * Si se lanzan varias monedas seguidas, el índice varía el tono musical en escala ascendente.
 * @param {number} [indice=0] - Número secuencial de la moneda para efecto en cascada
 */
export function reproducirSonidoMoneda(indice = 0) {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Escala pentatónica brillante para cascada de monedas
    const frecuenciasBase = [987.77, 1174.66, 1318.51, 1567.98, 1760.00, 1975.53, 2349.32, 2637.02];
    const freq1 = frecuenciasBase[indice % frecuenciasBase.length];
    const freq2 = freq1 * 1.334; // Salto tonal ascendente (cuarta justa aprox.)

    // Oscilador principal
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq1, now);
    // Salto rápido de frecuencia típico de sonido "coin / pickup"
    osc1.frequency.setValueAtTime(freq2, now + 0.05);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    // Oscilador secundario armónico para brillo metálico
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq1 * 2.01, now);
    osc2.frequency.setValueAtTime(freq2 * 2.01, now + 0.05);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch (err) {
    console.debug("Error reproduciendo sonido moneda:", err);
  }
}

/**
 * Reproduce el sonido de acumulación o recompensa de puntos (campanas brillantes de logro).
 * @param {number} [puntos=0] - Cantidad de puntos ganados
 */
export function reproducirSonidoPuntos(puntos = 0) {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Acorde o arpegio triunfal de puntos: Do6 - Mi6 - Sol6 (1046Hz, 1318Hz, 1567Hz)
    const notas = [1046.50, 1318.51, 1567.98];

    notas.forEach((freq, idx) => {
      const tiempoNota = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, tiempoNota);

      gain.gain.setValueAtTime(0.001, tiempoNota);
      gain.gain.exponentialRampToValueAtTime(0.18, tiempoNota + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, tiempoNota + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(tiempoNota);
      osc.stop(tiempoNota + 0.4);
    });
  } catch (err) {
    console.debug("Error reproduciendo sonido puntos:", err);
  }
}

/**
 * Reproduce el sonido de propulsión y despegue de cohete (🚀).
 * Genera un rugido de motor en aceleración con filtro resonante barriendo hacia frecuencias altas
 * y un tono sónico ascendente.
 * @param {number} [duracionSegundos=0.85] - Duración del vuelo
 */
export function reproducirSonidoCoheteDespegue(duracionSegundos = 0.85) {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const dur = Math.max(0.4, duracionSegundos);

    // 1. RUIDO BLANCO FILTRADO (Simula el fuego y escape del cohete)
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.Q.setValueAtTime(2.5, now);
    // El filtro barre de frecuencias graves a agudas (despegue y aceleración)
    noiseFilter.frequency.setValueAtTime(220, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1600, now + dur);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.24, now + 0.1);
    noiseGain.gain.setValueAtTime(0.24, now + dur * 0.7);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. OSCILADOR DE PROPULSIÓN GRAVE QUE SUBE DE TONO (efecto Doppler y aceleración)
    const oscMotor = ctx.createOscillator();
    const gainMotor = ctx.createGain();

    oscMotor.type = "triangle";
    oscMotor.frequency.setValueAtTime(80, now);
    oscMotor.frequency.exponentialRampToValueAtTime(320, now + dur);

    gainMotor.gain.setValueAtTime(0.001, now);
    gainMotor.gain.exponentialRampToValueAtTime(0.18, now + 0.08);
    gainMotor.gain.exponentialRampToValueAtTime(0.001, now + dur);

    oscMotor.connect(gainMotor);
    gainMotor.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + dur);
    oscMotor.start(now);
    oscMotor.stop(now + dur);
  } catch (err) {
    console.debug("Error reproduciendo sonido cohete despegue:", err);
  }
}

/**
 * Reproduce el sonido de impacto del cohete y explosión triunfal de puntos en el trofeo.
 */
export function reproducirSonidoCoheteImpacto() {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Mini explosión suave (ruido de baja frecuencia con caída rápida)
    const bufferSize = Math.floor(ctx.sampleRate * 0.25);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.22);

    const gainNoise = ctx.createGain();
    gainNoise.gain.setValueAtTime(0.2, now);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.25);

    // Fanfarria celestial de estrellas (acorde mayor brillante con arpegio rápido)
    const acordes = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7
    acordes.forEach((freq, i) => {
      const t = now + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (err) {
    console.debug("Error reproduciendo sonido impacto cohete:", err);
  }
}

/**
 * Reproduce el sonido de apertura de un cofre misterioso / tesoro (fanfarria mágica).
 */
export function reproducirSonidoCofre() {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Arpegio ascendente mágico de arpa / campanas
    const arpegio = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];

    arpegio.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.7);
    });
  } catch (err) {
    console.debug("Error reproduciendo sonido cofre:", err);
  }
}

/**
 * Reproduce el sonido de canje de puntos exitoso (caja registradora / campanilla de pago).
 */
export function reproducirSonidoCanje() {
  if (!estanSonidosHabilitados()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Golpe 1 (clic metálico)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1400, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // Golpe 2 (campanilla alta y cristalina)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(2093, now + 0.09); // C7
    gain2.gain.setValueAtTime(0.001, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.debug("Error reproduciendo sonido canje:", err);
  }
}
