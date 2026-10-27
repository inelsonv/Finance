import React, { useEffect, useState } from "react";

/**
 * Determina el estado emocional del avatar según la situación financiera:
 * - "celebrando": Acaba de registrar un pago de deuda o amortización reciente.
 * - "preocupado": Sobregiro activo en tarjeta, cuotas vencidas o deuda crítica desbordada.
 * - "enfocado": Deuda moderada bajo amortización activa (modo estratega anti-deuda).
 * - "relajado": Sin deudas, sin sobregiros, finanzas saludables y en paz.
 */
export function obtenerEstadoEmocionalFinanciero({
  tarjetas = [],
  prestamos = [],
  movimientos = [],
  pagoDeudaDetectado = null,
  estadoForzado = null,
} = {}) {
  if (estadoForzado) return estadoForzado;

  // 1. Celebrando hito reciente de pago (últimos 30 min o notificación activa)
  if (pagoDeudaDetectado) {
    const ts = pagoDeudaDetectado.timestamp || Date.now();
    if (Date.now() - ts < 1000 * 60 * 30) {
      return "celebrando";
    }
  }

  // 2. Preocupado / Alarmado por sobregiro o mora
  const tieneSobregiroRD = (tarjetas || []).some((t) => {
    const s = Number(t.saldoActual) || 0;
    const l = Number(t.limiteCredito ?? t.limite) || 0;
    return l > 0 && s > l;
  });

  const tieneCuotasVencidas = (tarjetas || []).some((t) => Number(t.cuotasVencidasUSD) > 0 || Number(t.cuotasVencidas) > 0);

  const tieneSobregiroUSD = (tarjetas || []).some((t) => {
    const s = Number(t.saldoActualUSD) || 0;
    const l = Number(t.limiteCreditoUSD) || 0;
    return l > 0 && s > l;
  });

  if (tieneSobregiroRD || tieneCuotasVencidas || tieneSobregiroUSD) {
    return "preocupado";
  }

  // 3. Evaluar volumen de deuda restante
  const totalDeudaPrestamos = (prestamos || [])
    .filter((p) => p.estado !== "Pagado")
    .reduce((acc, p) => acc + (Number(p.saldoPendienteNumero ?? p.saldoActual ?? p.montoAprobado) || 0), 0);

  const totalDeudaTarjetas = (tarjetas || [])
    .reduce((acc, t) => acc + (Number(t.saldoActual) || 0), 0);

  const deudaTotal = totalDeudaPrestamos + totalDeudaTarjetas;

  if (deudaTotal > 30000) {
    return "enfocado";
  }

  // 4. Finanzas en orden y relajadas
  return "relajado";
}

/**
 * Avatar Inteligente del Guardián Financiero con expresiones faciales dinámicas.
 */
