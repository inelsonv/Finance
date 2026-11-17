function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("-").map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(dateStr + "T00:00:00");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diasTranscurridosDesde(fechaInicio) {
  const inicio = parseLocalDate(fechaInicio);
  if (!inicio) return 0;
  const now = new Date();
  const hoyLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((hoyLocal - inicio) / 86400000);
  return Math.max(0, diff);
}

// Calcula cuántos días de inventario le quedan a un producto con seguimiento
// activado, basado en cuándo se registró el stock (fechaInicio +
// unidadesDisponibles) y el consumo diario configurado.
export function diasRestantesProducto(p) {
  if (!p?.seguimiento || !p?.fechaInicio || !p?.consumoDiario) return null;
  const consumo = Number(p.consumoDiario);
  if (!Number.isFinite(consumo) || consumo <= 0) return null;
  const diasTranscurridos = diasTranscurridosDesde(p.fechaInicio);
  const unidadesConsumidas = diasTranscurridos * consumo;
  const unidadesRestantes = Math.max(0, (Number(p.unidadesDisponibles) || 0) - unidadesConsumidas);
  return Math.max(0, Math.floor(unidadesRestantes / consumo));
}

// Calcula cuántas unidades exactas (ej. pastillas) quedan disponibles hoy
export function unidadesRestantesProducto(p) {
  if (!p?.seguimiento || !p?.fechaInicio || !p?.consumoDiario) return null;
  const consumo = Number(p.consumoDiario);
  if (!Number.isFinite(consumo) || consumo <= 0) return null;
  const diasTranscurridos = diasTranscurridosDesde(p.fechaInicio);
  const unidadesConsumidas = diasTranscurridos * consumo;
  return Math.max(0, Math.round(((Number(p.unidadesDisponibles) || 0) - unidadesConsumidas) * 100) / 100);
}

// Datos oficiales de Farmacia Los Hidalgos (WhatsApp Telefarmacia en R.D.)
export const FARMACIA_LOS_HIDALGOS = {
  name: "Farmacia Los Hidalgos",
  type: "Farmacia",
  phone: "809-541-4141",
  address: "Santo Domingo, República Dominicana (Telefarmacia y a domicilio)",
  notes: "Servicio de telefarmacia a domicilio y atención personalizada vía WhatsApp",
};

