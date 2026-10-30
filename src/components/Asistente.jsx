import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Bot,
  Loader2,
  Plus,
  X,
  Camera,
  Receipt,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Fuel,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Calendar,
  Tag,
  AlertCircle,
  Edit2,
  ArrowRight,
  Landmark,
  ShoppingCart,
  Package,
  Mic,
  MicOff,
  Shield,
  ShieldAlert,
  Scissors,
  Gift,
  TrendingDown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  crearAsistenteChat,
  guardarAsistenteChat,
  preguntarAsistente,
  watchAsistenteChat,
  watchAsistenteChats,
  watchPresupuestosHistoricos,
  addMovimiento,
  deleteMovimiento,
  agregarItemABorrador,
  updateOrdenCompra,
} from "../lib/db";
import { construirResumenFinanciero } from "../lib/resumenFinanciero";
import { GASTO_CATS_VARIABLE, GASTO_CATS_FIJO } from "../lib/categorias";
import { calcularFechaPagoTarjeta, categoriaPermitidaEnTarjeta } from "../lib/tarjetaCiclos";
import { analizarIntencionAccion, analizarIntencionGasto } from "../lib/asistenteGastoParser";
import { SkeletonChat } from "./Skeleton";
import AgenteAvatar from "./AgenteAvatar.jsx";

const SUGERENCIAS = [
  "🚨 ¿Cuál es mi plan de choque para salir de deudas y sobregiro?",
  "✂️ Ayúdame a recortar gastos innecesarios este mes",
  "🎄 ¿Cómo uso mi Salario de Navidad para liquidar deudas?",
  "🛡️ ¿Puedo permitirme una salida a cenar o compra extra?",
  "💳 PT09 paga el total de este préstamo",
  "📊 ¿Cuánto me falta para saldar mi préstamo PT09?",
  "🛒 Agrega leche a la orden de compra abierta",
  "⛽ Registra 2,000 en gasolina",
  "💡 Registra pago de luz de 2,500 en servicios",
  "📷 ¿Cómo escaneo una factura para registrar gastos y catálogo?",
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

function TarjetaGastoChat({
  data,
  guardado,
  guardando,
  onGuardar,
  onDeshacer,
  tarjetas = [],
  categoriasGasto = [],
  onNavigate,
  onClose,
}) {
  const [editando, setEditando] = useState(!guardado);
  const [monto, setMonto] = useState(data.monto || "");
  const [categoria, setCategoria] = useState(data.categoria || "Combustible");
  const [metodoPago, setMetodoPago] = useState(data.metodoPago || "Efectivo");
  const [tarjetaId, setTarjetaId] = useState(data.tarjetaId || "");
  const [fecha, setFecha] = useState(data.fecha || new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState(
    data.descripcion || (data.categoria === "Combustible" ? "Gasolina" : data.categoria || "Gasto")
  );
  const [errorLocal, setErrorLocal] = useState(null);

  const tarjetasActivas = (tarjetas || []).filter(
    (t) => t.estado === "Activa" && (t.tipoTarjeta || "Crédito") === "Crédito"
  );

  const categoriasPropias = (categoriasGasto || []).map((c) => c.nombre);
  const opcionesCategorias = categoriasPropias.length > 0
    ? categoriasPropias
    : [...GASTO_CATS_VARIABLE, ...GASTO_CATS_FIJO];

  useEffect(() => {
    if (metodoPago === "Tarjeta de crédito" && !tarjetaId && tarjetasActivas.length > 0) {
      setTarjetaId(tarjetasActivas[0].id);
    }
  }, [metodoPago, tarjetaId, tarjetasActivas]);

  const esCombustible =
    categoria.toLowerCase().includes("combustible") ||
    categoria.toLowerCase().includes("gasolina") ||
    (descripcion && descripcion.toLowerCase().includes("gasolina"));

  const handleConfirmar = () => {
    const num = parseFloat(monto);
    if (!Number.isFinite(num) || num <= 0) {
      setErrorLocal("Ingresa un monto válido mayor a 0");
      return;
    }
    if (!categoria) {
      setErrorLocal("Elige una categoría");
      return;
    }
    if (metodoPago === "Tarjeta de crédito" && !tarjetaId && tarjetasActivas.length > 0) {
      setErrorLocal("Selecciona qué tarjeta de crédito utilizaste");
      return;
    }

    if (metodoPago === "Tarjeta de crédito" && tarjetaId) {
      const tarjetaElegida = tarjetasActivas.find((t) => t.id === tarjetaId);
      if (tarjetaElegida && !categoriaPermitidaEnTarjeta(tarjetaElegida, categoria)) {
        setErrorLocal(`La categoría "${categoria}" no está habilitada para la tarjeta ${tarjetaElegida.nombre}.`);
        return;
      }
    }

    setErrorLocal(null);
    const tarjeta = tarjetasActivas.find((t) => t.id === tarjetaId);
    onGuardar({
      monto: num,
      categoria,
      clasificacion: GASTO_CATS_FIJO.includes(categoria) ? "Fijo" : "Variable",
      metodoPago,
      tarjetaId: metodoPago === "Tarjeta de crédito" ? tarjetaId : null,
      tarjetaNombre: metodoPago === "Tarjeta de crédito" ? tarjeta?.nombre || "" : "",
      fecha,
      descripcion: descripcion.trim() || categoria,
    });
    setEditando(false);
  };

  if (guardado && !editando) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(16, 185, 129, 0.07)",
          border: "1.5px solid rgba(16, 185, 129, 0.35)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#059669", fontWeight: 700, fontSize: 13 }}>
            <CheckCircle2 size={18} />
            <span>Gasto registrado en tus finanzas</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", fontFamily: "monospace" }}>
            RD$ {(Number(data.monto) || 0).toLocaleString("es", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11.5 }}>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: esCombustible ? "rgba(217, 119, 6, 0.12)" : "rgba(16, 185, 129, 0.12)",
              color: esCombustible ? "#b45309" : "#059669",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {esCombustible ? <Fuel size={12} /> : <Tag size={12} />}
            {data.categoria}
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--card-soft, #f3f4f6)",
              color: "var(--ink-soft)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CreditCard size={12} />
            {data.metodoPago}
            {data.tarjetaNombre ? ` (${data.tarjetaNombre})` : ""}
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--card-soft, #f3f4f6)",
              color: "var(--ink-soft)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Calendar size={12} /> {data.fecha}
          </span>
          {data.descripcion && (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "var(--card-soft, #f3f4f6)",
                color: "var(--ink-soft)",
              }}
            >
              {data.descripcion}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            borderTop: "1px solid rgba(16, 185, 129, 0.18)",
            paddingTop: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setEditando(true)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Edit2 size={12} /> Modificar
          </button>

          {data.movimientoId && onDeshacer && (
            <button
              type="button"
              disabled={guardando}
              onClick={() => onDeshacer(data.movimientoId)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#dc2626",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: guardando ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RotateCcw size={12} /> Deshacer / Eliminar
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                onNavigate("movimientos");
                onClose?.();
              }}
              style={{
                marginLeft: "auto",
                padding: "6px 10px",
                borderRadius: 8,
                background: "none",
                border: "none",
                color: "var(--sage)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Ver en Movimientos <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: "14px",
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line-soft)",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: esCombustible ? "rgba(217, 119, 6, 0.15)" : "rgba(46, 125, 50, 0.12)",
              color: esCombustible ? "#d97706" : "var(--sage)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {esCombustible ? <Fuel size={17} /> : <Tag size={16} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
              {esCombustible ? "⛽ Gasto de Combustible / Gasolina" : "📝 Registrar Gasto"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
              {guardado ? "Modificando datos del gasto" : "Listo para guardar en tus movimientos"}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: esCombustible ? "#d97706" : "var(--sage)",
              fontFamily: "monospace",
            }}
          >
            RD$ {monto ? (Number(monto) || 0).toLocaleString("es", { minimumFractionDigits: 2 }) : "0.00"}
          </span>
        </div>
      </div>

      {/* Formulario editable */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
            Monto (RD$)
          </label>
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ej: 2000"
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12.5,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--card)",
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
            Categoría
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--card)",
            }}
          >
            {opcionesCategorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
            Método de pago
          </label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--card)",
            }}
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta de crédito">Tarjeta de crédito</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Débito">Débito</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--card)",
            }}
          />
        </div>
      </div>

      {metodoPago === "Tarjeta de crédito" && (
        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
            Tarjeta de crédito
          </label>
          {tarjetasActivas.length > 0 ? (
            <select
              value={tarjetaId}
              onChange={(e) => setTarjetaId(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--card)",
              }}
            >
              {tarjetasActivas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.banco || "Banco"})
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 11, color: "var(--stamp)" }}>No hay tarjetas de crédito activas registradas.</div>
          )}
        </div>
      )}

      <div>
        <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>
          Nota o concepto
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Gasolina Shell, Almuerzo..."
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--card)",
          }}
        />
      </div>

      {errorLocal && (
        <div style={{ color: "#dc2626", fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
          <AlertCircle size={14} /> {errorLocal}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          disabled={guardando}
          onClick={handleConfirmar}
          style={{
            flex: 1,
            padding: "9px 12px",
            borderRadius: 9,
            background: esCombustible ? "#d97706" : "var(--sage)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: guardando ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {guardando ? <Loader2 size={14} className="despensa-spin" /> : <Check size={15} />}
          {guardando ? "Registrando gasto…" : `Confirmar y Registrar (RD$ ${(Number(monto) || 0).toLocaleString()})`}
        </button>

        {guardado && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            style={{
              padding: "9px 12px",
              borderRadius: 9,
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--ink-soft)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function TarjetaPrestamoChat({
  data,
  guardado,
  guardando,
  onGuardar,
  onDeshacer,
  onNavigate,
  onClose,
}) {
  const [editando, setEditando] = useState(!guardado);
  const [monto, setMonto] = useState(data.monto || "");
  const [metodoPago, setMetodoPago] = useState(data.metodoPago || "Transferencia");
  const [fecha, setFecha] = useState(data.fecha || new Date().toISOString().slice(0, 10));
  const [descripcion, setDescripcion] = useState(data.descripcion || `Pago préstamo ${data.prestamoNumero || ""}`);
  const [errorLocal, setErrorLocal] = useState(null);

  const handleConfirmar = () => {
    const num = parseFloat(monto);
    if (!Number.isFinite(num) || num <= 0) {
      setErrorLocal("Ingresa un monto válido mayor a 0");
      return;
    }
    setErrorLocal(null);
    onGuardar({
      ...data,
      monto: num,
      metodoPago,
      fecha,
      descripcion: descripcion.trim() || `Pago préstamo ${data.prestamoNumero || ""}`,
    });
    setEditando(false);
  };

  const puntosEstimados = Math.round((Number(data.monto) || 0) * 0.05);

  if (guardado && !editando) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: "12px 14px",
          borderRadius: 14,
          background: "rgba(16, 185, 129, 0.08)",
          border: "1.5px solid rgba(16, 185, 129, 0.38)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#059669", fontWeight: 700, fontSize: 13 }}>
            <Landmark size={18} />
            <span>Pago a préstamo {data.prestamoNumero} registrado</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", fontFamily: "monospace" }}>
            RD$ {(Number(data.monto) || 0).toLocaleString("es", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11.5 }}>
          {data.esTotal && (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(245, 158, 11, 0.15)",
                color: "#b45309",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🎉 Liquidación total de deuda
            </span>
          )}
          {data.entidadName && (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "var(--card-soft, #f3f4f6)",
                color: "var(--ink-soft)",
                fontWeight: 600,
              }}
            >
              {data.entidadName}
            </span>
          )}
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--card-soft, #f3f4f6)",
              color: "var(--ink-soft)",
            }}
          >
            {data.metodoPago}
          </span>
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "var(--card-soft, #f3f4f6)",
              color: "var(--ink-soft)",
            }}
          >
            <Calendar size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> {data.fecha}
          </span>
          {puntosEstimados > 0 && (
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
                fontWeight: 700,
              }}
            >
              +{puntosEstimados} pts 🚀
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
            borderTop: "1px solid rgba(16, 185, 129, 0.18)",
            paddingTop: 8,
            flexWrap: "wrap",
          }}
        >
          {onNavigate && (
            <button
              type="button"
              onClick={() => {
                onNavigate("prestamos");
                onClose?.();
              }}
              style={{
                padding: "6px 11px",
                borderRadius: 8,
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Landmark size={12} /> Ver en Préstamos
            </button>
          )}

          {data.movimientoId && onDeshacer && (
            <button
              type="button"
              onClick={() => onDeshacer(data.movimientoId)}
              disabled={guardando}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "var(--card)",
                border: "1px solid var(--line)",
                color: "var(--stamp, #ef4444)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: guardando ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RotateCcw size={12} /> Deshacer pago
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--card)",
        border: "1.5px solid var(--sage)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--sage)", fontWeight: 700, fontSize: 13 }}>
          <Landmark size={17} />
          <span>Confirmar pago de préstamo {data.prestamoNumero}</span>
        </div>
        {data.esTotal && (
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: "rgba(245, 158, 11, 0.15)", color: "#b45309" }}>
            Liquidación total
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>Monto (RD$)</label>
          <input
            type="number"
            step="any"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            style={{ width: "100%", padding: "7px 9px", fontSize: 13, borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", fontWeight: 600 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>Método de pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            style={{ width: "100%", padding: "7px 9px", fontSize: 12.5, borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
          >
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Débito">Débito</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 10.5, color: "var(--ink-soft)", display: "block", marginBottom: 3, fontWeight: 600 }}>Descripción / Concepto</label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ width: "100%", padding: "6px 9px", fontSize: 12, borderRadius: 8, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)" }}
        />
      </div>

      {errorLocal && <div style={{ fontSize: 11.5, color: "var(--stamp)" }}>{errorLocal}</div>}

      <div style={{ display: "flex", gap: 7, marginTop: 2 }}>
        <button
          type="button"
          disabled={guardando}
          onClick={handleConfirmar}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--sage)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: guardando ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {guardando ? <Loader2 size={13} className="despensa-spin" /> : <Check size={14} />}
          {guardando ? "Registrando pago…" : "Registrar Pago de Préstamo"}
        </button>
      </div>
    </div>
  );
}

