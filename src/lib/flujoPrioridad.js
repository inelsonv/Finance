// A partir de los nodos y conexiones del Editor de flujo, sigue la cadena desde
// el nodo de Ingreso para determinar en qué orden el usuario definió que se
// distribuya el dinero (ej. Gastos fijos → Deudas → Ahorro → Inversión).

export function calcularOrdenPrioridad(nodes, edges) {
  if (!nodes || !edges) return [];
  const ingresoNode = nodes.find((n) => n.data?.tipo === "ingreso" || n.data?.role === "ingreso");
  if (!ingresoNode) return [];

  const orden = [];
  const visitados = new Set([ingresoNode.id]);
  let actualId = ingresoNode.id;

  // Sigue la primera conexión saliente hacia un nodo no visitado, como una
  // cadena lineal (si hay ramificaciones, se sigue solo una rama).
  while (true) {
    const edgeSaliente = edges.find((e) => e.source === actualId && !visitados.has(e.target));
    if (!edgeSaliente) break;
    const siguienteNode = nodes.find((n) => n.id === edgeSaliente.target);
    if (!siguienteNode) break;
    visitados.add(siguienteNode.id);
    orden.push({ id: siguienteNode.id, categoria: siguienteNode.data?.categoria || siguienteNode.data?.label || "Otro", label: siguienteNode.data?.label });
    actualId = siguienteNode.id;
  }

  return orden;
}

// ¿El flujo define que "Ahorro" va DESPUÉS de "Gastos fijos" y "Deudas"?
// Si el usuario no tiene un nodo de Ahorro, o no tiene esos nodos definidos,
// retorna null (sin información suficiente para decidir).
export function ahorroDespuesDeCompromisos(nodes, edges) {
  const orden = calcularOrdenPrioridad(nodes, edges);
  if (orden.length === 0) return null;

  const idxAhorro = orden.findIndex((n) => n.categoria === "Ahorro");
  if (idxAhorro === -1) return null;

  const idxGastosFijos = orden.findIndex((n) => n.categoria === "Gastos fijos");
  const idxDeudas = orden.findIndex((n) => n.categoria === "Deudas");

  if (idxGastosFijos === -1 && idxDeudas === -1) return null;

  const despuesDeGastosFijos = idxGastosFijos === -1 || idxAhorro > idxGastosFijos;
  const despuesDeDeudas = idxDeudas === -1 || idxAhorro > idxDeudas;

  return despuesDeGastosFijos && despuesDeDeudas;
}

export function formatearOrdenPrioridad(nodes, edges) {
  const orden = calcularOrdenPrioridad(nodes, edges);
  if (orden.length === 0) return null;
  return ["Ingreso", ...orden.map((n) => n.label || n.categoria)].join(" → ");
}
