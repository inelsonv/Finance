/**
 * Utilidades para abreviar nombres de categorías y compromisos largos
 * en tablas compactas (ej. Presupuesto Anual) para que quepan completos
 * sin desbordarse ni cortarse bruscamente.
 */

const DICCIONARIO_ABREVIATURAS = {
  // Mantenimiento de vehículo y variantes
  "mantenimiento de vehículo": "Mant. Vehículo",
  "mantenimiento de vehiculo": "Mant. Vehículo",
  "mantenimiento de vehículos": "Mant. Vehículo",
  "mantenimiento de vehiculos": "Mant. Vehículo",
  "mantenimiento vehículo": "Mant. Vehículo",
  "mantenimiento vehiculo": "Mant. Vehículo",
  "mantenimiento vehicular": "Mant. Vehículo",
  "mantenimiento automotriz": "Mant. Auto",
  "mantenimiento del hogar": "Mant. Hogar",
  "mantenimiento casa": "Mant. Casa",

  // Compromisos financieros y variantes
  "compromisos financieros": "Comp. financieros",
  "compromisos financieros (préstamos y contratos)": "Comp. financieros",
  "compromisos financieros (prestamos y contratos)": "Comp. financieros",
  "compromisos del mes": "Comp. del mes",

  // Pagos y tarjetas
  "pago de tarjeta pendiente": "Pago tarjeta pend.",
  "pago de tarjeta": "Pago tarjeta",
  "pago de préstamo": "Pago préstamo",
  "pago de prestamo": "Pago préstamo",
  "pago de servicio": "Pago servicio",
  "pago de membresía": "Pago membresía",
  "pago de membresia": "Pago membresía",

  // Servicios y transporte
  "servicios públicos y suscripciones": "Servicios y Suscrip.",
  "servicios basicos e internet": "Servicios Básicos",
  "servicios básicos e internet": "Servicios Básicos",
  "servicios públicos": "Servicios Públ.",
  "transporte y combustible": "Transp. y Combustible",
  "transferencias a ahorros": "Transf. a Ahorros",
  "transferencias a ahorro": "Transf. a Ahorro",
  "educación y capacitación": "Educación / Cap.",
  "supermercado y alimentos": "Supermercado",
  "seguros y salud": "Seguros / Salud",
  "entretenimiento y salidas": "Entretenimiento",
};

/**
 * Abreviatura inteligente de una categoría para que quepa completa en columnas de tabla.
 * @param {string} nombre - Nombre original completo.
 * @returns {string} - Nombre abreviado o el original si cabe bien.
 */
export function abreviarNombreCategoria(nombre) {
  if (!nombre || typeof nombre !== "string") return nombre || "";
  const trim = nombre.trim();
  const lower = trim.toLowerCase();

  if (DICCIONARIO_ABREVIATURAS[lower]) {
    return DICCIONARIO_ABREVIATURAS[lower];
  }

  // Si ya es corto (17 caracteres o menos), devolverlo tal cual
  if (trim.length <= 17) return trim;

  // Reemplazos de palabras largas clave si excede la longitud
  let abrev = trim
    .replace(/\bMantenimiento\b/gi, "Mant.")
    .replace(/\bCompromisos\b/gi, "Comp.")
    .replace(/\bFinancieros\b/gi, "Financ.")
    .replace(/\bfinancieros\b/gi, "financ.")
    .replace(/\bAdministración\b/gi, "Admin.")
    .replace(/\bSuscripciones\b/gi, "Suscrip.")
    .replace(/\bSuscripción\b/gi, "Suscrip.")
    .replace(/\bTransporte\b/gi, "Transp.")
    .replace(/\bTransferencias\b/gi, "Transf.")
    .replace(/\bTransferencia\b/gi, "Transf.")
    .replace(/\bCombustible\b/gi, "Comb.")
    .replace(/\bVehículo\b/gi, "Vehículo")
    .replace(/\bVehiculo\b/gi, "Vehículo")
    .replace(/\bVehículos\b/gi, "Vehículos")
    .replace(/\bEducación\b/gi, "Educ.")
    .replace(/\bCapacitación\b/gi, "Capac.");

  return abrev;
}
