import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from "lucide-react";

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateStr(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function construirGrilla(year, month) {
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

export default function CustomDatePicker({
  value = "",
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  min = null,
  max = null,
  style = {},
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha de visualización del calendario (mes y año que se están explorando)
  const [viewDate, setViewDate] = useState(() => {
    if (value && typeof value === "string") {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date();
  });

  const [modoSelector, setModoSelector] = useState("dias"); // 'dias' | 'meses' | 'anios'

  // Si cambia el valor desde afuera y el calendario no está abierto, sincronizar viewDate
  useEffect(() => {
    if (!isOpen && value) {
      const parts = value.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [value, isOpen]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setModoSelector("dias");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const yearActual = viewDate.getFullYear();
  const monthActual = viewDate.getMonth();

  const grilla = useMemo(() => construirGrilla(yearActual, monthActual), [yearActual, monthActual]);

  const irMes = (delta) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setDate(1);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const seleccionarDia = (dateStr) => {
    if (onChange) onChange(dateStr);
    setIsOpen(false);
    setModoSelector("dias");
  };

  const seleccionarHoy = () => {
    const hoy = new Date();
    const str = toDateStr(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (onChange) onChange(str);
    setViewDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setIsOpen(false);
    setModoSelector("dias");
  };

  const borrarFecha = (e) => {
    e.stopPropagation();
    if (onChange) onChange("");
    setIsOpen(false);
    setModoSelector("dias");
  };

  const aniosDisponibles = useMemo(() => {
    const actual = new Date().getFullYear();
    const list = [];
    for (let y = actual - 5; y <= actual + 6; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const hoyDateStr = useMemo(() => {
    const d = new Date();
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        display: "inline-block",
        ...style,
      }}
      className={className}
    >
      {/* Input / Botón Disparador */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen((s) => !s);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "7.5px 10px",
          background: "var(--card, #0f172a)",
          border: `1px solid ${isOpen ? "var(--sage, #0284c7)" : "var(--line, #334155)"}`,
          borderRadius: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 13,
          color: value ? "var(--ink, #fff)" : "var(--ink-soft, #94a3b8)",
          fontFamily: "inherit",
          userSelect: "none",
          transition: "all 0.15s ease",
          boxShadow: isOpen ? "0 0 0 2px rgba(2, 132, 199, 0.2)" : "none",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
          <CalendarIcon
            size={14}
            style={{
              color: value ? "var(--sage, #0284c7)" : "var(--ink-soft, #94a3b8)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "Inter, monospace",
              fontWeight: value ? 600 : 400,
            }}
          >
            {value ? formatDateDisplay(value) : placeholder}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={borrarFecha}
              title="Borrar fecha"
              style={{
                background: "transparent",
                border: "none",
                padding: "2px",
                color: "var(--ink-soft, #94a3b8)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-soft, #94a3b8)")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Popover / Calendario Desplegable Personalizado */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 9999,
            width: 290,
            background: "var(--card, #0f172a)",
            border: "1px solid var(--line, #334155)",
            borderRadius: 12,
            padding: 12,
            boxShadow: "0 16px 36px -4px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            animation: "fadeIn 0.15s ease",
            boxSizing: "border-box",
          }}
        >
          {/* Cabecera del Calendario */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: "1px solid var(--line-soft, #1e293b)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                onClick={() => setModoSelector(modoSelector === "meses" ? "dias" : "meses")}
                style={{
                  background: modoSelector === "meses" ? "rgba(2, 132, 199, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 6px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ink, #fff)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {NOMBRES_MES[monthActual]}
              </button>
              <button
                type="button"
                onClick={() => setModoSelector(modoSelector === "anios" ? "dias" : "anios")}
                style={{
                  background: modoSelector === "anios" ? "rgba(2, 132, 199, 0.15)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 6px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--sage, #0284c7)",
                  cursor: "pointer",
                }}
              >
                {yearActual}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                onClick={() => irMes(-1)}
                title="Mes anterior"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid var(--line-soft, #334155)",
                  background: "transparent",
                  color: "var(--ink, #fff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => irMes(1)}
                title="Mes siguiente"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  border: "1px solid var(--line-soft, #334155)",
                  background: "transparent",
                  color: "var(--ink, #fff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Selector Rápido de Meses */}
          {modoSelector === "meses" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
                padding: "8px 0",
              }}
            >
              {NOMBRES_MES.map((m, idx) => {
                const esActual = idx === monthActual;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(yearActual, idx, 1));
                      setModoSelector("dias");
                    }}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: esActual ? 700 : 500,
                      background: esActual ? "var(--sage, #0284c7)" : "rgba(255, 255, 255, 0.04)",
                      color: esActual ? "#fff" : "var(--ink, #fff)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selector Rápido de Años */}
          {modoSelector === "anios" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
                padding: "8px 0",
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {aniosDisponibles.map((y) => {
                const esActual = y === yearActual;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewDate(new Date(y, monthActual, 1));
                      setModoSelector("dias");
                    }}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: esActual ? 700 : 500,
                      background: esActual ? "var(--sage, #0284c7)" : "rgba(255, 255, 255, 0.04)",
                      color: esActual ? "#fff" : "var(--ink, #fff)",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Grilla Principal de Días */}
          {modoSelector === "dias" && (
            <>
              {/* Días de la semana */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 2,
                  marginBottom: 6,
                  textAlign: "center",
                }}
              >
                {DIAS_SEMANA.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: i >= 5 ? "var(--amber, #f59e0b)" : "var(--ink-soft, #94a3b8)",
                      padding: "2px 0",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Celdas de días */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 2,
                }}
              >
                {grilla.map(({ day, dateStr, currentMonth }) => {
                  const esSeleccionado = value === dateStr;
                  const esHoy = hoyDateStr === dateStr;
                  const deshabilitado = (min && dateStr < min) || (max && dateStr > max);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => seleccionarDia(dateStr)}
                      style={{
                        height: 32,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: esSeleccionado || esHoy ? 700 : 500,
                        border: esHoy && !esSeleccionado ? "1px solid var(--sage, #0284c7)" : "none",
                        background: esSeleccionado
                          ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                          : "transparent",
                        color: esSeleccionado
                          ? "#ffffff"
                          : currentMonth
                          ? "var(--ink, #f8fafc)"
                          : "var(--ink-soft, #475569)",
                        opacity: deshabilitado ? 0.25 : currentMonth ? 1 : 0.45,
                        cursor: deshabilitado ? "not-allowed" : "pointer",
                        transition: "all 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!esSeleccionado && !deshabilitado) {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!esSeleccionado && !deshabilitado) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Pie de acciones rápidas */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--line-soft, #1e293b)",
              fontSize: 11,
            }}
          >
            <button
              type="button"
              onClick={borrarFecha}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-soft, #94a3b8)",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-soft, #94a3b8)")}
            >
              Borrar
            </button>

            <button
              type="button"
              onClick={seleccionarHoy}
              style={{
                background: "rgba(2, 132, 199, 0.15)",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                color: "var(--sage, #0284c7)",
                fontWeight: 700,
                cursor: "pointer",
                padding: "3px 10px",
                borderRadius: 6,
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
