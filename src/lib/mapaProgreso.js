import { calcularRacha } from "./racha";

// Define los 6 "mundos" del mapa de progreso y sus niveles — cada nivel es
// una función que, dados los datos reales de la app, devuelve true/false
// según si ya se cumplió. El "jefe" de cada mundo es la meta principal;
// los niveles anteriores son pasos intermedios hacia esa meta.
export function calcularMapaProgreso(datos) {
  const {
    fuentesIngreso = [],
    categoriasGasto = [],
    movimientos = [],
    presupuesto = {},
    checklistTodos = [],
    prestamos = [],
    tarjetas = [],
    estrategiaDeudas = {},
    metasAhorro = [],
    cuentas = [],
    activos = [],
  } = datos;

  const racha = calcularRacha(checklistTodos);

  const pagosPrestamo = movimientos.filter((m) => m.category === "Pago de préstamo");

  let cuotasMensuales = 0;
  for (const p of prestamos) {
    if (p.estado === "Activo") cuotasMensuales += Number(p.cuota) || 0;
  }
  for (const t of tarjetas) {
    if (t.estado === "Activa" && t.saldoActual > 0) cuotasMensuales += Number(t.pagoMinimo) || 0;
  }
  const ingresoAprox = fuentesIngreso.reduce((s, f) => s + (Number(f.montoEsperado) || 0), 0);
  const nivelEndeudamiento = ingresoAprox > 0 ? cuotasMensuales / ingresoAprox : 0;

  const deudaTotalPendiente =
    prestamos.filter((p) => p.estado === "Activo").length +
    tarjetas.filter((t) => t.estado === "Activa" && t.saldoActual > 0).length;

  const mejorProgresoAhorro = metasAhorro.reduce((max, m) => {
    if (!m.montoObjetivo) return max;
    const cuenta = cuentas.find((c) => c.id === m.cuentaId);
    const saldo = cuenta ? Number(cuenta.saldoActual) || 0 : 0;
    const pct = Math.min(100, (saldo / m.montoObjetivo) * 100);
    return Math.max(max, pct);
  }, 0);

  const totalActivos = cuentas.reduce((s, c) => s + (Number(c.saldoActual) || 0), 0) + activos.reduce((s, a) => s + (Number(a.valorEstimado) || 0), 0);
  const totalDeuda =
    prestamos.filter((p) => p.estado === "Activo").reduce((s, p) => s + (Number(p.montoAprobado) || 0), 0) +
    tarjetas.filter((t) => t.estado === "Activa").reduce((s, t) => s + (Number(t.saldoActual) || 0), 0);
  const patrimonioNeto = totalActivos - totalDeuda;

  const mundos = [
    {
      id: "primeros-pasos",
      nombre: "Primeros pasos",
      niveles: [
        { nombre: "Configura tus ingresos", accion: "Ve a Ingresos y agrega tu fuente de ingreso principal.", tab: "ingresos", completo: fuentesIngreso.length > 0 },
        { nombre: "Configura tus categorías de gasto", accion: "Ve a Categoría de gasto y crea al menos una categoría.", tab: "presupuesto-categoria-gasto", completo: categoriasGasto.length > 0 },
        { nombre: "Registra tu primer movimiento", accion: "Ve a Movimientos y registra cualquier gasto o ingreso reciente.", tab: "movimientos", completo: movimientos.length > 0 },
      ],
      jefe: { nombre: "Configura tu presupuesto", accion: "Ve a Presupuesto y ponle un monto a al menos una categoría.", tab: "presupuesto-mensual", completo: Object.keys(presupuesto || {}).length > 0 },
    },
    {
      id: "cazador-de-gastos",
      nombre: "Cazador de gastos",
      niveles: [
        { nombre: "Cumple 1 quincena seguida", accion: "Ve al Checklist de pagos y marca todos los pagos de esta quincena.", tab: "checklist-pagos", completo: racha >= 1 },
        { nombre: "Cumple 2 quincenas seguidas", accion: "Sigue marcando el Checklist completo cada quincena.", tab: "checklist-pagos", completo: racha >= 2 },
        { nombre: "Cumple 3 quincenas seguidas", accion: "Un empujón más — no rompas la racha.", tab: "checklist-pagos", completo: racha >= 3 },
      ],
      jefe: { nombre: "Cumple 4 quincenas seguidas", accion: "Mantén el Checklist al día 4 quincenas seguidas para vencer este mundo.", tab: "checklist-pagos", completo: racha >= 4 },
    },
    {
      id: "guerrero-anti-deuda",
      nombre: "Guerrero anti-deuda",
      niveles: [
        { nombre: "Registra tu primer pago de deuda", accion: "Ve a Préstamos o al Checklist y registra un pago a una deuda.", tab: "prestamos", completo: pagosPrestamo.length > 0 },
        { nombre: "Activa una estrategia de deudas", accion: "Ve a Estrategia de deudas y activa avalancha o bola de nieve.", tab: "estrategia-deudas", completo: !!estrategiaDeudas?.activo },
        { nombre: "Registra al menos 2 pagos de deuda", accion: "Sigue pagando tus deudas consistentemente.", tab: "prestamos", completo: pagosPrestamo.length >= 2 },
      ],
      jefe: { nombre: "Salda tu primera deuda por completo", accion: "Termina de pagar cualquiera de tus préstamos o tarjetas por completo.", tab: "prestamos", completo: prestamos.some((p) => p.estado === "Pagado") },
    },
    {
      id: "escudo-de-emergencia",
      nombre: "Escudo de emergencia",
      niveles: [
        { nombre: "Crea tu primera meta de ahorro", accion: "Ve a Ahorro y crea una meta (ej. fondo de emergencia).", tab: "ahorro", completo: metasAhorro.length > 0 },
        { nombre: "Alcanza 25% de alguna meta", accion: "Sigue aportando a tu meta de ahorro.", tab: "ahorro", completo: mejorProgresoAhorro >= 25 },
        { nombre: "Alcanza 50% de alguna meta", accion: "Ya vas a mitad de camino — no pares ahora.", tab: "ahorro", completo: mejorProgresoAhorro >= 50 },
      ],
      jefe: { nombre: "Completa una meta de ahorro al 100%", accion: "Alcanza el 100% de cualquiera de tus metas de ahorro.", tab: "ahorro", completo: mejorProgresoAhorro >= 100 },
    },
    {
      id: "libre-de-deudas-malas",
      nombre: "Libre de deudas malas",
      niveles: [
        { nombre: "Baja tu endeudamiento de nivel crítico", accion: "Reduce tus cuotas de deuda o aumenta tu ingreso hasta bajar de 43%.", tab: "estrategia-deudas", completo: nivelEndeudamiento < 0.43 },
        { nombre: "Baja tu endeudamiento de nivel alto", accion: "Sigue bajando tu nivel de endeudamiento hasta menos de 36%.", tab: "estrategia-deudas", completo: nivelEndeudamiento < 0.36 },
        { nombre: "Llega a endeudamiento saludable (<20%)", accion: "Ya casi — baja tu endeudamiento a menos del 20%.", tab: "estrategia-deudas", completo: nivelEndeudamiento < 0.2 },
      ],
      jefe: { nombre: "Queda completamente libre de deuda", accion: "Salda todos tus préstamos y tarjetas activos.", tab: "estrategia-deudas", completo: deudaTotalPendiente === 0 && (prestamos.length > 0 || tarjetas.length > 0) },
    },
    {
      id: "inversionista",
      nombre: "Inversionista",
      niveles: [
        { nombre: "Registra tu primera cuenta", accion: "Ve a Cuentas y registra tu cuenta bancaria.", tab: "cuentas", completo: cuentas.length > 0 },
        { nombre: "Registra tu primer activo", accion: "Ve a Activos y registra algo que poseas (vehículo, propiedad, etc.).", tab: "activos", completo: activos.length > 0 },
        { nombre: "Ten al menos 3 cuentas/activos registrados", accion: "Sigue registrando tus cuentas y activos.", tab: "activos", completo: cuentas.length + activos.length >= 3 },
      ],
      jefe: { nombre: "Tu patrimonio neto es positivo", accion: "Sigue reduciendo deuda y/o aumentando tus activos hasta que tu patrimonio neto supere tu deuda.", tab: "activos", completo: patrimonioNeto > 0 && totalDeuda > 0 },
    },
  ];

  // Determina el estado de cada mundo: bloqueado (el anterior no se completó),
  // en curso, o completado — y en qué nivel/paso está el jugador ahora mismo.
  let mundoActualEncontrado = false;
  const mundosConEstado = mundos.map((mundo, i) => {
    const pasos = [...mundo.niveles, mundo.jefe];
    const pasosCompletos = pasos.filter((p) => p.completo).length;
    const completado = pasosCompletos === pasos.length;
    const mundoAnteriorCompleto = i === 0 || mundos[i - 1].niveles.every((n) => n.completo) && mundos[i - 1].jefe.completo;
    const bloqueado = !mundoAnteriorCompleto;
    const esActual = !bloqueado && !completado && !mundoActualEncontrado;
    if (esActual) mundoActualEncontrado = true;
    return { ...mundo, pasos, pasosCompletos, totalPasos: pasos.length, completado, bloqueado, esActual };
  });

  return mundosConEstado;
}
