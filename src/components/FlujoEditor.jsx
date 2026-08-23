import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Plus, Save, Trash2, RotateCcw } from "lucide-react";
import { saveFlujo } from "../lib/db";

const PALETTE = ["#5b7a5b", "#a23e2e", "#b8892b", "#4a6a8a", "#8a5b8a", "#6a8a5b", "#8a6a4a"];

function defaultNodes() {
  return [
    { id: "n1", position: { x: 40, y: 140 }, data: { label: "Ingreso" }, style: nodeStyle(PALETTE[0]) },
    { id: "n2", position: { x: 320, y: 40 }, data: { label: "Ahorro" }, style: nodeStyle(PALETTE[3]) },
    { id: "n3", position: { x: 320, y: 140 }, data: { label: "Gastos fijos" }, style: nodeStyle(PALETTE[1]) },
    { id: "n4", position: { x: 320, y: 240 }, data: { label: "Gastos variables" }, style: nodeStyle(PALETTE[2]) },
  ];
}

function defaultEdges() {
  return [
    { id: "e1", source: "n1", target: "n2", ...edgeStyle(PALETTE[3]) },
    { id: "e2", source: "n1", target: "n3", ...edgeStyle(PALETTE[1]) },
    { id: "e3", source: "n1", target: "n4", ...edgeStyle(PALETTE[2]) },
  ];
}

function nodeStyle(color) {
  return {
    background: "var(--card)",
    color: "var(--ink)",
    border: `2px solid ${color}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
  };
}

function edgeStyle(color) {
  return {
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}

let idCounter = 100;
function nextId() {
  idCounter += 1;
  return `n${idCounter}`;
}

export default function FlujoEditor({ flujo }) {
  const [nodes, setNodes] = useState(() => flujo?.nodes || defaultNodes());
  const [edges, setEdges] = useState(() => flujo?.edges || defaultEdges());
  const [colorIndex, setColorIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (loadedOnce.current) return;
    if (flujo) {
      setNodes(flujo.nodes && flujo.nodes.length ? flujo.nodes : defaultNodes());
      setEdges(flujo.edges || defaultEdges());
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
    const color = PALETTE[nodes.length % PALETTE.length];
    const label = window.prompt("Nombre de la actividad (ej. Inversión, Fondo de emergencia)");
    if (!label || !label.trim()) return;
    const id = nextId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        position: { x: 120 + (nds.length % 4) * 60, y: 60 + Math.floor(nds.length / 4) * 90 },
        data: { label: label.trim() },
        style: nodeStyle(color),
      },
    ]);
    setDirty(true);
  };

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
      const cleanNodes = nodes.map((n) => ({ id: n.id, position: n.position, data: n.data, style: n.style }));
      const cleanEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, style: e.style, markerEnd: e.markerEnd }));
      await saveFlujo(cleanNodes, cleanEdges);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
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
          Arrastra los nodos · Conecta desde el borde de un nodo hacia otro · Doble clic en una conexión para borrarla
        </span>
      </div>

      <div style={{ height: 480, border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={(_, edge) => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
            setDirty(true);
          }}
          onNodeDoubleClick={(_, node) => {
            const label = window.prompt("Renombrar actividad", node.data.label);
            if (label && label.trim()) {
              setNodes((nds) => nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: label.trim() } } : n)));
              setDirty(true);
            }
          }}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background color="var(--line)" gap={16} />
          <Controls />
          <MiniMap nodeColor={() => "var(--sage)"} style={{ background: "var(--paper)" }} maskColor="rgba(0,0,0,0.05)" />
        </ReactFlow>
      </div>

      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
        Doble clic en un nodo para renombrarlo. Selecciona un nodo o conexión y presiona Suprimir/Backspace para eliminarlo.
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
  };
}
