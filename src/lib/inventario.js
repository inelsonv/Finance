// Calcula cuántos días de inventario le quedan a un producto con seguimiento
// activado, basado en cuándo se registró el stock (fechaInicio +
// unidadesDisponibles) y el consumo diario configurado.
export function diasRestantesProducto(p) {
  if (!p.seguimiento || !p.fechaInicio || !p.consumoDiario) return null;
  const hoy = new Date();
  const inicio = new Date(p.fechaInicio + "T00:00:00");
  const diasTranscurridos = Math.floor((hoy - inicio) / 86400000);
  const unidadesConsumidas = diasTranscurridos * p.consumoDiario;
  const unidadesRestantes = (p.unidadesDisponibles || 0) - unidadesConsumidas;
  return Math.floor(unidadesRestantes / p.consumoDiario);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Calcula el nuevo stock al registrar una reposición (compra) de "paquetes"
// unidades adicionales, sumando lo que quedaba disponible al momento.
export function registrarReposicion(p, paquetesComprados) {
  const restantesActuales = diasRestantesProducto(p);
  const unidadesActuales = restantesActuales != null ? Math.max(restantesActuales * (p.consumoDiario || 1), 0) : 0;
  const unidadesNuevas = paquetesComprados * (p.unidadesPorPaquete || 1);
  return {
    fechaInicio: todayStr(),
    unidadesDisponibles: unidadesActuales + unidadesNuevas,
  };
}
