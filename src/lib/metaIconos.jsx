import React from "react";
import {
  PiggyBank,
  DollarSign,
  Wallet,
  Plane,
  Home,
  Laptop,
  GraduationCap,
  HeartPulse,
  Target,
  Car,
  Wrench,
  Shield,
  WashingMachine,
  Refrigerator,
  Tv,
  Fan,
  Flame,
  Zap,
  Shirt,
  Dumbbell,
  Dog,
  Baby,
  Gamepad2,
} from "lucide-react";

export function MotorbikeIcon({ size = 18, color = "currentColor", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M5 16h4l3-6h4l3 6" />
      <path d="M12 10l-2 6" />
      <path d="M9 10h5" />
      <path d="M16 7l1 3" />
      <path d="M14 7h4" />
      <path d="M7 11h4" />
    </svg>
  );
}

export const CATEGORIAS_META = [
  { id: "auto", label: "Auto-detectar", emoji: "✨", Icon: Target },
  { id: "electrodomestico", label: "Lavadora / Electrodomésticos", emoji: "🧺", Icon: WashingMachine, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
  { id: "refrigeracion", label: "Nevera / Refrigeración", emoji: "🧊", Icon: Refrigerator, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.12)" },
  { id: "tv", label: "Smart TV / Audio", emoji: "📺", Icon: Tv, color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)" },
  { id: "aire", label: "Aire Acondicionado / Clima", emoji: "❄️", Icon: Fan, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" },
  { id: "cocina", label: "Estufa / Cocina", emoji: "🍳", Icon: Flame, color: "#f97316", bg: "rgba(249, 115, 22, 0.12)" },
  { id: "energia", label: "Inversor / Energía", emoji: "⚡", Icon: Zap, color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
  { id: "financiera", label: "Meta financiera / Ahorro", emoji: "💰", Icon: PiggyBank, color: "var(--sage)", bg: "var(--sage-bg)" },
  { id: "motor", label: "Activo / Motor / Vehículo", emoji: "🏍️", Icon: MotorbikeIcon, color: "#0284c7", bg: "rgba(2, 132, 199, 0.12)" },
  { id: "viaje", label: "Viaje / Vacaciones", emoji: "✈️", Icon: Plane, color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
  { id: "casa", label: "Casa / Vivienda", emoji: "🏠", Icon: Home, color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
  { id: "tecnologia", label: "Tecnología / Laptop", emoji: "💻", Icon: Laptop, color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  { id: "ropa", label: "Ropa / Vestimenta", emoji: "👕", Icon: Shirt, color: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
  { id: "fitness", label: "Gym / Deporte", emoji: "🏋️", Icon: Dumbbell, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  { id: "mascota", label: "Mascotas", emoji: "🐶", Icon: Dog, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  { id: "familia", label: "Familia / Bebé", emoji: "👶", Icon: Baby, color: "#f43f5e", bg: "rgba(244, 63, 94, 0.12)" },
  { id: "gaming", label: "Gaming / Consola", emoji: "🎮", Icon: Gamepad2, color: "#84cc16", bg: "rgba(132, 204, 22, 0.12)" },
  { id: "educacion", label: "Educación / Cursos", emoji: "🎓", Icon: GraduationCap, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
  { id: "salud", label: "Salud / Emergencia", emoji: "🛡️", Icon: Shield, color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
  { id: "otro", label: "Personal / Otro", emoji: "🎯", Icon: Target, color: "var(--ink)", bg: "var(--line-soft)" },
];

export function obtenerIconoYDetalleMeta(meta, activos = []) {
  if (!meta) {
    return {
      Icon: PiggyBank,
      label: "Financiera",
      emoji: "💰",
      color: "var(--sage)",
      bg: "var(--sage-bg)",
    };
  }

  const cat = (meta.categoria || meta.icono || "").toLowerCase().trim();
  const nombre = (meta.nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Si está explícitamente vinculado a un activo en la lista de activos
  if (meta.activoId && Array.isArray(activos)) {
    const act = activos.find((a) => a.id === meta.activoId);
    if (act) {
      const tipoAct = (act.tipo || "").toLowerCase();
      if (tipoAct.includes("veh") || tipoAct.includes("moto") || tipoAct.includes("car")) {
        return {
          Icon: MotorbikeIcon,
          label: "Activo / Motor",
          emoji: "🏍️",
          color: "#0284c7",
          bg: "rgba(2, 132, 199, 0.12)",
        };
      }
      if (tipoAct.includes("prop")) {
        return {
          Icon: Home,
          label: "Propiedad",
          emoji: "🏠",
          color: "#d97706",
          bg: "rgba(217, 119, 6, 0.12)",
        };
      }
      if (tipoAct.includes("elec")) {
        return {
          Icon: Laptop,
          label: "Equipo",
          emoji: "💻",
          color: "#2563eb",
          bg: "rgba(37, 99, 235, 0.12)",
        };
      }
    }
  }

  // 2. Si tiene categoría guardada explícitamente
  if (cat === "electrodomestico" || cat === "lavadora" || cat === "secadora") {
    return {
      Icon: WashingMachine,
      label: "Electrodomésticos",
      emoji: "🧺",
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.12)",
    };
  }
  if (cat === "refrigeracion" || cat === "nevera") {
    return {
      Icon: Refrigerator,
      label: "Refrigeración",
      emoji: "🧊",
      color: "#0ea5e9",
      bg: "rgba(14, 165, 233, 0.12)",
    };
  }
  if (cat === "tv" || cat === "television" || cat === "audio") {
    return {
      Icon: Tv,
      label: "Smart TV / Audio",
      emoji: "📺",
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.12)",
    };
  }
  if (cat === "aire" || cat === "clima" || cat === "ac") {
    return {
      Icon: Fan,
      label: "Aire Acondicionado",
      emoji: "❄️",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.12)",
    };
  }
  if (cat === "cocina" || cat === "estufa") {
    return {
      Icon: Flame,
      label: "Estufa / Cocina",
      emoji: "🍳",
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
    };
  }
  if (cat === "energia" || cat === "inversor") {
    return {
      Icon: Zap,
      label: "Inversor / Energía",
      emoji: "⚡",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.12)",
    };
  }
  if (cat === "ropa" || cat === "vestimenta") {
    return {
      Icon: Shirt,
      label: "Ropa / Moda",
      emoji: "👕",
      color: "#ec4899",
      bg: "rgba(236, 72, 153, 0.12)",
    };
  }
  if (cat === "fitness" || cat === "gym" || cat === "deporte") {
    return {
      Icon: Dumbbell,
      label: "Gym / Deporte",
      emoji: "🏋️",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
    };
  }
  if (cat === "mascota" || cat === "perro" || cat === "gato") {
    return {
      Icon: Dog,
      label: "Mascotas",
      emoji: "🐶",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }
  if (cat === "familia" || cat === "bebe") {
    return {
      Icon: Baby,
      label: "Familia / Bebé",
      emoji: "👶",
      color: "#f43f5e",
      bg: "rgba(244, 63, 94, 0.12)",
    };
  }
  if (cat === "gaming" || cat === "videojuego" || cat === "consola") {
    return {
      Icon: Gamepad2,
      label: "Gaming",
      emoji: "🎮",
      color: "#84cc16",
      bg: "rgba(132, 204, 22, 0.12)",
    };
  }
  if (cat === "motor" || cat === "activo" || cat === "vehiculo") {
    return {
      Icon: MotorbikeIcon,
      label: "Activo / Motor",
      emoji: "🏍️",
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.12)",
    };
  }
  if (cat === "viaje" || cat === "vacaciones" || cat === "avion") {
    return {
      Icon: Plane,
      label: "Viaje",
      emoji: "✈️",
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.12)",
    };
  }
  if (cat === "financiera" || cat === "ahorro" || cat === "fondo") {
    return {
      Icon: PiggyBank,
      label: "Meta financiera",
      emoji: "💰",
      color: "var(--sage)",
      bg: "var(--sage-bg)",
    };
  }
  if (cat === "casa" || cat === "propiedad") {
    return {
      Icon: Home,
      label: "Casa",
      emoji: "🏠",
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.12)",
    };
  }
  if (cat === "educacion" || cat === "estudio") {
    return {
      Icon: GraduationCap,
      label: "Educación",
      emoji: "🎓",
      color: "#7c3aed",
      bg: "rgba(124, 58, 237, 0.12)",
    };
  }
  if (cat === "tecnologia") {
    return {
      Icon: Laptop,
      label: "Tecnología",
      emoji: "💻",
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.12)",
    };
  }
  if (cat === "salud") {
    return {
      Icon: Shield,
      label: "Salud / Emergencia",
      emoji: "🛡️",
      color: "#dc2626",
      bg: "rgba(220, 38, 38, 0.12)",
    };
  }
  if (cat === "otro") {
    return {
      Icon: Target,
      label: "Personal",
      emoji: "🎯",
      color: "var(--ink)",
      bg: "var(--line-soft)",
    };
  }

  // 3. Detección automática por palabras clave en el nombre de la meta
  // Electrodomésticos / Lavadora / Secadora / Plancha
  if (
    /\b(lavadora|secadora|lavasecadora|plancha|electrodomestico|electrodomesticos|linea blanca|whirlpool|mabe|samsung wd|lg twinwash)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: WashingMachine,
      label: "Electrodomésticos",
      emoji: "🧺",
      color: "#06b6d4",
      bg: "rgba(6, 182, 212, 0.12)",
    };
  }

  // Nevera / Refrigerador / Congelador / Freezer
  if (
    /\b(nevera|refrigerador|refrigeradora|congelador|freezer|refrigeracion)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Refrigerator,
      label: "Refrigeración",
      emoji: "🧊",
      color: "#0ea5e9",
      bg: "rgba(14, 165, 233, 0.12)",
    };
  }

  // Smart TV / Televisor / Pantalla / Barra de sonido
  if (
    /\b(tv|televisor|pantalla|oled|qled|smart tv|roku|soundbar|barra de sonido|home theater)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Tv,
      label: "Smart TV / Audio",
      emoji: "📺",
      color: "#6366f1",
      bg: "rgba(99, 102, 241, 0.12)",
    };
  }

  // Aire Acondicionado / Abanico / Inverter
  if (
    /\b(aire|aire acondicionado|abanico|ventilador|split|climatizador|clima|btu)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Fan,
      label: "Aire Acondicionado",
      emoji: "❄️",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.12)",
    };
  }

  // Estufa / Horno / Microondas / Cocina
  if (
    /\b(estufa|horno|microondas|air fryer|freidora de aire|estufa de gas|estufa electrica)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Flame,
      label: "Estufa / Cocina",
      emoji: "🍳",
      color: "#f97316",
      bg: "rgba(249, 115, 22, 0.12)",
    };
  }

  // Inversor / Planta eléctrica / Baterías
  if (
    /\b(inversor|bateria|baterias|planta electrica|generador|paneles solares|solar)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Zap,
      label: "Inversor / Energía",
      emoji: "⚡",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.12)",
    };
  }

  // Ropa / Vestimenta / Calzado
  if (
    /\b(ropa|vestimenta|traje|vestido|calzado|zapatos|tenis|sneakers|moda)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Shirt,
      label: "Ropa / Moda",
      emoji: "👕",
      color: "#ec4899",
      bg: "rgba(236, 72, 153, 0.12)",
    };
  }

  // Fitness / Gym / Deporte
  if (
    /\b(gym|gimnasio|fitness|pesas|mancuernas|trotadora|deporte|crossfit|proteina)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Dumbbell,
      label: "Gym / Deporte",
      emoji: "🏋️",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
    };
  }

  // Mascotas / Perro / Gato
  if (
    /\b(perro|gato|mascota|veterinario|cachorro|pet)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Dog,
      label: "Mascotas",
      emoji: "🐶",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.12)",
    };
  }

  // Familia / Bebé
  if (
    /\b(bebe|cuna|embarazo|pañales|panales|cochecito|hijo|hija)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Baby,
      label: "Familia / Bebé",
      emoji: "👶",
      color: "#f43f5e",
      bg: "rgba(244, 63, 94, 0.12)",
    };
  }

  // Gaming / Videojuegos
  if (
    /\b(ps5|playstation|xbox|nintendo|switch|gaming|consola|videojuego|steam deck)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Gamepad2,
      label: "Gaming",
      emoji: "🎮",
      color: "#84cc16",
      bg: "rgba(132, 204, 22, 0.12)",
    };
  }

  // Activo / Motor / Motocicleta / Pasola / Vehículo / Carro
  if (
    /\b(motor|moto|motocicleta|pasola|scooter|carro|auto|vehiculo|camion|camioneta|reparacion|taller|mecanic|gomas|llantas)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: MotorbikeIcon,
      label: "Activo / Motor",
      emoji: "🏍️",
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.12)",
    };
  }

  // Viaje / Vacaciones / Vuelo / Avión
  if (
    /\b(viaje|viajar|vuelo|avion|aeropuerto|vacacion|vacaciones|playa|turismo|resort|hotel|paseo|crucero|orlando|disney|cancun|colombia|europa|miami|punta cana|samana|bavaro)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Plane,
      label: "Viaje",
      emoji: "✈️",
      color: "#059669",
      bg: "rgba(5, 150, 105, 0.12)",
    };
  }

  // Casa / Vivienda / Solar / Remodelación
  if (
    /\b(casa|apartamento|apto|solar|terreno|vivienda|hogar|construccion|remodelacion|mueble|sala|comedor|techo|piso)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Home,
      label: "Casa",
      emoji: "🏠",
      color: "#d97706",
      bg: "rgba(217, 119, 6, 0.12)",
    };
  }

  // Tecnología
  if (
    /\b(laptop|pc|computadora|macbook|iphone|celular|telefono|tablet|ipad|consola|playstation|ps5|monitor|camara)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: Laptop,
      label: "Tecnología",
      emoji: "💻",
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.12)",
    };
  }

  // Educación
  if (
    /\b(universidad|estudio|maestria|master|curso|carrera|colegio|diplomado|tesis|grado|escuela|certificacion)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: GraduationCap,
      label: "Educación",
      emoji: "🎓",
      color: "#7c3aed",
      bg: "rgba(124, 58, 237, 0.12)",
    };
  }

  // Salud / Emergencia
  if (/\b(salud|medico|cirugia|dental|clinica|hospital|seguro|emergencia|fondo de emergencia)\b/.test(nombre)) {
    return {
      Icon: Shield,
      label: "Salud / Emergencia",
      emoji: "🛡️",
      color: "#dc2626",
      bg: "rgba(220, 38, 38, 0.12)",
    };
  }

  // Inversión / Financiera
  if (
    /\b(fondo|inversion|retiro|bolsa|ahorro|financier|banco|capital|interes|pension|dividendos|deuda)\b/.test(
      nombre
    )
  ) {
    return {
      Icon: PiggyBank,
      label: "Meta financiera",
      emoji: "💰",
      color: "var(--sage)",
      bg: "var(--sage-bg)",
    };
  }

  // Por defecto: Meta financiera
  return {
    Icon: PiggyBank,
    label: "Meta financiera",
    emoji: "💰",
    color: "var(--sage)",
    bg: "var(--sage-bg)",
  };
}
