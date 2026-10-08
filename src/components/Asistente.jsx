import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Plus, X } from "lucide-react";
import { crearAsistenteChat, guardarAsistenteChat, preguntarAsistente, watchAsistenteChat, watchAsistenteChats, watchPresupuestosHistoricos } from "../lib/db";
import { construirResumenFinanciero } from "../lib/resumenFinanciero";

const SUGERENCIAS = [
  "¿Cómo voy con el pago de mis deudas y puntos? 🚀",
  "¿Cuál es mi siguiente deuda según mi estrategia?",
  "¿Qué pagos debería priorizar esta quincena?",
  "¿Cuánto he gastado este mes y en qué categoría?",
  "¿Cuánto presupuesto me queda disponible?",
];

export default function Asistente({
  movimientos,
  presupuesto,
  presupuestoYear,
  prestamos,
  tarjetas,
  cuentas,
  fuentesIngreso,
  puntos,
  diasCobro,
  categoriasGasto,
  checklistTodos,
  membresias,
  contratos,
  activos,
  metasAhorro,
  seguros,
  ingresosPuntuales,
  eventos,
  onClose,
  onNavigate,
  ultimoPagoDeuda,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [cargandoChats, setCargandoChats] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [presupuestosHistoricos, setPresupuestosHistoricos] = useState({});
  const [pagoDeudaDetectado, setPagoDeudaDetectado] = useState(() => {
    if (ultimoPagoDeuda) return ultimoPagoDeuda;
    try {
      const stored = sessionStorage.getItem("ultimoPagoDeudaAgente");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - (parsed.timestamp || 0) < 1000 * 60 * 30) return parsed;
      }
    } catch (_) {}
    return null;
  });
  const scrollRef = useRef(null);
  const chatCreadoPendiente = useRef(null);

  useEffect(() => {
    if (ultimoPagoDeuda) setPagoDeudaDetectado(ultimoPagoDeuda);
  }, [ultimoPagoDeuda]);

  useEffect(() => {
    const handler = (e) => {
      const { puntos, mensaje } = e.detail || {};
      setPagoDeudaDetectado({ puntos, mensaje, timestamp: Date.now() });
    };
    window.addEventListener("agenteCelebrarPagoDeuda", handler);
    return () => window.removeEventListener("agenteCelebrarPagoDeuda", handler);
  }, []);

  useEffect(() => {
    return watchPresupuestosHistoricos(setPresupuestosHistoricos, (err) => {
      console.error("No se pudieron cargar los presupuestos históricos:", err);
    });
  }, []);

  useEffect(() => {
    return watchAsistenteChats((lista) => {
      setChats(lista);
      setCargandoChats(false);
    }, () => {
      setCargandoChats(false);
      setError("No se pudo cargar el historial de conversaciones.");
    });
  }, []);

  useEffect(() => {
    if (cargandoChats) return;
    if (!chats.length) return;
    if (chatId && chatCreadoPendiente.current === chatId) {
      if (chats.some((chat) => chat.id === chatId)) chatCreadoPendiente.current = null;
      else return;
    }
    if (!chatId || !chats.some((chat) => chat.id === chatId)) setChatId(chats[0].id);
  }, [chats, cargandoChats, chatId]);

  useEffect(() => {
    if (!chatId) {
      setMensajes([]);
      setCargandoMensajes(false);
      return;
    }
    setMensajes([]);
    setCargandoMensajes(true);
    return watchAsistenteChat(chatId, (chat) => {
      setMensajes(Array.isArray(chat?.mensajes) ? chat.mensajes : []);
      setCargandoMensajes(false);
    }, () => {
      setCargandoMensajes(false);
      setError("No se pudo abrir esta conversación.");
    });
  }, [chatId]);

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
      let idConversacion = chatId;
      const tituloGuardado = chats.find((chat) => chat.id === idConversacion)?.titulo;
      const titulo = tituloGuardado && tituloGuardado !== "Nueva conversación" ? tituloGuardado : pregunta.slice(0, 52);
      if (!idConversacion) {
        try {
          idConversacion = await crearAsistenteChat(titulo, nuevosMensajes);
          chatCreadoPendiente.current = idConversacion;
          setChatId(idConversacion);
        } catch (err) {
          // El asistente sigue respondiendo aunque no se pueda guardar el historial.
          setError("No se pudo guardar el historial; intentaré responder de todos modos.");
        }
      }

      const resumen = construirResumenFinanciero({
        movimientos,
        presupuesto,
        presupuestoYear,
        presupuestosHistoricos,
        prestamos,
        tarjetas,
        cuentas,
        fuentesIngreso,
        puntos,
        diasCobro,
        categoriasGasto,
        checklistTodos,
        membresias,
        contratos,
        activos,
        metasAhorro,
        seguros,
        ingresosPuntuales,
        eventos,
      });
      // Limita el historial enviado para no elevar innecesariamente el consumo TPM.
      const historialParaEnviar = mensajes.slice(-4).map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
      if (historialParaEnviar.at(-1)?.role === "user") historialParaEnviar.pop();
      if (idConversacion) {
        try {
          await guardarAsistenteChat(idConversacion, titulo, nuevosMensajes);
        } catch (err) {
          setError("No se pudo guardar el historial; la respuesta seguirá disponible en esta sesión.");
        }
      }
      const { respuesta } = await preguntarAsistente(pregunta, resumen, historialParaEnviar);
      const mensajesCompletos = [...nuevosMensajes, { role: "assistant", content: respuesta }];
      setMensajes(mensajesCompletos);
      if (idConversacion) {
        try {
          await guardarAsistenteChat(idConversacion, titulo, mensajesCompletos);
        } catch (err) {
          setError("Recibí la respuesta, pero no se pudo guardar en el historial.");
        }
      }
    } catch (err) {
      setError(err.message || String(err));
      setMensajes(nuevosMensajes);
    } finally {
      setEnviando(false);
    }
  };

  return (
      <div className="despensa-asistente" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", maxHeight: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Sparkles size={17} style={{ color: "var(--sage)" }} />
        <span className="despensa-tab-font" style={{ fontSize: 15, fontWeight: 700 }}>Asistente</span>
        <button
          onClick={async () => {
            if (enviando) return;
            setError(null);
            try {
              const id = await crearAsistenteChat("Nueva conversación");
              chatCreadoPendiente.current = id;
              setChatId(id);
              setMensajes([]);
            } catch (err) {
              setError(err.message || "No se pudo crear una conversación.");
            }
          }}
          disabled={enviando}
          style={{ marginLeft: onClose ? 0 : "auto", display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)", borderRadius: 9, background: "var(--card)", color: "var(--ink-soft)", padding: "6px 9px", cursor: "pointer", fontSize: 12 }}
        >
          <Plus size={14} /> Nuevo chat
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar asistente"
            title="Cerrar"
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid var(--line)", borderRadius: 8, background: "var(--card)", color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {chats.length > 0 && (
        <select
          aria-label="Conversaciones guardadas"
          value={chatId || ""}
          onChange={(e) => { setError(null); setChatId(e.target.value); }}
          disabled={enviando || cargandoChats || cargandoMensajes}
          style={{ width: "100%", marginBottom: 10, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 9, background: "var(--card)", color: "var(--ink)", fontSize: 12.5 }}
        >
          {chats.map((chat) => <option key={chat.id} value={chat.id}>{chat.titulo || "Conversación"}</option>)}
        </select>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
        {pagoDeudaDetectado && (
          <div
            style={{
              padding: "11px 13px",
              borderRadius: 13,
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(16, 185, 129, 0.12))",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 7,
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.1)",
              marginBottom: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                <span>🚀 Hito Financiero Detectado</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f59e0b", color: "#fff", fontWeight: 800 }}>
                  +{pagoDeudaDetectado.puntos || 0} pts
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPagoDeudaDetectado(null);
                  try { sessionStorage.removeItem("ultimoPagoDeudaAgente"); } catch (_) {}
                }}
                style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 2 }}
                title="Descartar aviso"
              >
                <X size={13} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>
              ¡Excelente trabajo amortizando a tu deuda! Como tu agente financiero, puedo ayudarte a analizar tu próximo objetivo y calcular tu ahorro de intereses.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
              <button
                type="button"
                onClick={() => enviarPregunta("¿Cómo impactó mi último pago en mi deuda y qué me recomiendas hacer ahora según mi estrategia?")}
                style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--line)", cursor: "pointer", color: "var(--ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Sparkles size={13} style={{ color: "var(--sage)" }} />
                Analizar impacto con el agente
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate("estrategia-deudas");
                    onClose?.();
                  }}
                  style={{ fontSize: 11.5, padding: "5px 10px", borderRadius: 8, background: "var(--sage)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  🎯 Ver Estrategia de deudas
                </button>
              )}
            </div>
          </div>
        )}

        {cargandoMensajes && (
          <div style={{ alignSelf: "center", padding: "1rem", color: "var(--ink-soft)", fontSize: 12.5 }}>Cargando conversación…</div>
        )}

        {mensajes.length === 0 && !cargandoMensajes && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
              Pregúntame por tus gastos, la quincena actual, el presupuesto o qué pagos priorizar.
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
          Aviso: {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarPregunta()}
          placeholder="Escribe tu pregunta…"
          maxLength={2000}
          disabled={enviando || cargandoChats || cargandoMensajes}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5 }}
        />
        <button
          onClick={() => enviarPregunta()}
          disabled={enviando || cargandoChats || cargandoMensajes || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "none",
            background: enviando || cargandoChats || cargandoMensajes || !input.trim() ? "var(--line)" : "var(--sage)",
            color: "#fff",
            cursor: enviando || cargandoChats || cargandoMensajes || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
