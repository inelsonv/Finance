import { clasificarFecha } from "./quincenaConfig";

// Determina a qué quincena (Q1/Q2/...) pertenece una fecha "YYYY-MM-DD",
// según los días de cobro configurados por el usuario.
export function quincenaDeFecha(fecha, diasCobro) {
  if (!fecha) return null;
  const [y, m, d] = fecha.split("-").map(Number);
  if (!y || !m || !d) return null;
  return clasificarFecha(fecha, diasCobro);
}

// Calcula cuánto se ha gastado en una categoría durante una quincena específica,
// y lo compara contra el monto presupuestado en Presupuesto mensual.
export function consumoPresupuesto({ presupuesto, movimientos, categoria, year, month, quincena, diasCobro }) {
  const presupuestado = presupuesto?.[categoria]?.[String(month)]?.[quincena];
  if (typeof presupuestado !== "number" || presupuestado <= 0) return null;

  let gastado = 0;
  for (const m of movimientos) {
    if (m.category !== categoria || m.type !== "Gasto") continue;
    const q = quincenaDeFecha(m.date, diasCobro);
    if (!q || q.year !== year || q.month !== month || q.quincena !== quincena) continue;
    gastado += Number(m.amount) || 0;
  }

  const pct = (gastado / presupuestado) * 100;
  return { presupuestado, gastado, pct };
}

// Igual que consumoPresupuesto, pero ubica los gastos con TARJETA en la
// quincena de su fecha de pago calculada (no la fecha de compra) — así el
// presupuesto de una quincena futura ya "reserva" espacio para lo que
// tocará pagar de tarjeta, y no deja gastar más ahí hasta saldarlo. Los
// gastos en efectivo/otro siguen contando por su fecha de compra normal.
// Los consumos de tarjeta ya marcados como pagados dejan de reservar
// presupuesto.
export function consumoPresupuestoConTarjeta({ presupuesto, movimientos, categoria, year, month, quincena, diasCobro }) {
  const presupuestado = presupuesto?.[categoria]?.[String(month)]?.[quincena];
  if (typeof presupuestado !== "number" || presupuestado <= 0) return null;

  let gastado = 0;
  for (const m of movimientos) {
    if (m.category !== categoria || m.type !== "Gasto") continue;
    const esTarjeta = m.metodoPago === "Tarjeta de crédito";
    let q;
    if (esTarjeta) {
      if (m.pagado === true) continue;
      if (!m.fechaPagoTarjeta) continue;
      q = quincenaDeFecha(m.fechaPagoTarjeta, diasCobro);
    } else {
      q = quincenaDeFecha(m.date, diasCobro);
    }
    if (!q || q.year !== year || q.month !== month || q.quincena !== quincena) continue;
    gastado += Number(m.amount) || 0;
  }

  const pct = (gastado / presupuestado) * 100;
  return { presupuestado, gastado, pct };
}
