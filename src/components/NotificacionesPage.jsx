import React, { useState } from "react";
import { AlertCircle, MessageCircle, Check, MoreHorizontal, Pill, Plus, Zap } from "lucide-react";
import { useNotificaciones, etiquetaDias } from "./NotificationBell.jsx";
import { formatWhatsappUrl, construirMensajePedidoFarmacia } from "../lib/inventario";
import ModalPresupuestarServicio from "./ModalPresupuestarServicio.jsx";

function Fila({ n, yaLeida, onOpen, onWhatsapp, onPresupuestar }) {
  const Icon = n.icon;
  const etiqueta = etiquetaDias(n.dias, n.tipoNotif);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        width: "100%",
        padding: "12px 4px",
        background: yaLeida ? "transparent" : "var(--sage-bg)",
        border: "none",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: etiqueta.bg,
          color: etiqueta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n.dias <= 0 ? <AlertCircle size={17} /> : <Icon size={17} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.35 }}>
          <span style={{ fontWeight: yaLeida ? 500 : 700 }}>{n.titulo}</span>
        </div>
        <div style={{ fontSize: 12, color: n.noPresupuestado ? "var(--amber)" : "var(--ink-soft)", fontWeight: n.noPresupuestado ? 600 : 400, marginTop: 2 }}>
          {n.subtitulo}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {n.noPresupuestado && n.contrato && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPresupuestar?.(n.contrato);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--amber-bg)",
                color: "var(--amber)",
                border: "1px solid var(--amber)",
                borderRadius: 6,
                cursor: "pointer",
              }}
              title="Definir monto estimado para este servicio en el presupuesto"
            >
              <Plus size={13} /> Agregar al presupuesto
            </button>
          )}
          {n.whatsapp && (
            <button
              onClick={(e) => onWhatsapp(n, e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                fontSize: 11.5,
                fontWeight: 500,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {n.whatsapp.esFarmacia ? <Pill size={12} /> : <MessageCircle size={12} />}
              {n.whatsapp.esFarmacia ? "Pedir a la Farmacia por WhatsApp" : "Pedir por WhatsApp"}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, flexShrink: 0, background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

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
  categoriasGasto,
  ingresosPuntuales,
  ajustesPresupuesto,
  sugerenciasInversion,
  diasCobro,
  habitosPenalizaciones,
  versiculoHoy,
  habitos,
  habitosRegistro,
  estrategiaDeudas,
  tipoCambio,
  isOwner = false,
  checklistTodos,
}) {
  const [contratoParaPresupuestar, setContratoParaPresupuestar] = useState(null);
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
    categoriasGasto,
    ingresosPuntuales,
    ajustesPresupuesto,
    sugerenciasInversion,
    diasCobro,
    habitosPenalizaciones,
    versiculoHoy,
    habitos,
    habitosRegistro,
    estrategiaDeudas,
    tipoCambio,
    isOwner,
    checklistTodos,
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
    if (!n.whatsapp?.telefono) return;
    const msg = n.whatsapp.esFarmacia
      ? construirMensajePedidoFarmacia(
          { name: n.whatsapp.producto, cantidadPedidoAuto: n.whatsapp.cantidad },
          { name: n.whatsapp.entidadNombre },
          { cantidad: n.whatsapp.cantidad, codigoEmpleado }
        )
      : (() => {
          const partes = [`Hola, quisiera pedir: ${n.whatsapp.producto}.`];
          if (codigoEmpleado) partes.push(`Código de empleado: ${codigoEmpleado}.`);
          return partes.join(" ");
        })();

    window.open(formatWhatsappUrl(n.whatsapp.telefono, msg), "_blank");
  };

  const nuevas = notificaciones.filter((n) => !leidas.has(firma(n)));
  const anteriores = notificaciones.filter((n) => leidas.has(firma(n)));

  const abrir = (n) => {
    marcarLeida(n);
    onNavigate(n.tab, n.periodoObjetivo, n.productId);
  };

  return (
    <div>
      {notificaciones.length > 0 && nuevas.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            onClick={marcarTodasLeidas}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              background: "transparent",
              color: "var(--sage)",
              border: "none",
              cursor: "pointer",
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
        <div>
          {nuevas.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, padding: "4px", marginBottom: 2 }}>
                Nuevas
              </div>
              {nuevas.map((n) => (
                <Fila
                  key={n.id}
                  n={n}
                  yaLeida={false}
                  onOpen={() => abrir(n)}
                  onWhatsapp={pedirPorWhatsapp}
                  onPresupuestar={setContratoParaPresupuestar}
                />
              ))}
            </div>
          )}
          {anteriores.length > 0 && (
            <div>
              <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, padding: "4px", marginBottom: 2, marginTop: nuevas.length > 0 ? 14 : 0 }}>
                Anteriores
              </div>
              {anteriores.map((n) => (
                <Fila
                  key={n.id}
                  n={n}
                  yaLeida={true}
                  onOpen={() => abrir(n)}
                  onWhatsapp={pedirPorWhatsapp}
                  onPresupuestar={setContratoParaPresupuestar}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {contratoParaPresupuestar && (
        <ModalPresupuestarServicio
          isOpen={!!contratoParaPresupuestar}
          onClose={() => setContratoParaPresupuestar(null)}
          contrato={contratoParaPresupuestar}
          year={presupuestoYear}
        />
      )}
    </div>
  );
}
