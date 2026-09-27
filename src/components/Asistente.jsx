import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Plus } from "lucide-react";
import { crearAsistenteChat, guardarAsistenteChat, preguntarAsistente, watchAsistenteChat, watchAsistenteChats, watchPresupuestosHistoricos } from "../lib/db";
import { construirResumenFinanciero } from "../lib/resumenFinanciero";

const SUGERENCIAS = [
  "¿Cuánto he gastado este mes?",
  "¿En qué categoría gasté más?",
  "¿Cuánto presupuesto me queda esta quincena?",
  "¿Qué pagos debería priorizar?",
  "¿Me estoy pasando del presupuesto en algo?",
];

export default function Asistente({ movimientos, presupuesto, presupuestoYear, prestamos, tarjetas, cuentas, fuentesIngreso, puntos, diasCobro, categoriasGasto, checklistTodos, membresias, contratos, activos, metasAhorro, seguros, ingresosPuntuales, eventos }) {
  const [mensajes, setMensajes] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [cargandoChats, setCargandoChats] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [presupuestosHistoricos, setPresupuestosHistoricos] = useState({});
  const scrollRef = useRef(null);
  const chatCreadoPendiente = useRef(null);

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
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, border: "1px solid var(--line)", borderRadius: 9, background: "var(--card)", color: "var(--ink-soft)", padding: "6px 9px", cursor: "pointer", fontSize: 12 }}
        >
          <Plus size={14} /> Nuevo chat
        </button>
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
