import React, { useState } from "react";
import { X, Check, TrendingDown } from "lucide-react";
import { addMovimiento } from "../lib/db";
import { GASTO_CATS_VARIABLE, GASTO_CATS_FIJO } from "../lib/categorias";

const METODOS = ["Efectivo", "Transferencia", "Tarjeta de crédito", "Débito", "Otro"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function QuickGasto({ categoriasGasto, onClose }) {
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);

  const categoriasPropias = (categoriasGasto || []).map((c) => c.nombre);
  const opciones = categoriasPropias.length > 0 ? categoriasPropias : [...GASTO_CATS_VARIABLE, ...GASTO_CATS_FIJO];

  const handleGuardar = async () => {
    if (!categoria) {
      setError("Elige una categoría");
      return;
    }
    const amount = parseFloat(monto);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addMovimiento({
        type: "Gasto",
        category: categoria,
        amount,
        description: nota.trim(),
        date: todayStr(),
        clasificacion: GASTO_CATS_FIJO.includes(categoria) ? "Fijo" : "Variable",
        metodoPago,
      });
      setGuardado(true);
      setTimeout(() => onClose(), 900);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--card)",
          borderTop: "1px solid var(--line)",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 4, background: "var(--line)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
            <TrendingDown size={17} style={{ color: "var(--stamp)" }} /> Registrar gasto
          </span>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "var(--paper)", border: "none", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>

        {guardado ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--sage)" }}>
            <Check size={28} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>Gasto registrado</div>
          </div>
        ) : (
          <>
            <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
              Categoría
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {opciones.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12.5,
                    fontWeight: 500,
                    borderRadius: 20,
                    border: `1px solid ${categoria === c ? "var(--sage)" : "var(--line)"}`,
                    background: categoria === c ? "var(--sage-bg)" : "var(--paper)",
                    color: categoria === c ? "var(--sage)" : "var(--ink)",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
              Monto
            </div>
            <input
              autoFocus
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 20, fontWeight: 600, marginBottom: 12 }}
            />

            <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
              Método de pago
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {METODOS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodoPago(m)}
                  style={{
                    padding: "6px 11px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: `1px solid ${metodoPago === m ? "var(--sage)" : "var(--line)"}`,
                    background: metodoPago === m ? "var(--sage-bg)" : "var(--paper)",
                    color: metodoPago === m ? "var(--sage)" : "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <input
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, marginBottom: 14 }}
            />

            <button
              onClick={handleGuardar}
              disabled={saving}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 600,
                background: "var(--stamp)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <Check size={16} /> {saving ? "Guardando…" : "Guardar gasto"}
            </button>
            {error && <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)", textAlign: "center" }}>{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
