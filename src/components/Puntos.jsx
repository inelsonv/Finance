import React, { useMemo, useState } from "react";
import { Trophy, Landmark, HandCoins, PiggyBank, Gift, Check, ArrowRight, Flame, Target, CreditCard, PenLine } from "lucide-react";
import { canjearPuntos } from "../lib/db";
import { calcularIngresoQuincenal } from "../lib/quincenaResumen";
import { confirm } from "../lib/confirm";
import Pagination from "./Pagination.jsx";
import { calcularRacha, historialRachaVisual } from "../lib/racha";

const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const TIPO_ICONS = {
  prestamo: Landmark,
  gastoFijo: HandCoins,
  metaAhorro: PiggyBank,
  canje: Gift,
  cumplimientoPresupuesto: Target,
  tarjeta: CreditCard,
  registro: PenLine,
};

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  const signo = v < 0 ? "-" : "";
  return signo + "$" + Math.abs(v).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function Puntos({ puntos, puntosHistorial, categoriasGasto, checklistTodos, categoriasPuntos, fuentesIngreso, topesAjuste }) {
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [quincena, setQuincena] = useState("Q1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [pageHistorial, setPageHistorial] = useState(1);
  const PAGE_SIZE_HISTORIAL = 10;

  const historialPaginado = useMemo(
    () => (puntosHistorial || []).slice((pageHistorial - 1) * PAGE_SIZE_HISTORIAL, pageHistorial * PAGE_SIZE_HISTORIAL),
    [puntosHistorial, pageHistorial]
  );

  const racha = useMemo(() => calcularRacha(checklistTodos), [checklistTodos]);
  const historialRacha = useMemo(() => historialRachaVisual(checklistTodos), [checklistTodos]);

  const { mesObjetivo, yearObjetivo } = useMemo(() => {
    const hoy = new Date();
    let mes = hoy.getMonth() + 2; // mes siguiente, 1-indexado
    let year = hoy.getFullYear();
    if (mes > 12) {
      mes -= 12;
      year += 1;
    }
    return { mesObjetivo: mes, yearObjetivo: year };
  }, []);

  // Las categorías marcadas en Configuración → "Categorías que generan
  // puntos" no pueden recibir puntos por canje, para no crear un círculo
  // donde la misma vía da y recibe puntos.
  const ingresoQuincenalFijo = useMemo(() => calcularIngresoQuincenal(fuentesIngreso), [fuentesIngreso]);

  const categoriasVariables = useMemo(
    () =>
      (categoriasGasto || []).filter(
        (c) => c.clasificacion === "Variable" && !(categoriasPuntos || []).includes(c.nombre)
      ),
    [categoriasGasto, categoriasPuntos]
  );

  const handleCanjear = async () => {
    const montoNum = parseFloat(monto);
    if (!categoria) {
      setError("Elige una categoría de gasto variable");
      return;
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    if (montoNum > puntos) {
      setError("No tienes suficientes puntos para ese canje");
      return;
    }

    const confirmado = await confirm(
      `¿Liberar ${formatMoney(montoNum)} para "${categoria}" en la ${quincena === "Q1" ? "primera" : "segunda"} quincena de ${NOMBRES_MES[mesObjetivo - 1]} ${yearObjetivo}?`,
      { confirmLabel: "Canjear puntos", danger: false }
    );
    if (!confirmado) return;

    setSaving(true);
    setError(null);
    try {
      await canjearPuntos({
        montoACanjear: montoNum,
        year: yearObjetivo,
        month: mesObjetivo,
        quincena,
        categoria,
        topeCategoria: topesAjuste?.[categoria] ?? null,
        ingresoQuincenalFijo,
      });
      setExito(`Listo: se agregaron ${formatMoney(montoNum)} a "${categoria}" para esa quincena.`);
      setMonto("");
      setCategoria("");
      setTimeout(() => setExito(null), 5000);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Flame size={18} style={{ color: racha > 0 ? "var(--stamp)" : "var(--ink-soft)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>
            Racha: {racha} quincena{racha !== 1 ? "s" : ""} seguida{racha !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {historialRacha.map((h) => {
            const [, mesN, q] = h.key.split("-");
            return (
              <div key={h.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  title={h.esActual ? "Quincena en curso" : h.cumplida ? "Cumplida" : "No cumplida"}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: h.esActual ? "var(--card)" : h.cumplida ? "var(--sage)" : "var(--line-soft)",
                    border: h.esActual ? "2px dashed var(--amber)" : "none",
                    color: h.cumplida ? "#fff" : "var(--ink-soft)",
                  }}
                >
                  {h.esActual ? (
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)" }} />
                  ) : h.cumplida ? (
                    <Check size={15} />
                  ) : (
                    <span style={{ fontSize: 10 }}>✕</span>
                  )}
                </div>
                <span style={{ fontSize: 9, color: "var(--ink-soft)" }}>{q}/{mesN}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 10 }}>
          Se cuenta una quincena como cumplida cuando marcas todos sus pagos del Checklist como pagados.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "var(--amber-bg)",
          border: "1px solid var(--amber)",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <Trophy size={30} style={{ color: "var(--amber)" }} />
        <div>
          <div className="despensa-mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--amber)" }}>{formatMoney(puntos)}</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>disponibles para canjear (1 punto = $1 peso)</div>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Gift size={16} style={{ color: "var(--sage)" }} />
          <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Canjear puntos</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
          Libera dinero extra en una categoría de gasto variable (compras, entretenimiento, etc.) para{" "}
          <strong>{NOMBRES_MES[mesObjetivo - 1]} {yearObjetivo}</strong> — se suma al presupuesto que ya tengas ahí.
        </div>

        {categoriasVariables.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Todavía no tienes categorías de gasto marcadas como "Variable". Ve a Presupuesto → Categoría de gasto para
            crear o marcar una (ej. Compras, Entretenimiento).
          </div>
        ) : puntos <= 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Todavía no tienes puntos acumulados. Se ganan al pagar préstamos, gastos fijos, y aportar a tus metas de ahorro.
          </div>
        ) : (
          <>
            <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                <option value="">Categoría variable…</option>
                {categoriasVariables.map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
              <select
                value={quincena}
                onChange={(e) => setQuincena(e.target.value)}
                style={{ padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                <option value="Q1">1ra quincena</option>
                <option value="Q2">2da quincena</option>
              </select>
            </div>

            {categoria && topesAjuste?.[categoria] != null && (
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
                Tope configurado para "{categoria}": <strong>{formatMoney(topesAjuste[categoria])}</strong> (no se permite pasarlo)
              </div>
            )}
            {ingresoQuincenalFijo > 0 && (
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
                Tu ingreso fijo estimado esa quincena es <strong>{formatMoney(ingresoQuincenalFijo)}</strong> — no se permite canjear más que eso en total hacia esa quincena.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                className="despensa-mono"
                type="number"
                min="0"
                max={puntos}
                step="1"
                placeholder={`Monto a liberar (máx. ${formatMoney(puntos)})`}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                style={{ flex: 1, padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <button
                onClick={handleCanjear}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "var(--sage)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: saving ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <ArrowRight size={14} /> {saving ? "Canjeando…" : "Canjear"}
              </button>
            </div>

            {error && <div style={{ fontSize: 12, color: "var(--stamp)" }}>{error}</div>}
            {exito && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--sage)" }}>
                <Check size={13} /> {exito}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <div className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Historial</div>
        {(!puntosHistorial || puntosHistorial.length === 0) ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
            Todavía no tienes movimientos de puntos.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {historialPaginado.map((h) => {
              const Icon = TIPO_ICONS[h.tipo] || Trophy;
              const positivo = h.puntos >= 0;
              return (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: positivo ? "var(--sage-bg)" : "var(--stamp-bg)",
                      color: positivo ? "var(--sage)" : "var(--stamp)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{h.motivo}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{formatDateDisplay(h.fecha)}</div>
                  </div>
                  <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 700, color: positivo ? "var(--sage)" : "var(--stamp)" }}>
                    {positivo ? "+" : ""}{formatMoney(h.puntos)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination page={pageHistorial} totalItems={(puntosHistorial || []).length} pageSize={PAGE_SIZE_HISTORIAL} onPageChange={setPageHistorial} />
      </div>
    </div>
  );
}
