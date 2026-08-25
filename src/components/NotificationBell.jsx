import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Landmark, CreditCard, Ticket, Zap, AlertCircle, Clock, Package, MessageCircle, Settings, Mail } from "lucide-react";
import { watchNotifConfig, saveNotifConfig } from "../lib/db";
import { diasRestantesProducto } from "../lib/inventario";

const UMBRAL_DIAS = 7;

function todayInfo() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function ymPrefix(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function diasHasta(diaPago, today) {
  const { year, month, day } = today;
  const daysInThisMonth = new Date(year, month, 0).getDate();
  const targetDay = Math.min(diaPago, daysInThisMonth);
  let diff = targetDay - day;
  if (diff < 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const nextTargetDay = Math.min(diaPago, daysInNextMonth);
    const msPerDay = 24 * 60 * 60 * 1000;
    diff = Math.round((new Date(nextYear, nextMonth - 1, nextTargetDay) - new Date(year, month - 1, day)) / msPerDay);
  }
  return diff;
}

function yaPagadoEsteMes(movimientos, category, idField, id, today) {
  const prefix = ymPrefix(today.year, today.month);
  return movimientos.some((m) => m.category === category && m[idField] === id && (m.date || "").startsWith(prefix));
}

function useNotificaciones({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades }) {
  return useMemo(() => {
    const today = todayInfo();
    const list = [];

    for (const p of prestamos) {
      if (p.estado !== "Activo" || !p.fechaInicio) continue;
      const diaPago = parseInt(p.fechaInicio.split("-")[2], 10);
      if (!diaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de préstamo", "prestamoId", p.id, today)) continue;
      const dias = diasHasta(diaPago, today);
      if (dias <= UMBRAL_DIAS) {
        list.push({
          id: `p-${p.id}`,
          icon: Landmark,
          titulo: `Cuota de préstamo ${p.numero}`,
          subtitulo: p.entidadName || "Sin entidad",
          dias,
          tab: "prestamos",
        });
      }
    }

    for (const t of tarjetas) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de tarjeta", "tarjetaId", t.id, today)) continue;
      const dias = diasHasta(t.fechaPago, today);
      if (dias <= UMBRAL_DIAS) {
        list.push({
          id: `t-${t.id}`,
          icon: CreditCard,
          titulo: `Pago de tarjeta ${t.nombre}`,
          subtitulo: t.entidadName || "Sin entidad",
          dias,
          tab: "tarjetas",
        });
      }
    }

    for (const m of membresias) {
      if (m.estado !== "Activa" || !m.diaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de membresía", "membresiaId", m.id, today)) continue;
      const dias = diasHasta(m.diaPago, today);
      if (dias <= UMBRAL_DIAS) {
        list.push({
          id: `m-${m.id}`,
          icon: Ticket,
          titulo: `Renovación de ${m.nombre}`,
          subtitulo: m.tipo || "Membresía",
          dias,
          tab: "membresias",
        });
      }
    }

    for (const c of contratos) {
      if (c.estado !== "Activo" || !c.diaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de servicio", "contratoId", c.id, today)) continue;
      const dias = diasHasta(c.diaPago, today);
      if (dias <= UMBRAL_DIAS) {
        list.push({
          id: `c-${c.id}`,
          icon: Zap,
          titulo: `Pago de ${c.nombre}`,
          subtitulo: c.tipo || "Contrato",
          dias,
          tab: "contratos",
        });
      }
    }

    for (const p of products || []) {
      const dias = diasRestantesProducto(p);
      if (dias == null) continue;
      if (dias <= (p.diasAviso ?? 5)) {
        const entidad = p.entidadId ? (entidades || []).find((e) => e.docId === p.entidadId) : null;
        list.push({
          id: `prod-${p.id}`,
          icon: Package,
          titulo: dias <= 0 ? `Se acabó: ${p.name}` : `Se acaba pronto: ${p.name}`,
          subtitulo: entidad ? `Comprado en ${entidad.name}` : p.category || "Producto",
          dias,
          tab: "catalogo",
          whatsapp: entidad?.phone ? { telefono: entidad.phone, producto: p.name, entidadNombre: entidad.name } : null,
        });
      }
    }

    return list.sort((a, b) => a.dias - b.dias);
  }, [prestamos, tarjetas, membresias, contratos, movimientos, products, entidades]);
}

function etiquetaDias(dias) {
  if (dias <= 0) return { label: "Hoy", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  if (dias === 1) return { label: "Mañana", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  if (dias <= 3) return { label: `En ${dias} días`, color: "var(--amber)", bg: "var(--amber-bg)" };
  return { label: `En ${dias} días`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
}

export default function NotificationBell({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades, fuentesIngreso, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [emailConfig, setEmailConfig] = useState(undefined);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const ref = useRef(null);
  const notificaciones = useNotificaciones({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades });

  useEffect(() => {
    const unsub = watchNotifConfig(setEmailConfig, () => {});
    return () => unsub();
  }, []);

  const handleSaveEmail = async () => {
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    try {
      await saveNotifConfig(emailInput.trim());
      setShowSettings(false);
    } finally {
      setSavingEmail(false);
    }
  };

  const codigoEmpleado = (fuentesIngreso || []).find((f) => f.estado === "Activo" && f.codigoEmpleado)?.codigoEmpleado || "";

  const pedirPorWhatsapp = (n, e) => {
    e.stopPropagation();
    const telefono = n.whatsapp.telefono.replace(/\D/g, "");
    const partes = [`Hola, quisiera pedir: ${n.whatsapp.producto}.`];
    if (codigoEmpleado) partes.push(`Código de empleado: ${codigoEmpleado}.`);
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(partes.join(" "))}`, "_blank");
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--card)",
          color: "var(--ink-soft)",
          cursor: "pointer",
        }}
      >
        <Bell size={16} />
        {notificaciones.length > 0 && (
          <span
            className="despensa-mono"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              borderRadius: 10,
              background: "var(--stamp)",
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {notificaciones.length}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(300px, calc(100vw - 24px))",
            maxHeight: 380,
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={13} /> Notificaciones
            </span>
            <button
              onClick={() => {
                setEmailInput(emailConfig?.email || "");
                setShowSettings((s) => !s);
              }}
              title="Configurar aviso diario por correo"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer" }}
            >
              <Settings size={13} />
            </button>
          </div>

          {showSettings && (
            <div style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", background: "var(--paper)" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={12} /> Recibe un resumen diario de estas alertas por correo
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tu@correo.com"
                  style={{ flex: 1, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail}
                  style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  {savingEmail ? "…" : "Guardar"}
                </button>
              </div>
            </div>
          )}

          {notificaciones.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12.5, color: "var(--ink-soft)" }}>
              No tienes alertas próximas en los siguientes {UMBRAL_DIAS} días.
            </div>
          ) : (
            notificaciones.map((n) => {
              const Icon = n.icon;
              const etiqueta = etiquetaDias(n.dias);
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onNavigate(n.tab);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onNavigate(n.tab);
                      setOpen(false);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid var(--line-soft)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: etiqueta.bg,
                      color: etiqueta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {n.dias <= 0 ? <AlertCircle size={14} /> : <Icon size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.titulo}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{n.subtitulo}</div>
                  </div>
                  {n.whatsapp && (
                    <button
                      onClick={(e) => pedirPorWhatsapp(n, e)}
                      title="Pedir por WhatsApp"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        background: "var(--sage-bg)",
                        color: "var(--sage)",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <MessageCircle size={13} />
                    </button>
                  )}
                  <span
                    className="despensa-mono"
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: etiqueta.bg,
                      color: etiqueta.color,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Clock size={9} /> {etiqueta.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
