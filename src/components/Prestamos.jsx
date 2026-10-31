import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Landmark, Calendar, Percent, Pencil, Check, MessageCircle, Car, RotateCcw, ChevronDown, ChevronUp, Copy, ArrowLeftRight, CreditCard, Scissors, AlertTriangle } from "lucide-react";
import { addPrestamo, deletePrestamo, updatePrestamoEstado, updatePrestamo } from "../lib/db";
import { confirm } from "../lib/confirm";
import { calcularProyeccionPago } from "../lib/proyeccionPrestamo";
import {
  ESCENARIOS_DIVISION,
  TRIMESTRES_INFO,
  SEMESTRES_INFO,
  NOMBRES_MESES_CORTOS,
  describirEscenarioDivision,
  contarMesesDivision,
} from "../lib/prestamoDivision";

const PLAZO_UNIDADES = ["meses", "años"];
const TIPOS_PRESTAMO = ["Vehículo", "Hipotecario / Vivienda", "Personal", "Estudiantil", "Consolidación de deuda", "Negocio", "Otro"];
const ESTADOS = ["Activo", "Pagado", "En mora"];
const METODOS_PAGO_PRESTAMO = ["Transferencia", "Efectivo", "Tarjeta de Débito", "Cheque", "Descuento Nómina", "Otro"];
const TIPOS_CUENTA_DESTINO = ["Cuentas de Terceros", "Cuenta de Ahorros", "Cuenta Corriente", "Préstamo Directo", "Otro"];

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function nextNumero(prestamos) {
  let max = 0;
  for (const p of prestamos) {
    const match = /^PT(\d+)$/.exec(p.numero || "");
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return "PT" + String(max + 1).padStart(2, "0");
}

function normalizarCuotas(lista) {
  return (lista || [])
    .filter((c) => c.fecha && c.monto)
    .map((c) => ({ fecha: c.fecha, monto: parseFloat(c.monto) || 0 }))
    .filter((c) => c.monto > 0);
}

export function obtenerInfoCuotasPrestamo(p, movimientos) {
  if (!p) return { totalCuotas: null, cuotasPagadas: 0, cuotasPendientes: null, porcentaje: 0, pagos: [] };

  const pagos = (movimientos || [])
    .filter(
      (m) =>
        m.category === "Pago de préstamo" &&
        (m.prestamoId === p.id || (m.prestamoNumero && p.numero && m.prestamoNumero === p.numero))
    )
    .sort(
      (a, b) =>
        String(a.date || "").localeCompare(String(b.date || "")) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
    );

  let totalCuotas = null;
  if (p.frecuenciaCuota === "Personalizado") {
    totalCuotas = (p.cuotasPersonalizadas || []).length;
  } else if (p.plazo) {
    totalCuotas = p.plazoUnidad === "años" ? (Number(p.plazo) || 0) * 12 : Number(p.plazo) || 0;
  }

  const cuotasPagadas = pagos.length;
  let cuotasPendientes = null;

  if (p.estado === "Pagado") {
    cuotasPendientes = 0;
  } else if (totalCuotas != null && totalCuotas > 0) {
    cuotasPendientes = Math.max(0, totalCuotas - cuotasPagadas);
  }

  const porcentaje =
    totalCuotas && totalCuotas > 0
      ? Math.min(100, Math.round((cuotasPagadas / totalCuotas) * 100))
      : 0;

  return {
    totalCuotas,
    cuotasPagadas,
    cuotasPendientes,
    porcentaje,
    pagos,
  };
}

function SelectorEscenarioDivision({
  escenario = "anual",
  semestres = [1, 2],
  trimestres = [1],
  meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  onChangeEscenario,
  onChangeSemestres,
  onChangeTrimestres,
  onChangeMeses,
}) {
  const toggleSemestre = (s) => {
    const list = Array.isArray(semestres) ? [...semestres] : [];
    const idx = list.indexOf(s);
    if (idx >= 0) {
      if (list.length > 1) list.splice(idx, 1);
    } else {
      list.push(s);
      list.sort((a, b) => a - b);
    }
    onChangeSemestres(list);
  };

  const toggleTrimestre = (t) => {
    const list = Array.isArray(trimestres) ? [...trimestres] : [];
    const idx = list.indexOf(t);
    if (idx >= 0) {
      if (list.length > 1) list.splice(idx, 1);
    } else {
      list.push(t);
      list.sort((a, b) => a - b);
    }
    onChangeTrimestres(list);
  };

  const toggleMes = (m) => {
    const list = Array.isArray(meses) ? [...meses] : [];
    const idx = list.indexOf(m);
    if (idx >= 0) {
      if (list.length > 1) list.splice(idx, 1);
    } else {
      list.push(m);
      list.sort((a, b) => a - b);
    }
    onChangeMeses(list);
  };

  const mesesDivididosTotal = useMemo(() => {
    if (escenario === "anual") return 12;
    if (escenario === "semestral") {
      let count = 0;
      if ((semestres || []).includes(1)) count += 6;
      if ((semestres || []).includes(2)) count += 6;
      return count;
    }
    if (escenario === "trimestral") {
      return (trimestres || []).length * 3;
    }
    if (escenario === "personalizado") {
      return (meses || []).length;
    }
    return 12;
  }, [escenario, semestres, trimestres, meses]);

  return (
    <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Escenario de aplicación
        </label>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 10,
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--sage)",
          }}
        >
          {mesesDivididosTotal} de 12 meses divididos
        </span>
      </div>

      {/* Selector de modo: Anual, Semestral, Trimestral, Meses específicos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 8 }}>
        {ESCENARIOS_DIVISION.map((esc) => {
          const activo = escenario === esc.id;
          return (
            <button
              key={esc.id}
              type="button"
              onClick={() => onChangeEscenario(esc.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 2px",
                borderRadius: 7,
                background: activo ? "var(--sage)" : "var(--paper)",
                color: activo ? "#fff" : "var(--ink)",
                border: `1px solid ${activo ? "var(--sage)" : "var(--line)"}`,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{esc.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: activo ? 700 : 500, marginTop: 2, textAlign: "center" }}>
                {esc.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contenido condicional según escenario */}
      {escenario === "anual" && (
        <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: 11, color: "var(--ink)" }}>
          📅 <strong>Todo el año (Enero a Diciembre):</strong> La cuota se divide en Q1 y Q2 en los 12 meses del año.
        </div>
      )}

      {escenario === "semestral" && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
            Selecciona en qué semestre(s) deseas dividir la cuota:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            {SEMESTRES_INFO.map((s) => {
              const seleccionado = (semestres || []).includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSemestre(s.id)}
                  style={{
                    padding: "7px 9px",
                    borderRadius: 6,
                    border: `1.5px solid ${seleccionado ? "var(--sage)" : "var(--line)"}`,
                    background: seleccionado ? "rgba(16, 185, 129, 0.12)" : "var(--paper)",
                    color: seleccionado ? "var(--sage)" : "var(--ink)",
                    fontSize: 11.5,
                    fontWeight: seleccionado ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>{s.nombre}</span>
                  <span style={{ fontSize: 9.5, opacity: 0.8, fontWeight: 400 }}>{s.mesesTexto}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => onChangeSemestres([1, 2])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Ambos semestres
            </button>
            <button
              type="button"
              onClick={() => onChangeSemestres([1])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Solo 1er Semestre
            </button>
            <button
              type="button"
              onClick={() => onChangeSemestres([2])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Solo 2do Semestre
            </button>
          </div>
        </div>
      )}

      {escenario === "trimestral" && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
            Elige en qué trimestres dividir la cuota:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 6 }}>
            {TRIMESTRES_INFO.map((t) => {
              const sel = (trimestres || []).includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTrimestre(t.id)}
                  style={{
                    padding: "6px 2px",
                    borderRadius: 6,
                    border: `1.5px solid ${sel ? "var(--sage)" : "var(--line)"}`,
                    background: sel ? "rgba(16, 185, 129, 0.12)" : "var(--paper)",
                    color: sel ? "var(--sage)" : "var(--ink)",
                    fontSize: 11,
                    fontWeight: sel ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 400 }}>{t.mesesTexto}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => onChangeTrimestres([1, 2, 3, 4])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Todos (T1 a T4)
            </button>
            <button
              type="button"
              onClick={() => onChangeTrimestres([1, 2])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Solo T1 y T2
            </button>
            <button
              type="button"
              onClick={() => onChangeTrimestres([3, 4])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Solo T3 y T4
            </button>
          </div>
        </div>
      )}

      {escenario === "personalizado" && (
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
            Haz clic en los meses en los que deseas dividir la cuota:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 6 }}>
            {NOMBRES_MESES_CORTOS.map((mesNombre, idx) => {
              const numMes = idx + 1;
              const sel = (meses || []).includes(numMes);
              return (
                <button
                  key={numMes}
                  type="button"
                  onClick={() => toggleMes(numMes)}
                  style={{
                    padding: "5px 2px",
                    borderRadius: 5,
                    border: `1.5px solid ${sel ? "var(--sage)" : "var(--line)"}`,
                    background: sel ? "rgba(16, 185, 129, 0.15)" : "var(--paper)",
                    color: sel ? "var(--sage)" : "var(--ink-soft)",
                    fontSize: 10.5,
                    fontWeight: sel ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {mesNombre}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              onClick={() => onChangeMeses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Todos los meses
            </button>
            <button
              type="button"
              onClick={() => onChangeMeses([1, 2, 3, 4, 5, 6])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Ene - Jun
            </button>
            <button
              type="button"
              onClick={() => onChangeMeses([7, 8, 9, 10, 11, 12])}
              style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)", cursor: "pointer" }}
            >
              Jul - Dic
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6, fontStyle: "italic" }}>
        * En los meses no seleccionados se cobrará la cuota completa estándar en una sola quincena.
      </div>
    </div>
  );
}

function SeccionDividirCuota({
  cuota,
  dividirEnQuincenas,
  cuotaQ1,
  cuotaQ2,
  escenarioDivision = "anual",
  semestresDivision = [1, 2],
  trimestresDivision = [1],
  mesesDivision = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  onChangeDividir,
  onChangeQ1,
  onChangeQ2,
  onChangeEscenario,
  onChangeSemestres,
  onChangeTrimestres,
  onChangeMeses,
}) {
  const cuotaNum = parseFloat(cuota) || 0;
  const q1Num = parseFloat(cuotaQ1) || 0;
  const q2Num = parseFloat(cuotaQ2) || 0;
  const suma = Math.round((q1Num + q2Num) * 100) / 100;
  const diferencia = Math.round((cuotaNum - suma) * 100) / 100;
  const exacto = cuotaNum > 0 && Math.abs(diferencia) < 0.05;

  const aplicar5050 = () => {
    if (cuotaNum <= 0) return;
    const mitad1 = Math.round(cuotaNum / 2);
    const mitad2 = Math.round((cuotaNum - mitad1) * 100) / 100;
    onChangeQ1(String(mitad1));
    onChangeQ2(String(mitad2));
  };

  const balancearQ2 = () => {
    if (cuotaNum <= 0) return;
    const resto = Math.max(0, Math.round((cuotaNum - q1Num) * 100) / 100);
    onChangeQ2(String(resto));
  };

  return (
    <div
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: dividirEnQuincenas ? "rgba(16, 185, 129, 0.06)" : "var(--paper)",
        border: `1px solid ${dividirEnQuincenas ? "rgba(16, 185, 129, 0.3)" : "var(--line)"}`,
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Scissors size={15} style={{ color: dividirEnQuincenas ? "var(--sage)" : "var(--ink-soft)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              Dividir cuota en ambas quincenas (Q1 y Q2)
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              Divide el pago mensual para ir más desahogado/flojo en cada quincena
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dividirEnQuincenas}
          onClick={() => {
            const nuevo = !dividirEnQuincenas;
            onChangeDividir(nuevo);
            if (nuevo && (!cuotaQ1 && !cuotaQ2) && cuotaNum > 0) {
              const mitad1 = Math.round(cuotaNum / 2);
              const mitad2 = Math.round((cuotaNum - mitad1) * 100) / 100;
              onChangeQ1(String(mitad1));
              onChangeQ2(String(mitad2));
            }
          }}
          style={{
            width: 40,
            height: 22,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: dividirEnQuincenas ? "var(--sage)" : "var(--line)",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: dividirEnQuincenas ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          />
        </button>
      </div>

      {dividirEnQuincenas && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--line)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                1ra Quincena (Q1 · días 1-15)
              </label>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto Q1"
                value={cuotaQ1}
                onChange={(e) => onChangeQ1(e.target.value)}
                style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--card)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                2da Quincena (Q2 · días 16-fin)
              </label>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto Q2"
                value={cuotaQ2}
                onChange={(e) => onChangeQ2(e.target.value)}
                style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--card)" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={aplicar5050}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 5,
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Mitad 50 / 50
              </button>
              <button
                type="button"
                onClick={balancearQ2}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 5,
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Ajustar resto en Q2
              </button>
            </div>
          </div>

          {cuotaNum > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 500,
                background: exacto ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                color: exacto ? "var(--sage)" : "var(--stamp)",
                border: `1px solid ${exacto ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
              }}
            >
              {exacto ? (
                <>
                  <Check size={14} style={{ flexShrink: 0 }} />
                  <span>
                    ✓ Suma exacta: <strong>RD$ {suma.toLocaleString("es")}</strong> de RD$ {cuotaNum.toLocaleString("es")} (cuota completa)
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>
                    La suma da <strong>RD$ {suma.toLocaleString("es")}</strong> (diferencia: {diferencia > 0 ? "faltan" : "sobran"} <strong>RD$ {Math.abs(diferencia).toLocaleString("es")}</strong> para completar los RD$ {cuotaNum.toLocaleString("es")}).
                  </span>
                </>
              )}
            </div>
          )}

          <SelectorEscenarioDivision
            escenario={escenarioDivision}
            semestres={semestresDivision}
            trimestres={trimestresDivision}
            meses={mesesDivision}
            onChangeEscenario={onChangeEscenario}
            onChangeSemestres={onChangeSemestres}
            onChangeTrimestres={onChangeTrimestres}
            onChangeMeses={onChangeMeses}
          />
        </div>
      )}
    </div>
  );
}

function ModalDividirCuotaRapido({ modalDividir, setModalDividir, onGuardar }) {
  if (!modalDividir || !modalDividir.prestamo) return null;
  const p = modalDividir.prestamo;
  const cuotaNum = Number(p.cuota) || 0;
  const q1Num = parseFloat(modalDividir.cuotaQ1) || 0;
  const q2Num = parseFloat(modalDividir.cuotaQ2) || 0;
  const suma = Math.round((q1Num + q2Num) * 100) / 100;
  const diferencia = Math.round((cuotaNum - suma) * 100) / 100;
  const exacto = cuotaNum > 0 && Math.abs(diferencia) < 0.05;

  const aplicar5050 = () => {
    if (cuotaNum <= 0) return;
    const m1 = Math.round(cuotaNum / 2);
    const m2 = Math.round((cuotaNum - m1) * 100) / 100;
    setModalDividir((prev) => ({ ...prev, cuotaQ1: String(m1), cuotaQ2: String(m2), error: null }));
  };

  const balancearQ2 = () => {
    if (cuotaNum <= 0) return;
    const resto = Math.max(0, Math.round((cuotaNum - q1Num) * 100) / 100);
    setModalDividir((prev) => ({ ...prev, cuotaQ2: String(resto), error: null }));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !modalDividir.guardando) setModalDividir(null);
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          border: "1px solid var(--line)",
          maxWidth: 480,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--paper)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Scissors size={18} style={{ color: "var(--sage)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                Dividir cuota de Préstamo {p.numero}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                {p.entidadName ? `${p.entidadName} · ` : ""}Pagar en ambas quincenas para ir más flojo
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalDividir(null)}
            disabled={modalDividir.guardando}
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {/* Tarjeta de cuota actual */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Cuota mensual completa:</span>
            <span className="despensa-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
              {formatMoney(cuotaNum)}
            </span>
          </div>

          {/* Switch activar / desactivar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 8,
              background: modalDividir.dividirEnQuincenas ? "rgba(16, 185, 129, 0.08)" : "var(--paper)",
              border: `1px solid ${modalDividir.dividirEnQuincenas ? "rgba(16, 185, 129, 0.3)" : "var(--line)"}`,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                {modalDividir.dividirEnQuincenas ? "División activada" : "División desactivada"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                {modalDividir.dividirEnQuincenas
                  ? "Se dividirá el pago entre la 1ra y 2da quincena"
                  : "Se cobrará la cuota entera de una sola vez"}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={modalDividir.dividirEnQuincenas}
              onClick={() =>
                setModalDividir((prev) => {
                  const nuevo = !prev.dividirEnQuincenas;
                  return {
                    ...prev,
                    dividirEnQuincenas: nuevo,
                    cuotaQ1: nuevo && (!prev.cuotaQ1 || prev.cuotaQ1 === "0") ? String(Math.round(cuotaNum / 2)) : prev.cuotaQ1,
                    cuotaQ2: nuevo && (!prev.cuotaQ2 || prev.cuotaQ2 === "0") ? String(cuotaNum - Math.round(cuotaNum / 2)) : prev.cuotaQ2,
                    error: null,
                  };
                })
              }
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: modalDividir.dividirEnQuincenas ? "var(--sage)" : "var(--line)",
                position: "relative",
                transition: "background 0.2s",
                padding: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: modalDividir.dividirEnQuincenas ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>

          {modalDividir.dividirEnQuincenas && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Monto 1ra Quincena (Q1)
                  </label>
                  <input
                    className="despensa-mono"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto Q1"
                    value={modalDividir.cuotaQ1}
                    onChange={(e) =>
                      setModalDividir((prev) => ({ ...prev, cuotaQ1: e.target.value, error: null }))
                    }
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--card)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                    Monto 2da Quincena (Q2)
                  </label>
                  <input
                    className="despensa-mono"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto Q2"
                    value={modalDividir.cuotaQ2}
                    onChange={(e) =>
                      setModalDividir((prev) => ({ ...prev, cuotaQ2: e.target.value, error: null }))
                    }
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--card)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={aplicar5050}
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Mitad 50 / 50 ({formatMoney(Math.round(cuotaNum / 2))})
                </button>
                <button
                  type="button"
                  onClick={balancearQ2}
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Ajustar resto en Q2
                </button>
              </div>

              {/* Validación de suma */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 500,
                  background: exacto ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  color: exacto ? "var(--sage)" : "var(--stamp)",
                  border: `1px solid ${exacto ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                  marginBottom: 10,
                }}
              >
                {exacto ? (
                  <>
                    <Check size={16} style={{ flexShrink: 0 }} />
                    <span>
                      ✓ Suma exacta: <strong>RD$ {suma.toLocaleString("es")}</strong> de RD$ {cuotaNum.toLocaleString("es")}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>
                      La suma da <strong>RD$ {suma.toLocaleString("es")}</strong> (diferencia: {diferencia > 0 ? "faltan" : "sobran"} <strong>RD$ {Math.abs(diferencia).toLocaleString("es")}</strong> para completar los RD$ {cuotaNum.toLocaleString("es")}).
                    </span>
                  </>
                )}
              </div>

              {/* Selector de Escenarios */}
              <SelectorEscenarioDivision
                escenario={modalDividir.escenarioDivision || "anual"}
                semestres={modalDividir.semestresDivision || [1, 2]}
                trimestres={modalDividir.trimestresDivision || [1]}
                meses={modalDividir.mesesDivision || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                onChangeEscenario={(val) => setModalDividir((prev) => ({ ...prev, escenarioDivision: val }))}
                onChangeSemestres={(val) => setModalDividir((prev) => ({ ...prev, semestresDivision: val }))}
                onChangeTrimestres={(val) => setModalDividir((prev) => ({ ...prev, trimestresDivision: val }))}
                onChangeMeses={(val) => setModalDividir((prev) => ({ ...prev, mesesDivision: val }))}
              />
            </>
          )}

          {modalDividir.error && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                borderRadius: 7,
                fontSize: 12,
                color: "var(--stamp)",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              {modalDividir.error}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line-soft)", background: "var(--paper)", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setModalDividir(null)}
            disabled={modalDividir.guardando}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-soft)",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onGuardar}
            disabled={modalDividir.guardando || (modalDividir.dividirEnQuincenas && !exacto)}
            style={{
              padding: "7px 16px",
              borderRadius: 7,
              background: "var(--sage)",
              border: "none",
              color: "#fff",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: modalDividir.guardando || (modalDividir.dividirEnQuincenas && !exacto) ? "not-allowed" : "pointer",
              opacity: modalDividir.guardando || (modalDividir.dividirEnQuincenas && !exacto) ? 0.6 : 1,
            }}
          >
            {modalDividir.guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyForm = (numero) => {
  const esPT01 = numero === "PT01";
  return {
    numero,
    tipo: TIPOS_PRESTAMO[0],
    entidadId: "",
    activoId: "",
    montoAprobado: "",
    plazo: "",
    plazoUnidad: "meses",
    tasaInteres: "",
    cuota: "",
    dividirEnQuincenas: false,
    cuotaQ1: "",
    cuotaQ2: "",
    escenarioDivision: "anual",
    semestresDivision: [1, 2],
    trimestresDivision: [1],
    mesesDivision: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    fechaInicio: todayStr(),
    estado: "Activo",
    notas: "",
    notificarWhatsapp: false,
    esRevolvente: false,
    saldoActual: "",
    montoMinimoRetiro: "",
    frecuenciaCuota: "Mensual",
    cuotasPersonalizadas: [],
    metodoPago: "Transferencia",
    cuentaDestinoId: "",
    cuentaDestinoBanco: esPT01 ? "Banco Popular" : "Banco Popular",
    cuentaDestinoNumero: esPT01 ? "0002804611" : "",
    cuentaDestinoBeneficiario: esPT01 ? "Julian Ochoa" : "",
    cuentaDestinoTipo: esPT01 ? "Cuentas de Terceros" : "Cuentas de Terceros",
  };
};

export default function Prestamos({ prestamos, entidades, movimientos, activos, cuentas = [], focusPrestamoId }) {
  const [showForm, setShowForm] = useState(false);
  const [showHistorico, setShowHistorico] = useState(() => {
    try {
      const saved = localStorage.getItem("smart-finance-prestamos-historico-open");
      if (saved !== null) return saved === "1";
    } catch {}
    return true;
  });

  const [form, setForm] = useState(() => emptyForm(nextNumero(prestamos)));
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [revolventeAbiertoId, setRevolventeAbiertoId] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [detallesAbiertos, setDetallesAbiertos] = useState({});
  const toggleDetalles = (id) => setDetallesAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));

  const [modalDividir, setModalDividir] = useState(null);

  const abrirModalDividir = (p) => {
    const cuota = Number(p.cuota) || 0;
    const mitad1 = Math.round(cuota / 2);
    const mitad2 = Math.round((cuota - mitad1) * 100) / 100;
    setModalDividir({
      prestamo: p,
      dividirEnQuincenas: p.dividirEnQuincenas ?? true,
      cuotaQ1: p.cuotaQ1 != null ? String(p.cuotaQ1) : String(mitad1),
      cuotaQ2: p.cuotaQ2 != null ? String(p.cuotaQ2) : String(mitad2),
      escenarioDivision: p.escenarioDivision || "anual",
      semestresDivision: Array.isArray(p.semestresDivision) && p.semestresDivision.length > 0 ? p.semestresDivision : [1, 2],
      trimestresDivision: Array.isArray(p.trimestresDivision) && p.trimestresDivision.length > 0 ? p.trimestresDivision : [1],
      mesesDivision: Array.isArray(p.mesesDivision) && p.mesesDivision.length > 0 ? p.mesesDivision : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      error: null,
      guardando: false,
    });
  };

  const guardarModalDividir = async () => {
    if (!modalDividir || !modalDividir.prestamo) return;
    const p = modalDividir.prestamo;
    const cuota = Number(p.cuota) || 0;

    if (!modalDividir.dividirEnQuincenas) {
      setModalDividir((prev) => ({ ...prev, guardando: true, error: null }));
      try {
        await updatePrestamo(p.id, {
          dividirEnQuincenas: false,
          cuotaQ1: null,
          cuotaQ2: null,
        });
        setModalDividir(null);
      } catch (e) {
        setModalDividir((prev) => ({ ...prev, guardando: false, error: e.message || String(e) }));
      }
      return;
    }

    const q1 = parseFloat(modalDividir.cuotaQ1);
    const q2 = parseFloat(modalDividir.cuotaQ2);
    const cuotaQ1 = Number.isFinite(q1) ? q1 : Math.round(cuota / 2);
    const cuotaQ2 = Number.isFinite(q2) ? q2 : cuota - cuotaQ1;
    const suma = Math.round((cuotaQ1 + cuotaQ2) * 100) / 100;
    const esperado = Math.round(cuota * 100) / 100;

    if (Math.abs(suma - esperado) > 0.05) {
      setModalDividir((prev) => ({
        ...prev,
        error: `La suma de ambas quincenas (RD$ ${cuotaQ1.toLocaleString("es")} + RD$ ${cuotaQ2.toLocaleString("es")} = RD$ ${suma.toLocaleString("es")}) debe ser exactamente igual a la cuota mensual de RD$ ${esperado.toLocaleString("es")}.`,
      }));
      return;
    }

    setModalDividir((prev) => ({ ...prev, guardando: true, error: null }));
    try {
      await updatePrestamo(p.id, {
        dividirEnQuincenas: true,
        cuotaQ1,
        cuotaQ2,
        escenarioDivision: modalDividir.escenarioDivision || "anual",
        semestresDivision: modalDividir.semestresDivision || [1, 2],
        trimestresDivision: modalDividir.trimestresDivision || [1],
        mesesDivision: modalDividir.mesesDivision || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      });
      setModalDividir(null);
    } catch (e) {
      setModalDividir((prev) => ({ ...prev, guardando: false, error: e.message || String(e) }));
    }
  };

  const copiarCuenta = async (texto, id) => {
    if (!texto) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const t = document.createElement("textarea");
        t.value = texto;
        document.body.appendChild(t);
        t.select();
        document.execCommand("copy");
        document.body.removeChild(t);
      }
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch (e) {
      console.error("Error al copiar cuenta:", e);
    }
  };

  const prestamosActivos = useMemo(() => prestamos.filter((p) => p.estado !== "Pagado" || p.id === editingId), [prestamos, editingId]);
  const prestamosPagados = useMemo(() => prestamos.filter((p) => p.estado === "Pagado" && p.id !== editingId), [prestamos, editingId]);

  useEffect(() => {
    if (focusPrestamoId) {
      setDetallesAbiertos((prev) => ({ ...prev, [focusPrestamoId]: true }));
      if (prestamos.some((p) => p.id === focusPrestamoId && p.estado === "Pagado")) {
        setShowHistorico(true);
      }
    }
  }, [focusPrestamoId, prestamos]);

  const openForm = () => {
    setForm(emptyForm(nextNumero(prestamos)));
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditError(null);
    const fechasOverride = p.cuotasPersonalizadasOverrides || {};
    const esPT01 = p.numero === "PT01";
    setEditForm({
      tipo: p.tipo || TIPOS_PRESTAMO[0],
      entidadId: p.entidadId || "",
      activoId: p.activoId || "",
      esRevolvente: !!p.esRevolvente,
      saldoActual: p.saldoActual != null ? String(p.saldoActual) : "",
      montoMinimoRetiro: p.montoMinimoRetiro != null ? String(p.montoMinimoRetiro) : "",
      montoAprobado: p.montoAprobado != null ? String(p.montoAprobado) : "",
      plazo: p.plazo != null ? String(p.plazo) : "",
      plazoUnidad: p.plazoUnidad || "meses",
      tasaInteres: p.tasaInteres != null ? String(p.tasaInteres) : "",
      cuota: p.cuota != null ? String(p.cuota) : "",
      dividirEnQuincenas: !!p.dividirEnQuincenas,
      cuotaQ1: p.cuotaQ1 != null ? String(p.cuotaQ1) : (p.dividirEnQuincenas && p.cuota ? String(Math.round(p.cuota / 2)) : ""),
      cuotaQ2: p.cuotaQ2 != null ? String(p.cuotaQ2) : (p.dividirEnQuincenas && p.cuota ? String(p.cuota - Math.round(p.cuota / 2)) : ""),
      escenarioDivision: p.escenarioDivision || "anual",
      semestresDivision: Array.isArray(p.semestresDivision) && p.semestresDivision.length > 0 ? p.semestresDivision : [1, 2],
      trimestresDivision: Array.isArray(p.trimestresDivision) && p.trimestresDivision.length > 0 ? p.trimestresDivision : [1],
      mesesDivision: Array.isArray(p.mesesDivision) && p.mesesDivision.length > 0 ? p.mesesDivision : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      fechaInicio: p.fechaInicio || todayStr(),
      estado: p.estado || "Activo",
      notas: p.notas || "",
      notificarWhatsapp: !!p.notificarWhatsapp,
      frecuenciaCuota: p.frecuenciaCuota || "Mensual",
      metodoPago: p.metodoPago || "Transferencia",
      cuentaDestinoId: p.cuentaDestinoId || "",
      cuentaDestinoBanco: p.cuentaDestinoBanco || (esPT01 ? "Banco Popular" : (p.entidadName || "Banco Popular")),
      cuentaDestinoNumero: p.cuentaDestinoNumero || (esPT01 ? "0002804611" : ""),
      cuentaDestinoBeneficiario: p.cuentaDestinoBeneficiario || (esPT01 ? "Julian Ochoa" : ""),
      cuentaDestinoTipo: p.cuentaDestinoTipo || (esPT01 ? "Cuentas de Terceros" : "Cuentas de Terceros"),
      cuotasPersonalizadas: p.cuotasPersonalizadas ? p.cuotasPersonalizadas.map((c) => {
        const override = fechasOverride[c.fecha];
        return {
          fecha: (typeof override === "string" ? override : override?.fecha) || c.fecha || "",
          monto: c.monto != null ? String(c.monto) : "",
        };
      }) : [],
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    const monto = parseFloat(editForm.montoAprobado);
    if (!editForm.entidadId) {
      setEditError("Selecciona la entidad prestamista");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setEditError("Ingresa un monto aprobado válido");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const entidad = entidades.find((e) => e.docId === editForm.entidadId);
      const activoSel = activos.find((a) => a.id === editForm.activoId);
      const plazo = parseFloat(editForm.plazo);
      const tasa = parseFloat(editForm.tasaInteres);
      const cuota = parseFloat(editForm.cuota);

      const dividir = !!editForm.dividirEnQuincenas && editForm.frecuenciaCuota === "Mensual";
      let cuotaQ1 = null;
      let cuotaQ2 = null;
      if (dividir) {
        const q1 = parseFloat(editForm.cuotaQ1);
        const q2 = parseFloat(editForm.cuotaQ2);
        cuotaQ1 = Number.isFinite(q1) ? q1 : Math.round((cuota || 0) / 2);
        cuotaQ2 = Number.isFinite(q2) ? q2 : (cuota || 0) - cuotaQ1;
        const suma = Math.round((cuotaQ1 + cuotaQ2) * 100) / 100;
        const esperado = Math.round((cuota || 0) * 100) / 100;
        if (Math.abs(suma - esperado) > 0.05) {
          setEditError(`La suma de ambas quincenas (RD$ ${cuotaQ1.toLocaleString("es")} + RD$ ${cuotaQ2.toLocaleString("es")} = RD$ ${suma.toLocaleString("es")}) debe ser exactamente igual a la cuota mensual de RD$ ${esperado.toLocaleString("es")}`);
          setEditSaving(false);
          return;
        }
      }

      await updatePrestamo(editingId, {
        tipo: editForm.tipo,
        entidadId: editForm.entidadId,
        entidadName: entidad ? entidad.name : "",
        activoId: editForm.tipo === "Vehículo" ? editForm.activoId || null : null,
        activoNombre: editForm.tipo === "Vehículo" ? activoSel?.nombre || "" : "",
        esRevolvente: editForm.esRevolvente,
        saldoActual: editForm.esRevolvente ? (editForm.estado === "Pagado" ? 0 : parseFloat(editForm.saldoActual) || null) : null,
        montoMinimoRetiro: editForm.esRevolvente ? parseFloat(editForm.montoMinimoRetiro) || null : null,
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: editForm.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        dividirEnQuincenas: dividir,
        cuotaQ1: dividir ? cuotaQ1 : null,
        cuotaQ2: dividir ? cuotaQ2 : null,
        escenarioDivision: dividir ? (editForm.escenarioDivision || "anual") : "anual",
        semestresDivision: dividir ? (editForm.semestresDivision || [1, 2]) : [1, 2],
        trimestresDivision: dividir ? (editForm.trimestresDivision || [1]) : [1],
        mesesDivision: dividir ? (editForm.mesesDivision || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        fechaInicio: editForm.fechaInicio,
        estado: editForm.estado,
        notas: editForm.notas.trim(),
        notificarWhatsapp: editForm.notificarWhatsapp,
        frecuenciaCuota: editForm.frecuenciaCuota,
        metodoPago: editForm.metodoPago || "Transferencia",
        cuentaDestinoId: editForm.cuentaDestinoId || null,
        cuentaDestinoBanco: editForm.cuentaDestinoBanco || "",
        cuentaDestinoNumero: editForm.cuentaDestinoNumero || "",
        cuentaDestinoBeneficiario: editForm.cuentaDestinoBeneficiario || "",
        cuentaDestinoTipo: editForm.cuentaDestinoTipo || "",
        cuotasPersonalizadas: normalizarCuotas(editForm.cuotasPersonalizadas),
        cuotasPersonalizadasOverrides: {},
      });
      if (editForm.estado === "Pagado") {
        setShowHistorico(true);
        try {
          localStorage.setItem("smart-finance-prestamos-historico-open", "1");
        } catch {}
      }
      cancelEdit();
    } catch (err) {
      setEditError(err.message || String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const totals = useMemo(() => {
    let aprobado = 0;
    let activos = 0;
    for (const p of prestamos) {
      aprobado += Number(p.montoAprobado) || 0;
      if (p.estado === "Activo") activos += 1;
    }
    return { aprobado, activos, total: prestamos.length };
  }, [prestamos]);

  const pagadoPorPrestamo = useMemo(() => {
    const map = {};
    for (const p of prestamos) {
      const total = (movimientos || [])
        .filter(
          (m) =>
            m.category === "Pago de préstamo" &&
            (m.prestamoId === p.id || (m.prestamoNumero && p.numero && m.prestamoNumero === p.numero))
        )
        .reduce((s, m) => s + (Number(m.amount) || 0), 0);
      map[p.id] = total;
    }
    return map;
  }, [prestamos, movimientos]);

  const totalesGenerales = useMemo(() => {
    let pagado = 0;
    for (const p of prestamos) {
      pagado += pagadoPorPrestamo[p.id] || 0;
    }
    return { pagado, pendiente: totals.aprobado - pagado };
  }, [prestamos, pagadoPorPrestamo, totals.aprobado]);

  const cuotasTotalesResumen = useMemo(() => {
    let pagadas = 0;
    let pendientes = 0;
    let totalPlan = 0;
    for (const p of prestamosActivos) {
      const info = obtenerInfoCuotasPrestamo(p, movimientos);
      if (info.totalCuotas != null && info.totalCuotas > 0) {
        pagadas += info.cuotasPagadas;
        pendientes += info.cuotasPendientes ?? 0;
        totalPlan += info.totalCuotas;
      }
    }
    return { pagadas, pendientes, totalPlan };
  }, [prestamosActivos, movimientos]);

  const handleAdd = async () => {
    const monto = parseFloat(form.montoAprobado);
    const plazo = parseFloat(form.plazo);
    const tasa = parseFloat(form.tasaInteres);
    if (!form.entidadId) {
      setFormError("Selecciona la entidad prestamista");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setFormError("Ingresa un monto aprobado válido");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const entidad = entidades.find((e) => e.docId === form.entidadId);
      const activoSel = activos.find((a) => a.id === form.activoId);
      const cuota = parseFloat(form.cuota);

      const dividir = !!form.dividirEnQuincenas && form.frecuenciaCuota === "Mensual";
      let cuotaQ1 = null;
      let cuotaQ2 = null;
      if (dividir) {
        const q1 = parseFloat(form.cuotaQ1);
        const q2 = parseFloat(form.cuotaQ2);
        cuotaQ1 = Number.isFinite(q1) ? q1 : Math.round((cuota || 0) / 2);
        cuotaQ2 = Number.isFinite(q2) ? q2 : (cuota || 0) - cuotaQ1;
        const suma = Math.round((cuotaQ1 + cuotaQ2) * 100) / 100;
        const esperado = Math.round((cuota || 0) * 100) / 100;
        if (Math.abs(suma - esperado) > 0.05) {
          setFormError(`La suma de ambas quincenas (RD$ ${cuotaQ1.toLocaleString("es")} + RD$ ${cuotaQ2.toLocaleString("es")} = RD$ ${suma.toLocaleString("es")}) debe ser exactamente igual a la cuota mensual de RD$ ${esperado.toLocaleString("es")}`);
          setSaving(false);
          return;
        }
      }

      await addPrestamo({
        numero: form.numero,
        tipo: form.tipo,
        entidadId: form.entidadId,
        entidadName: entidad ? entidad.name : "",
        activoId: form.tipo === "Vehículo" ? form.activoId || null : null,
        activoNombre: form.tipo === "Vehículo" ? activoSel?.nombre || "" : "",
        esRevolvente: form.esRevolvente,
        saldoActual: form.esRevolvente ? parseFloat(form.saldoActual) || null : null,
        montoMinimoRetiro: form.esRevolvente ? parseFloat(form.montoMinimoRetiro) || null : null,
        montoAprobado: monto,
        plazo: Number.isFinite(plazo) ? plazo : null,
        plazoUnidad: form.plazoUnidad,
        tasaInteres: Number.isFinite(tasa) ? tasa : null,
        cuota: Number.isFinite(cuota) ? cuota : null,
        dividirEnQuincenas: dividir,
        cuotaQ1: dividir ? cuotaQ1 : null,
        cuotaQ2: dividir ? cuotaQ2 : null,
        escenarioDivision: dividir ? (form.escenarioDivision || "anual") : "anual",
        semestresDivision: dividir ? (form.semestresDivision || [1, 2]) : [1, 2],
        trimestresDivision: dividir ? (form.trimestresDivision || [1]) : [1],
        mesesDivision: dividir ? (form.mesesDivision || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        fechaInicio: form.fechaInicio,
        estado: form.estado,
        notas: form.notas.trim(),
        notificarWhatsapp: form.notificarWhatsapp,
        frecuenciaCuota: form.frecuenciaCuota,
        metodoPago: form.metodoPago || "Transferencia",
        cuentaDestinoId: form.cuentaDestinoId || null,
        cuentaDestinoBanco: form.cuentaDestinoBanco || "",
        cuentaDestinoNumero: form.cuentaDestinoNumero || "",
        cuentaDestinoBeneficiario: form.cuentaDestinoBeneficiario || "",
        cuentaDestinoTipo: form.cuentaDestinoTipo || "",
        cuotasPersonalizadas: normalizarCuotas(form.cuotasPersonalizadas),
      });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 18 }}>
        <SummaryCard label="Préstamos" value={totals.total} mono={false} />
        <SummaryCard label="Activos" value={totals.activos} mono={false} />
        <SummaryCard label="Monto aprobado total" value={formatMoney(totals.aprobado)} mono />
        <SummaryCard label="Total pagado" value={formatMoney(totalesGenerales.pagado)} mono color="var(--sage)" />
        <SummaryCard label="Falta por pagar" value={formatMoney(totalesGenerales.pendiente)} mono color={totalesGenerales.pendiente > 0 ? "var(--stamp)" : "var(--sage)"} />
        {cuotasTotalesResumen.totalPlan > 0 && (
          <SummaryCard
            label="Cuotas pendientes"
            value={`${cuotasTotalesResumen.pendientes} de ${cuotasTotalesResumen.totalPlan}`}
            mono
            color={cuotasTotalesResumen.pendientes > 0 ? "var(--stamp)" : "var(--sage)"}
          />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button
          onClick={() => (showForm ? setShowForm(false) : openForm())}
          disabled={!showForm && entidades.length === 0}
          title={entidades.length === 0 ? "Primero registra una entidad en la sección Entidades" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: !showForm && entidades.length === 0 ? "var(--line)" : "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: !showForm && entidades.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar préstamo"}
        </button>
      </div>

      {entidades.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Primero registra al menos una entidad (banco, financiera, etc.) en la sección Entidades.
        </div>
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: 8, marginBottom: 8 }}>
            <input
              value={form.numero}
              readOnly
              className="despensa-mono"
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink-soft)" }}
            />
            <select
              value={form.entidadId}
              onChange={(e) => setForm({ ...form, entidadId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="">Entidad prestamista…</option>
              {entidades.map((e) => (
                <option key={e.docId} value={e.docId}>{e.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {TIPOS_PRESTAMO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {form.tipo === "Vehículo" && (
            <div style={{ marginBottom: 8 }}>
              {activos.filter((a) => a.tipo === "Vehículo").length === 0 ? (
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
                  No tienes vehículos registrados en Activos todavía (opcional).
                </div>
              ) : (
                <select
                  value={form.activoId}
                  onChange={(e) => setForm({ ...form, activoId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                >
                  <option value="">Vincular a un vehículo de Activos (opcional)…</option>
                  {activos.filter((a) => a.tipo === "Vehículo").map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.esRevolvente}
              onChange={(e) => setForm({ ...form, esRevolvente: e.target.checked })}
            />
            Es un préstamo revolvente (al pagar, el monto queda disponible para volver a retirar)
          </label>
          {form.esRevolvente && (
            <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Saldo actual utilizado"
                value={form.saldoActual}
                onChange={(e) => setForm({ ...form, saldoActual: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Mínimo disponible para retirar"
                value={form.montoMinimoRetiro}
                onChange={(e) => setForm({ ...form, montoMinimoRetiro: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          )}

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto aprobado"
              value={form.montoAprobado}
              onChange={(e) => setForm({ ...form, montoAprobado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <input
                className="despensa-mono"
                type="number"
                step="1"
                min="0"
                placeholder="Plazo"
                value={form.plazo}
                onChange={(e) => setForm({ ...form, plazo: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <select
                value={form.plazoUnidad}
                onChange={(e) => setForm({ ...form, plazoUnidad: e.target.value })}
                style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
              >
                {PLAZO_UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div style={{ position: "relative" }}>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Tasa interés"
                value={form.tasaInteres}
                onChange={(e) => setForm({ ...form, tasaInteres: e.target.value })}
                style={{ width: "100%", padding: "8px 22px 8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <Percent size={12} style={{ position: "absolute", right: 8, top: 11, color: "var(--ink-soft)" }} />
            </div>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ position: "relative" }}>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <select
              value={form.frecuenciaCuota}
              onChange={(e) => setForm({ ...form, frecuenciaCuota: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
            >
              <option value="Mensual">Cuota mensual fija (se calcula sola cada mes)</option>
              <option value="Personalizado">Fechas específicas (cuotas irregulares)</option>
            </select>
          </div>

          {form.frecuenciaCuota === "Mensual" ? (
            <div style={{ marginBottom: 8 }}>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Cuota mensual"
                value={form.cuota}
                onChange={(e) => setForm({ ...form, cuota: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
              />
              <SeccionDividirCuota
                cuota={form.cuota}
                dividirEnQuincenas={form.dividirEnQuincenas}
                cuotaQ1={form.cuotaQ1}
                cuotaQ2={form.cuotaQ2}
                escenarioDivision={form.escenarioDivision}
                semestresDivision={form.semestresDivision}
                trimestresDivision={form.trimestresDivision}
                mesesDivision={form.mesesDivision}
                onChangeDividir={(val) => setForm((prev) => ({ ...prev, dividirEnQuincenas: val }))}
                onChangeQ1={(val) => setForm((prev) => ({ ...prev, cuotaQ1: val }))}
                onChangeQ2={(val) => setForm((prev) => ({ ...prev, cuotaQ2: val }))}
                onChangeEscenario={(val) => setForm((prev) => ({ ...prev, escenarioDivision: val }))}
                onChangeSemestres={(val) => setForm((prev) => ({ ...prev, semestresDivision: val }))}
                onChangeTrimestres={(val) => setForm((prev) => ({ ...prev, trimestresDivision: val }))}
                onChangeMeses={(val) => setForm((prev) => ({ ...prev, mesesDivision: val }))}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
                Agrega cada cuota con su fecha y monto exactos:
              </div>
              {form.cuotasPersonalizadas.map((c, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    type="date"
                    value={c.fecha}
                    onChange={(e) => {
                      const list = [...form.cuotasPersonalizadas];
                      list[idx] = { ...list[idx], fecha: e.target.value };
                      setForm({ ...form, cuotasPersonalizadas: list });
                    }}
                    style={{ flex: 1, minWidth: 0, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                  />
                  <input
                    className="despensa-mono"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto"
                    value={c.monto}
                    onChange={(e) => {
                      const list = [...form.cuotasPersonalizadas];
                      list[idx] = { ...list[idx], monto: e.target.value };
                      setForm({ ...form, cuotasPersonalizadas: list });
                    }}
                    style={{ width: 90, flexShrink: 0, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                  />
                  <button
                    onClick={() => setForm({ ...form, cuotasPersonalizadas: form.cuotasPersonalizadas.filter((_, i) => i !== idx) })}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, flexShrink: 0, background: "transparent", border: "none", color: "var(--stamp)", cursor: "pointer" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setForm({ ...form, cuotasPersonalizadas: [...form.cuotasPersonalizadas, { fecha: "", monto: "" }] })}
                style={{ fontSize: 12, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
              >
                + Agregar cuota
              </button>
            </div>
          )}

          <SeccionCuentaDestino formState={form} setFormState={setForm} cuentas={cuentas} entidades={entidades} />

          <input
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.notificarWhatsapp}
              onChange={(e) => setForm({ ...form, notificarWhatsapp: e.target.checked })}
            />
            Notificar pagos de este préstamo por WhatsApp
          </label>
          {form.notificarWhatsapp && (
            <div style={{ fontSize: 11.5, color: entidades.find((e) => e.docId === form.entidadId)?.phone ? "var(--ink-soft)" : "var(--stamp)", marginBottom: 10 }}>
              {entidades.find((e) => e.docId === form.entidadId)?.phone
                ? `Se enviará al teléfono de la entidad: ${entidades.find((e) => e.docId === form.entidadId).phone}`
                : "La entidad seleccionada no tiene teléfono registrado — agrégalo en Entidades para que la notificación funcione."}
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Guardando…" : "Guardar préstamo"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{formError}</div>
          )}
        </div>
      )}

      {prestamosActivos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {prestamos.length === 0 ? "Todavía no registraste ningún préstamo." : "No tienes préstamos activos — revisa el histórico abajo."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {prestamosActivos.map((p) => (
            <div key={p.id} data-record-id={p.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
              {editingId === p.id ? (
                <div>
                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: 8, marginBottom: 8 }}>
                    <div className="despensa-mono" style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--paper)", color: "var(--ink-soft)" }}>
                      {p.numero}
                    </div>
                    <select
                      value={editForm.entidadId}
                      onChange={(e) => setEditForm({ ...editForm, entidadId: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      <option value="">Entidad prestamista…</option>
                      {entidades.map((e) => (
                        <option key={e.docId} value={e.docId}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={editForm.tipo}
                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      {TIPOS_PRESTAMO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {editForm.tipo === "Vehículo" && (
                    <div style={{ marginBottom: 8 }}>
                      {activos.filter((a) => a.tipo === "Vehículo").length === 0 ? (
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", padding: "4px 0" }}>
                          No tienes vehículos registrados en Activos todavía (opcional).
                        </div>
                      ) : (
                        <select
                          value={editForm.activoId}
                          onChange={(e) => setEditForm({ ...editForm, activoId: e.target.value })}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                        >
                          <option value="">Vincular a un vehículo de Activos (opcional)…</option>
                          {activos.filter((a) => a.tipo === "Vehículo").map((a) => (
                            <option key={a.id} value={a.id}>{a.nombre}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.esRevolvente}
                      onChange={(e) => setEditForm({ ...editForm, esRevolvente: e.target.checked })}
                    />
                    Es un préstamo revolvente (al pagar, el monto queda disponible para volver a retirar)
                  </label>
                  {editForm.esRevolvente && (
                    <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Saldo actual utilizado"
                        value={editForm.saldoActual}
                        onChange={(e) => setEditForm({ ...editForm, saldoActual: e.target.value })}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Mínimo disponible para retirar"
                        value={editForm.montoMinimoRetiro}
                        onChange={(e) => setEditForm({ ...editForm, montoMinimoRetiro: e.target.value })}
                        style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                    </div>
                  )}

                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      className="despensa-mono"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monto aprobado"
                      value={editForm.montoAprobado}
                      onChange={(e) => setEditForm({ ...editForm, montoAprobado: e.target.value })}
                      style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Plazo"
                        value={editForm.plazo}
                        onChange={(e) => setEditForm({ ...editForm, plazo: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <select
                        value={editForm.plazoUnidad}
                        onChange={(e) => setEditForm({ ...editForm, plazoUnidad: e.target.value })}
                        style={{ padding: "8px 4px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
                      >
                        {PLAZO_UNIDADES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Tasa interés"
                        value={editForm.tasaInteres}
                        onChange={(e) => setEditForm({ ...editForm, tasaInteres: e.target.value })}
                        style={{ width: "100%", padding: "8px 22px 8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                      />
                      <Percent size={12} style={{ position: "absolute", right: 8, top: 11, color: "var(--ink-soft)" }} />
                    </div>
                  </div>

                  <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input
                      type="date"
                      value={editForm.fechaInicio}
                      onChange={(e) => setEditForm({ ...editForm, fechaInicio: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                    />
                    <select
                      value={editForm.estado}
                      onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                      disabled={p.estado === "Pagado"}
                      title={p.estado === "Pagado" ? "Este préstamo ya está saldado y no se puede revertir" : undefined}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        fontSize: 13,
                        background: p.estado === "Pagado" ? "var(--line-soft)" : "var(--card)",
                        color: p.estado === "Pagado" ? "var(--ink-soft)" : "var(--ink)",
                        cursor: p.estado === "Pagado" ? "not-allowed" : "pointer",
                      }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  {p.estado === "Pagado" && (
                    <div style={{ fontSize: 11, color: "var(--sage)", marginTop: -4, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={11} /> Préstamo saldado por completo — el estado ya no se puede cambiar.
                    </div>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    <select
                      value={editForm.frecuenciaCuota}
                      onChange={(e) => setEditForm({ ...editForm, frecuenciaCuota: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                    >
                      <option value="Mensual">Cuota mensual fija (se calcula sola cada mes)</option>
                      <option value="Personalizado">Fechas específicas (cuotas irregulares)</option>
                    </select>
                  </div>

                  {editForm.frecuenciaCuota === "Mensual" ? (
                    <div style={{ marginBottom: 8 }}>
                      <input
                        className="despensa-mono"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Cuota mensual"
                        value={editForm.cuota}
                        onChange={(e) => setEditForm({ ...editForm, cuota: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}
                      />
                      <SeccionDividirCuota
                        cuota={editForm.cuota}
                        dividirEnQuincenas={editForm.dividirEnQuincenas}
                        cuotaQ1={editForm.cuotaQ1}
                        cuotaQ2={editForm.cuotaQ2}
                        escenarioDivision={editForm.escenarioDivision}
                        semestresDivision={editForm.semestresDivision}
                        trimestresDivision={editForm.trimestresDivision}
                        mesesDivision={editForm.mesesDivision}
                        onChangeDividir={(val) => setEditForm((prev) => ({ ...prev, dividirEnQuincenas: val }))}
                        onChangeQ1={(val) => setEditForm((prev) => ({ ...prev, cuotaQ1: val }))}
                        onChangeQ2={(val) => setEditForm((prev) => ({ ...prev, cuotaQ2: val }))}
                        onChangeEscenario={(val) => setEditForm((prev) => ({ ...prev, escenarioDivision: val }))}
                        onChangeSemestres={(val) => setEditForm((prev) => ({ ...prev, semestresDivision: val }))}
                        onChangeTrimestres={(val) => setEditForm((prev) => ({ ...prev, trimestresDivision: val }))}
                        onChangeMeses={(val) => setEditForm((prev) => ({ ...prev, mesesDivision: val }))}
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
                        Agrega cada cuota con su fecha y monto exactos:
                      </div>
                      {editForm.cuotasPersonalizadas.map((c, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <input
                            type="date"
                            value={c.fecha}
                            onChange={(e) => {
                              const list = [...editForm.cuotasPersonalizadas];
                              list[idx] = { ...list[idx], fecha: e.target.value };
                              setEditForm({ ...editForm, cuotasPersonalizadas: list });
                            }}
                            style={{ flex: 1, minWidth: 0, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                          />
                          <input
                            className="despensa-mono"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Monto"
                            value={c.monto}
                            onChange={(e) => {
                              const list = [...editForm.cuotasPersonalizadas];
                              list[idx] = { ...list[idx], monto: e.target.value };
                              setEditForm({ ...editForm, cuotasPersonalizadas: list });
                            }}
                            style={{ width: 90, flexShrink: 0, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                          />
                          <button
                            onClick={() => setEditForm({ ...editForm, cuotasPersonalizadas: editForm.cuotasPersonalizadas.filter((_, i) => i !== idx) })}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, flexShrink: 0, background: "transparent", border: "none", color: "var(--stamp)", cursor: "pointer" }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setEditForm({ ...editForm, cuotasPersonalizadas: [...editForm.cuotasPersonalizadas, { fecha: "", monto: "" }] })}
                        style={{ fontSize: 12, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        + Agregar cuota
                      </button>
                    </div>
                  )}

                  <SeccionCuentaDestino formState={editForm} setFormState={setEditForm} cuentas={cuentas} entidades={entidades} />

                  <input
                    placeholder="Notas (opcional)"
                    value={editForm.notas}
                    onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 10 }}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editForm.notificarWhatsapp}
                      onChange={(e) => setEditForm({ ...editForm, notificarWhatsapp: e.target.checked })}
                    />
                    Notificar pagos de este préstamo por WhatsApp
                  </label>
                  {editForm.notificarWhatsapp && (
                    <div style={{ fontSize: 11.5, color: entidades.find((e) => e.docId === editForm.entidadId)?.phone ? "var(--ink-soft)" : "var(--stamp)", marginBottom: 10 }}>
                      {entidades.find((e) => e.docId === editForm.entidadId)?.phone
                        ? `Se enviará al teléfono de la entidad: ${entidades.find((e) => e.docId === editForm.entidadId).phone}`
                        : "La entidad seleccionada no tiene teléfono registrado — agrégalo en Entidades para que la notificación funcione."}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={editSaving}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 500,
                        background: "var(--sage)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: editSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      <Check size={14} /> {editSaving ? "Guardando…" : "Guardar cambios"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 500,
                        background: "var(--card)",
                        color: "var(--ink-soft)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {editError && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>{editError}</div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span className="despensa-mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--stamp)" }}>
                        {p.numero}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Landmark size={13} style={{ color: "var(--ink-soft)" }} />
                        {p.entidadName || "Entidad no especificada"}
                      </span>
                      {p.tipo && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 12, background: "var(--sage-bg)", color: "var(--sage)" }}
                        >
                          {p.tipo}
                        </span>
                      )}
                      <EstadoBadge
                        estado={p.estado}
                        onChange={async (estado) => {
                          if (estado === "Pagado") {
                            setShowHistorico(true);
                            try {
                              localStorage.setItem("smart-finance-prestamos-historico-open", "1");
                            } catch {}
                          }
                          await updatePrestamoEstado(p.id, estado);
                        }}
                      />
                      {p.activoNombre && (
                        <span style={{ fontSize: 11, color: "var(--ink-soft)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Car size={11} />
                          {p.activoNombre}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleDetalles(p.id)}
                        title={detallesAbiertos[p.id] ? "Ocultar detalles secundarios" : "Ver detalles (plazo, tasa, proyección e historial)"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: "3px 8px",
                          background: detallesAbiertos[p.id] ? "var(--line-soft)" : "transparent",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--ink-soft)",
                          cursor: "pointer",
                        }}
                      >
                        {detallesAbiertos[p.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {detallesAbiertos[p.id] ? "Menos" : "Detalles"}
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        title="Editar préstamo"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 26,
                          height: 26,
                          background: "transparent",
                          color: "var(--ink-soft)",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirm("¿Eliminar este préstamo?")) deletePrestamo(p.id);
                        }}
                        title="Eliminar préstamo"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 26,
                          height: 26,
                          background: "transparent",
                          color: "var(--stamp)",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Fila compacta de cuenta destino */}
                  {(() => {
                    const esPT01 = p.numero === "PT01";
                    const metodo = p.metodoPago || "Transferencia";
                    const numCuenta = p.cuentaDestinoNumero || (esPT01 ? "0002804611" : "");
                    const banco = p.cuentaDestinoBanco || (esPT01 ? "Banco Popular" : (p.entidadName || "Banco"));
                    const beneficiario = p.cuentaDestinoBeneficiario || (esPT01 ? "Julian Ochoa" : "");

                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 10.5,
                            padding: "1px 6px",
                            borderRadius: 5,
                            background: "var(--paper)",
                            border: "1px solid var(--line)",
                            color: "var(--ink)",
                            fontWeight: 500,
                          }}
                        >
                          <ArrowLeftRight size={10} style={{ color: "var(--sage)" }} />
                          {metodo}
                        </span>

                        {numCuenta && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              padding: "1px 7px",
                              borderRadius: 5,
                              background: "rgba(59, 130, 246, 0.08)",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                              color: "var(--ink)",
                            }}
                          >
                            <Landmark size={10} style={{ color: "#2563eb" }} />
                            <span>
                              <strong>{banco}:</strong> <span className="despensa-mono">{numCuenta}</span>
                              {beneficiario ? ` (${beneficiario})` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copiarCuenta(numCuenta, p.id);
                              }}
                              title="Copiar número de cuenta destino"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                background: "transparent",
                                border: "none",
                                color: copiadoId === p.id ? "var(--sage)" : "#2563eb",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "0 2px",
                              }}
                            >
                              {copiadoId === p.id ? <Check size={10} /> : <Copy size={10} />}
                              {copiadoId === p.id ? "Copiado" : "Copiar"}
                            </button>
                          </span>
                        )}

                        {p.notificarWhatsapp && (
                          <span
                            title={
                              entidades.find((e) => e.docId === p.entidadId)?.phone
                                ? `Notifica pagos a ${entidades.find((e) => e.docId === p.entidadId).phone}`
                                : "Notificación activa, pero la entidad no tiene teléfono registrado"
                            }
                            style={{ display: "inline-flex", alignItems: "center", color: entidades.find((e) => e.docId === p.entidadId)?.phone ? "var(--sage)" : "var(--stamp)" }}
                          >
                            <MessageCircle size={12} />
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Métricas esenciales siempre visibles en una sola fila compacta */}
                  {(() => {
                    const cuotasInfo = obtenerInfoCuotasPrestamo(p, movimientos);
                    const pagado = pagadoPorPrestamo[p.id] || 0;
                    const pendiente = Math.max((Number(p.montoAprobado) || 0) - pagado, 0);
                    const pct = p.montoAprobado ? Math.min(100, Math.round((pagado / p.montoAprobado) * 100)) : 0;
                    const expandido = !!detallesAbiertos[p.id];

                    return (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))", gap: 8, alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 9.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Cuota mensual</div>
                            <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 1 }}>
                              {p.cuota != null ? formatMoney(p.cuota) : "—"}
                            </div>
                            {p.dividirEnQuincenas && p.cuota != null && (
                              <>
                                <div style={{ fontSize: 10, color: "var(--sage)", fontWeight: 600, marginTop: 2 }}>
                                  Q1: {formatMoney(p.cuotaQ1 != null ? p.cuotaQ1 : Math.round(p.cuota / 2))} · Q2: {formatMoney(p.cuotaQ2 != null ? p.cuotaQ2 : p.cuota - Math.round(p.cuota / 2))}
                                </div>
                                <div style={{ fontSize: 9.5, color: "var(--ink-soft)", marginTop: 1 }}>
                                  {describirEscenarioDivision(p)}
                                </div>
                              </>
                            )}
                            {p.frecuenciaCuota === "Mensual" && p.cuota > 0 && p.estado !== "Pagado" && (
                              <button
                                type="button"
                                onClick={() => abrirModalDividir(p)}
                                title={p.dividirEnQuincenas ? "Modificar división de cuota entre quincenas y escenarios" : "Dividir cuota entre Q1 y Q2 para ir más flojo"}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  marginTop: 4,
                                  padding: "2px 7px",
                                  borderRadius: 5,
                                  border: `1px solid ${p.dividirEnQuincenas ? "rgba(16, 185, 129, 0.35)" : "var(--line)"}`,
                                  background: p.dividirEnQuincenas ? "rgba(16, 185, 129, 0.12)" : "var(--paper)",
                                  color: p.dividirEnQuincenas ? "var(--sage)" : "var(--ink-soft)",
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                <Scissors size={10} />
                                {p.dividirEnQuincenas ? "Dividida (Ajustar)" : "Dividir en 2 quincenas"}
                              </button>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 9.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Falta por pagar</div>
                            <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 700, color: pendiente > 0 ? "var(--stamp)" : "var(--sage)", marginTop: 1 }}>
                              {formatMoney(pendiente)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 9.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Aprobado</div>
                            <div className="despensa-mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", marginTop: 1 }}>
                              {formatMoney(p.montoAprobado)}
                            </div>
                          </div>
                          {cuotasInfo.totalCuotas != null && (
                            <div>
                              <div style={{ fontSize: 9.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Progreso cuotas</div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginTop: 1 }}>
                                <strong style={{ color: "var(--sage)" }}>{cuotasInfo.cuotasPagadas}</strong> de {cuotasInfo.totalCuotas} <span style={{ fontSize: 10.5, fontWeight: 400, color: "var(--ink-soft)" }}>({pct}%)</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Barra delgada de progreso */}
                        <div style={{ height: 4, borderRadius: 2, background: "var(--line-soft)", overflow: "hidden", marginTop: 7 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "var(--sage)", borderRadius: 2 }} />
                        </div>

                        {/* Detalles secundarios plegables */}
                        {expandido && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 8 }}>
                              <Field label="Plazo" value={p.plazo ? `${p.plazo} ${p.plazoUnidad || "meses"}` : "—"} />
                              <Field label="Tasa interés" value={p.tasaInteres != null ? `${p.tasaInteres}%` : "—"} />
                              <Field
                                label="Inicio"
                                value={
                                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <Calendar size={11} /> {formatDateDisplay(p.fechaInicio)}
                                  </span>
                                }
                              />
                              <Field label="Total pagado" value={<span style={{ color: "var(--sage)" }}>{formatMoney(pagado)}</span>} />
                            </div>

                            {(() => {
                              const proyeccion = calcularProyeccionPago(p, movimientos);
                              if (!proyeccion || proyeccion.yaSaldado) return null;
                              const fechaTexto = proyeccion.fechaProyectada.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
                              let comparacion = null;
                              if (proyeccion.diasDiferencia != null) {
                                if (proyeccion.diasDiferencia > 15) {
                                  comparacion = { texto: `${Math.round(proyeccion.diasDiferencia / 30)} meses más tarde de lo planeado`, color: "var(--stamp)" };
                                } else if (proyeccion.diasDiferencia < -15) {
                                  comparacion = { texto: `${Math.round(Math.abs(proyeccion.diasDiferencia) / 30)} meses antes de lo planeado`, color: "var(--sage)" };
                                } else {
                                  comparacion = { texto: "según lo planeado", color: "var(--ink-soft)" };
                                }
                              }
                              return (
                                <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.4, marginBottom: 8 }}>
                                  📈 A tu ritmo actual, quedaría saldado el <strong style={{ color: "var(--ink)" }}>{fechaTexto}</strong>
                                  {comparacion && (
                                    <span style={{ color: comparacion.color }}> — {comparacion.texto}</span>
                                  )}
                                </div>
                              );
                            })()}

                            <HistorialCuotasPagadas prestamo={p} movimientos={movimientos} />

                            {p.esRevolvente && (() => {
                              const limite = Number(p.montoAprobado) || 0;
                              const usado = Number(p.saldoActual) || 0;
                              const disponible = Math.max(limite - usado, 0);
                              const pctUsado = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
                              const minimoRetiro = p.montoMinimoRetiro;
                              const puedeRetirar = minimoRetiro != null ? disponible >= minimoRetiro : disponible > 0;
                              const barColor = pctUsado >= 90 ? "var(--stamp)" : pctUsado >= 60 ? "var(--amber)" : "var(--sage)";
                              const abierto = revolventeAbiertoId === p.id;
                              return (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
                                  <button
                                    onClick={() => setRevolventeAbiertoId(abierto ? null : p.id)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 10.5,
                                      color: "var(--ink-soft)",
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      padding: 0,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.03em",
                                    }}
                                  >
                                    <RotateCcw size={11} />
                                    Línea revolvente
                                    {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  </button>

                                  {abierto && (
                                    <div style={{ marginTop: 6 }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
                                        <Field label="Disponible para retirar" value={<span style={{ color: puedeRetirar ? "var(--sage)" : "var(--stamp)" }}>{formatMoney(disponible)}</span>} />
                                        <Field label="Saldo utilizado" value={formatMoney(usado)} />
                                      </div>
                                      <div style={{ height: 4, borderRadius: 2, background: "var(--line-soft)", overflow: "hidden", marginBottom: 5 }}>
                                        <div style={{ height: "100%", width: `${pctUsado}%`, background: barColor, borderRadius: 2 }} />
                                      </div>
                                      <div
                                        className="despensa-tab-font"
                                        style={{
                                          fontSize: 10.5,
                                          fontWeight: 600,
                                          display: "inline-block",
                                          padding: "1px 7px",
                                          borderRadius: 10,
                                          background: puedeRetirar ? "var(--sage-bg)" : "var(--stamp-bg)",
                                          color: puedeRetirar ? "var(--sage)" : "var(--stamp)",
                                        }}
                                      >
                                        {puedeRetirar
                                          ? "Puedes volver a retirar"
                                          : minimoRetiro != null
                                          ? `Necesitas pagar más (mínimo ${formatMoney(minimoRetiro)} disponible)`
                                          : "Sin disponible para retirar"}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {p.notas && (
                              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 6, borderTop: "1px solid var(--line-soft)", paddingTop: 6 }}>
                                {p.notas}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {prestamosPagados.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button
            onClick={() => {
              setShowHistorico((s) => {
                const next = !s;
                try {
                  localStorage.setItem("smart-finance-prestamos-historico-open", next ? "1" : "0");
                } catch {}
                return next;
              });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              fontSize: 12.5,
              fontWeight: 500,
              background: "var(--card)",
              color: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              cursor: "pointer",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check size={13} style={{ color: "var(--sage)" }} /> Histórico de préstamos saldados ({prestamosPagados.length})
            </span>
            {showHistorico ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showHistorico && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {prestamosPagados.map((p) => (
                <div
                  key={p.id}
                  data-record-id={p.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "var(--paper)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    opacity: 0.85,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={12} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.numero}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.entidadName || "Sin entidad"}</div>
                      {(() => {
                        const info = obtenerInfoCuotasPrestamo(p, movimientos);
                        if (!info.totalCuotas) return null;
                        return (
                          <div style={{ fontSize: 11, color: "var(--sage)", marginTop: 2, fontWeight: 500 }}>
                            {info.totalCuotas} de {info.totalCuotas} cuotas saldadas (0 pendientes)
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <EstadoBadge
                      estado={p.estado}
                      onChange={(nuevoEstado) => updatePrestamoEstado(p.id, nuevoEstado)}
                    />
                    <div className="despensa-mono" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                      {formatMoney(p.montoAprobado)}
                    </div>
                    <button
                      onClick={() => startEdit(p)}
                      title="Editar (por ejemplo, para corregir sus cuotas)"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        background: "transparent",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                  </div>
                  <HistorialCuotasPagadas prestamo={p} movimientos={movimientos} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalDividir && (
        <ModalDividirCuotaRapido
          modalDividir={modalDividir}
          setModalDividir={setModalDividir}
          onGuardar={guardarModalDividir}
        />
      )}
    </div>
  );
}

function SeccionCuentaDestino({ formState, setFormState, cuentas, entidades }) {
  const handleSeleccionarCuentaRegistrada = (cuentaId) => {
    if (!cuentaId) {
      setFormState((prev) => ({ ...prev, cuentaDestinoId: "" }));
      return;
    }
    const c = (cuentas || []).find((cta) => cta.id === cuentaId);
    if (c) {
      setFormState((prev) => ({
        ...prev,
        cuentaDestinoId: c.id,
        cuentaDestinoBanco: c.entidadName || prev.cuentaDestinoBanco || "",
        cuentaDestinoNumero: c.numeroCuenta || prev.cuentaDestinoNumero || "",
        cuentaDestinoBeneficiario: c.nombre || prev.cuentaDestinoBeneficiario || "",
        cuentaDestinoTipo: c.tipo ? `Cuenta de ${c.tipo}` : prev.cuentaDestinoTipo || "Cuentas de Terceros",
      }));
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 10,
        background: "var(--paper)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <CreditCard size={14} style={{ color: "var(--ink-soft)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
          Método de pago y cuenta destino
        </span>
      </div>

      <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>
            Método de pago
          </label>
          <select
            value={formState.metodoPago || "Transferencia"}
            onChange={(e) => setFormState((prev) => ({ ...prev, metodoPago: e.target.value }))}
            style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--card)" }}
          >
            {METODOS_PAGO_PRESTAMO.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>
            Cuenta registrada (opcional)
          </label>
          <select
            value={formState.cuentaDestinoId || ""}
            onChange={(e) => handleSeleccionarCuentaRegistrada(e.target.value)}
            style={{ width: "100%", padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--card)" }}
          >
            <option value="">Seleccionar cuenta guardada…</option>
            {(cuentas || []).map((cta) => (
              <option key={cta.id} value={cta.id}>
                {cta.nombre} · {cta.entidadName || "Banco"} {cta.numeroCuenta ? `(${cta.numeroCuenta})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {formState.metodoPago === "Transferencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>
            Datos para la transferencia (se mostrarán como aviso al marcar el pago en el Checklist):
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>
                Entidad Bancaria
              </label>
              <input
                placeholder="Ej. Banco Popular"
                value={formState.cuentaDestinoBanco || ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, cuentaDestinoBanco: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>
                Tipo de producto
              </label>
              <select
                value={formState.cuentaDestinoTipo || TIPOS_CUENTA_DESTINO[0]}
                onChange={(e) => setFormState((prev) => ({ ...prev, cuentaDestinoTipo: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, background: "var(--card)" }}
              >
                {TIPOS_CUENTA_DESTINO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>
                Número de cuenta / producto
              </label>
              <input
                className="despensa-mono"
                placeholder="Ej. 0002804611"
                value={formState.cuentaDestinoNumero || ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, cuentaDestinoNumero: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 2 }}>
                Nombre del beneficiario
              </label>
              <input
                placeholder="Ej. Julian Ochoa"
                value={formState.cuentaDestinoBeneficiario || ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, cuentaDestinoBeneficiario: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div className="despensa-mono" style={{ fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function HistorialCuotasPagadas({ prestamo, movimientos }) {
  const [abierto, setAbierto] = useState(false);
  const totalCuotasPlan = prestamo?.frecuenciaCuota === "Personalizado"
    ? (prestamo.cuotasPersonalizadas || []).length
    : prestamo?.plazo
    ? (prestamo.plazoUnidad === "años" ? (Number(prestamo.plazo) || 0) * 12 : Number(prestamo.plazo) || 0)
    : null;

  const pagos = useMemo(() => {
    // Obtenemos los pagos ordenados cronológicamente (más antiguo primero) para numerar las cuotas
    const pagosCronologicos = (movimientos || [])
      .filter((m) => m.category === "Pago de préstamo" && (m.prestamoId === prestamo.id || (m.prestamoNumero && m.prestamoNumero === prestamo.numero)))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

    // Asignamos el número de cuota ordinal a cada pago
    const mapeados = pagosCronologicos.map((p, idx) => ({
      ...p,
      numeroCuota: idx + 1,
      totalCuotasPlan,
    }));

    // Mostramos el listado ordenado del más reciente al más antiguo
    return mapeados.reverse();
  }, [movimientos, prestamo, totalCuotasPlan]);

  const cuotasPendientes = totalCuotasPlan != null ? Math.max(0, totalCuotasPlan - pagos.length) : null;

  return (
    <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 7 }}>
      <button
        type="button"
        onClick={() => setAbierto((value) => !value)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "transparent", color: "var(--sage)", fontSize: 11.5, cursor: "pointer" }}
      >
        <Check size={12} />
        {prestamo.estado === "Pagado" ? (
          <>Cuotas saldadas ({pagos.length}{totalCuotasPlan ? ` de ${totalCuotasPlan}` : ""})</>
        ) : totalCuotasPlan ? (
          <>
            Cuotas pagadas ({pagos.length} de {totalCuotasPlan} · quedan <strong style={{ color: cuotasPendientes > 0 ? "var(--stamp)" : "var(--sage)" }}>{cuotasPendientes}</strong>)
          </>
        ) : (
          <>Cuotas pagadas ({pagos.length})</>
        )}
        {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {abierto && (
        pagos.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
            {pagos.map((pago) => (
              <div key={pago.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: "var(--card)", fontSize: 11.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span
                    className="despensa-mono"
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 6,
                      background: "var(--sage-bg)",
                      color: "var(--sage)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Cuota #{pago.numeroCuota}{pago.totalCuotasPlan ? ` de ${pago.totalCuotasPlan}` : ""}
                  </span>
                  <span style={{ color: "var(--ink-soft)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {formatDateDisplay(pago.date) || "Fecha no disponible"}
                    {pago.metodoPago ? ` · ${pago.metodoPago}` : ""}
                  </span>
                </div>
                <strong className="despensa-mono" style={{ color: "var(--sage)", whiteSpace: "nowrap" }}>{formatMoney(Number(pago.amount) || 0)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 7, fontSize: 11, color: "var(--ink-soft)" }}>Aún no hay cuotas registradas como pagadas.</div>
        )
      )}
    </div>
  );
}

function EstadoBadge({ estado, onChange }) {
  const colors = {
    Activo: { bg: "var(--sage-bg)", color: "var(--sage)" },
    Pagado: { bg: "var(--line-soft)", color: "var(--ink-soft)" },
    "En mora": { bg: "var(--stamp-bg)", color: "var(--stamp)" },
  };
  const c = colors[estado] || colors.Activo;
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 6px",
        borderRadius: 20,
        border: "none",
        background: c.bg,
        color: c.color,
        cursor: "pointer",
      }}
    >
      {ESTADOS.map((e) => (
        <option key={e} value={e}>{e}</option>
      ))}
    </select>
  );
}

function SummaryCard({ label, value, mono, color }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 10, color: "var(--ink-soft)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div
        className={mono ? "despensa-mono" : "despensa-tab-font"}
        style={{ fontSize: "clamp(11px, 2.2vw, 15px)", fontWeight: 600, color: color || "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