export default function AgenteAvatar({
  tarjetas = [],
  prestamos = [],
  movimientos = [],
  pagoDeudaDetectado = null,
  estado: estadoProp = null,
  size = 40,
  showBadge = true,
  className = "",
  style = {},
}) {
  const [celebrandoTemporal, setCelebrandoTemporal] = useState(false);

  useEffect(() => {
    const handlePago = () => {
      setCelebrandoTemporal(true);
      const timer = setTimeout(() => {
        setCelebrandoTemporal(false);
      }, 10000); // 10 segundos de celebración enérgica en tiempo real
      return () => clearTimeout(timer);
    };

    window.addEventListener("agenteCelebrarPagoDeuda", handlePago);
    window.addEventListener("lanzarCoheteDeuda", handlePago);

    return () => {
      window.removeEventListener("agenteCelebrarPagoDeuda", handlePago);
      window.removeEventListener("lanzarCoheteDeuda", handlePago);
    };
  }, []);

  const estadoCalculado = obtenerEstadoEmocionalFinanciero({
    tarjetas,
    prestamos,
    movimientos,
    pagoDeudaDetectado,
    estadoForzado: celebrandoTemporal ? "celebrando" : estadoProp,
  });

  const estado = celebrandoTemporal ? "celebrando" : (estadoProp || estadoCalculado);

  const config = {
    celebrando: {
      titulo: "¡Feliz y celebrando! Pagaste una deuda y estás más cerca de la libertad financiera 🎉",
      colorPrimario: "#10b981",
      colorFondo: "#ecfdf5",
      colorBorde: "#34d399",
      colorLED: "#10b981",
      badgeIcono: "🎉",
      badgeFondo: "#059669",
    },
    preocupado: {
      titulo: "Preocupado: Tienes un sobregiro activo en la Tarjeta 6011 y 1 cuota vencida en USD 🚨",
      colorPrimario: "#ef4444",
      colorFondo: "#fef2f2",
      colorBorde: "#f87171",
      colorLED: "#dc2626",
      badgeIcono: "🚨",
      badgeFondo: "#dc2626",
    },
    enfocado: {
      titulo: "Enfocado: Ejecutando plan anti-deuda y protegiéndote contra gastos innecesarios 🛡️",
      colorPrimario: "#f59e0b",
      colorFondo: "#fffbeb",
      colorBorde: "#fbbf24",
      colorLED: "#f59e0b",
      badgeIcono: "🛡️",
      badgeFondo: "#d97706",
    },
    relajado: {
      titulo: "Relajado y sereno: Tus finanzas están bajo control y sin sobregiros 🌿",
      colorPrimario: "#0ea5e9",
      colorFondo: "#f0f9ff",
      colorBorde: "#7dd3fc",
      colorLED: "#0284c7",
      badgeIcono: "🌿",
      badgeFondo: "#0284c7",
    },
  }[estado] || {
    titulo: "Guardián Financiero",
    colorPrimario: "#10b981",
    colorFondo: "#ecfdf5",
    colorBorde: "#34d399",
    colorLED: "#10b981",
    badgeIcono: "🛡️",
    badgeFondo: "#059669",
  };

  return (
    <div
      className={`agente-avatar-contenedor ${className}`}
      title={config.titulo}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{
          overflow: "visible",
          filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.12))",
        }}
      >
        <defs>
          <linearGradient id={`grad-casco-${estado}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={config.colorFondo} />
          </linearGradient>

          <filter id="glow-led" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Antena / Sensor del Guardián */}
        <line x1="50" y1="18" x2="50" y2="9" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
        <circle
          cx="50"
          cy="7"
          r="4.5"
          fill={config.colorLED}
          filter="url(#glow-led)"
          className={estado === "preocupado" ? "despensa-led-alerta" : estado === "celebrando" ? "despensa-led-celebrar" : ""}
        />

        {/* Cabeza / Casco del Robot */}
        <rect
          x="15"
          y="18"
          width="70"
          height="62"
          rx="22"
          fill={`url(#grad-casco-${estado})`}
          stroke={config.colorBorde}
          strokeWidth="3"
        />

        {/* Orejas / Sensores laterales */}
        <rect x="9" y="38" width="6" height="18" rx="3" fill="#cbd5e1" stroke={config.colorBorde} strokeWidth="1.5" />
        <rect x="85" y="38" width="6" height="18" rx="3" fill="#cbd5e1" stroke={config.colorBorde} strokeWidth="1.5" />

        {/* Visor Facial */}
        <rect
          x="22"
          y="27"
          width="56"
          height="43"
          rx="14"
          fill="#0f172a"
        />

        {/* -------------------- EXPRESIONES FACIALES -------------------- */}

        {/* 1. CELEBRANDO: Ojos felices en arco, mejillas rosadas, gran sonrisa abierta */}
        {estado === "celebrando" && (
          <g className="anim-celebrando">
            {/* Ojos en arco feliz ^ ^ */}
            <path d="M 32 46 Q 39 37 46 46" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 54 46 Q 61 37 68 46" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />

            {/* Mejillas sonrojadas */}
            <circle cx="30" cy="54" r="3" fill="#f43f5e" opacity="0.6" />
            <circle cx="70" cy="54" r="3" fill="#f43f5e" opacity="0.6" />

            {/* Gran sonrisa con dientes */}
            <path d="M 38 52 Q 50 66 62 52 Z" fill="#ffffff" stroke="#34d399" strokeWidth="1.5" />

            {/* Chispitas o estrellas en las esquinas */}
            <path d="M 22 20 L 25 22 L 22 24 L 20 22 Z" fill="#fbbf24" />
            <path d="M 77 19 L 80 21 L 77 23 L 75 21 Z" fill="#fbbf24" />
          </g>
        )}

        {/* 2. PREOCUPADO: Ceño fruncido, ojos alarmados con pupilas temblorosas, boca ondulada y gota de sudor frío */}
        {estado === "preocupado" && (
          <g className="anim-preocupado">
            {/* Cejas angustiadas inclinadas */}
            <line x1="31" y1="36" x2="44" y2="40" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="69" y1="36" x2="56" y2="40" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />

            {/* Ojos redondos alarmados */}
            <circle cx="38" cy="47" r="6" fill="#ffffff" />
            <circle cx="38" cy="48" r="2.8" fill="#dc2626" />
            <circle cx="39.5" cy="46.5" r="1.2" fill="#ffffff" />

            <circle cx="62" cy="47" r="6" fill="#ffffff" />
            <circle cx="62" cy="48" r="2.8" fill="#dc2626" />
            <circle cx="63.5" cy="46.5" r="1.2" fill="#ffffff" />

            {/* Boca angustiada ondulada */}
            <path d="M 39 61 Q 44 57 50 60 Q 56 63 61 58" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />

            {/* Gota de sudor frío en la sien */}
            <path
              d="M 75 31 C 75 31 79 36 79 38 C 79 40.2 77.2 42 75 42 C 72.8 42 71 40.2 71 38 C 71 36 75 31 75 31 Z"
              fill="#38bdf8"
              opacity="0.9"
            />
          </g>
        )}

        {/* 3. ENFOCADO: Ceño estratega decidido, mirada táctica atenta, boca firme */}
        {estado === "enfocado" && (
          <g>
            {/* Cejas firmes enfocadas */}
            <line x1="31" y1="39" x2="44" y2="41" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="69" y1="39" x2="56" y2="41" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

            {/* Ojos enfocados y calculadores */}
            <ellipse cx="38" cy="47" rx="5" ry="4" fill="#fbbf24" />
            <ellipse cx="62" cy="47" rx="5" ry="4" fill="#fbbf24" />
            <circle cx="40" cy="46" r="1.5" fill="#0f172a" />
            <circle cx="60" cy="46" r="1.5" fill="#0f172a" />

            {/* Boca firme decidida con leve sonrisa táctica */}
            <path d="M 41 59 L 59 58" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* 4. RELAJADO: Ojos serenos en curva suave, sonrisa plácida, aura zen */}
        {estado === "relajado" && (
          <g>
            {/* Ojos cerrados plácidos ˘ ˘ */}
            <path d="M 33 46 Q 39 51 45 46" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            <path d="M 55 46 Q 61 51 67 46" fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

            {/* Sonrisa serena */}
            <path d="M 42 56 Q 50 63 58 56" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* Insignia emocional flotante en la esquina */}
      {showBadge && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: Math.max(15, Math.round(size * 0.38)),
            height: Math.max(15, Math.round(size * 0.38)),
            borderRadius: "50%",
            background: config.badgeFondo,
            color: "#fff",
            fontSize: Math.max(9, Math.round(size * 0.24)),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            border: "1.5px solid #ffffff",
            lineHeight: 1,
          }}
        >
          {config.badgeIcono}
        </span>
      )}
    </div>
  );
}
