// A partir de los nodos y conexiones del Editor de flujo, sigue la cadena desde
// el nodo de Ingreso para determinar en qué orden el usuario definió que se
// distribuya el dinero (ej. Gastos fijos → Deudas → Ahorro → Inversión).
// Estas son funciones puras de solo lectura — no modifican nada del
// presupuesto, se usan únicamente como referencia visual.

export function calcularOrdenPrioridad(nodes, edges) {
  if (!nodes || !edges) return [];
  const ingresoNode = nodes.find((n) => n.data?.tipo === "ingreso" || n.data?.role === "ingreso");
  if (!ingresoNode) return [];

  const orden = [];
  const visitados = new Set([ingresoNode.id]);
  let actualId = ingresoNode.id;

  while (true) {
    const edgeSaliente = edges.find((e) => e.source === actualId && !visitados.has(e.target));
    if (!edgeSaliente) break;
    const siguienteNode = nodes.find((n) => n.id === edgeSaliente.target);
    if (!siguienteNode) break;
    visitados.add(siguienteNode.id);
    orden.push({ id: siguienteNode.id, label: siguienteNode.data?.label || "Sin nombre" });
    actualId = siguienteNode.id;
  }

  return orden;
}

export function formatearOrdenPrioridad(nodes, edges) {
  const orden = calcularOrdenPrioridad(nodes, edges);
  if (orden.length === 0) return null;
  return ["Ingreso", ...orden.map((n) => n.label)].join(" → ");
}
