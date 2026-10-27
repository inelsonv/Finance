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
  { id: "financiera", label: "Meta financiera", emoji: "💰", Icon: PiggyBank, color: "var(--sage)", bg: "var(--sage-bg)" },
  { id: "motor", label: "Activo / Motor", emoji: "🏍️", Icon: MotorbikeIcon, color: "#0284c7", bg: "rgba(2, 132, 199, 0.12)" },
  { id: "viaje", label: "Viaje / Vacaciones", emoji: "✈️", Icon: Plane, color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
  { id: "casa", label: "Casa / Vivienda", emoji: "🏠", Icon: Home, color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
  { id: "tecnologia", label: "Tecnología", emoji: "💻", Icon: Laptop, color: "#2563eb", bg: "rgba(37, 99, 235, 0.12)" },
  { id: "educacion", label: "Educación", emoji: "🎓", Icon: GraduationCap, color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
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
