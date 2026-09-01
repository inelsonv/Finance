import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Save, Trash2, RotateCcw, Check, X, TrendingUp, PiggyBank, LineChart, Landmark, CreditCard, Ticket, Zap, Home, ShoppingBag, Utensils, Car, Fuel, HeartPulse, Film, Briefcase, DollarSign, Wallet, Coins, Receipt, Church } from "lucide-react";
import { saveFlujo } from "../lib/db";
import { confirm } from "../lib/confirm";

const PALETTE = ["#5b7a5b", "#a23e2e", "#b8892b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a"];
const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

const ICONOS = {
  trendingUp: TrendingUp,
  piggyBank: PiggyBank,
  lineChart: LineChart,
  landmark: Landmark,
  creditCard: CreditCard,
  ticket: Ticket,
  zap: Zap,
  home: Home,
  shoppingBag: ShoppingBag,
  utensils: Utensils,
  car: Car,
  fuel: Fuel,
  heartPulse: HeartPulse,
  film: Film,
  briefcase: Briefcase,
  wallet: Wallet,
  coins: Coins,
  receipt: Receipt,
  dollarSign: DollarSign,
  church: Church,
};

const ICONO_DEFAULT = "dollarSign";

const NODOS_PRECONFIGURADOS = [
  { label: "Ingreso", icon: "trendingUp", color: PALETTE[0], tipo: "ingreso" },
  { label: "Gastos fijos", icon: "home", color: PALETTE[1] },
  { label: "Gastos variables", icon: "shoppingBag", color: PALETTE[2] },
  { label: "Pago de deudas", icon: "landmark", color: PALETTE[3] },
  { label: "Ahorro", icon: "piggyBank", color: PALETTE[0] },
  { label: "Inversión", icon: "trendingUp", color: PALETTE[4] },
  { label: "Diezmo", icon: "church", color: PALETTE[5] },
];

function IconoNodo({ nombre, size = 13 }) {
  const Icon = ICONOS[nombre] || ICONOS[ICONO_DEFAULT];
  return <Icon size={size} />;
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ingresoMensualCalculado(fuentesIngreso) {
  let total = 0;
  for (const f of fuentesIngreso || []) {
    if (f.estado !== "Activo" || f.montoEsperado == null) continue;
    total += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
  }
  return total;
}

function ActivityFlowNode({ data }) {
  const color = data.color || "#5b7a5b";
  const esIngreso = data.tipo === "ingreso";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: color,
        color: "#fff",
        border: `2px solid ${color}`,
        borderRadius: 10,
        padding: "8px 12px",
        fontFamily: "Inter, sans-serif",
        minWidth: 150,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#fff", border: `2px solid ${color}` }} />
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
          opacity: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#fff",
        }}
      >
        <IconoNodo nombre={data.icon} size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", color: "#fff" }}>{data.label}</div>
        {esIngreso && (
          <div className="despensa-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginTop: 2 }}>
            {data.amount != null ? formatMoney(data.amount) : "Sin monto"}
          </div>
        )}
        {!esIngreso && data.amount != null && (
          <div className="despensa-mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginTop: 2 }}>
            {formatMoney(data.amount)}
            {data.calculado && <span style={{ fontWeight: 400, opacity: 0.85 }}> · 10% auto</span>}
          </div>
        )}
        {!esIngreso && data.categoriaGasto && (
          <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>{data.categoriaGasto}</div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#fff", border: `2px solid ${color}` }} />
    </div>
  );
}

const nodeTypes = { activity: ActivityFlowNode };

function defaultNodes() {
  return [
    { id: "n1", type: "activity", position: { x: 40, y: 200 }, data: { label: "Ingreso", amount: null, color: PALETTE[0], role: "ingreso", tipo: "ingreso", icon: "trendingUp" } },
    { id: "n2", type: "activity", position: { x: 380, y: 40 }, data: { label: "Ahorro", amount: null, color: PALETTE[3], tipo: "categoria", icon: "piggyBank" } },
    { id: "n3", type: "activity", position: { x: 380, y: 200 }, data: { label: "Gastos fijos", amount: null, color: PALETTE[1], tipo: "categoria", icon: "receipt" } },
    { id: "n4", type: "activity", position: { x: 380, y: 360 }, data: { label: "Gastos variables", amount: null, color: PALETTE[2], tipo: "categoria", icon: "shoppingBag" } },
  ];
}

