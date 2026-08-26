import React, { useMemo } from "react";
import { Banknote, CreditCard, Ticket, Zap, ArrowRight, AlertTriangle } from "lucide-react";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diasHasta(diaDelMes) {
  if (!diaDelMes) return null;
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = hoy.getMonth();
  const dias = new Date(year, month, diaDelMes) - hoy;
  return Math.round(dias / 86400000);
}

export default function PagosFijos({ prestamos, tarjetas, membresias, contratos, movimientos, onNavigate }) {
  const pagadoPorPrestamo = useMemo(() => {
    const map = {};
    for (const m of movimientos || []) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      map[m.prestamoId] = (map[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const prestamosActivos = (prestamos || []).filter((p) => p.estado === "Activo");
  const cuotaPrestamos = prestamosActivos.reduce((s, p) => s + (Number(p.cuota) || 0), 0);
  const pendientePrestamos = prestamosActivos.reduce((s, p) => {
    const pagado = pagadoPorPrestamo[p.id] || 0;
    return s + Math.max((Number(p.montoAprobado) || 0) - pagado, 0);
  }, 0);

  const tarjetasActivas = (tarjetas || []).filter((t) => t.estado === "Activa");
  const pagoMinimoTarjetas = tarjetasActivas.reduce((s, t) => s + (Number(t.pagoMinimo) || 0), 0);

  const membresiasActivas = (membresias || []).filter((m) => m.estado === "Activa");
  const contratosActivos = (contratos || []).filter((c) => c.estado === "Activo");

  const totalMensualFijo = cuotaPrestamos + pagoMinimoTarjetas;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <SummaryCard label="Préstamos activos" value={prestamosActivos.length} />
        <SummaryCard label="Pendiente en préstamos" value={formatMoney(pendientePrestamos)} mono color="var(--stamp)" />
        <SummaryCard label="Tarjetas activas" value={tarjetasActivas.length} />
        <SummaryCard label="Total mensual fijo" value={formatMoney(totalMensualFijo)} mono color="var(--stamp)" />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <NavButton onClick={() => onNavigate("prestamos")} icon={Banknote} label="Ir a Préstamos" />
        <NavButton onClick={() => onNavigate("tarjetas")} icon={CreditCard} label="Ir a Tarjetas" />
        <NavButton onClick={() => onNavigate("membresias")} icon={Ticket} label="Ir a Membresías" />
        <NavButton onClick={() => onNavigate("contratos")} icon={Zap} label="Ir a Contratos" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <ResumenBloque
          titulo="Préstamos"
          icon={Banknote}
          items={prestamosActivos.map((p) => ({
            id: p.id,
            nombre: `${p.numero} · ${p.entidadName || ""}`,
            detalle: p.cuota ? `Cuota: ${formatMoney(p.cuota)}` : "Sin cuota fija",
          }))}
          onNavigate={() => onNavigate("prestamos")}
        />
        <ResumenBloque
          titulo="Tarjetas"
          icon={CreditCard}
          items={tarjetasActivas.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            detalle: t.pagoMinimo ? `Mínimo: ${formatMoney(t.pagoMinimo)}` : t.tipoTarjeta || "",
          }))}
          onNavigate={() => onNavigate("tarjetas")}
        />
        <ResumenBloque
          titulo="Membresías"
          icon={Ticket}
          items={membresiasActivas.map((m) => ({ id: m.id, nombre: m.nombre, detalle: m.entidadName || "" }))}
          onNavigate={() => onNavigate("membresias")}
        />
        <ResumenBloque
          titulo="Contratos"
          icon={Zap}
          items={contratosActivos.map((c) => ({ id: c.id, nombre: c.nombre, detalle: c.tipo || "" }))}
          onNavigate={() => onNavigate("contratos")}
        />
      </div>
    </div>
  );
}

function ResumenBloque({ titulo, icon: Icon, items, onNavigate }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Icon size={14} style={{ color: "var(--ink-soft)" }} />
        <span className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 600 }}>{titulo}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Sin registros activos.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.slice(0, 4).map((it) => (
            <button
              key={it.id}
              onClick={onNavigate}
              style={{ display: "flex", justifyContent: "space-between", gap: 8, background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontSize: 12, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.nombre}</span>
              <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)", flexShrink: 0 }}>{it.detalle}</span>
            </button>
          ))}
          {items.length > 4 && (
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>+{items.length - 4} más…</span>
          )}
        </div>
      )}
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

function NavButton({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 500, background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
    >
      <Icon size={14} /> {label} <ArrowRight size={12} />
    </button>
  );
}
