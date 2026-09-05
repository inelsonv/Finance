import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { preguntarAsistente } from "../lib/db";
import { construirResumenFinanciero } from "../lib/resumenFinanciero";

const SUGERENCIAS = [
  "¿Cuánto he gastado este mes?",
  "¿En qué categoría gasté más?",
  "¿Cuánto debo en total?",
  "¿Me estoy pasando del presupuesto en algo?",
];

export default function Asistente({ movimientos, presupuesto, presupuestoYear, prestamos, tarjetas, cuentas, fuentesIngreso, puntos, diasCobro }) {
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, enviando]);

  const enviarPregunta = async (texto) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || enviando) return;

    const nuevosMensajes = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(nuevosMensajes);
    setInput("");
    setEnviando(true);
    setError(null);

    try {
      const resumen = construirResumenFinanciero({
        movimientos,
        presupuesto,
        presupuestoYear,
        prestamos,
        tarjetas,
        cuentas,
        fuentesIngreso,
        puntos,
        diasCobro,
      });
      // Solo se manda el historial de texto (sin campos extra) para no
      // inflar la petición — los últimos 6 mensajes son de sobra para dar
      // contexto de seguimiento razonable.
      const historialParaEnviar = mensajes.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const { respuesta } = await preguntarAsistente(pregunta, resumen, historialParaEnviar);
      setMensajes([...nuevosMensajes, { role: "assistant", content: respuesta }]);
    } catch (err) {
      setError(err.message || String(err));
      setMensajes(nuevosMensajes);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", maxHeight: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Sparkles size={17} style={{ color: "var(--sage)" }} />
        <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Asistente</span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
              Pregúntame lo que quieras sobre tus finanzas — respondo con tus datos reales.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviarPregunta(s)}
                  style={{ padding: "7px 14px", fontSize: 12.5, borderRadius: 20, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "9px 13px",
              borderRadius: 14,
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--sage)" : "var(--card)",
              color: m.role === "user" ? "#fff" : "var(--ink)",
              border: m.role === "user" ? "none" : "1px solid var(--line)",
            }}
          >
            {m.content}
          </div>
        ))}

        {enviando && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)" }}>
            <Loader2 size={14} className="despensa-spin" style={{ color: "var(--ink-soft)" }} />
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Revisando tus datos…</span>
          </div>
        )}

        {error && (
          <div style={{ alignSelf: "flex-start", fontSize: 12, color: "var(--stamp)", padding: "6px 10px" }}>
            No se pudo responder: {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarPregunta()}
          placeholder="Escribe tu pregunta…"
          disabled={enviando}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5 }}
        />
        <button
          onClick={() => enviarPregunta()}
          disabled={enviando || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "none",
            background: enviando || !input.trim() ? "var(--line)" : "var(--sage)",
            color: "#fff",
            cursor: enviando || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
