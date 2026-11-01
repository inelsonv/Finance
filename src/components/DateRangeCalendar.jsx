import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function construirGrilla(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day, dateStr: toDateStr(y, m, day), currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(year, month, d), currentMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: nextDay, dateStr: toDateStr(y, m, nextDay), currentMonth: false });
    nextDay++;
  }
  return cells;
}

function diasEntre(inicio, fin) {
  if (!inicio || !fin) return 0;
  const a = new Date(inicio + "T00:00:00");
  const b = new Date(fin + "T00:00:00");
  const dias = Math.round((b - a) / 86400000) + 1;
  return dias > 0 ? dias : 0;
}

// Selector de calendario visual para elegir un rango de fechas (ida y vuelta).
// Al abrir, se posiciona en el mes de la fecha de inicio si ya hay una elegida.
export default function DateRangeCalendar({ fechaInicio, fechaFin, onChange }) {
  const [viewDate, setViewDate] = useState(() => {
    const base = fechaInicio || fechaFin;
    return base ? new Date(base + "T00:00:00") : new Date();
  });

  const grilla = useMemo(() => construirGrilla(viewDate), [viewDate]);
  const dias = diasEntre(fechaInicio, fechaFin);

  const irMes = (delta) => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(1);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const onClickDia = (dateStr) => {
    if (!fechaInicio || (fechaInicio && fechaFin)) {
      // Empieza una selección nueva.
      onChange({ fechaInicio: dateStr, fechaFin: "" });
    } else if (dateStr < fechaInicio) {
      onChange({ fechaInicio: dateStr, fechaFin: fechaInicio });
    } else {
      onChange({ fechaInicio, fechaFin: dateStr });
    }
  };

  const enRango = (dateStr) => fechaInicio && fechaFin && dateStr >= fechaInicio && dateStr <= fechaFin;
  const esExtremo = (dateStr) => dateStr === fechaInicio || dateStr === fechaFin;

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => irMes(-1)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronLeft size={13} />
        </button>
        <span className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 600 }}>
          {NOMBRES_MES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => irMes(1)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, border: "1px solid var(--line)", borderRadius: 6, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9.5, color: "var(--ink-soft)", padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {grilla.map((cell) => {
          const rango = enRango(cell.dateStr);
          const extremo = esExtremo(cell.dateStr);
          return (
            <button
              type="button"
              key={cell.dateStr}
              onClick={() => onClickDia(cell.dateStr)}
              style={{
                aspectRatio: "1 / 1",
                fontSize: 11,
                borderRadius: 6,
                border: "none",
                background: extremo ? "var(--sage)" : rango ? "var(--sage-bg)" : "transparent",
                color: extremo ? "#fff" : cell.currentMonth ? "var(--ink)" : "var(--ink-soft)",
                opacity: cell.currentMonth ? 1 : 0.4,
                cursor: "pointer",
                fontWeight: extremo ? 700 : 400,
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 11.5, color: dias > 0 ? "var(--sage)" : "var(--ink-soft)", textAlign: "center" }}>
        {dias > 0
          ? `${dias} día${dias !== 1 ? "s" : ""} seleccionado${dias !== 1 ? "s" : ""}`
          : fechaInicio
          ? "Elige la fecha de regreso"
          : "Toca el primer día de tus vacaciones"}
      </div>
    </div>
  );
}
