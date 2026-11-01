// Categorías superiores / principales para agrupar gastos y segmentar presupuestos.
// Permite que subcategorías (ej: Combustible, Mantenimiento, Lavado, Marbete)
// se asignen a una sola categoría principal ("Vehículo"), segmentándose
// claramente en el presupuesto con subtotales y switches de simulación.

export const CATEGORIAS_SUPERIORES_PREDEFINIDAS = [
  "Vehículo",
  "Hogar y Vivienda",
  "Alimentación",
  "Servicios y Conectividad",
  "Salud y Bienestar",
  "Personal y Familia",
  "Entretenimiento y Ocio",
  "Compromisos financieros",
  "Otras Categorías",
];

const REGLAS_SUPERIORES = [
  {
    superior: "Vehículo",
    palabras: [
      "combustible", "gasolina", "gasoil", "diesel", "vehiculo", "vehículo",
      "carro", "auto", "lavado", "marbete", "mantenimiento de vehiculo",
      "mantenimiento vehiculo", "mantenimiento vehículo", "taller", "mecanico",
      "mecánico", "repuesto", "parqueo", "estacionamiento", "seguro de vehiculo",
      "seguro de vehículo", "seguro vehiculo", "peaje", "multa",
    ],
  },
  {
    superior: "Hogar y Vivienda",
    palabras: [
      "vivienda", "alquiler", "renta", "hipoteca", "casa", "hogar", "apartamento",
      "luz", "electricidad", "energia", "energía", "agua", "coraasan", "caasd",
      "basura", "gas", "mantenimiento hogar", "mantenimiento casa", "reparacion",
    ],
  },
  {
    superior: "Alimentación",
    palabras: [
      "supermercado", "alimento", "alimentos", "alimentacion", "alimentación",
      "comida", "despensa", "mercado", "viveres", "víveres", "restaurante",
      "almuerzo", "cena", "desayuno", "cafeteria", "cafetería", "cafe", "café",
    ],
  },
  {
    superior: "Servicios y Conectividad",
    palabras: [
      "servicios", "internet", "telefono", "teléfono", "celular", "plan movil",
      "plan móvil", "wifi", "cable", "streaming", "netflix", "spotify",
      "suscripcion", "suscripción", "contrato",
    ],
  },
  {
    superior: "Salud y Bienestar",
    palabras: [
      "salud", "bienestar", "farmacia", "medicina", "medicamento", "doctor",
      "medico", "médico", "clinica", "clínica", "dentista", "odontolog",
      "gimnasio", "gym", "seguro de salud", "seguro medico", "seguro médico",
      "laboratorio", "terapia", "psicolog", "lentes", "optica", "óptica",
    ],
  },
  {
    superior: "Personal y Familia",
    palabras: [
      "gastos personales", "personal", "ropa", "vestimenta", "calzado", "zapatos",
      "barberia", "barbería", "salon", "salón", "pelo", "peluqueria", "peluquería",
      "estudio", "educacion", "educación", "colegio", "universidad", "curso",
      "hijo", "hija", "hijos", "bebe", "bebé", "mascota", "perro", "gato", "veterinario",
      "regalo", "regalos", "cumpleaños", "iglesia", "diezmo", "ofrenda",
    ],
  },
  {
    superior: "Entretenimiento y Ocio",
    palabras: [
      "entretenimiento", "cine", "pelicula", "película", "salidas", "diversion",
      "diversión", "juego", "videojuego", "vacaciones", "viaje", "turismo",
      "hotel", "concierto", "musica", "música", "fiesta", "bar",
    ],
  },
];

function normalizar(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Infiere o valida la categoría superior a la que pertenece una categoría de gasto.
 * Si ya tiene una categoría superior configurada explícitamente, la respeta.
 * Si no, analiza el nombre con reglas heurísticas inteligentes.
 */
export function inferirCategoriaSuperior(nombreCategoria, categoriaSuperiorConfigurada) {
  const manual = (categoriaSuperiorConfigurada || "").trim();
  if (manual) return manual;

  const n = normalizar(nombreCategoria);
  if (!n) return "Otras Categorías";

  for (const regla of REGLAS_SUPERIORES) {
    if (regla.palabras.some((p) => n.includes(normalizar(p)))) {
      return regla.superior;
    }
  }

  return "Otras Categorías";
}

/**
 * Devuelve el ícono sugerido (como nombre de string) para la categoría superior.
 */
export function iconoParaCategoriaSuperior(nombreSuperior) {
  const n = normalizar(nombreSuperior);
  if (n.includes("vehiculo") || n.includes("carro") || n.includes("auto")) return "car";
  if (n.includes("hogar") || n.includes("vivienda") || n.includes("casa")) return "home";
  if (n.includes("aliment") || n.includes("comida")) return "utensils";
  if (n.includes("servicio") || n.includes("conectividad") || n.includes("internet")) return "wifi";
  if (n.includes("salud") || n.includes("bienestar")) return "heartpulse";
  if (n.includes("personal") || n.includes("familia")) return "user";
  if (n.includes("entretenimiento") || n.includes("ocio")) return "film";
  if (n.includes("compromiso") || n.includes("financier")) return "landmark";
  return "layers";
}
