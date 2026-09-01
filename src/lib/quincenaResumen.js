// Calcula cuánto se presupuestó y cuánto se gastó realmente en un rango de
// fechas de una quincena específica (year, month, quincena). Reutilizado por
// la tarjeta "Quincena actual" y por la evaluación de cumplimiento de puntos.
import { rangoFechasQuincenaConfigurado } from "./quincenaConfig";

export function rangoFechasQuincena(year, month, quincena, diasCobro) {
  return rangoFechasQuincenaConfigurado(year, month, quincena, diasCobro);
}

export function calcularResumenQuincena({ year, month, quincena, presupuesto, categoriasGasto, prestamos, movimientos, diasCobro }) {
  const { fechaInicio, fechaFin } = rangoFechasQuincena(year, month, quincena, diasCobro);

  let presupuestado = 0;
  for (const c of categoriasGasto || []) {
    const val = presupuesto?.[c.nombre]?.[String(month)]?.[quincena];
    if (typeof val === "number") presupuestado += val;
  }
  for (const p of prestamos || []) {
    if (p.estado !== "Activo") continue;
    if (p.frecuenciaCuota === "Personalizado") {
      for (const c of p.cuotasPersonalizadas || []) {
        if (!c.fecha || !c.monto) continue;
        if (c.fecha >= fechaInicio && c.fecha <= fechaFin) presupuestado += Number(c.monto) || 0;
      }
      continue;
    }
    if (!p.fechaInicio || !p.cuota) continue;
    const [sy, sm, sd] = p.fechaInicio.split("-").map(Number);
    if (!sy || !sm) continue;
    const mesesTotales = p.plazoUnidad === "años" ? (p.plazo || 0) * 12 : p.plazo || 0;
    const offset = (year - sy) * 12 + (month - sm);
    const activo = offset >= 0 && offset < mesesTotales;
    const quincenaCuota = sd && sd > 15 ? "Q2" : "Q1";
    if (activo && quincenaCuota === quincena) presupuestado += Number(p.cuota) || 0;
  }

  let gastado = 0;
  for (const m of movimientos || []) {
    if (m.type !== "Gasto") continue;
    if (!m.date || m.date < fechaInicio || m.date > fechaFin) continue;
    gastado += Number(m.amount) || 0;
  }

  return { fechaInicio, fechaFin, presupuestado, gastado };
}

// Convierte el monto esperado de cada fuente de ingreso activa a un
// equivalente MENSUAL según su frecuencia, y lo divide entre 2 para obtener
// un estimado de ingreso fijo por quincena (aproximado cuando hay fuentes con
// distintas frecuencias mezcladas).
const FRECUENCIA_FACTOR = { Semanal: 52 / 12, Quincenal: 2, Mensual: 1, Anual: 1 / 12, Único: 0 };

export function calcularIngresoQuincenal(fuentesIngreso) {
  let mensual = 0;
  for (const f of fuentesIngreso || []) {
    if (f.estado !== "Activo" || f.montoEsperado == null) continue;
    mensual += f.montoEsperado * (FRECUENCIA_FACTOR[f.frecuencia] ?? 1);
  }
  return mensual / 2;
}
