import React, { useState } from "react";
import { AlertCircle, MessageCircle, Check } from "lucide-react";
import { useNotificaciones, etiquetaDias } from "./NotificationBell.jsx";

export default function NotificacionesPage({
  prestamos,
  tarjetas,
  membresias,
  contratos,
  movimientos,
  products,
  entidades,
  fuentesIngreso,
  eventos,
  presupuesto,
  presupuestoYear,
  seguros,
  onNavigate,
}) {
  const [leidas, setLeidas] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("smart-finance-notif-leidas") || "[]"));
    } catch (e) {
      return new Set();
    }
  });

  const notificaciones = useNotificaciones({
    prestamos,
    tarjetas,
    membresias,
    contratos,
    movimientos,
    products,
    entidades,
    eventos,
    fuentesIngreso,
    presupuesto,
    presupuestoYear,
    seguros,
  });

  const codigoEmpleado = (fuentesIngreso || []).find((f) => f.estado === "Activo" && f.codigoEmpleado)?.codigoEmpleado || "";

  const firma = (n) => `${n.id}:${n.dias}`;

  const marcarLeida = (n) => {
    setLeidas((prev) => {
      const nuevo = new Set(prev);
      nuevo.add(firma(n));
      try {
        localStorage.setItem("smart-finance-notif-leidas", JSON.stringify([...nuevo]));
      } catch (e) {
        // localStorage no disponible, la marca solo dura esta sesión
      }
      return nuevo;
    });
  };

  const marcarTodasLeidas = () => {
    setLeidas((prev) => {
      const nuevo = new Set(prev);
      notificaciones.forEach((n) => nuevo.add(firma(n)));
      try {
        localStorage.setItem("smart-finance-notif-leidas", JSON.stringify([...nuevo]));
      } catch (e) {
        // ignorar
      }
      return nuevo;
    });
  };

  const pedirPorWhatsapp = (n, e) => {
    e.stopPropagation();
    const telefono = n.whatsapp.telefono.replace(/\D/g, "");
    const partes = [`Hola, quisiera pedir: ${n.whatsapp.producto}.`];
    if (codigoEmpleado) partes.push(`Código de empleado: ${codigoEmpleado}.`);
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(partes.join(" "))}`, "_blank");
  };

  const noLeidas = notificaciones.filter((n) => !leidas.has(firma(n)));

  return (
    <div>
      {notificaciones.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={marcarTodasLeidas}
            disabled={noLeidas.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              background: "var(--card)",
              color: noLeidas.length === 0 ? "var(--line)" : "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: noLeidas.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Check size={13} /> Marcar todas como leídas
          </button>
        </div>
      )}

      {notificaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          No tienes alertas próximas por ahora.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notificaciones.map((n) => {
            const Icon = n.icon;
            const etiqueta = etiquetaDias(n.dias);
            const yaLeida = leidas.has(firma(n));
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  marcarLeida(n);
                  onNavigate(n.tab, n.periodoObjetivo);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    marcarLeida(n);
                    onNavigate(n.tab, n.periodoObjetivo);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "12px 14px",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: yaLeida ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: etiqueta.bg,
                    color: etiqueta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {n.dias <= 0 ? <AlertCircle size={15} /> : <Icon size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{n.titulo}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{n.subtitulo}</div>
                </div>
                {n.whatsapp && (
                  <button
                    onClick={(e) => pedirPorWhatsapp(n, e)}
                    title="Pedir por WhatsApp"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                    }}
                  >
                    <MessageCircle size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