function TarjetaOrdenCompraChat({
  data,
  guardado,
  guardando,
  onDeshacer,
  onNavigate,
  onClose,
}) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(59, 130, 246, 0.08)",
        border: "1.5px solid rgba(59, 130, 246, 0.35)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#2563eb", fontWeight: 700, fontSize: 13 }}>
          <ShoppingCart size={18} />
          <span>Añadido a la Orden de Compra</span>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(59, 130, 246, 0.15)", color: "#1d4ed8" }}>
          {data.folio || "Orden Abierta"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
        <div>
          <strong style={{ fontSize: 13, color: "var(--ink)", display: "block" }}>{data.productoNombre}</strong>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            Cantidad: {data.cantidad || 1} {Number(data.cantidad) === 1 ? "unidad" : "unidades"}
          </span>
        </div>
        {data.precioUnitario && (
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", fontFamily: "monospace" }}>
            RD$ {((Number(data.cantidad) || 1) * Number(data.precioUnitario)).toLocaleString("es", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
          borderTop: "1px solid rgba(59, 130, 246, 0.18)",
          paddingTop: 8,
          flexWrap: "wrap",
        }}
      >
        {onNavigate && (
          <button
            type="button"
            onClick={() => {
              onNavigate("ordenes-compra");
              onClose?.();
            }}
            style={{
              padding: "6px 11px",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <ShoppingCart size={12} /> Ver Órdenes de Compra
          </button>
        )}

        {data.ordenId && onDeshacer && (
          <button
            type="button"
            onClick={() => onDeshacer(data.ordenId, data.productoNombre)}
            disabled={guardando}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--stamp, #ef4444)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: guardando ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <RotateCcw size={12} /> Deshacer
          </button>
        )}
      </div>
    </div>
  );
}

function BannerGuardianFinanciero({ tarjetas = [], prestamos = [], onPreguntar, onNavigate, onClose }) {
  const [colapsado, setColapsado] = useState(false);

  const tarjetasAlerta = (tarjetas || []).filter((t) => {
    const sRD = Number(t.saldoActual) || 0;
    const lRD = Number(t.limiteCredito ?? t.limite) || 0;
    const sUSD = Number(t.saldoActualUSD) || 0;
    const lUSD = Number(t.limiteCreditoUSD) || 0;
    return (lRD > 0 && sRD > lRD) || (lUSD > 0 && sUSD > lUSD) || Number(t.cuotasVencidasUSD) > 0;
  });

  const haySobregiro = tarjetasAlerta.length > 0;
  const tarjeta6011 = (tarjetas || []).find((t) => (t.ultimos4 || "").includes("6011") || (t.nombre || "").includes("6011")) || tarjetasAlerta[0];

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        background: haySobregiro
          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(245, 158, 11, 0.08))"
          : "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.05))",
        border: haySobregiro ? "1.5px solid rgba(239, 68, 68, 0.45)" : "1.5px solid rgba(16, 185, 129, 0.3)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        marginBottom: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AgenteAvatar tarjetas={tarjetas} prestamos={prestamos} size={34} showBadge={false} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Guardián Financiero Activo</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: haySobregiro ? "#dc2626" : "#059669",
                  color: "#fff",
                }}
              >
                {haySobregiro ? "🚨 SOBREGIRO DETECTADO" : "🛡️ PROTECCIÓN ACTIVA"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
              {haySobregiro
                ? "Sobregiro en tarjeta detectado. Modo choque anti-deuda encendido."
                : "Vigilando gastos innecesarios y guiando tu libertad financiera."}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setColapsado(!colapsado)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-soft)",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
          title={colapsado ? "Expandir guardián" : "Minimizar"}
        >
          {colapsado ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!colapsado && (
        <>
          {tarjeta6011 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                padding: "8px 10px",
                borderRadius: 10,
                background: "var(--card)",
                border: "1px solid var(--line-soft)",
                fontSize: 11.5,
              }}
            >
              <div>
                <span style={{ color: "var(--ink-soft)", display: "block", fontSize: 10.5 }}>Tarjeta Local 6011 (RD$)</span>
                <strong style={{ color: Number(tarjeta6011.saldoActual) > Number(tarjeta6011.limiteCredito) ? "#dc2626" : "var(--ink)", fontFamily: "monospace", fontSize: 12 }}>
                  RD$ {(Number(tarjeta6011.saldoActual) || 0).toLocaleString("es", { minimumFractionDigits: 2 })}
                </strong>
                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>
                  Límite RD$ {(Number(tarjeta6011.limiteCredito) || 0).toLocaleString("es")} (Sobregiro: -RD$ 1,688.32)
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "var(--ink-soft)", display: "block", fontSize: 10.5 }}>Balance USD (6011)</span>
                <strong style={{ color: Number(tarjeta6011.cuotasVencidasUSD) > 0 ? "#dc2626" : "var(--ink)", fontFamily: "monospace", fontSize: 12 }}>
                  US$ {(Number(tarjeta6011.saldoActualUSD) || 0).toLocaleString("es", { minimumFractionDigits: 2 })}
                </strong>
                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>
                  1 cuota vencida: US$ 79.17
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 2 }}>
            <button
              type="button"
              onClick={() => onPreguntar?.("¿Cuál es mi plan de choque para salir de deudas y sobregiro?")}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: 7,
                background: "#dc2626",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              🚨 Plan de Choque
            </button>
            <button
              type="button"
              onClick={() => onPreguntar?.("Ayúdame a recortar gastos innecesarios este mes para pagar deudas")}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: 7,
                background: "var(--card)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Scissors size={12} style={{ color: "#f59e0b" }} /> Recortar Gastos
            </button>
            <button
              type="button"
              onClick={() => onPreguntar?.("¿Cómo uso mi Salario de Navidad (Ley 16-92) para liquidar mis deudas?")}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: 7,
                background: "var(--card)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Gift size={12} style={{ color: "#10b981" }} /> Salario Navidad
            </button>
            <button
              type="button"
              onClick={() => onPreguntar?.("¿Puedo gastar en una salida o compra no esencial en este momento?")}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: 7,
                background: "var(--card)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Shield size={12} style={{ color: "var(--sage)" }} /> ¿Puedo gastar?
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onNavigate("estrategia-deudas");
                  onClose?.();
                }}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 9px",
                  borderRadius: 7,
                  background: "none",
                  border: "none",
                  color: "var(--sage)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Estrategia Deudas <ArrowRight size={11} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TarjetaPlanDeudasChat({ tarjetas = [], prestamos = [], onNavigate, onClose, onEnviarMensaje }) {
  const tarjeta6011 = (tarjetas || []).find((t) => (t.ultimos4 || "").includes("6011") || (t.nombre || "").includes("6011"));

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(239, 68, 68, 0.05)",
        border: "1.5px solid rgba(239, 68, 68, 0.35)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(239, 68, 68, 0.2)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#dc2626", fontWeight: 800, fontSize: 13.5 }}>
          <ShieldAlert size={18} />
          <span>Plan de Choque Anti-Deuda del Guardián</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(239, 68, 68, 0.15)", color: "#dc2626" }}>
          🚨 Nivel Crítico
        </span>
      </div>

      {/* Tarjeta 6011 Detalle */}
      <div style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 700, fontSize: 12 }}>
          <span style={{ color: "var(--ink)" }}>Tarjeta Local ************6011</span>
          <span style={{ color: "#dc2626", fontFamily: "monospace" }}>Corte: 26/10 | Pago: 20/11</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5 }}>
          <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "6px 8px", borderRadius: 7 }}>
            <span style={{ color: "var(--ink-soft)", display: "block" }}>Pesos Dominicanos</span>
            <strong style={{ color: "#dc2626", fontSize: 12.5 }}>RD$ 50,888.32</strong>
            <div style={{ fontSize: 10.5, color: "#dc2626" }}>Límite RD$ 41,000 (Sobregiro: -RD$ 1,688.32)</div>
            <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>Pago Mínimo: RD$ 5,461.69</div>
          </div>
          <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "6px 8px", borderRadius: 7 }}>
            <span style={{ color: "var(--ink-soft)", display: "block" }}>Dólares Americanos</span>
            <strong style={{ color: "#dc2626", fontSize: 12.5 }}>US$ 397.70</strong>
            <div style={{ fontSize: 10.5, color: "#dc2626", fontWeight: 700 }}>1 cuota vencida: US$ 79.17</div>
            <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>Límite: US$ 500.00</div>
          </div>
        </div>
      </div>

      {/* Pasos del Guardián */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "#dc2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>1</div>
          <div style={{ color: "var(--ink)" }}>
            <strong>Urgencia Inmediata:</strong> Pagar la cuota vencida en USD (<strong>US$ 79.17</strong>) y cubrir el sobregiro (<strong>RD$ 1,688.32</strong> + mínimo RD$ 5,461.69) para frenar comisiones por mora y proteger tu historial de crédito.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "#f59e0b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>2</div>
          <div style={{ color: "var(--ink)" }}>
            <strong>Congelar Tarjetas:</strong> No realizar consumos nuevos con la tarjeta de crédito. Usar solo efectivo o débito estrictamente dentro de presupuesto.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <div style={{ minWidth: 20, height: 20, borderRadius: "50%", background: "#10b981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>3</div>
          <div style={{ color: "var(--ink)" }}>
            <strong>Método Avalancha:</strong> Tras cubrir mínimos de tus préstamos, inyectar cada recorte a la Tarjeta 6011 (tasa del ~60% anual) para parar la sangría financiera.
          </div>
        </div>
      </div>

      {/* Botones de acción rápida */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(239, 68, 68, 0.2)", paddingTop: 8 }}>
        {onNavigate && (
          <button
            type="button"
            onClick={() => {
              onNavigate("estrategia-deudas");
              onClose?.();
            }}
            style={{
              padding: "6px 11px",
              borderRadius: 8,
              background: "#dc2626",
              color: "#fff",
              border: "none",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            🎯 Ver Estrategia de Deudas
          </button>
        )}
        <button
          type="button"
          onClick={() => onEnviarMensaje?.("Ayúdame a recortar gastos innecesarios este mes")}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--card)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Scissors size={12} style={{ color: "#f59e0b" }} /> Recortar Gastos
        </button>
        <button
          type="button"
          onClick={() => onEnviarMensaje?.("¿Cómo uso mi Salario de Navidad (Ley 16-92) para liquidar deudas?")}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--card)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Gift size={12} style={{ color: "#10b981" }} /> Plan Salario Navidad
        </button>
      </div>
    </div>
  );
}

function TarjetaRecorteGastosChat({ data, movimientos = [], onEnviarMensaje, onNavigate, onClose }) {
  const [nivelRecorte, setNivelRecorte] = useState(30);

  // Calcular gastos variables reales
  const hoy = new Date();
  const yAct = hoy.getFullYear();
  const mAct = hoy.getMonth() + 1;
  let totalVar = 0;
  for (const m of movimientos || []) {
    if (!m.date || m.type !== "Gasto" || m.clasificacion === "Fijo") continue;
    const [y, mo] = m.date.split("-").map(Number);
    if (y === yAct && mo === mAct) {
      totalVar += Number(m.amount) || 0;
    }
  }
  if (totalVar === 0) totalVar = 28500; // Estimación base quincenal/mensual representativa

  const ahorroMensual = Math.round(totalVar * (nivelRecorte / 100));

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(245, 158, 11, 0.08)",
        border: "1.5px solid rgba(245, 158, 11, 0.4)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(245, 158, 11, 0.25)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#d97706", fontWeight: 800, fontSize: 13.5 }}>
          <Scissors size={18} />
          <span>Simulador de Recorte de Gastos Innecesarios</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(245, 158, 11, 0.2)", color: "#b45309" }}>
          ✂️ Modo Ahorro
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
        El Guardián identificó tus gastos variables prescindibles (delivery, salidas no programadas, compras impulsivas). Selecciona un nivel de recorte:
      </div>

      {/* Selectores de nivel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[
          { pct: 20, label: "20% Moderado" },
          { pct: 30, label: "30% Guardián ⭐" },
          { pct: 50, label: "50% Guerra Anti-Deuda" },
        ].map((item) => (
          <button
            key={item.pct}
            type="button"
            onClick={() => setNivelRecorte(item.pct)}
            style={{
              padding: "7px 6px",
              borderRadius: 8,
              border: nivelRecorte === item.pct ? "2px solid #d97706" : "1px solid var(--line)",
              background: nivelRecorte === item.pct ? "#fef3c7" : "var(--card)",
              color: nivelRecorte === item.pct ? "#b45309" : "var(--ink)",
              fontWeight: nivelRecorte === item.pct ? 800 : 600,
              fontSize: 11,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Resultado del ahorro */}
      <div style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Ahorro mensual recuperado:</span>
          <strong style={{ fontSize: 15, color: "#059669", fontFamily: "monospace" }}>
            RD$ {ahorroMensual.toLocaleString("es", { minimumFractionDigits: 2 })}
          </strong>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink)", borderTop: "1px dashed var(--line-soft)", paddingTop: 6 }}>
          🚀 <strong>Impacto directo en tus deudas:</strong> Con este recorte de {nivelRecorte}%, saldas el sobregiro de <strong>RD$ -1,688.32</strong> de la Tarjeta 6011 en menos de una quincena y aceleras tu libertad financiera en meses.
        </div>
      </div>

      {/* Consejos del Guardián */}
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
        <div>🛑 <strong>Regla de las 48 horas:</strong> Si no es comida básica o medicina, espera 48 horas antes de comprar.</div>
        <div>🍲 <strong>Cero delivery esta quincena:</strong> Aprovecha el inventario y catálogo para cocinar en casa.</div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(245, 158, 11, 0.25)", paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => onEnviarMensaje?.(`Quiero aplicar un recorte de gastos de RD$ ${ahorroMensual.toLocaleString("es")} directo a amortizar mi tarjeta 6011`)}
          style={{
            padding: "6px 11px",
            borderRadius: 8,
            background: "#d97706",
            color: "#fff",
            border: "none",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Aplicar Ahorro a Deuda
        </button>
        <button
          type="button"
          onClick={() => onEnviarMensaje?.("¿Puedo gastar en una salida o capricho hoy?")}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--card)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🛡️ Consultar al Guardián antes de gastar
        </button>
      </div>
    </div>
  );
}

