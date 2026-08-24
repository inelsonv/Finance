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
import { Plus, Save, Trash2, RotateCcw, Check, X, TrendingUp, PiggyBank, LineChart, Landmark, CreditCard, Ticket, Zap, Home, ShoppingBag, Utensils, Car, Fuel, HeartPulse, Film, Briefcase, DollarSign, Wallet, Coins, Receipt } from "lucide-react";
import { saveFlujo } from "../lib/db";

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
};

const ICONO_DEFAULT = "dollarSign";

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
  return (
    <div
      style={{
        background: "var(--card)",
        color: "var(--ink)",
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: "8px 14px",
        fontFamily: "Inter, sans-serif",
        minWidth: 130,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color, display: "flex" }}>
          <IconoNodo nombre={data.icon} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{data.label}</span>
      </div>
      <div className="despensa-mono" style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>
        {data.amount != null ? formatMoney(data.amount) : "Sin monto"}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  );
}

const nodeTypes = { activity: ActivityFlowNode };

function defaultNodes() {
  return [
    { id: "n1", type: "activity", position: { x: 40, y: 140 }, data: { label: "Ingreso", amount: null, color: PALETTE[0], role: "ingreso", icon: "trendingUp" } },
    { id: "n2", type: "activity", position: { x: 340, y: 20 }, data: { label: "Ahorro", amount: null, color: PALETTE[3], icon: "piggyBank" } },
    { id: "n3", type: "activity", position: { x: 340, y: 140 }, data: { label: "Gastos fijos", amount: null, color: PALETTE[1], icon: "receipt" } },
    { id: "n4", type: "activity", position: { x: 340, y: 260 }, data: { label: "Gastos variables", amount: null, color: PALETTE[2], icon: "shoppingBag" } },
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

export default function FlujoEditor({ flujo, fuentesIngreso }) {
  const [nodes, setNodes] = useState(() => flujo?.nodes || defaultNodes());
  const [edges, setEdges] = useState(() => flujo?.edges || defaultEdges());
  const [colorIndex, setColorIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editIcon, setEditIcon] = useState(ICONO_DEFAULT);
  const loadedOnce = useRef(false);

  const ingresoSugerido = useMemo(() => ingresoMensualCalculado(fuentesIngreso), [fuentesIngreso]);

  useEffect(() => {
    if (loadedOnce.current) return;
    if (flujo) {
      setNodes(flujo.nodes && flujo.nodes.length ? flujo.nodes : defaultNodes());
      setEdges((flujo.edges || defaultEdges()).map((e) => ({ ...e, type: "step" })));
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

  const onConnect = useCallback((connection) => {
    setColorIndex((i) => {
      const color = PALETTE[i % PALETTE.length];
      setEdges((eds) => addEdge({ ...connection, ...edgeStyle(color) }, eds));
      return i + 1;
    });
    setDirty(true);
  }, []);

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
        data: { label: label.trim(), amount: null, color, icon: ICONO_DEFAULT },
      },
    ]);
    setDirty(true);
    setEditingId(id);
    setEditLabel(label.trim());
    setEditAmount("");
    setEditIcon(ICONO_DEFAULT);
  };

  const openEdit = (node) => {
    setEditingId(node.id);
    setEditLabel(node.data.label);
    setEditAmount(node.data.amount != null ? String(node.data.amount) : "");
    setEditIcon(node.data.icon || ICONO_DEFAULT);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditAmount("");
    setEditIcon(ICONO_DEFAULT);
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
              },
            }
          : n
      )
    );
    setDirty(true);
    cancelEdit();
  };

  const useIngresoSugerido = () => setEditAmount(String(ingresoSugerido.toFixed(2)));

  const clearAll = () => {
    if (!window.confirm("¿Vaciar el lienzo y empezar de cero?")) return;
    setNodes([]);
    setEdges([]);
    setDirty(true);
  };

  const resetDefault = () => {
    if (!window.confirm("¿Restaurar el diagrama de ejemplo? Se perderán tus cambios actuales.")) return;
    setNodes(defaultNodes());
    setEdges(defaultEdges());
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanNodes = nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data }));
      const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type || "straight", style: e.style, markerEnd: e.markerEnd }));
      await saveFlujo(cleanNodes, cleanEdges);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const resumen = useMemo(() => {
    const ingresoNode = nodes.find((n) => n.data.role === "ingreso");
    const ingresoMonto = ingresoNode?.data.amount ?? 0;
    let asignado = 0;
    for (const n of nodes) {
      if (n.data.role === "ingreso") continue;
      asignado += Number(n.data.amount) || 0;
    }
    return { ingresoMonto, asignado, restante: ingresoMonto - asignado };
  }, [nodes]);

  const editingNode = nodes.find((n) => n.id === editingId);
  const isIngresoNode = editingNode?.data.role === "ingreso";

  return (
    <div>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <button onClick={addNode} style={btnStyle("var(--ink)", "var(--paper)")}>
          <Plus size={14} /> Agregar actividad
        </button>
        <button onClick={handleSave} disabled={saving || !dirty} style={btnStyle(dirty ? "var(--sage)" : "var(--line)", "#fff", !dirty)}>
          <Save size={14} /> {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
        </button>
        <button onClick={resetDefault} style={btnStyle("var(--card)", "var(--ink-soft)", false, true)}>
          <RotateCcw size={14} /> Restaurar ejemplo
        </button>
        <button onClick={clearAll} style={btnStyle("var(--card)", "var(--stamp)", false, true)}>
          <Trash2 size={14} /> Vaciar
        </button>
        <span style={{ fontSize: 11.5, color: "var(--ink-soft)", marginLeft: "auto" }}>
          Arrastra para mover · Conecta desde el borde de un nodo · Doble clic en un nodo para editar monto
        </span>
      </div>

      {editingId && (
        <div style={{ background: "var(--card)", border: "1px solid var(--stamp)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
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
              placeholder="Monto"
              style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 13, width: 120 }}
            />
            {isIngresoNode && ingresoSugerido > 0 && (
              <button onClick={useIngresoSugerido} style={btnStyle("var(--sage-bg)", "var(--sage)", false, false)}>
                Usar ingreso mensual: {formatMoney(ingresoSugerido)}
              </button>
            )}
          </div>

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

      <div style={{ height: 460, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={(_, edge) => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            setDirty(true);
          }}
          onNodeDoubleClick={(_, node) => openEdit(node)}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background color="var(--line)" gap={16} />
          <Controls />
          <MiniMap nodeColor={() => "var(--sage)"} style={{ background: "var(--paper)" }} maskColor="rgba(0,0,0,0.05)" />
        </ReactFlow>
      </div>

      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
        El nodo "Ingreso" original toma como referencia tu ingreso mensual calculado en la sección Ingresos. Selecciona un
        nodo o conexión y presiona Suprimir/Backspace para eliminarlo.
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