// Formatea el enlace de WhatsApp con prefijo de República Dominicana (+1)
export function formatWhatsappUrl(rawPhone, text) {
  if (!rawPhone) return "";
  let cleaned = String(rawPhone).replace(/\D/g, "");
  // Si tiene 10 dígitos y empieza por 809, 829 o 849 (R.D.), anteponer prefijo internacional 1
  if (cleaned.length === 10 && /^(809|829|849)/.test(cleaned)) {
    cleaned = "1" + cleaned;
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

// Construye el mensaje pre-redactado para pedir a la farmacia por WhatsApp
export function construirMensajePedidoFarmacia(producto, entidad, opciones = {}) {
  const cantidad = opciones.cantidad || producto.cantidadPedidoAuto || producto.unidadesPorPaquete || 1;
  const codigoEmpleado = opciones.codigoEmpleado || "";
  const direccion = opciones.direccion || "";
  const notas = opciones.notas || producto.notasPedidoAuto || "";

  const lineas = [
    `¡Hola, ${entidad?.name || "Farmacia Los Hidalgos"}! Quisiera solicitar a domicilio el siguiente pedido:`,
    `💊 *Producto:* ${producto.name}`,
    `📦 *Cantidad:* ${cantidad} caja(s)/paquete(s)`,
  ];

  if (direccion) {
    lineas.push(`📍 *Dirección de entrega:* ${direccion}`);
  }
  if (codigoEmpleado) {
    lineas.push(`💳 *Código de cliente / empleado:* ${codigoEmpleado}`);
  }
  if (notas) {
    lineas.push(`📝 *Nota:* ${notas}`);
  }
  lineas.push(`¿Tienen disponibilidad y a qué hora podrían realizar la entrega? ¡Muchas gracias!`);

  return lineas.join("\n\n");
}

// Reasigna o corrige manualmente el inventario exacto disponible a partir de una fecha
// (por defecto hoy). A diferencia de registrarReposicion, fija el saldo real
// en vez de sumarlo al stock anterior.
export function ajustarInventarioProducto(unidadesExactas, opciones = {}) {
  const unidades = Math.max(0, Math.round((Number(unidadesExactas) || 0) * 100) / 100);
  const fecha = opciones.fechaInicio || todayStr();
  const result = {
    seguimiento: true,
    fechaInicio: fecha,
    unidadesDisponibles: unidades,
  };
  if (opciones.unidadesPorPaquete != null) {
    result.unidadesPorPaquete = Math.max(1, Number(opciones.unidadesPorPaquete) || 1);
  }
  if (opciones.consumoDiario != null) {
    result.consumoDiario = Math.max(0.25, Number(opciones.consumoDiario) || 1);
  }
  return result;
}

// Calcula el nuevo stock al registrar una reposición (compra) de "paquetes"
// unidades adicionales, sumando exactamente lo que quedaba disponible hoy al momento.
export function registrarReposicion(p, paquetesComprados, opciones = {}) {
  const unidadesCalculadas = unidadesRestantesProducto(p);
  const unidadesActuales = unidadesCalculadas != null
    ? unidadesCalculadas
    : Math.max(0, Number(p?.unidadesDisponibles) || 0);

  const unidadesPorPaq = Number(opciones.unidadesPorPaquete) || Number(p?.unidadesPorPaquete) || 1;
  const paquetes = Math.max(0, Number(paquetesComprados) || 0);
  const unidadesNuevas = paquetes * unidadesPorPaq;
  const fecha = opciones.fechaInicio || todayStr();
  const total = Math.round((unidadesActuales + unidadesNuevas) * 100) / 100;

  return {
    fechaInicio: fecha,
    unidadesDisponibles: total,
    seguimiento: true,
    unidadesPorPaquete: unidadesPorPaq,
    consumoDiario: Number(opciones.consumoDiario) || Number(p?.consumoDiario) || 1,
  };
}

// Evalúa si algún producto con pedido automático activado alcanzó el umbral
// crítico de inventario (ej. 5 pastillas o 5 días restantes) y dispara la orden
// automáticamente a la farmacia (Los Hidalgos por defecto).
export async function evaluarPedidosAutomaticos(products, entidades, registrarDisparo, registrarPedido) {
  if (!products || !Array.isArray(products) || products.length === 0) return;

  for (const p of products) {
    if (!p.seguimiento || !p.pedidoAutomatico) continue;

    const dias = diasRestantesProducto(p);
    const unidades = unidadesRestantesProducto(p);
    const umbralAviso = p.diasAviso ?? 5;

    // Disparar cuando queden menos o igual días que el aviso, o 5 o menos unidades
    const debePedir = (dias != null && dias <= umbralAviso) || (unidades != null && unidades <= 5);
    if (!debePedir) continue;

    // Si ya se disparó para este ciclo de stock, evitar duplicados
    if (p.ultimoPedidoAutomatico?.fecha) {
      const fechaPedido = new Date(p.ultimoPedidoAutomatico.fecha);
      const diasDesdePedido = Math.floor((Date.now() - fechaPedido.getTime()) / 86400000);
      const inicioInv = p.fechaInicio ? new Date(p.fechaInicio + "T00:00:00") : null;
      if (diasDesdePedido < 4 || (inicioInv && fechaPedido >= inicioInv)) {
        continue;
      }
    }

    // Identificar farmacia asociada (o Farmacia Los Hidalgos por defecto)
    let entidad = p.entidadId ? (entidades || []).find((e) => e.docId === p.entidadId) : null;
    if (!entidad) {
      entidad = (entidades || []).find(
        (e) => /los\s+hidalgos/i.test(e.name) || (e.type === "Farmacia" && /hidalgos/i.test(e.name))
      ) || FARMACIA_LOS_HIDALGOS;
    }

    const telefono = entidad?.phone || FARMACIA_LOS_HIDALGOS.phone;
    const entidadName = entidad?.name || FARMACIA_LOS_HIDALGOS.name;
    const cantidad = p.cantidadPedidoAuto || 1;

    const infoPedido = {
      fecha: new Date().toISOString(),
      estado: "solicitado",
      cantidad,
      entidadName,
      telefono,
      unidadesRestantes: unidades,
      diasRestantes: dias,
    };

    try {
      if (typeof registrarDisparo === "function") {
        await registrarDisparo(p.id, infoPedido);
      }
      if (typeof registrarPedido === "function") {
        await registrarPedido({
          productId: p.id,
          productName: p.name,
          entidadId: entidad?.docId || null,
          entidadName,
          telefono,
          cantidad,
          notas: p.notasPedidoAuto || "",
          direccion: p.direccionPedidoAuto || "",
          automatico: true,
        });
      }
    } catch (err) {
      console.error(`Error al solicitar pedido automático para ${p.name}:`, err);
    }
  }
}
