import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2, Plus, X, Camera, Receipt, Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { crearAsistenteChat, guardarAsistenteChat, preguntarAsistente, watchAsistenteChat, watchAsistenteChats, watchPresupuestosHistoricos } from "../lib/db";
import { construirResumenFinanciero } from "../lib/resumenFinanciero";
import { procesarFacturaConCatalogo, aplicarFacturaACatalogoYMovimientos } from "../lib/facturaOcr";

const SUGERENCIAS = [
  "📷 ¿Cómo escaneo una factura para registrar gastos y catálogo?",
  "¿Cómo voy con el pago de mis deudas y puntos? 🚀",
  "¿Cuál es mi siguiente deuda según mi estrategia?",
  "¿Qué pagos debería priorizar esta quincena?",
  "¿Cuánto he gastado este mes y en qué categoría?",
];

function TarjetaFacturaChat({
  data,
  onGuardar,
  onAbrirModulo,
  guardado,
  guardando,
}) {
  const [expandido, setExpandido] = useState(false);
  const [metodoPago, setMetodoPago] = useState("Tarjeta");
  const [categoriaGasto, setCategoriaGasto] = useState("Alimentos");
  const [agregarNuevos, setAgregarNuevos] = useState(true);

  if (!data) return null;

  const items = data.items || [];
  const itemsAMostrar = expandido ? items : items.slice(0, 5);

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--card)",
        border: "1.5px solid var(--line)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line-soft)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Receipt size={17} style={{ color: "var(--sage)" }} />
          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{data.tienda || "Supermercado"}</span>
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--sage)", fontFamily: "monospace" }}>
          RD$ {(data.total || 0).toLocaleString("es", { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11.5 }}>
        <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(16, 185, 129, 0.12)", color: "#059669", fontWeight: 600 }}>
          ✓ {data.coincidencias?.length || 0} en catálogo
        </span>
        <span style={{ padding: "3px 8px", borderRadius: 999, background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: 600 }}>
          + {data.nuevos?.length || 0} nuevos
        </span>
        <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--card-soft, #f3f4f6)", color: "var(--ink-soft)" }}>
          📅 {data.fecha}
        </span>
      </div>

      {/* Lista de artículos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: expandido ? 260 : 180, overflowY: "auto", paddingRight: 4 }}>
        {itemsAMostrar.map((it, idx) => {
          const precioActual = it.nuevoPrecio || it.precioUnitario;
          const precioAnt = it.precioAnterior;
          const diferencia = it.diferenciaPrecio;

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: 8,
                background: it.esNuevo ? "rgba(59, 130, 246, 0.04)" : "rgba(16, 185, 129, 0.04)",
                border: "1px solid var(--line-soft)",
                fontSize: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.nombre}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                  Cant: {it.cantidad} {it.esNuevo ? "• Nuevo producto" : "• En catálogo"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>
                  ${precioActual?.toLocaleString("es", { minimumFractionDigits: 2 })}
                </div>
                {precioAnt !== null && precioAnt !== undefined && (
                  <div style={{ fontSize: 10, color: diferencia > 0 ? "#dc2626" : diferencia < 0 ? "#16a34a" : "var(--ink-soft)" }}>
                    Antes: ${precioAnt.toFixed(0)} {diferencia !== 0 ? `(${diferencia > 0 ? "+" : ""}${diferencia?.toFixed(0)})` : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 5 && (
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          style={{ background: "none", border: "none", color: "var(--sage)", fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "2px 0" }}
        >
          {expandido ? <>Menos detalles <ChevronUp size={13} /></> : <>Ver todos ({items.length}) <ChevronDown size={13} /></>}
        </button>
      )}

      {/* Opciones y confirmación */}
      {!guardado ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line-soft)", paddingTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 2 }}>Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ width: "100%", padding: "5px 6px", fontSize: 11.5, borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)" }}
              >
                <option value="Tarjeta">Tarjeta</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 2 }}>Categoría</label>
              <select
                value={categoriaGasto}
                onChange={(e) => setCategoriaGasto(e.target.value)}
                style={{ width: "100%", padding: "5px 6px", fontSize: 11.5, borderRadius: 6, border: "1px solid var(--line)", background: "var(--card)" }}
              >
                <option value="Alimentos">Alimentos</option>
                <option value="Supermercado">Supermercado</option>
                <option value="Higiene personal">Higiene</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-soft)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agregarNuevos}
              onChange={(e) => setAgregarNuevos(e.target.checked)}
            />
            Añadir artículos no existentes al catálogo
          </label>

          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
            <button
              type="button"
              disabled={guardando}
              onClick={() => onGuardar({ metodoPago, categoriaGasto, agregarNuevos })}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 12,
                cursor: guardando ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              {guardando ? <Loader2 size={13} className="despensa-spin" /> : <Check size={14} />}
              {guardando ? "Guardando…" : "Registrar Gasto y Precios"}
            </button>

            {onAbrirModulo && (
              <button
                type="button"
                onClick={onAbrirModulo}
                title="Editar en Escanear Factura completo"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 8, display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
          <Check size={16} /> Gasto guardado y precios actualizados en el Catálogo
        </div>
      )}
    </div>
  );
}

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
  products = [],
  ordenesCompra = [],
}) {
  const [mensajes, setMensajes] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [cargandoChats, setCargandoChats] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [guardandoFacturaIndex, setGuardandoFacturaIndex] = useState(null);
  const [error, setError] = useState(null);
  const [presupuestosHistoricos, setPresupuestosHistoricos] = useState({});
  const fileInputRef = useRef(null);
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

  const procesarFacturaSubida = async (file) => {
    if (!file || procesandoFactura) return;
    setProcesandoFactura(true);
    setError(null);

    let previewUrl = null;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch (_) {}

    const mensajeUsuario = {
      role: "user",
      content: "📷 Foto de factura de supermercado adjuntada para registrar gastos y catálogo.",
      imagenPreview: previewUrl,
    };

    const nuevosMensajes = [...mensajes, mensajeUsuario];
    setMensajes(nuevosMensajes);

    try {
      let idConversacion = chatId;
      if (!idConversacion) {
        try {
          idConversacion = await crearAsistenteChat("Factura de supermercado", nuevosMensajes);
          chatCreadoPendiente.current = idConversacion;
          setChatId(idConversacion);
        } catch (_) {}
      }

      const resultado = await procesarFacturaConCatalogo(file, products);

      const mensajeAsistente = {
        role: "assistant",
        content: `🧾 **Factura de ${resultado.tienda} detectada**\nTotal: **RD$ ${resultado.total.toLocaleString("es", { minimumFractionDigits: 2 })}** (${resultado.fecha})\n\nIdentifiqué **${resultado.totalArticulos} artículos**:\n• **${resultado.coincidencias.length} artículos** coinciden con tu Catálogo para actualizar precios.\n• **${resultado.nuevos.length} artículos nuevos** listos para añadir.\n\nPuedes revisar los renglones y confirmar el registro con un clic abajo:`,
        facturaData: resultado,
      };

      const mensajesCompletos = [...nuevosMensajes, mensajeAsistente];
      setMensajes(mensajesCompletos);

      if (idConversacion) {
        try {
          await guardarAsistenteChat(idConversacion, `Factura ${resultado.tienda}`, mensajesCompletos);
        } catch (_) {}
      }
    } catch (err) {
      console.error("Error al procesar factura en el asistente:", err);
      const mensajeFallo = {
        role: "assistant",
        content: `⚠️ No se pudo interpretar la factura automáticamente (${err.message || String(err)}).\n\nAsegúrate de que la foto tenga buena luz y no esté inclinada o cortada. También puedes utilizar el módulo completo **Escanear Factura** en el menú.`,
      };
      setMensajes([...nuevosMensajes, mensajeFallo]);
    } finally {
      setProcesandoFactura(false);
    }
  };

  const handleGuardarFactura = async (indiceMensaje, opciones) => {
    const msg = mensajes[indiceMensaje];
    if (!msg?.facturaData) return;
    setGuardandoFacturaIndex(indiceMensaje);

    try {
      const res = await aplicarFacturaACatalogoYMovimientos({
        facturaData: msg.facturaData,
        metodoPago: opciones.metodoPago,
        categoriaGasto: opciones.categoriaGasto,
        agregarNuevosAlCatalogo: opciones.agregarNuevos,
      });

      // Dispara la animación de cohete hacia los puntos
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lanzarCoheteDeuda", {
            detail: {
              puntos: 20,
              mensaje: `Factura ${res.tienda} registrada`,
              forzar: true,
            },
          })
        );
      }

      const copia = [...mensajes];
      copia[indiceMensaje] = {
        ...copia[indiceMensaje],
        facturaData: { ...copia[indiceMensaje].facturaData, guardado: true },
      };
      copia.push({
        role: "assistant",
        content: `🎉 ¡Listo! Registré el gasto de **RD$ ${res.total.toLocaleString("es", { minimumFractionDigits: 2 })}** en tus movimientos y actualicé ${res.preciosActualizados} precios en tu Catálogo (${res.productosCreados} productos nuevos incorporados). ¡Puntos ganados! 🚀`,
      });
      setMensajes(copia);

      if (chatId) {
        try {
          await guardarAsistenteChat(chatId, `Factura ${res.tienda}`, copia);
        } catch (_) {}
      }
    } catch (err) {
      setError("No se pudo guardar la factura: " + (err.message || String(err)));
    } finally {
      setGuardandoFacturaIndex(null);
    }
  };

  const handlePaste = (e) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;
    for (let i = 0; i < clipboardItems.length; i++) {
      if (clipboardItems[i].type.indexOf("image") !== -1) {
        const file = clipboardItems[i].getAsFile();
        if (file) {
          e.preventDefault();
          procesarFacturaSubida(file);
          break;
        }
      }
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
          disabled={enviando || procesandoFactura}
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
          disabled={enviando || cargandoChats || cargandoMensajes || procesandoFactura}
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
              Pregúntame por tus gastos, la quincena actual, o sube una foto de tu factura de supermercado 📷 para registrar gastos y catálogo.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s.includes("factura")) {
                      fileInputRef.current?.click();
                    } else {
                      enviarPregunta(s);
                    }
                  }}
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
              maxWidth: m.facturaData ? "96%" : "82%",
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
            {m.imagenPreview && (
              <img
                src={m.imagenPreview}
                alt="Factura"
                style={{
                  maxWidth: 180,
                  maxHeight: 180,
                  borderRadius: 10,
                  marginBottom: 8,
                  objectFit: "cover",
                  display: "block",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              />
            )}
            <div>{m.content}</div>

            {m.facturaData && (
              <TarjetaFacturaChat
                data={m.facturaData}
                guardado={Boolean(m.facturaData.guardado)}
                guardando={guardandoFacturaIndex === i}
                onGuardar={(opciones) => handleGuardarFactura(i, opciones)}
                onAbrirModulo={() => {
                  onNavigate?.("escanear-factura");
                  onClose?.();
                }}
              />
            )}
          </div>
        ))}

        {procesandoFactura && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)" }}>
            <Loader2 size={16} className="despensa-spin" style={{ color: "var(--sage)" }} />
            <div style={{ fontSize: 12.5, color: "var(--ink)" }}>
              <strong>Analizando factura con IA…</strong> Identificando tienda, artículos y cruzando con tu catálogo.
            </div>
          </div>
        )}

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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) procesarFacturaSubida(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={procesandoFactura || enviando || cargandoChats || cargandoMensajes}
          title="Subir o tomar foto de factura de supermercado"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--sage)",
            cursor: procesandoFactura || enviando ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          <Camera size={18} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarPregunta()}
          onPaste={handlePaste}
          placeholder={procesandoFactura ? "Escaneando factura con IA…" : "Escribe o adjunta una factura 📷…"}
          maxLength={2000}
          disabled={procesandoFactura || enviando || cargandoChats || cargandoMensajes}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13.5 }}
        />
        <button
          onClick={() => enviarPregunta()}
          disabled={enviando || procesandoFactura || cargandoChats || cargandoMensajes || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "none",
            background: enviando || procesandoFactura || cargandoChats || cargandoMensajes || !input.trim() ? "var(--line)" : "var(--sage)",
            color: "#fff",
            cursor: enviando || procesandoFactura || cargandoChats || cargandoMensajes || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