function TarjetaPlanNavidadChat({ data, fuentesIngreso = [], tarjetas = [], onEnviarMensaje, onNavigate, onClose }) {
  // Salario de Navidad proyectado (Doble Sueldo / Ley 16-92)
  const salarioBase = (fuentesIngreso || [])
    .filter((f) => f.estado === "Activo" || !f.estado)
    .reduce((s, f) => {
      const val = Number(f.salario ?? f.montoNeto ?? f.montoEsperado ?? f.montoMensual ?? (Number(f.montoQuincenal) * 2) ?? f.monto) || 0;
      return s + val;
    }, 0) || 55000; // Valor de referencia si no hay registrado

  const bombaAntiDeuda = Math.round(salarioBase * 0.75);
  const fondoNavidadEfectivo = Math.round(salarioBase * 0.25);

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(16, 185, 129, 0.08)",
        border: "1.5px solid rgba(16, 185, 129, 0.35)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(16, 185, 129, 0.2)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#059669", fontWeight: 800, fontSize: 13.5 }}>
          <Gift size={18} />
          <span>Estrategia Salario de Navidad (Ley 16-92)</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "rgba(16, 185, 129, 0.2)", color: "#047857" }}>
          🎄 Doble Sueldo
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>
        En República Dominicana, el <strong>Salario de Navidad (Sueldo 13)</strong> se paga antes del 20 de diciembre. Es <strong>100% inembargable y libre de retenciones TSS e ISR</strong>.
      </div>

      <div style={{ background: "var(--card)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Salario de Navidad estimado:</span>
          <strong style={{ fontSize: 15, color: "#059669", fontFamily: "monospace" }}>
            RD$ {salarioBase.toLocaleString("es", { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5 }}>
          <div style={{ background: "rgba(239, 68, 68, 0.08)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.25)" }}>
            <span style={{ color: "#dc2626", fontWeight: 800, display: "block" }}>💥 75% Bomba Anti-Deuda</span>
            <strong style={{ color: "var(--ink)", fontSize: 13, fontFamily: "monospace" }}>
              RD$ {bombaAntiDeuda.toLocaleString("es")}
            </strong>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 4 }}>
              Liquida por completo el sobregiro de la Tarjeta 6011 y amortiza masivo a préstamos con intereses altos.
            </div>
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.08)", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(16, 185, 129, 0.25)" }}>
            <span style={{ color: "#059669", fontWeight: 800, display: "block" }}>🍗 25% Cena & Fiesta Efectivo</span>
            <strong style={{ color: "var(--ink)", fontSize: 13, fontFamily: "monospace" }}>
              RD$ {fondoNavidadEfectivo.toLocaleString("es")}
            </strong>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 4 }}>
              Cena de Nochebuena y regalos familiares pagados 100% en efectivo, sin usar la tarjeta de crédito.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(16, 185, 129, 0.2)", paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => onEnviarMensaje?.(`¿Cuánto me ahorro de intereses si aplico los RD$ ${bombaAntiDeuda.toLocaleString("es")} del Salario de Navidad a la Tarjeta 6011?`)}
          style={{
            padding: "6px 11px",
            borderRadius: 8,
            background: "#059669",
            color: "#fff",
            border: "none",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Calcular impacto anti-intereses
        </button>
        {onNavigate && (
          <button
            type="button"
            onClick={() => {
              onNavigate("estrategia-deudas");
              onClose?.();
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ver Calendario de Amortización
          </button>
        )}
      </div>
    </div>
  );
}

function TarjetaEvaluadorGastoChat({ data, onEnviarMensaje }) {
  const [montoTest, setMontoTest] = useState(data?.monto || 3000);

  return (
    <div
      style={{
        marginTop: 8,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(239, 68, 68, 0.06)",
        border: "1.5px solid rgba(239, 68, 68, 0.4)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(239, 68, 68, 0.25)", paddingBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#dc2626", fontWeight: 800, fontSize: 13.5 }}>
          <ShieldAlert size={18} />
          <span>Veredicto del Guardián: ¿Puedo hacer este gasto?</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: "#dc2626", color: "#fff" }}>
          🛑 DENEGADO
        </span>
      </div>

      <div style={{ background: "var(--card)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Monto que deseas evaluar:</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>RD$</span>
            <input
              type="number"
              value={montoTest}
              onChange={(e) => setMontoTest(Number(e.target.value) || 0)}
              style={{
                width: 90,
                padding: "3px 6px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "monospace",
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.4, fontWeight: 600 }}>
          ⚠️ <strong>Alerta:</strong> Con un sobregiro activo en tu Tarjeta 6011 (<strong>RD$ -1,688.32</strong>) y una cuota vencida en USD (<strong>US$ 79.17</strong>), gastar RD$ {Number(montoTest).toLocaleString("es")} en compras o salidas no esenciales atrasará tu recuperación y te sumará hasta 60% de intereses anuales.
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
        💡 <strong>Recomendación del Guardián:</strong> Suspende este consumo. Si depositas estos RD$ {Number(montoTest).toLocaleString("es")} a la tarjeta hoy mismo, ¡eliminas el sobregiro de inmediato y respiras con alivio!
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid rgba(239, 68, 68, 0.2)", paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => onEnviarMensaje?.(`Prefiero abonar RD$ ${Number(montoTest).toLocaleString("es")} a la tarjeta 6011 para eliminar el sobregiro`)}
          style={{
            padding: "6px 11px",
            borderRadius: 8,
            background: "#059669",
            color: "#fff",
            border: "none",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✅ Destinar a pagar la tarjeta
        </button>
      </div>
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
  entidades = [],
  estrategiaDeudas,
  tipoCambio,
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
  const [guardandoGastoIndex, setGuardandoGastoIndex] = useState(null);
  const [guardandoPrestamoIndex, setGuardandoPrestamoIndex] = useState(null);
  const [guardandoOrdenIndex, setGuardandoOrdenIndex] = useState(null);
  const [error, setError] = useState(null);
  const [presupuestosHistoricos, setPresupuestosHistoricos] = useState({});
  const fileInputRef = useRef(null);

  // Reconocimiento de voz y dictado por comandos
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [transcripcionParcial, setTranscripcionParcial] = useState("");
  const recognitionRef = useRef(null);
  const vozSoportada = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const tarjetasActivas = (tarjetas || []).filter(
    (t) => t.estado === "Activa" && (t.tipoTarjeta || "Crédito") === "Crédito"
  );
  const categoriasPropias = (categoriasGasto || []).map((c) => c.nombre);
  const opcionesCategorias = categoriasPropias.length > 0
    ? categoriasPropias
    : [...GASTO_CATS_VARIABLE, ...GASTO_CATS_FIJO];
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
  }, [mensajes, enviando, transcripcionParcial]);

  // Limpieza al desmontar el reconocimiento de voz
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  const iniciarReconocimientoVoz = () => {
    if (!vozSoportada) {
      setError("Tu navegador no soporta reconocimiento de voz nativo.");
      return;
    }

    if (escuchandoVoz) {
      detenerReconocimientoVoz();
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "es-DO"; // Español República Dominicana / Latinoamérica
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setEscuchandoVoz(true);
        setTranscripcionParcial("");
        setError(null);
      };

      recognition.onresult = (event) => {
        let textoInterino = "";
        let textoFinal = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            textoFinal += trans;
          } else {
            textoInterino += trans;
          }
        }

        if (textoInterino) {
          setTranscripcionParcial(textoInterino);
        }

        if (textoFinal) {
          const textoCompleto = textoFinal.trim();
          setInput((prev) => (prev ? `${prev} ${textoCompleto}` : textoCompleto));
          setTranscripcionParcial("");
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setError(`Micrófono: ${event.error === "not-allowed" ? "Permiso de micrófono denegado" : event.error}`);
        }
        setEscuchandoVoz(false);
        setTranscripcionParcial("");
      };

      recognition.onend = () => {
        setEscuchandoVoz(false);
        setTranscripcionParcial("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error al iniciar reconocimiento de voz:", err);
      setError("No se pudo activar el micrófono.");
      setEscuchandoVoz(false);
      setTranscripcionParcial("");
    }
  };

  const detenerReconocimientoVoz = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setEscuchandoVoz(false);
    setTranscripcionParcial("");
  };

  const enviarPregunta = async (texto) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || enviando) return;

    const nuevosMensajes = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(nuevosMensajes);
    setInput("");
    setEnviando(true);
    setError(null);

    // Detección local inmediata con analizador universal de intenciones
    const analisisLocal = analizarIntencionAccion(pregunta, {
      prestamos,
      tarjetas,
      ordenesCompra,
      products,
      categoriasGasto,
      movimientos,
    });

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
        ordenesCompra,
        products,
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

      let resAsistente = null;
      try {
        resAsistente = await preguntarAsistente(pregunta, resumen, historialParaEnviar, {
          categorias: opcionesCategorias,
          tarjetas: tarjetasActivas,
          prestamos,
          cuentas,
          ordenesCompra,
          products,
        });
      } catch (errApi) {
        console.warn("Consulta asistente error backend:", errApi);
        if (analisisLocal) {
          if (analisisLocal.tipoAccion === "consulta_prestamo") {
            resAsistente = {
              respuesta: analisisLocal.respuestaDirecta,
              tipoAccion: "consulta_prestamo",
              accion: analisisLocal,
            };
          } else if (analisisLocal.tipoAccion === "pago_prestamo") {
            resAsistente = {
              respuesta: `He identificado la orden de pago para el préstamo **${analisisLocal.prestamoNumero}** por **RD$ ${Number(analisisLocal.monto || 0).toLocaleString("es", { minimumFractionDigits: 2 })}**.`,
              tipoAccion: "pago_prestamo",
              accion: analisisLocal,
            };
          } else if (analisisLocal.tipoAccion === "agregar_orden_compra") {
            resAsistente = {
              respuesta: `He identificado tu solicitud de agregar **${analisisLocal.productoNombre}** (${analisisLocal.cantidad} unidad${analisisLocal.cantidad > 1 ? "es" : ""}) a la orden de compra abierta.`,
              tipoAccion: "agregar_orden_compra",
              accion: analisisLocal,
            };
          } else if (analisisLocal.tipoAccion === "registrar_gasto") {
            resAsistente = {
              respuesta: `He detectado tu gasto en **${analisisLocal.categoria}** por **RD$ ${Number(analisisLocal.monto || 0).toLocaleString("es", { minimumFractionDigits: 2 })}**.`,
              tipoAccion: "registrar_gasto",
              intencionGasto: true,
              gasto: analisisLocal,
              accion: analisisLocal,
            };
          }
        } else {
          throw errApi;
        }
      }

      const tipoAccion =
        resAsistente?.tipoAccion ||
        analisisLocal?.tipoAccion ||
        (resAsistente?.intencionGasto ? "registrar_gasto" : "ninguna");

      const accionFinal = resAsistente?.accion || resAsistente?.gasto || analisisLocal;

      let prestamoCardData = null;
      let ordenCompraCardData = null;
      let gastoCardData = null;
      let textoRespuesta = resAsistente?.respuesta;

      // 1. PAGO DE PRÉSTAMO (ej: "PT09 paga el total de este prestamo")
      if (tipoAccion === "pago_prestamo" && accionFinal) {
        const pNumBuscado = (accionFinal.prestamoNumero || "").toUpperCase().replace(/\s+/g, "");
        const matchPNum = pNumBuscado.match(/PT\s*0?(\d+)/i);
        const numInt = matchPNum ? parseInt(matchPNum[1], 10) : null;

        const prestamoObj = (prestamos || []).find((p) => {
          if (accionFinal.prestamoId && p.id === accionFinal.prestamoId) return true;
          const curNum = (p.numero || p.codigo || "").toUpperCase().replace(/\s+/g, "");
          if (curNum === pNumBuscado) return true;
          const curMatch = curNum.match(/PT\s*0?(\d+)/i);
          if (numInt != null && curMatch && parseInt(curMatch[1], 10) === numInt) return true;
          return false;
        });

        // Calcular saldo pendiente real según movimientos
        let saldoPendienteReal = prestamoObj?.saldoPendienteNumero;
        if (saldoPendienteReal == null && prestamoObj) {
          if (prestamoObj.esRevolvente && prestamoObj.saldoActual != null) {
            saldoPendienteReal = Number(prestamoObj.saldoActual) || 0;
          } else {
            const aprobado = Number(prestamoObj.montoAprobado) || 0;
            const pagado = (movimientos || []).reduce((acc, m) => {
              if (m.category === "Pago de préstamo" && (m.prestamoId === prestamoObj.id || m.prestamoNumero === prestamoObj.numero)) {
                return acc + (Number(m.amount) || 0);
              }
              return acc;
            }, 0);
            saldoPendienteReal = Math.max(aprobado - pagado, 0);
          }
        }

        let montoPagar = Number(accionFinal.monto);
        if (!Number.isFinite(montoPagar) || montoPagar <= 0 || accionFinal.esTotal) {
          montoPagar = saldoPendienteReal > 0 ? saldoPendienteReal : (Number(prestamoObj?.cuota) || Number(accionFinal.monto) || 0);
        }

        let guardadoAuto = false;
        let movId = null;

        if (montoPagar > 0 && accionFinal.autoRegistrar) {
          try {
            const nuevoMov = await addMovimiento({
              type: "Gasto",
              category: "Pago de préstamo",
              amount: montoPagar,
              description: accionFinal.descripcion || `Pago préstamo ${prestamoObj?.numero || accionFinal.prestamoNumero}`,
              date: accionFinal.fecha || new Date().toISOString().slice(0, 10),
              prestamoId: prestamoObj?.id || accionFinal.prestamoId || null,
              prestamoNumero: prestamoObj?.numero || accionFinal.prestamoNumero || "",
              entidadId: prestamoObj?.entidadId || accionFinal.entidadId || null,
              entidadName: prestamoObj?.entidadName || accionFinal.entidadName || "",
              metodoPago: accionFinal.metodoPago || "Transferencia",
              origen: "chat_ia",
            });
            movId = nuevoMov.id;
            guardadoAuto = true;

          } catch (errP) {

            console.warn("Fallo al guardar pago de préstamo:", errP);
          }
        }

        const esLiquidacionTotal = accionFinal.esTotal || (saldoPendienteReal > 0 && montoPagar >= saldoPendienteReal);

        prestamoCardData = {
          ...accionFinal,
          monto: montoPagar,
          saldoPendiente: saldoPendienteReal ?? accionFinal.saldoPendiente,
          prestamoId: prestamoObj?.id || accionFinal.prestamoId,
          prestamoNumero: prestamoObj?.numero || accionFinal.prestamoNumero,
          entidadName: prestamoObj?.entidadName || accionFinal.entidadName,
          esTotal: esLiquidacionTotal,
          guardado: guardadoAuto,
          movimientoId: movId,
        };

        if (guardadoAuto) {
          textoRespuesta = `🎉 ¡Excelente decisión! He registrado el pago de **RD$ ${montoPagar.toLocaleString("es", { minimumFractionDigits: 2 })}** al préstamo **${prestamoObj?.numero || accionFinal.prestamoNumero}** (${prestamoObj?.entidadName || accionFinal.entidadName || "Préstamo"}).\n\n${esLiquidacionTotal ? "¡Has saldado esta deuda por completo! 🏆" : `Saldo pendiente restante: RD$ ${Math.max((saldoPendienteReal || 0) - montoPagar, 0).toLocaleString("es")}.`} Sumaste puntos 🚀 hacia tu libertad financiera.`;
        }
      }

      // 2. AGREGAR A LA ORDEN DE COMPRA
      else if (tipoAccion === "agregar_orden_compra" && accionFinal) {
        const ordenBorrador = (ordenesCompra || []).find((o) => o.estado === "Borrador");
        let ordenId = null;
        let guardadoAuto = false;

        if (accionFinal.autoRegistrar && accionFinal.productoNombre) {
          try {
            ordenId = await agregarItemABorrador(ordenBorrador, {
              productId: accionFinal.productId || null,
              productName: accionFinal.productoNombre,
              precioUnitario: accionFinal.precioUnitario ?? null,
              cantidad: accionFinal.cantidad || 1,
            });
            guardadoAuto = true;
          } catch (errOC) {
            console.warn("Fallo al agregar item a orden de compra:", errOC);
          }
        }

        ordenCompraCardData = {
          ...accionFinal,
          guardado: guardadoAuto,
          ordenId: ordenId || ordenBorrador?.id,
          folio: ordenBorrador?.folio || "Borrador",
        };

        if (guardadoAuto) {
          textoRespuesta = `🛒 ¡Listo! He añadido **${accionFinal.productoNombre}** (${accionFinal.cantidad || 1} ${Number(accionFinal.cantidad) === 1 ? "unidad" : "unidades"}${accionFinal.precioUnitario ? ` a RD$ ${Number(accionFinal.precioUnitario).toLocaleString("es")} c/u` : ""}) a tu orden de compra abierta **${ordenBorrador?.folio || "Borrador"}**.`;
        }
      }

      // 3. GASTO (Combustible, Alimentación, Servicios, etc.)
      else if (tipoAccion === "registrar_gasto" || resAsistente?.intencionGasto) {
        const gastoDetectado = accionFinal || resAsistente?.gasto;
        let guardadoAutomatico = false;
        let idNuevoMovimiento = null;

        if (gastoDetectado && Number(gastoDetectado.monto) > 0 && gastoDetectado.autoRegistrar) {
          try {
            const tarjeta = tarjetasActivas.find((t) => t.id === gastoDetectado.tarjetaId);
            const infoFechaPago =
              gastoDetectado.metodoPago === "Tarjeta de crédito" && tarjeta
                ? calcularFechaPagoTarjeta(tarjeta, gastoDetectado.fecha)?.fechaPagoStr || null
                : null;

            const docRef = await addMovimiento({
              type: "Gasto",
              category: gastoDetectado.categoria || "Otros",
              amount: Number(gastoDetectado.monto),
              description: gastoDetectado.descripcion || gastoDetectado.categoria || "Gasto",
              date: gastoDetectado.fecha || new Date().toISOString().slice(0, 10),
              clasificacion:
                gastoDetectado.clasificacion ||
                (GASTO_CATS_FIJO.includes(gastoDetectado.categoria) ? "Fijo" : "Variable"),
              metodoPago: gastoDetectado.metodoPago || "Efectivo",
              tarjetaId: gastoDetectado.metodoPago === "Tarjeta de crédito" ? gastoDetectado.tarjetaId || null : null,
              tarjetaNombre:
                gastoDetectado.metodoPago === "Tarjeta de crédito"
                  ? gastoDetectado.tarjetaNombre || tarjeta?.nombre || ""
                  : "",
              monedaTarjeta: gastoDetectado.metodoPago === "Tarjeta de crédito" ? "RDS" : null,
              fechaPagoTarjeta: infoFechaPago,
              origen: "chat_ia",
            });

            idNuevoMovimiento = docRef.id;
            guardadoAutomatico = true;

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("lanzarCoheteDeuda", {
                  detail: {
                    puntos: 10,
                    mensaje: `Gasto de ${gastoDetectado.categoria} registrado`,
                    forzar: true,
                  },
                })
              );
            }
          } catch (errAuto) {
            console.warn("Fallo al registrar automáticamente en Firestore:", errAuto);
          }
        }

        gastoCardData = {
          ...gastoDetectado,
          guardado: guardadoAutomatico,
          movimientoId: idNuevoMovimiento,
        };

        if (guardadoAutomatico && gastoDetectado) {
          textoRespuesta = `✅ ¡Listo! Registré tu gasto de **RD$ ${Number(gastoDetectado.monto).toLocaleString("es", { minimumFractionDigits: 2 })}** en **${gastoDetectado.categoria}** (${gastoDetectado.metodoPago}${gastoDetectado.tarjetaNombre ? ` - ${gastoDetectado.tarjetaNombre}` : ""}) para la fecha ${gastoDetectado.fecha}.\n\nYa está sumado a tus movimientos y balance financiero. Si necesitas ajustar los datos o deshacerlo, puedes hacerlo abajo:`;
        } else if (!textoRespuesta && gastoDetectado) {
          textoRespuesta = `He preparado el registro de tu gasto en **${gastoDetectado.categoria}** por **RD$ ${Number(gastoDetectado.monto || 0).toLocaleString("es", { minimumFractionDigits: 2 })}**. Puedes confirmar con un clic para guardarlo en tus movimientos:`;
        }
      }

      let planDeudasCardData = null;
      let recorteGastosCardData = null;
      let planNavidadCardData = null;
      let evaluadorGastoCardData = null;

      const actResp = resAsistente?.tipoAccion || analisisLocal?.tipoAccion;
      const lowerPreg = pregunta.toLowerCase();

      if (
        actResp === "plan_deudas" ||
        lowerPreg.includes("plan de choque") ||
        lowerPreg.includes("salir de deudas") ||
        lowerPreg.includes("endeudamiento") ||
        lowerPreg.includes("sobregiro")
      ) {
        planDeudasCardData = {
          resumenGuardian: resumen?.guardianDiagnostico,
          tarjetas,
          prestamos,
        };
      } else if (
        actResp === "recorte_gastos" ||
        lowerPreg.includes("recortar gastos") ||
        lowerPreg.includes("gastos innecesarios") ||
        lowerPreg.includes("recorte") ||
        lowerPreg.includes("fuga")
      ) {
        recorteGastosCardData = {
          resumenGuardian: resumen?.guardianDiagnostico,
          movimientos,
        };
      } else if (
        actResp === "plan_navidad" ||
        lowerPreg.includes("salario de navidad") ||
        lowerPreg.includes("doble sueldo") ||
        lowerPreg.includes("sueldo 13") ||
        lowerPreg.includes("regalia")
      ) {
        planNavidadCardData = {
          resumenGuardian: resumen?.guardianDiagnostico,
          fuentesIngreso,
          tarjetas,
        };
      } else if (
        actResp === "guardian_evaluar_gasto" ||
        lowerPreg.includes("puedo gastar") ||
        lowerPreg.includes("puedo comprar") ||
        lowerPreg.includes("me puedo permitir") ||
        lowerPreg.includes("debo gastar")
      ) {
        evaluadorGastoCardData = {
          resumenGuardian: resumen?.guardianDiagnostico,
          monto: accionFinal?.monto || analisisLocal?.monto || 3000,
        };
      }

      const mensajeAsistente = {
        role: "assistant",
        content: textoRespuesta || resAsistente?.respuesta || "Respuesta procesada.",
        ...(prestamoCardData ? { prestamoData: prestamoCardData } : {}),
        ...(ordenCompraCardData ? { ordenCompraData: ordenCompraCardData } : {}),
        ...(gastoCardData ? { gastoData: gastoCardData } : {}),
        ...(planDeudasCardData ? { planDeudasData: planDeudasCardData } : {}),
        ...(recorteGastosCardData ? { recorteGastosData: recorteGastosCardData } : {}),
        ...(planNavidadCardData ? { planNavidadData: planNavidadCardData } : {}),
        ...(evaluadorGastoCardData ? { evaluadorGastoData: evaluadorGastoCardData } : {}),
      };

      const mensajesCompletos = [...nuevosMensajes, mensajeAsistente];
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

  const handleGuardarPrestamo = async (indiceMensaje, datosAjustados) => {
    const msg = mensajes[indiceMensaje];
    if (!msg?.prestamoData) return;
    setGuardandoPrestamoIndex(indiceMensaje);
    setError(null);

    try {
      let docId = msg.prestamoData.movimientoId;
      if (docId) {
        await deleteMovimiento(docId, "Modificado desde chat IA").catch(() => {});
      }

      const nuevoMov = await addMovimiento({
        type: "Gasto",
        category: "Pago de préstamo",
        amount: Number(datosAjustados.monto),
        description: datosAjustados.descripcion || `Pago préstamo ${datosAjustados.prestamoNumero || ""}`,
        date: datosAjustados.fecha || new Date().toISOString().slice(0, 10),
        prestamoId: datosAjustados.prestamoId || null,
        prestamoNumero: datosAjustados.prestamoNumero || "",
        entidadId: datosAjustados.entidadId || null,
        entidadName: datosAjustados.entidadName || "",
        metodoPago: datosAjustados.metodoPago || "Transferencia",
        origen: "chat_ia",
      });

      const puntosG = Math.round(Number(datosAjustados.monto) * 0.05);
      window.dispatchEvent(
        new CustomEvent("agenteCelebrarPagoDeuda", {
          detail: {
            puntos: puntosG,
            mensaje: `¡Pago de préstamo ${datosAjustados.prestamoNumero} registrado!`,
          },
        })
      );

      const copia = [...mensajes];
      copia[indiceMensaje] = {
        ...copia[indiceMensaje],
        prestamoData: {
          ...copia[indiceMensaje].prestamoData,
          ...datosAjustados,
          guardado: true,
          movimientoId: nuevoMov.id,
        },
      };
      setMensajes(copia);

      if (chatId) {
        await guardarAsistenteChat(chatId, `Pago: ${datosAjustados.prestamoNumero || "Préstamo"}`, copia).catch(() => {});
      }
    } catch (err) {
      setError("Error al registrar pago de préstamo: " + (err.message || String(err)));
    } finally {
      setGuardandoPrestamoIndex(null);
    }
  };

  const handleDeshacerPrestamo = async (indiceMensaje, movimientoId) => {
    if (!movimientoId) return;
    setGuardandoPrestamoIndex(indiceMensaje);
    setError(null);

    try {
      await deleteMovimiento(movimientoId, "Eliminado desde chat IA");
      const copia = [...mensajes];
      copia[indiceMensaje] = {
        ...copia[indiceMensaje],
        prestamoData: {
          ...copia[indiceMensaje].prestamoData,
          guardado: false,
          movimientoId: null,
        },
      };
      copia.push({
        role: "assistant",
        content: "↩️ El pago del préstamo fue eliminado de tus movimientos. Tu balance y deuda vuelven a su estado previo.",
      });
      setMensajes(copia);

      if (chatId) {
        await guardarAsistenteChat(chatId, "Deshacer pago", copia).catch(() => {});
      }
    } catch (err) {
      setError("Error al deshacer pago: " + (err.message || String(err)));
    } finally {
      setGuardandoPrestamoIndex(null);
    }
  };

  const handleDeshacerOrdenCompra = async (indiceMensaje, ordenId, productoNombre) => {
    if (!ordenId || !productoNombre) return;
    setGuardandoOrdenIndex(indiceMensaje);
    setError(null);

    try {
      const orden = (ordenesCompra || []).find((o) => o.id === ordenId);
      if (orden) {
        const items = [...(orden.items || [])];
        const idx = items.findIndex((it) => it.productName === productoNombre || it.productId === productoNombre);
        if (idx >= 0) {
          items.splice(idx, 1);
          await updateOrdenCompra(ordenId, { items });
        }
      }
      const copia = [...mensajes];
      copia[indiceMensaje] = {
        ...copia[indiceMensaje],
        ordenCompraData: {
          ...copia[indiceMensaje].ordenCompraData,
          guardado: false,
        },
      };
      copia.push({
        role: "assistant",
        content: `↩️ Se eliminó **${productoNombre}** de la orden de compra abierta.`,
      });
      setMensajes(copia);
    } catch (err) {
      setError("Error al quitar producto de la orden: " + (err.message || String(err)));
    } finally {
      setGuardandoOrdenIndex(null);
    }
  };

  const handleDeshacerGasto = async (indiceMensaje, movimientoId) => {
    if (!movimientoId) return;
    setGuardandoGastoIndex(indiceMensaje);
    setError(null);

    try {
      await deleteMovimiento(movimientoId, "Eliminado desde chat IA");

      const copia = [...mensajes];
      copia[indiceMensaje] = {
        ...copia[indiceMensaje],
        gastoData: {
          ...copia[indiceMensaje].gastoData,
          guardado: false,
          movimientoId: null,
        },
      };
      copia.push({
        role: "assistant",
        content: "↩️ El gasto fue eliminado de tus movimientos. Puedes volver a registrarlo o corregir los datos cuando gustes.",
      });
      setMensajes(copia);

      if (chatId) {
        try {
          await guardarAsistenteChat(chatId, "Chat", copia);
        } catch (_) {}
      }
    } catch (err) {
      setError("No se pudo deshacer el gasto: " + (err.message || String(err)));
    } finally {
      setGuardandoGastoIndex(null);
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <AgenteAvatar
          tarjetas={tarjetas}
          prestamos={prestamos}
          movimientos={movimientos}
          pagoDeudaDetectado={pagoDeudaDetectado}
          size={32}
          showBadge={true}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <span className="despensa-tab-font" style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Guardián & Asesor</span>
          <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 999, background: "rgba(16, 185, 129, 0.18)", color: "#059669", fontWeight: 800 }}>
            🛡️ Activo
          </span>
        </div>
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

      <BannerGuardianFinanciero
        tarjetas={tarjetas}
        prestamos={prestamos}
        onPreguntar={enviarPregunta}
        onNavigate={onNavigate}
        onClose={onClose}
      />

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
                <Bot size={13} style={{ color: "var(--sage)" }} />
                Analizar impacto con el consultor
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
          <SkeletonChat bubbles={3} />
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
              maxWidth: m.facturaData || m.gastoData || m.prestamoData || m.ordenCompraData || m.planDeudasData || m.recorteGastosData || m.planNavidadData || m.evaluadorGastoData ? "96%" : "82%",
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
            {m.role === "assistant" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <AgenteAvatar
                  tarjetas={tarjetas}
                  prestamos={prestamos}
                  movimientos={movimientos}
                  pagoDeudaDetectado={pagoDeudaDetectado}
                  estado={
                    m.prestamoData?.guardado
                      ? "celebrando"
                      : m.planDeudasData
                      ? "preocupado"
                      : m.recorteGastosData
                      ? "enfocado"
                      : null
                  }
                  size={20}
                  showBadge={false}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>Guardián Financiero</span>
              </div>
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

            {m.gastoData && (
              <TarjetaGastoChat
                data={m.gastoData}
                guardado={Boolean(m.gastoData.guardado)}
                guardando={guardandoGastoIndex === i}
                onGuardar={(opciones) => handleGuardarGasto(i, opciones)}
                onDeshacer={(movId) => handleDeshacerGasto(i, movId)}
                tarjetas={tarjetas}
                categoriasGasto={categoriasGasto}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            )}

            {m.prestamoData && (
              <TarjetaPrestamoChat
                data={m.prestamoData}
                guardado={Boolean(m.prestamoData.guardado)}
                guardando={guardandoPrestamoIndex === i}
                onGuardar={(opciones) => handleGuardarPrestamo(i, opciones)}
                onDeshacer={(movId) => handleDeshacerPrestamo(i, movId)}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            )}

            {m.ordenCompraData && (
              <TarjetaOrdenCompraChat
                data={m.ordenCompraData}
                guardado={Boolean(m.ordenCompraData.guardado)}
                guardando={guardandoOrdenIndex === i}
                onDeshacer={(ordenId, prodNombre) => handleDeshacerOrdenCompra(i, ordenId, prodNombre)}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            )}

            {m.planDeudasData && (
              <TarjetaPlanDeudasChat
                tarjetas={tarjetas}
                prestamos={prestamos}
                onNavigate={onNavigate}
                onClose={onClose}
                onEnviarMensaje={enviarPregunta}
              />
            )}

            {m.recorteGastosData && (
              <TarjetaRecorteGastosChat
                data={m.recorteGastosData}
                movimientos={movimientos}
                onNavigate={onNavigate}
                onClose={onClose}
                onEnviarMensaje={enviarPregunta}
              />
            )}

            {m.planNavidadData && (
              <TarjetaPlanNavidadChat
                data={m.planNavidadData}
                fuentesIngreso={fuentesIngreso}
                tarjetas={tarjetas}
                onNavigate={onNavigate}
                onClose={onClose}
                onEnviarMensaje={enviarPregunta}
              />
            )}

            {m.evaluadorGastoData && (
              <TarjetaEvaluadorGastoChat
                data={m.evaluadorGastoData}
                onEnviarMensaje={enviarPregunta}
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

        {escuchandoVoz && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 14,
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#dc2626",
              fontSize: 12.5,
              animation: "pulse 1.5s infinite",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
            <span>Escuchando voz… {transcripcionParcial ? `"${transcripcionParcial}"` : "Habla ahora (ej: 'PT09 paga el total', 'gasto 500 en gasolina'…)"}</span>
          </div>
        )}

        {enviando && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--line)" }}>
            <Loader2 size={14} className="despensa-spin" style={{ color: "var(--ink-soft)" }} />
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Procesando en Smart Finance…</span>
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

        {vozSoportada && (
          <button
            type="button"
            onClick={iniciarReconocimientoVoz}
            disabled={procesandoFactura || enviando || cargandoChats || cargandoMensajes}
            title={escuchandoVoz ? "Detener dictado por voz" : "Dictar movimiento o consulta por voz"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              border: escuchandoVoz ? "1.5px solid #ef4444" : "1px solid var(--line)",
              background: escuchandoVoz ? "rgba(239, 68, 68, 0.12)" : "var(--card)",
              color: escuchandoVoz ? "#dc2626" : "var(--ink)",
              cursor: procesandoFactura || enviando ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            {escuchandoVoz ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarPregunta()}
          onPaste={handlePaste}
          placeholder={
            escuchandoVoz
              ? (transcripcionParcial ? `Escuchando: ${transcripcionParcial}…` : "Escuchando lo que dices…")
              : procesandoFactura
              ? "Escaneando factura con IA…"
              : "Escribe o dicta tu consulta (ej: 'PT09 paga el total', 'gasto 500 en gasolina'…)"
          }
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
