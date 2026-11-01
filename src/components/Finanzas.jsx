import React, { useMemo } from "react";
import { Vault, PiggyBank, LineChart, Briefcase, ArrowRight, Landmark } from "lucide-react";

const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Finanzas({ cuentas, metasAhorro, fuentesIngreso, movimientos, onNavigate }) {
  const saldoPorCuenta = useMemo(() => {
    const map = {};
    for (const c of cuentas || []) {
      let total = c.saldoInicial || 0;
      for (const mv of movimientos || []) {
        if (mv.cuentaId === c.id && mv.category === c.tipo) total += Number(mv.amount) || 0;
      }
      map[c.id] = total;
    }
    return map;
  }, [cuentas, movimientos]);

  const totalesPorTipo = useMemo(() => {
    const map = { Ahorro: 0, Corriente: 0, Inversión: 0, Corretaje: 0 };
    for (const c of cuentas || []) {
      if (map[c.tipo] == null) map[c.tipo] = 0;
      map[c.tipo] += saldoPorCuenta[c.id] || 0;
    }
    return map;
  }, [cuentas, saldoPorCuenta]);

  const ingresoMensual = useMemo(() => {
    let total = 0;
    for (const f of fuentesIngreso || []) {
      if (f.estado !== "Activo" || f.montoEsperado == null) continue;
      total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
    }
    return total;
  }, [fuentesIngreso]);

  const metasActivas = (metasAhorro || []).filter((m) => m.estado === "Activa");

  const totalGeneral = Object.values(totalesPorTipo).reduce((s, v) => s + v, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <SummaryCard label="Total en cuentas" value={formatMoney(totalGeneral)} mono color="var(--sage)" />
        <SummaryCard label="Ingreso mensual" value={formatMoney(ingresoMensual)} mono />
        <SummaryCard label="Metas de ahorro activas" value={metasActivas.length} color="var(--sage)" />
        <SummaryCard label="Cuentas registradas" value={(cuentas || []).length} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <NavButton onClick={() => onNavigate("cuentas")} icon={Vault} label="Ir a Cuentas" />
        <NavButton onClick={() => onNavigate("ahorro")} icon={PiggyBank} label="Ir a Ahorro" />
        <NavButton onClick={() => onNavigate("inversion")} icon={LineChart} label="Ir a Inversión" />
        <NavButton onClick={() => onNavigate("ingresos")} icon={Briefcase} label="Ir a Ingresos" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
        {Object.entries(totalesPorTipo)
          .filter(([tipo]) => (cuentas || []).some((c) => c.tipo === tipo))
          .map(([tipo, monto]) => (
            <div key={tipo} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{tipo}</div>
              <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 600 }}>{formatMoney(monto)}</div>
            </div>
          ))}
      </div>

      <div>
        <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
          Tus cuentas
        </div>
        {(cuentas || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10 }}>
            <Landmark size={22} style={{ marginBottom: 8, opacity: 0.6 }} />
            <div>Todavía no has registrado ninguna cuenta.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cuentas.map((c) => (
              <button
                key={c.id}
                onClick={() => onNavigate("cuentas")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "9px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 12.5, minWidth: 0 }}>{c.nombre} <span style={{ color: "var(--ink-soft)" }}>· {c.tipo} · {c.entidadName}</span></span>
                <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{formatMoney(saldoPorCuenta[c.id] || 0)}</span>
              </button>
            ))}
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
