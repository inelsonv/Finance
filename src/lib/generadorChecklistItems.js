import { Landmark, Wallet, CreditCard, Banknote, ArrowLeftRight, HelpCircle, Briefcase, FileText } from "lucide-react";
import { ingresoMensualNeto } from "./deduccionesLey";
import { calcularResumenQuincena } from "./quincenaResumen";
import { consumoPresupuesto } from "./presupuestoConsumo";
import { contratoActivoEnMes, calcularQuincenaEfectivaContrato } from "../components/Contratos";

const MES_NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function fechaCuotaEnMes(year, month, day) {
  const ultimoDia = new Date(year, month, 0).getDate();
  const dia = Math.min(Math.max(Number(day) || 1, 1), ultimoDia);
  return `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function celdaPrestamo(prestamo, year, mes) {
  if (!prestamo.fechaInicio || !prestamo.cuota) return { activo: false, quincena: null };
  const [sy, sm, sd] = prestamo.fechaInicio.split("-").map(Number);
  if (!sy || !sm) return { activo: false, quincena: null };
  const mesesTotales = prestamo.plazoUnidad === "años" ? (prestamo.plazo || 0) * 12 : prestamo.plazo || 0;
  if (!mesesTotales) return { activo: false, quincena: null };
  const offset = (year - sy) * 12 + (mes - sm);
  const activo = offset >= 0 && offset < mesesTotales;
  const quincena = sd && sd >= 15 ? "Q2" : "Q1";
  return { activo, quincena };
}

export function esCategoriaConsumoGradual(categoriaOItem) {
  if (!categoriaOItem) return false;

  // 1. Configuración explícita del usuario
  const tipo = categoriaOItem.tipoGastoChecklist || categoriaOItem.modoChecklist;
  if (tipo === "pago_unico") return false;
  if (tipo === "consumo_gradual") return true;

  // 2. Gastos fijos siempre son compromisos puntuales (factura, cuota, mensualidad)
  if (categoriaOItem.clasificacion === "Fijo") return false;

  const nombre = (
    typeof categoriaOItem === "string"
      ? categoriaOItem
      : categoriaOItem.nombre || categoriaOItem.category || ""
  ).trim();

  // 3. Gastos de mantenimiento (ej. mantenimiento de vehículo, del hogar), reparaciones,
  // talleres, repuestos: aunque sean variables, son gastos puntuales donde se hace un
  // solo pago, por lo que NO deben mostrarse como barra de consumo progresivo.
  if (/mantenimiento|reparaci[oó]n|taller|repuesto|mec[aá]nic|arreglo/i.test(nombre)) {
    return false;
  }

  // 4. Solo categorías de consumo continuo / frecuente durante la quincena
  // (como combustible/gasolina o supermercado/alimentos) se muestran por defecto como barra.
  if (/^(combustible|gasolina|gasoil|diesel|supermercado|alimentos?|alimentaci[oó]n|despensa|comida|mercado|v[ií]veres)$/i.test(nombre)) {
    return true;
  }

  // Por defecto, cualquier otro gasto variable presupuestado se trata como pago único
  return false;
}

export function generarItemsPeriodo({
  periodo,
  categoriasGasto = [],
  presupuesto = {},
  prestamos = [],
  tarjetas = [],
  contratos = [],
  presupuestoYear,
  movimientos = [],
  estrategiaDeudas,
  tipoCambio,
  pagoRapido = {},
  fuentesIngreso = [],
  checklist = {},
  overridesLocales = {},
  diasCobro = [15, 30],
}) {
  const list = [];
  const presupuestoDisponible =
    (presupuesto && Object.keys(presupuesto).length > 0) ||
    !presupuestoYear ||
    periodo.year === presupuestoYear;

  let idPrioridadDeuda = null;
  if (estrategiaDeudas?.activo) {
    const pagadoPorPrestamoLocal = {};
    for (const m of movimientos || []) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      pagadoPorPrestamoLocal[m.prestamoId] = (pagadoPorPrestamoLocal[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    const candidatas = [];
    for (const p of prestamos || []) {
      if (p.estado !== "Activo") continue;
      const saldo = Math.max((Number(p.montoAprobado) || 0) - (pagadoPorPrestamoLocal[p.id] || 0), 0);
      if (saldo <= 0) continue;
      candidatas.push({ id: `prestamo-${p.id}`, saldo, tasaInteres: p.tasaInteres ?? null });
    }
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
      if (t.saldoActual != null && t.saldoActual > 0) {
        candidatas.push({ id: `tarjeta-${t.id}`, saldo: t.saldoActual, tasaInteres: t.tasaInteres ?? null });
      }
      if (t.saldoActualUSD != null && t.saldoActualUSD > 0) {
        const saldoEnRDS = tipoCambio ? t.saldoActualUSD * tipoCambio : t.saldoActualUSD;
        candidatas.push({ id: `tarjeta-${t.id}`, saldo: saldoEnRDS, tasaInteres: t.tasaInteres ?? null });
      }
    }
    const ordenadas =
      estrategiaDeudas.metodo === "bola"
        ? [...candidatas].sort((a, b) => a.saldo - b.saldo)
        : [...candidatas].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));
    idPrioridadDeuda = ordenadas[0]?.id || null;
  }

  if (presupuestoDisponible) {
    const categoriasMap = new Map();
    for (const c of categoriasGasto || []) {
      if (c?.nombre) {
        categoriasMap.set(c.nombre.trim().toLowerCase(), c);
      }
    }

    // Reunir nombres únicos de categorias existentes en categoriasGasto y en las llaves del presupuesto
    const nombresCategoriasAProcesar = new Set();
    for (const c of categoriasGasto || []) {
      if (c?.nombre) nombresCategoriasAProcesar.add(c.nombre.trim());
    }
    for (const nombreKey of Object.keys(presupuesto || {})) {
      if (nombreKey && typeof nombreKey === "string" && !nombreKey.startsWith("_")) {
        nombresCategoriasAProcesar.add(nombreKey.trim());
      }
    }

    const categoriasAgregadas = new Set();

    for (const nombreCat of nombresCategoriasAProcesar) {
      const lower = nombreCat.toLowerCase();
      if (categoriasAgregadas.has(lower)) continue;

      let catData = presupuesto?.[nombreCat];
      if (!catData) {
        for (const [pk, pv] of Object.entries(presupuesto || {})) {
          if (pk.trim().toLowerCase() === lower) {
            catData = pv;
            break;
          }
        }
      }

      const mesStr = String(periodo.month);
      const mesPad = mesStr.padStart(2, "0");
      const valMes = catData?.[mesStr] ?? catData?.[periodo.month] ?? catData?.[mesPad];
      const rawVal = valMes?.[periodo.quincena];

      const numVal =
        typeof rawVal === "number"
          ? rawVal
          : parseFloat(String(rawVal ?? "").replace(/,/g, "").trim());

      if (Number.isFinite(numVal) && numVal > 0) {
        categoriasAgregadas.add(lower);
        const c = categoriasMap.get(lower) || { nombre: nombreCat, clasificacion: "Fijo" };
        const esVariable = c.clasificacion === "Variable";
        const esGradual = esCategoriaConsumoGradual(c);
        let gastadoReal = 0;
        try {
          const resultado = consumoPresupuesto({
            presupuesto,
            movimientos: movimientos || [],
            categoria: c.nombre || nombreCat,
            year: periodo.year,
            month: periodo.month,
            quincena: periodo.quincena,
            diasCobro,
          });
          gastadoReal = resultado?.gastado || 0;
        } catch {
          gastadoReal = 0;
        }

        list.push({
          key: c.nombre || nombreCat,
          nombre: c.nombre || nombreCat,
          monto: numVal,
          icon: Wallet,
          metodoDefault: c.metodoPagoDefault || null,
          esPrestamo: false,
          categoriaId: c.id || null,
          clasificacion: c.clasificacion || "Fijo",
          tipoGastoChecklist: c.tipoGastoChecklist || (esGradual ? "consumo_gradual" : "pago_unico"),
          esVariable,
          esConsumoGradual: esGradual,
          gastadoReal,
        });
      }
    }
  }

  // Contratos activos que caen en este periodo según su día de pago y días de gracia
  for (const c of contratos || []) {
    if (c.estado !== "Activo" || !c.diaPago || !c.montoEstimado) continue;
    for (const offset of [0, -1]) {
      let mesFacturacion = periodo.month + offset;
      let yearFacturacion = periodo.year;
      if (mesFacturacion < 1) {
        mesFacturacion = 12;
        yearFacturacion -= 1;
      }
      if (!contratoActivoEnMes(c, yearFacturacion, mesFacturacion)) continue;
      const efectivo = calcularQuincenaEfectivaContrato(c.diaPago, c.diasGracia, yearFacturacion, mesFacturacion);
      if (efectivo && efectivo.year === periodo.year && efectivo.month === periodo.month && efectivo.quincena === periodo.quincena) {
        list.push({
          key: `contrato-${c.id}`,
          nombre: `Contrato ${c.nombre}${c.entidadName ? " · " + c.entidadName : ""}`,
          monto: Number(c.montoEstimado) || 0,
          icon: FileText,
          metodoDefault: c.metodoPago || null,
          esContrato: true,
          contratoId: c.id,
          contratoNombre: c.nombre,
          clasificacion: "Fijo",
          diaPago: c.diaPago,
        });
        break;
      }
    }
  }

  for (const p of prestamos || []) {
    if (p.estado !== "Activo" && p.estado !== "Pagado") continue;
    const saldado = p.estado === "Pagado";
    if (p.frecuenciaCuota === "Personalizado") {
      const fechasOverride = {
        ...(p.cuotasPersonalizadasOverrides || {}),
        ...(overridesLocales[p.id]?.personalizadas || {}),
      };
      for (const c of p.cuotasPersonalizadas || []) {
        if (!c.fecha || !c.monto) continue;
        const overrideFecha = fechasOverride[c.fecha];
        const fechaEfectiva = typeof overrideFecha === "string" ? overrideFecha : overrideFecha?.fecha || c.fecha;
        const [cy, cm, cd] = fechaEfectiva.split("-").map(Number);
        if (cy !== periodo.year || cm !== periodo.month) continue;
        const q = cd && cd >= 15 ? "Q2" : "Q1";
        if (q !== periodo.quincena) continue;
        list.push({
          key: `prestamo-${p.id}-${c.fecha}`,
          nombre: overrideFecha
            ? `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (movida desde ${c.fecha.split("-").reverse().slice(0, 2).join("/")})`
            : `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (${c.fecha.split("-").reverse().slice(0, 2).join("/")})`,
          monto: c.monto,
          icon: Landmark,
          metodoDefault: p.metodoPago || "Transferencia",
          esPrestamo: true,
          prestamo: p,
          esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
          prestamoId: p.id,
          prestamoNumero: p.numero,
          fechaCuota: fechaEfectiva,
          diaCuota: Number(fechaEfectiva.slice(-2)),
          entidadId: p.entidadId || "",
          entidadName: p.entidadName || "",
          cuentaDestinoNumero: p.cuentaDestinoNumero || (p.numero === "PT01" ? "0002804611" : ""),
          cuentaDestinoBeneficiario: p.cuentaDestinoBeneficiario || (p.numero === "PT01" ? "Julian Ochoa" : ""),
          cuentaDestinoBanco: p.cuentaDestinoBanco || (p.numero === "PT01" ? "Banco Popular" : (p.entidadName || "")),
          cuentaDestinoTipo: p.cuentaDestinoTipo || (p.numero === "PT01" ? "Cuentas de Terceros" : ""),
          bloqueadoPagado: saldado,
          origenKey: c.fecha,
          tieneOverride: !!overrideFecha,
          cuotaPersonalizada: true,
        });
      }
      continue;
    }

    const overrides = {
      ...(p.quincenaOverrides || {}),
      ...(overridesLocales[p.id]?.mensuales || {}),
    };
    const origenKeyEsteMes = `${periodo.month}-${periodo.year}`;
    const overrideEsteMesRaw = overrides[origenKeyEsteMes];
    const overrideEsteMes = overrideEsteMesRaw && typeof overrideEsteMesRaw === "object" ? overrideEsteMesRaw : null;

    const { activo, quincena } = celdaPrestamo(p, periodo.year, periodo.month);
    if (activo && !overrideEsteMes && quincena === periodo.quincena && p.cuota) {
      list.push({
        key: `prestamo-${p.id}`,
        nombre: `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""}`,
        monto: p.cuota,
        icon: Landmark,
        metodoDefault: p.metodoPago || "Transferencia",
        esPrestamo: true,
        prestamo: p,
        esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
        prestamoId: p.id,
        prestamoNumero: p.numero,
        fechaCuota: fechaCuotaEnMes(periodo.year, periodo.month, Number(p.fechaInicio.slice(-2))),
        diaCuota: Number(p.fechaInicio.slice(-2)),
        entidadId: p.entidadId || "",
        entidadName: p.entidadName || "",
        cuentaDestinoNumero: p.cuentaDestinoNumero || (p.numero === "PT01" ? "0002804611" : ""),
        cuentaDestinoBeneficiario: p.cuentaDestinoBeneficiario || (p.numero === "PT01" ? "Julian Ochoa" : ""),
        cuentaDestinoBanco: p.cuentaDestinoBanco || (p.numero === "PT01" ? "Banco Popular" : (p.entidadName || "")),
        cuentaDestinoTipo: p.cuentaDestinoTipo || (p.numero === "PT01" ? "Cuentas de Terceros" : ""),
        bloqueadoPagado: saldado,
        origenKey: origenKeyEsteMes,
        tieneOverride: false,
      });
    }

    for (const [origenKey, destino] of Object.entries(overrides)) {
      if (!destino || typeof destino !== "object") continue;
      if (destino.year !== periodo.year || destino.month !== periodo.month || destino.quincena !== periodo.quincena) continue;
      const [origMes] = origenKey.split("-").map(Number);
      list.push({
        key: `prestamo-${p.id}-mov-${origenKey}`,
        nombre: `Préstamo ${p.numero}${p.entidadName ? " · " + p.entidadName : ""} (movida de ${MES_NOMBRES[origMes - 1]})`,
        monto: p.cuota,
        icon: Landmark,
        metodoDefault: p.metodoPago || "Transferencia",
        esPrestamo: true,
        prestamo: p,
        esPrioridadDeuda: idPrioridadDeuda === `prestamo-${p.id}`,
        prestamoId: p.id,
        prestamoNumero: p.numero,
        fechaCuota: destino.fecha || fechaCuotaEnMes(destino.year, destino.month, Number(p.fechaInicio?.slice(-2))),
        diaCuota: Number(p.fechaInicio?.slice(-2)),
        entidadId: p.entidadId || "",
        entidadName: p.entidadName || "",
        cuentaDestinoNumero: p.cuentaDestinoNumero || (p.numero === "PT01" ? "0002804611" : ""),
        cuentaDestinoBeneficiario: p.cuentaDestinoBeneficiario || (p.numero === "PT01" ? "Julian Ochoa" : ""),
        cuentaDestinoBanco: p.cuentaDestinoBanco || (p.numero === "PT01" ? "Banco Popular" : (p.entidadName || "")),
        cuentaDestinoTipo: p.cuentaDestinoTipo || (p.numero === "PT01" ? "Cuentas de Terceros" : ""),
        bloqueadoPagado: saldado,
        origenKey,
        tieneOverride: true,
      });
    }
  }

  for (const t of tarjetas || []) {
    if (t.estado && t.estado !== "Activa") continue;
    const diasEnMes = new Date(periodo.year, periodo.month, 0).getDate();
    const diaPago = Math.min(Number(t.fechaPago) || 20, diasEnMes);
    const q = diaPago >= 15 ? "Q2" : "Q1";
    if (q !== periodo.quincena) continue;

    const saldoRD = Number(t.saldoActual) || 0;
    const pagoMinRD = Number(t.pagoMinimo) || 0;
    if (saldoRD > 0 && pagoMinRD > 0) {
      list.push({
        key: `tarjeta-${t.id}-rd-${periodo.year}-${periodo.month}`,
        nombre: `Tarjeta ${t.alias || t.nombre} — pago mínimo`,
        monto: pagoMinRD,
        icon: CreditCard,
        metodoDefault: null,
        esTarjeta: true,
        esPrioridadDeuda: idPrioridadDeuda === `tarjeta-${t.id}`,
        tarjetaId: t.id,
        tarjetaNombre: t.alias || t.nombre,
        entidadName: t.entidadName || "",
      });
    }

    if (t.tieneMonedaSecundaria) {
      const saldoUSD = Number(t.saldoActualUSD) || 0;
      const pagoMinUSD = Number(t.pagoMinimoUSD) || 0;
      if (saldoUSD > 0 && pagoMinUSD > 0) {
        list.push({
          key: `tarjeta-${t.id}-usd-${periodo.year}-${periodo.month}`,
          nombre: `Tarjeta ${t.alias || t.nombre} — pago mínimo (USD)`,
          monto: tipoCambio ? Math.round(pagoMinUSD * tipoCambio * 100) / 100 : pagoMinUSD,
          montoOriginalUSD: pagoMinUSD,
          monedaOriginal: "USD",
          icon: CreditCard,
          metodoDefault: null,
          esTarjeta: true,
          esPrioridadDeuda: idPrioridadDeuda === `tarjeta-${t.id}-usd`,
          tarjetaId: t.id,
          tarjetaNombre: t.alias || t.nombre,
          entidadName: t.entidadName || "",
        });
      }
    }
  }

  if (pagoRapido?.activo && fuentesIngreso && categoriasGasto && presupuesto) {
    const ingresoQuincenal = ingresoMensualNeto(fuentesIngreso) / 2;
    const resumenQuincena = calcularResumenQuincena({
      year: periodo.year,
      month: periodo.month,
      quincena: periodo.quincena,
      presupuesto,
      categoriasGasto,
      prestamos,
      movimientos,
      diasCobro,
    });
    let minimoTarjetasQuincena = 0;
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      const diasEnMesT = new Date(periodo.year, periodo.month, 0).getDate();
      const diaPagoT = Math.min(Number(t.fechaPago), diasEnMesT);
      const qT = diaPagoT >= 15 ? "Q2" : "Q1";
      if (qT !== periodo.quincena) continue;
      if (t.saldoActual > 0 && t.pagoMinimo) minimoTarjetasQuincena += Number(t.pagoMinimo) || 0;
      if (t.saldoActualUSD > 0 && t.pagoMinimoUSD) minimoTarjetasQuincena += (Number(t.pagoMinimoUSD) || 0) * (tipoCambio || 1);
    }
    const extraQuincenal = Math.max(ingresoQuincenal - resumenQuincena.presupuestado - minimoTarjetasQuincena, 0);
    if (extraQuincenal > 0) {
      for (const it of list) {
        const idComparable = it.esPrestamo ? `p-${it.prestamoId}` : it.esTarjeta ? `t-${it.tarjetaId}` : null;
        const idComparableUSD = it.esTarjeta ? `t-${it.tarjetaId}-usd` : null;
        if (idComparable && (idComparable === pagoRapido.deudaId || idComparableUSD === pagoRapido.deudaId)) {
          it.monto = (Number(it.monto) || 0) + extraQuincenal;
          it.esPagoRapido = true;
        }
      }
    }
  }

  for (const it of list) {
    it.montoPresupuestado = it.monto;
    const override = checklist?.items?.[it.key]?.montoOverride;
    if (override != null) it.monto = Number(override) || 0;
  }

  const esGastoPrioritario = (item) =>
    item.clasificacion === "Fijo" || /^(combustible|gasolina)$/i.test(item.nombre?.trim() || "");

  return list.sort((a, b) => {
    const prioridadA = esGastoPrioritario(a) ? 0 : 1;
    const prioridadB = esGastoPrioritario(b) ? 0 : 1;
    return prioridadA - prioridadB || b.monto - a.monto;
  });
}
