import React, { useMemo, useState } from "react";
import { Package, ClipboardList, Sparkles, ArrowRight, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { calcularSugerenciasRecompra } from "../lib/recomendaciones";
import Catalogo from "./Catalogo.jsx";

const ESTADO_COLORES = {
  Borrador: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
  "Enviada a proveedor": { bg: "var(--stamp-bg)", color: "var(--stamp)" },
  "Compra presencial": { bg: "var(--amber-bg)", color: "var(--amber)" },
  Completada: { bg: "var(--sage-bg)", color: "var(--sage)" },
  Cancelada: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
};

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function totalOrden(orden) {
  return (orden.items || []).reduce((s, it) => s + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 0), 0);
}

export default function Compras({ products, ordenesCompra, historialCompras, onNavigate, entidades, categoriasGasto, comprasProrateadas }) {
  const [showCatalogo, setShowCatalogo] = useState(true);
  const ordenesVigentes = useMemo(
    () => (ordenesCompra || []).filter((o) => o.estado !== "Completada" && o.estado !== "Cancelada"),
    [ordenesCompra]
  );

  const totalVigente = useMemo(() => ordenesVigentes.reduce((s, o) => s + totalOrden(o), 0), [ordenesVigentes]);

  const sugerencias = useMemo(() => {
    const productIds = new Set((products || []).map((p) => p.id));
    return calcularSugerenciasRecompra(historialCompras || []).filter((s) => productIds.has(s.productId));
  }, [products, historialCompras]);

  const ordenesRecientes = useMemo(() => (ordenesCompra || []).slice(0, 5), [ordenesCompra]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <SummaryCard label="Productos en catálogo" value={(products || []).length} />
        <SummaryCard label="Órdenes vigentes" value={ordenesVigentes.length} color="var(--amber)" />
        <SummaryCard label="Monto en órdenes vigentes" value={formatMoney(totalVigente)} mono color="var(--stamp)" />
        <SummaryCard label="Sugerencias de recompra" value={sugerencias.length} color="var(--sage)" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowCatalogo((s) => !s)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 500, background: showCatalogo ? "var(--sage)" : "var(--card)", color: showCatalogo ? "#fff" : "var(--ink)", border: showCatalogo ? "none" : "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
        >
          <Package size={14} /> {showCatalogo ? "Ocultar" : "Mostrar"} catálogo {showCatalogo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          onClick={() => onNavigate("ordenes-compra")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 500, background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
        >
          <ClipboardList size={14} /> Ir a Órdenes de compra <ArrowRight size={12} />
        </button>
      </div>

      {showCatalogo && (
        <div style={{ marginBottom: 24, paddingBottom: 4, borderBottom: "1px solid var(--line)" }}>
          <Catalogo
            products={products}
            entidades={entidades}
            historialCompras={historialCompras}
            ordenesCompra={ordenesCompra}
            onNavigate={onNavigate}
            categoriasGasto={categoriasGasto}
            comprasProrateadas={comprasProrateadas}
          />
        </div>
      )}

      {sugerencias.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={13} style={{ color: "var(--sage)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Deberías reabastecer
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sugerencias.slice(0, 5).map((s) => (
              <div
                key={s.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: s.vencido ? "var(--stamp-bg)" : "var(--sage-bg)",
                  border: `1px solid ${s.vencido ? "var(--stamp)" : "var(--sage)"}`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12.5,
                }}
              >
                <span>{s.productName}</span>
                <span style={{ color: s.vencido ? "var(--stamp)" : "var(--sage)", fontSize: 11 }}>
                  cada ~{s.promedioDias}d · última hace {s.diasDesdeUltima}d
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
          Órdenes de compra recientes
        </div>
        {ordenesRecientes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
            <ShoppingCart size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
            <div>Todavía no has creado ninguna orden de compra.</div>
            <button
              onClick={() => onNavigate("ordenes-compra")}
              style={{ marginTop: 12, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Crear la primera orden
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ordenesRecientes.map((o) => {
              const estadoStyle = ESTADO_COLORES[o.estado] || ESTADO_COLORES.Borrador;
              return (
                <button
                  key={o.id}
                  onClick={() => onNavigate("ordenes-compra")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 700 }}>{o.folio}</span>
                      <span
                        className="despensa-tab-font"
                        style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 20, background: estadoStyle.bg, color: estadoStyle.color }}
                      >
                        {o.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {formatDateDisplay(o.fecha)} · {(o.items || []).length} producto(s)
                    </div>
                  </div>
                  <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{formatMoney(totalOrden(o))}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, mono, color }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>{label}</div>
      <div className={mono ? "despensa-mono" : "despensa-tab-font"} style={{ fontSize: 16, fontWeight: 600, color: color || "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}