function defaultEdges() {
  return [
    { id: "e1", source: "n1", target: "n2", ...edgeStyle(PALETTE[3]) },
    { id: "e2", source: "n1", target: "n3", ...edgeStyle(PALETTE[1]) },
    { id: "e3", source: "n1", target: "n4", ...edgeStyle(PALETTE[2]) },
  ];
}

function edgeStyle(color) {
  return {
    type: "step",
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}

let idCounter = 100;
function nextId() {
  idCounter += 1;
  return `n${idCounter}`;
}

export default function FlujoEditor({ flujo, fuentesIngreso, categoriasGasto }) {
  const [nodes, setNodes] = useState(() => flujo?.nodes || defaultNodes());
  const [edges, setEdges] = useState(() => flujo?.edges || defaultEdges());
  const [colorIndex, setColorIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const edgesConSeleccion = useMemo(
    () =>
      edges.map((e) =>
        e.id === selectedEdgeId
          ? {
              ...e,
              style: { ...e.style, stroke: "var(--stamp)", strokeWidth: 3 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "#a23e2e" },
              animated: true,
            }
          : e
      ),
    [edges, selectedEdgeId]
  );
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editIcon, setEditIcon] = useState(ICONO_DEFAULT);
  const [editTipo, setEditTipo] = useState("categoria");
  const [editCategoriaGasto, setEditCategoriaGasto] = useState("");
  const loadedOnce = useRef(false);
  const viewportRef = useRef(null);
  const [viewportInicial, setViewportInicial] = useState(null);
  const rfInstance = useRef(null);
  const [zoomPct, setZoomPct] = useState(100);
  // Evita marcar "cambios sin guardar" por el ajuste automático de vista al
  // abrir el editor — solo después de este pequeño margen se considera que
  // un cambio de zoom/posición viene realmente del usuario.
  const viewportListo = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      viewportListo.current = true;
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const ingresoSugerido = useMemo(() => ingresoMensualCalculado(fuentesIngreso), [fuentesIngreso]);

  useEffect(() => {
    if (loadedOnce.current) return;
    if (flujo) {
      setNodes(flujo.nodes && flujo.nodes.length ? flujo.nodes : defaultNodes());
      setEdges((flujo.edges || defaultEdges()).map((e) => ({ ...e, type: "step" })));
      if (flujo.viewport) {
        setViewportInicial(flujo.viewport);
        viewportRef.current = flujo.viewport;
        if (flujo.viewport.zoom) setZoomPct(Math.round(flujo.viewport.zoom * 100));
      }
      loadedOnce.current = true;
    } else if (flujo === null) {
      loadedOnce.current = true;
    }
  }, [flujo]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    setDirty(true);
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    setDirty(true);
  }, []);

  const [avisoIngreso, setAvisoIngreso] = useState(null);

  const onConnect = useCallback(
    (connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const esIngreso = sourceNode?.data?.tipo === "ingreso" || sourceNode?.data?.role === "ingreso";
      const esDiezmo = sourceNode?.data?.label === "Diezmo";

      if ((esIngreso || esDiezmo) && edges.some((e) => e.source === connection.source)) {
        setAvisoIngreso(
          esIngreso
            ? "El nodo Ingreso solo puede tener una conexión de salida. Elimina la actual antes de crear otra."
            : "El nodo Diezmo solo puede tener una conexión de salida (no derivan otros gastos de él). Elimina la actual antes de crear otra."
        );
        setTimeout(() => setAvisoIngreso(null), 3500);
        return;
      }

      setColorIndex((i) => {
        const color = PALETTE[i % PALETTE.length];
        setEdges((eds) => addEdge({ ...connection, ...edgeStyle(color) }, eds));
        return i + 1;
      });
      setDirty(true);
    },
    [nodes, edges]
  );

  const addNode = () => {
    const label = window.prompt("Nombre de la actividad (ej. Pago préstamo, Inversión)");
    if (!label || !label.trim()) return;
    const color = PALETTE[nodes.length % PALETTE.length];
    const id = nextId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "activity",
        position: { x: 120 + (nds.length % 4) * 60, y: 60 + Math.floor(nds.length / 4) * 100 },
        data: { label: label.trim(), amount: null, color, icon: ICONO_DEFAULT, tipo: "categoria" },
      },
    ]);
    setDirty(true);
    setEditingId(id);
    setEditLabel(label.trim());
    setEditAmount("");
    setEditIcon(ICONO_DEFAULT);
    setEditTipo("categoria");
  };

  const addNodoPreconfigurado = (preset) => {
    const id = nextId();
    const tipo = preset.tipo || "categoria";
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "activity",
        position: { x: 120 + (nds.length % 4) * 60, y: 60 + Math.floor(nds.length / 4) * 100 },
        data: {
          label: preset.label,
          amount: null,
          color: preset.color,
          icon: preset.icon,
          tipo,
          role: tipo === "ingreso" ? "ingreso" : undefined,
        },
      },
    ]);
    setDirty(true);
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setDirty(true);
    setSelectedNodeId(null);
    if (editingId === nodeId) cancelEdit();
  };

  const openEdit = (node) => {
    setEditingId(node.id);
    setEditLabel(node.data.label);
    setEditAmount(node.data.amount != null ? String(node.data.amount) : "");
    setEditIcon(node.data.icon || ICONO_DEFAULT);
    setEditTipo(node.data.tipo || (node.data.role === "ingreso" ? "ingreso" : "categoria"));
    setEditCategoriaGasto(node.data.categoriaGasto || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditAmount("");
    setEditIcon(ICONO_DEFAULT);
    setEditTipo("categoria");
    setEditCategoriaGasto("");
  };

  const applyEdit = () => {
    const num = parseFloat(editAmount);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingId
          ? {
              ...n,
              data: {
                ...n.data,
                label: editLabel.trim() || n.data.label,
                amount: Number.isFinite(num) && editAmount !== "" ? num : null,
                icon: editIcon,
                tipo: editTipo,
                role: editTipo === "ingreso" ? "ingreso" : undefined,
                categoriaGasto: editTipo === "ingreso" ? undefined : editCategoriaGasto || undefined,
              },
            }
          : n
      )
    );
    setDirty(true);
    cancelEdit();
  };

  const useIngresoSugerido = () => setEditAmount(String(ingresoSugerido.toFixed(2)));

  const clearAll = async () => {
    if (!(await confirm("¿Vaciar el lienzo y empezar de cero?"))) return;
    setNodes([]);
    setEdges([]);
    setDirty(true);
  };

  const resetDefault = async () => {
    if (!(await confirm("¿Restaurar el diagrama de ejemplo? Se perderán tus cambios actuales."))) return;
    setNodes(defaultNodes());
    setEdges(defaultEdges());
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanNodes = nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
      const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type || "straight", style: e.style, markerEnd: e.markerEnd }));
      const viewportAGuardar = rfInstance.current ? rfInstance.current.getViewport() : viewportRef.current;
      await saveFlujo(cleanNodes, cleanEdges, viewportAGuardar);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // El nodo "Diezmo" calcula su propio monto solo: 10% de lo que trae el
  // nodo que se conecta hacia él (normalmente Ingreso), en vez de requerir
  // que se le asigne un monto a mano.
  const montosCalculados = useMemo(() => {
    const map = new Map();
    for (const n of nodes) {
      if (n.data.label !== "Diezmo") continue;
      const edgeEntrante = edges.find((e) => e.target === n.id);
      if (!edgeEntrante) continue;
      const sourceNode = nodes.find((nn) => nn.id === edgeEntrante.source);
      if (!sourceNode) continue;
      const montoOrigen = Number(sourceNode.data.amount) || 0;
      map.set(n.id, Math.round(montoOrigen * 0.1 * 100) / 100);
    }
    return map;
  }, [nodes, edges]);

  const nodesParaRender = useMemo(
    () =>
      nodes.map((n) =>
        montosCalculados.has(n.id)
          ? { ...n, data: { ...n.data, amount: montosCalculados.get(n.id), calculado: true } }
          : n
      ),
    [nodes, montosCalculados]
  );

  const resumen = useMemo(() => {
    const esIngresoNodo = (n) => n.data.tipo === "ingreso" || n.data.role === "ingreso";
    let ingresoMonto = 0;
    let asignado = 0;
    for (const n of nodes) {
      const monto = montosCalculados.get(n.id) ?? (Number(n.data.amount) || 0);
      if (esIngresoNodo(n)) ingresoMonto += monto;
      else asignado += monto;
    }
    return { ingresoMonto, asignado, restante: ingresoMonto - asignado };
  }, [nodes, montosCalculados]);

  const isIngresoNode = editTipo === "ingreso";

  // No renderizar el editor (ni el mapa) hasta saber si hay un viewport
  // guardado — si se monta antes de tiempo, el editor arranca con el "ajuste
  // automático" y luego ya no hay forma de aplicarle el zoom guardado.
  if (flujo === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--ink-soft)", fontSize: 13 }}>
        Cargando…
      </div>
    );
  }

  return (
    <div>
      {avisoIngreso && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--stamp-bg)",
            border: "1px solid var(--stamp)",
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 10,
            fontSize: 12,
            color: "var(--stamp)",
          }}
        >
          {avisoIngreso}
        </div>
      )}

      {resumen.ingresoMonto > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
          <span>Ingreso del nodo: <strong className="despensa-mono">{formatMoney(resumen.ingresoMonto)}</strong></span>
          <span>Asignado: <strong className="despensa-mono" style={{ color: "var(--stamp)" }}>{formatMoney(resumen.asignado)}</strong></span>
          <span>
            Sin asignar:{" "}
            <strong className="despensa-mono" style={{ color: resumen.restante >= 0 ? "var(--sage)" : "var(--stamp)" }}>
              {formatMoney(resumen.restante)}
            </strong>
          </span>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Nodos comunes — toca para agregar:</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {NODOS_PRECONFIGURADOS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => addNodoPreconfigurado(preset)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 20,
                border: `1px solid ${preset.color}`,
                background: "var(--card)",
                color: preset.color,
                cursor: "pointer",
              }}
            >
              <IconoNodo nombre={preset.icon} size={12} /> {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <button onClick={addNode} style={btnStyle("var(--ink)", "var(--paper)")}>
          <Plus size={14} /> Agregar actividad personalizada
        </button>
        <button onClick={handleSave} disabled={saving || !dirty} style={btnStyle(dirty ? "var(--sage)" : "var(--line)", "#fff", !dirty)}>
          <Save size={14} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
        </button>
        <button onClick={resetDefault} style={btnStyle("var(--card)", "var(--ink-soft)", false, true)}>
          <RotateCcw size={14} /> Restaurar ejemplo
        </button>
        <select
          value={zoomPct}
          onChange={(e) => {
            const pct = Number(e.target.value);
            setZoomPct(pct);
            if (rfInstance.current) {
              rfInstance.current.zoomTo(pct / 100, { duration: 200 });
            }
            setDirty(true);
          }}
          title="Nivel de zoom guardado"
          style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}
        >
          {[25, 50, 75, 100, 125, 150, 200].map((p) => (
            <option key={p} value={p}>Zoom {p}%</option>
          ))}
        </select>
        <button onClick={clearAll} style={btnStyle("var(--card)", "var(--stamp)", false, true)}>
          <Trash2 size={14} /> Vaciar
        </button>
        <span style={{ fontSize: 11.5, color: "var(--ink-soft)", marginLeft: "auto" }}>
          Arrastra para mover · Conecta desde el borde de un nodo · Doble clic en un nodo para editar monto
        </span>
      </div>

      {editingId && (
        <div style={{ background: "var(--card)", border: "1px solid var(--stamp)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => setEditTipo("ingreso")}
              style={{
                flex: 1,
                padding: "7px 8px",
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 7,
                border: "1px solid var(--line)",
                background: editTipo === "ingreso" ? "var(--sage-bg)" : "var(--card)",
                color: editTipo === "ingreso" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              Nodo de Ingreso
            </button>
            <button
              onClick={() => setEditTipo("categoria")}
              style={{
                flex: 1,
                padding: "7px 8px",
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 7,
                border: "1px solid var(--line)",
                background: editTipo === "categoria" ? "var(--sage-bg)" : "var(--card)",
                color: editTipo === "categoria" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              Categoría / destino
            </button>
          </div>

          {!isIngresoNode && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Vincular a una categoría de gasto (opcional)</div>
              <select
                value={editCategoriaGasto}
                onChange={(e) => setEditCategoriaGasto(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, background: "var(--card)" }}
              >
                <option value="">Sin vincular…</option>
                {(categoriasGasto || []).map((c) => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Nombre"
              style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, flex: "1 1 140px" }}
            />
            <input
              className="despensa-mono"
              type="number"
              step="0.01"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyEdit()}
              placeholder={isIngresoNode ? "Monto de ingreso" : "Monto (opcional)"}
              disabled={montosCalculados.has(editingId)}
              style={{
                padding: "7px 10px",
                border: "1px solid var(--line)",
                borderRadius: 7,
                fontSize: 13,
                width: 140,
                background: montosCalculados.has(editingId) ? "var(--line-soft)" : "#fff",
                cursor: montosCalculados.has(editingId) ? "not-allowed" : "text",
              }}
            />
            {isIngresoNode && ingresoSugerido > 0 && (
              <button onClick={useIngresoSugerido} style={btnStyle("var(--sage-bg)", "var(--sage)", false, false)}>
                Usar ingreso mensual: {formatMoney(ingresoSugerido)}
              </button>
            )}
          </div>
          {montosCalculados.has(editingId) && (
            <div style={{ fontSize: 11, color: "var(--sage)", marginTop: -4, marginBottom: 10 }}>
              Este monto se calcula solo: 10% de lo que trae el nodo conectado a este.
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Ícono</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {Object.keys(ICONOS).map((key) => (
              <button
                key={key}
                onClick={() => setEditIcon(key)}
                title={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: editIcon === key ? "2px solid var(--sage)" : "1px solid var(--line)",
                  background: editIcon === key ? "var(--sage-bg)" : "var(--card)",
                  color: editIcon === key ? "var(--sage)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <IconoNodo nombre={key} size={14} />
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={applyEdit} style={btnStyle("var(--sage)", "#fff")}>
              <Check size={14} /> Aplicar
            </button>
            <button onClick={cancelEdit} style={btnStyle("var(--card)", "var(--ink-soft)", false, true)}>
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 680, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)", position: "relative" }}>
        {selectedEdgeId && (
          <button
            onClick={() => {
              setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
              setDirty(true);
              setSelectedEdgeId(null);
            }}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              background: "var(--stamp)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <Trash2 size={13} /> Eliminar conexión
          </button>
        )}
        {selectedNodeId && !selectedEdgeId && (
          <button
            onClick={() => deleteNode(selectedNodeId)}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              background: "var(--stamp)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <Trash2 size={13} /> Eliminar nodo
          </button>
        )}
        <ReactFlow
          nodes={nodesParaRender}
          edges={edgesConSeleccion}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={(_, edge) => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            setDirty(true);
            setSelectedEdgeId(null);
          }}
          onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
          onNodeDoubleClick={(_, node) => openEdit(node)}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => {
            setSelectedEdgeId(null);
            setSelectedNodeId(null);
          }}
          onMoveEnd={(_, viewport) => {
            viewportRef.current = viewport;
            setZoomPct(Math.round(viewport.zoom * 100));
            if (viewportListo.current) setDirty(true);
          }}
          onInit={(instance) => {
            rfInstance.current = instance;
            // Refuerzo: aplica el zoom guardado explícitamente al iniciar,
            // por si "defaultViewport" no toma efecto a tiempo.
            if (viewportInicial) {
              instance.setViewport(viewportInicial, { duration: 0 });
            }
          }}
          {...(viewportInicial ? { defaultViewport: viewportInicial } : { fitView: true })}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background color="var(--line)" gap={16} />
          <Controls />
          <MiniMap nodeColor={() => "var(--sage)"} style={{ background: "var(--paper)" }} maskColor="rgba(0,0,0,0.05)" />
        </ReactFlow>
      </div>

      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
        El nodo "Ingreso" original toma como referencia tu ingreso mensual calculado en la sección Ingresos. Toca una
        conexión para seleccionarla y aparecerá el botón "Eliminar conexión" (o doble clic para borrarla directo). Toca un
        nodo para seleccionarlo y aparecerá el botón "Eliminar nodo".
      </div>
    </div>
  );
}

function btnStyle(bg, color, disabled, outline) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    background: bg,
    color,
    border: outline ? "1px solid var(--line)" : "none",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
  };
}
