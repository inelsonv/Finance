import React, { useState } from "react";
import { X, Zap, DollarSign, Check, Calendar, AlertCircle } from "lucide-react";
import { updateContrato, setPresupuestoCelda } from "../lib/db";

const MONTOS_RAPIDOS = [300, 500, 800, 1000, 1500, 2000, 3000];

export default function ModalPresupuestarServicio({
  isOpen,
  onClose,
  contrato,
  year = new Date().getFullYear(),
  onSuccess,
}) {
  if (!isOpen || !contrato) return null;

  const [monto, setMonto] = useState(
    contrato.montoEstimado ? String(contrato.montoEstimado) : ""
  );
  const [tambienEnMatriz, setTambienEnMatriz] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const num = Number(monto);
    if (!num || num <= 0) {
      setError("Por favor ingresa un monto estimado válido (mayor a 0).");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      // 1. Actualizar el contrato con su monto estimado recurrente
      await updateContrato(contrato.id, {
        montoEstimado: num,
      });

      // 2. Si el usuario desea asignarlo también como celda de categoría explícita
      if (tambienEnMatriz) {
        const catNombre = contrato.nombre || contrato.tipo || "Servicios";
        const mesActual = new Date().getMonth() + 1;
        const quincena = Number(contrato.diaPago) <= 15 ? "Q1" : "Q2";

        // Asignar en la quincena correspondiente de todos los meses restantes del año
        for (let m = mesActual; m <= 12; m++) {
          await setPresupuestoCelda(year, catNombre, m, quincena, num);
        }
      }

      if (onSuccess) {
        onSuccess(contrato, num);
      }
      onClose();
    } catch (err) {
      console.error("Error al presupuestar servicio:", err);
      setError("No se pudo guardar el presupuesto del servicio. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          border: "1px solid var(--line)",
          maxWidth: 440,
          width: "100%",
          padding: 22,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--amber-bg)",
                color: "var(--amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Presupuestar servicio
              </h3>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
                {contrato.nombre} {contrato.tipo ? `· ${contrato.tipo}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-soft)",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            background: "var(--amber-bg)",
            border: "1px solid var(--amber)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            color: "var(--ink)",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <AlertCircle size={15} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 1 }} />
          <div>
            Este servicio vence el <strong>día {contrato.diaPago}</strong> de cada mes, pero no tiene un monto presupuestado.
            Al definirlo, se sumará automáticamente a tus compromisos y alertas de pago.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Monto estimado por pago ($)
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-soft)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                $
              </span>
              <input
                type="number"
                min="1"
                step="any"
                autoFocus
                placeholder="Ej. 850"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 26px",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: 15,
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Montos rápidos */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
              Montos rápidos:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MONTOS_RAPIDOS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonto(String(val))}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 500,
                    border: Number(monto) === val ? "1px solid var(--sage)" : "1px solid var(--line)",
                    background: Number(monto) === val ? "var(--sage-bg)" : "var(--paper)",
                    color: Number(monto) === val ? "var(--sage)" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  ${val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 18,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={tambienEnMatriz}
              onChange={(e) => setTambienEnMatriz(e.target.checked)}
              style={{ marginTop: 2, cursor: "pointer" }}
            />
            <span>
              Asignar también como casilla fija en la categoría <strong>"{contrato.nombre || contrato.tipo || "Servicios"}"</strong> del presupuesto anual {year}.
            </span>
          </label>

          {error && (
            <div
              style={{
                background: "var(--stamp-bg)",
                color: "var(--stamp)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 500,
                background: "transparent",
                color: "var(--ink-soft)",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando ? "Guardando…" : "Guardar en presupuesto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
