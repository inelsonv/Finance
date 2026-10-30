import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Landmark, CreditCard, Ticket, AlertCircle, CheckCircle2, Clock, Package, MessageCircle, Settings, Mail, Calendar, Wallet, Shield, Gift, Gauge, TrendingUp, TrendingDown as TrendingDownIcon, Flame, ListTodo, Lightbulb, BookOpen, FileText, Pill, Zap, Plus, Receipt } from "lucide-react";
import ModalPresupuestarServicio from "./ModalPresupuestarServicio.jsx";
import ModalResumenGastosNoPresupuestados from "./ModalResumenGastosNoPresupuestados.jsx";
import { obtenerGastosNoPresupuestados } from "../lib/gastosNoPresupuestados";
import { watchNotifConfig, saveNotifConfig } from "../lib/db";
import { periodoDeFecha } from "../lib/rachaHabito";
import { consumoPresupuesto, quincenaDeFecha } from "../lib/presupuestoConsumo";
import { GASTO_CATS_FIJO } from "../lib/categorias";
import { periodoActualConfigurado } from "../lib/quincenaConfig";
import { obtenerConsejoDelDia } from "../lib/consejosFinancieros";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { fetchInflacionRD } from "../lib/inflacionRD";
import { diasRestantesProducto, unidadesRestantesProducto, formatWhatsappUrl, construirMensajePedidoFarmacia } from "../lib/inventario";

const UMBRAL_DIAS = 7;

function todayInfo() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function ymPrefix(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// Días restantes hasta una fecha completa "YYYY-MM-DD" (a diferencia de
// diasHasta, que asume un día del mes recurrente).
function diasHastaFecha(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha + "T00:00:00");
  return Math.round((target - hoy) / 86400000);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatMoneyNotif(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diasHasta(diaPago, today, diasGracia = 0) {
  const diaConGracia = (Number(diaPago) || 0) + (Number(diasGracia) || 0);
  const { year, month, day } = today;
  const daysInThisMonth = new Date(year, month, 0).getDate();
  const targetDay = Math.min(diaConGracia, daysInThisMonth);
  let diff = targetDay - day;
  if (diff < 0 || diaConGracia > daysInThisMonth) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
    const diaConGraciaAjustado = diaConGracia > daysInThisMonth ? diaConGracia - daysInThisMonth : diaConGracia;
    const nextTargetDay = Math.min(diaConGraciaAjustado, daysInNextMonth);
    const msPerDay = 24 * 60 * 60 * 1000;
    diff = Math.round((new Date(nextYear, nextMonth - 1, nextTargetDay) - new Date(year, month - 1, day)) / msPerDay);
  }
  return diff;
}

// Determina en qué fecha (año/mes/día) cae la próxima ocurrencia de un día de pago,
// sin importar si ya pasó este mes (en cuyo caso proyecta al mes siguiente).
function ocurrenciaDia(diaPago, today) {
  const { year, month, day } = today;
  const daysInThisMonth = new Date(year, month, 0).getDate();
  const targetDay = Math.min(diaPago, daysInThisMonth);
  if (targetDay >= day) return { year, month, day: targetDay };
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  return { year: nextYear, month: nextMonth, day: Math.min(diaPago, daysInNextMonth) };
}

// Un cobro cerca de fin de mes (ej. día 30) es para pagar la primera quincena del
// mes SIGUIENTE. Un cobro a mitad de mes (ej. día 15) es para pagar la segunda
// quincena de ESE MISMO mes.
function periodoObjetivoParaCobro(diaPago, today) {
  const ocurrencia = ocurrenciaDia(diaPago, today);
  if (ocurrencia.day <= 15) {
    return { year: ocurrencia.year, month: ocurrencia.month, quincena: "Q2" };
  }
  let month = ocurrencia.month + 1;
  let year = ocurrencia.year;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return { year, month, quincena: "Q1" };
}

function yaPagadoEsteMes(movimientos, category, idField, id, today) {
  const prefix = ymPrefix(today.year, today.month);
  return movimientos.some((m) => m.category === category && m[idField] === id && (m.date || "").startsWith(prefix));
}

export function useNotificaciones({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades, eventos, fuentesIngreso, presupuesto, presupuestoYear, seguros, categoriasGasto, ingresosPuntuales, ajustesPresupuesto, sugerenciasInversion, diasCobro, habitosPenalizaciones, versiculoHoy, habitos, habitosRegistro, estrategiaDeudas, tipoCambio, isOwner = false, checklistTodos }) {
  const [inflacionRD, setInflacionRD] = useState(null);
  useEffect(() => {
    let cancelado = false;
    fetchInflacionRD()
      .then((r) => !cancelado && setInflacionRD(r))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  return useMemo(() => {
    const today = todayInfo();
    const list = [];

    // Nivel de endeudamiento: cuotas mensuales de deuda (préstamos + pago
    // mínimo de tarjetas) ÷ ingreso neto mensual — la métrica estándar en
    // finanzas personales (debt-to-income ratio). Según el nivel, se
    // sugiere una recomendación concreta.
    let nivelEndeudamientoCalculado = null;
    if (fuentesIngreso && (prestamos?.length || tarjetas?.length)) {
      const ingresoNeto = ingresoMensualNeto(fuentesIngreso);
      if (ingresoNeto > 0) {
        let cuotasMensuales = 0;
        for (const p of prestamos || []) {
          if (p.estado !== "Activo") continue;
          // Un préstamo con una sola cuota total no es un pago fijo
          // recurrente — no debe contar para el índice de endeudamiento.
          const cuotasTotales = p.frecuenciaCuota === "Personalizado" ? (p.cuotasPersonalizadas || []).length : p.plazoUnidad === "años" ? (p.plazo || 0) * 12 : p.plazo || 0;
          if (cuotasTotales <= 1) continue;
          cuotasMensuales += Number(p.cuota) || 0;
        }
        for (const t of tarjetas || []) {
          if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
          if (t.saldoActual > 0) cuotasMensuales += Number(t.pagoMinimo) || 0;
          if (t.saldoActualUSD > 0) cuotasMensuales += (Number(t.pagoMinimoUSD) || 0) * (tipoCambio || 1);
        }
        const nivelEndeudamiento = cuotasMensuales / ingresoNeto;
        nivelEndeudamientoCalculado = nivelEndeudamiento;
        let nivel = null;
        if (nivelEndeudamiento >= 0.43) {
          nivel = {
            texto: "Nivel crítico",
            recomendacion: "Tus cuotas de deuda superan el 43% de tu ingreso neto — evita adquirir deuda nueva y prioriza reducir la existente cuanto antes.",
          };
        } else if (nivelEndeudamiento >= 0.36) {
          nivel = {
            texto: "Nivel alto",
            recomendacion: "Tus cuotas de deuda están entre 36-43% de tu ingreso neto — antes de un gasto grande nuevo, considera destinar ese dinero a pagar deuda.",
          };
        } else if (nivelEndeudamiento >= 0.2) {
          nivel = {
            texto: "Nivel moderado",
            recomendacion: "Tus cuotas de deuda están entre 20-36% de tu ingreso neto — manejable, pero evita sumar más compromisos fijos por ahora.",
          };
        }
        if (nivel) {
          list.push({
            id: `endeudamiento-${today.year}-${today.month}`,
            icon: Gauge,
            titulo: `Endeudamiento: ${nivel.texto} (${Math.round(nivelEndeudamiento * 100)}%)`,
            subtitulo: nivel.recomendacion,
            dias: 0,
            tab: "estrategia-deudas",
          });
        }
      }
    }

    // Flujo de caja negativo sostenido: revisa los últimos 3 meses
    // COMPLETOS (sin contar el actual, que sigue en curso) y cuenta en
    // cuántos de ellos gastaste más de lo que ingresó. Combinado con un
    // endeudamiento alto, es de las señales más confiables de riesgo real
    // de insolvencia.
    if (movimientos && movimientos.length > 0) {
      const mesesAnalizar = [];
      for (let i = 1; i <= 3; i++) {
        let m = today.month - i;
        let y = today.year;
        if (m <= 0) {
          m += 12;
          y -= 1;
        }
        mesesAnalizar.push(ymPrefix(y, m));
      }
      const mesesNegativos = mesesAnalizar.filter((prefijo) => {
        const delMes = movimientos.filter((mv) => (mv.date || "").startsWith(prefijo));
        if (delMes.length === 0) return false;
        const ingresos = delMes.filter((mv) => mv.type === "Ingreso").reduce((s, mv) => s + (Number(mv.amount) || 0), 0);
        const salidas = delMes.filter((mv) => mv.type !== "Ingreso").reduce((s, mv) => s + (Number(mv.amount) || 0), 0);
        return ingresos > 0 && salidas > ingresos;
      });

      if (mesesNegativos.length >= 2) {
        const esRiesgoAlto = nivelEndeudamientoCalculado != null && nivelEndeudamientoCalculado >= 0.36;
        list.push({
          id: `flujo-negativo-${today.year}-${today.month}`,
          icon: esRiesgoAlto ? AlertCircle : TrendingDownIcon,
          titulo: esRiesgoAlto
            ? `⚠ Riesgo de insolvencia — flujo negativo + endeudamiento alto`
            : `Gastaste más de lo que ganaste ${mesesNegativos.length} de los últimos 3 meses`,
          subtitulo: esRiesgoAlto
            ? "Gastas más de lo que ganas y tu deuda ya es alta — es momento de recortar gastos y buscar ingreso extra antes de que se vuelva insostenible."
            : "Revisa en qué se está yendo el dinero — un mes malo pasa, pero un patrón sostenido es una señal a atender.",
          dias: esRiesgoAlto ? -1 : 0,
          tab: "movimientos",
        });
      }
    }

    // Si hay una estrategia de pago de deudas activa (avalancha o bola de
    // nieve), calcula cuál es la deuda prioritaria según ese plan, para
    // poder mencionarla si aparece atrasada más abajo.
    let idPrioridad = null;
    if (estrategiaDeudas?.activo) {
      const pagadoPorPrestamoLocal = {};
      for (const m of movimientos) {
        if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
        pagadoPorPrestamoLocal[m.prestamoId] = (pagadoPorPrestamoLocal[m.prestamoId] || 0) + (Number(m.amount) || 0);
      }
      const candidatas = [];
      for (const p of prestamos) {
        if (p.estado !== "Activo") continue;
        const saldo = Math.max((Number(p.montoAprobado) || 0) - (pagadoPorPrestamoLocal[p.id] || 0), 0);
        if (saldo <= 0) continue;
        candidatas.push({ id: `p-${p.id}`, saldo, tasaInteres: p.tasaInteres ?? null });
      }
      for (const t of tarjetas) {
        if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
        if (t.saldoActual != null && t.saldoActual > 0) {
          candidatas.push({ id: `t-${t.id}`, saldo: t.saldoActual, tasaInteres: t.tasaInteres ?? null });
        }
        if (t.saldoActualUSD != null && t.saldoActualUSD > 0) {
          const saldoEnRDS = tipoCambio ? t.saldoActualUSD * tipoCambio : t.saldoActualUSD;
          candidatas.push({ id: `t-${t.id}-usd`, saldo: saldoEnRDS, tasaInteres: t.tasaInteres ?? null });
        }
      }
      const ordenadas =
        estrategiaDeudas.metodo === "bola"
          ? [...candidatas].sort((a, b) => a.saldo - b.saldo)
          : [...candidatas].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));
      idPrioridad = ordenadas[0]?.id || null;
    }

    for (const p of prestamos) {
      if (p.estado !== "Activo" || !p.fechaInicio) continue;
      const diaPago = parseInt(p.fechaInicio.split("-")[2], 10);
      if (!diaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de préstamo", "prestamoId", p.id, today)) continue;
      const dias = diasHasta(diaPago, today);
      if (dias <= UMBRAL_DIAS) {
        const esPrioridadAtrasada = dias <= 0 && idPrioridad === `p-${p.id}`;
        list.push({
          id: `p-${p.id}`,
          icon: Landmark,
          titulo: `Cuota de préstamo ${p.numero}`,
          subtitulo: esPrioridadAtrasada
            ? `Según tu plan de ${estrategiaDeudas.metodo === "bola" ? "bola de nieve" : "avalancha"}, esta es tu deuda prioritaria y sigue pendiente`
            : p.entidadName || "Sin entidad",
          dias,
          tab: "prestamos",
        });
      }
    }

    for (const t of tarjetas) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de tarjeta", "tarjetaId", t.id, today)) continue;
      const dias = diasHasta(t.fechaPago, today);
      if (dias <= UMBRAL_DIAS) {
        const esPrioridadAtrasada = dias <= 0 && (idPrioridad === `t-${t.id}` || idPrioridad === `t-${t.id}-usd`);
        list.push({
          id: `t-${t.id}`,
          icon: CreditCard,
          titulo: `Pago de tarjeta ${t.nombre}`,
          subtitulo: esPrioridadAtrasada
            ? `Según tu plan de ${estrategiaDeudas.metodo === "bola" ? "bola de nieve" : "avalancha"}, esta es tu deuda prioritaria y sigue pendiente`
            : t.entidadName || "Sin entidad",
          dias,
          tab: "tarjetas",
        });
      }
    }

    for (const m of membresias) {
      if (m.estado !== "Activa") continue;

      // 1. Alerta de expiración / fin del plan (ej. Google Gemini activo hasta enero, avisar 5 días antes)
      if (m.fechaExpiracion && m.alertarExpiracion !== false) {
        const diasExp = diasHastaFecha(m.fechaExpiracion);
        const umbralExp = m.diasAvisoExpiracion != null ? Number(m.diasAvisoExpiracion) : 5;
        if (diasExp != null && diasExp <= umbralExp) {
          list.push({
            id: `m-exp-${m.id}`,
            icon: Ticket,
            titulo:
              diasExp < 0
                ? `Plan de ${m.nombre} expirado`
                : diasExp === 0
                ? `Plan de ${m.nombre} expira hoy`
                : `Plan de ${m.nombre} expira en ${diasExp} día${diasExp === 1 ? "" : "s"}`,
            subtitulo:
              diasExp < 0
                ? `Venció el ${formatDateDisplay(m.fechaExpiracion)} (${m.tipo || "Suscripción"})`
                : `Vence el ${formatDateDisplay(m.fechaExpiracion)} · Alerta configurada a ${umbralExp} días`,
            dias: Math.max(0, diasExp),
            urgente: diasExp <= 2,
            tab: "membresias",
          });
        }
      }

      // 2. Alerta de día de pago periódico recurrente
      if (m.diaPago && !yaPagadoEsteMes(movimientos, "Pago de membresía", "membresiaId", m.id, today)) {
        const umbralPago = m.diasAvisoPago != null ? Number(m.diasAvisoPago) : UMBRAL_DIAS;
        const dias = diasHasta(m.diaPago, today);
        if (dias <= umbralPago) {
          list.push({
            id: `m-${m.id}`,
            icon: Ticket,
            titulo: `Renovación de ${m.nombre}`,
            subtitulo: m.tipo || "Membresía",
            dias,
            tab: "membresias",
          });
        }
      }
    }

    for (const c of contratos) {
      if (c.estado !== "Activo" || !c.diaPago) continue;
      if (yaPagadoEsteMes(movimientos, "Pago de servicio", "contratoId", c.id, today)) continue;
      const dias = diasHasta(c.diaPago, today, c.diasGracia);
      if (dias <= UMBRAL_DIAS) {
        const tieneMontoEstimado = Number(c.montoEstimado) > 0;
        const mesActual = today.month;
        const qActual = today.day <= 15 ? "Q1" : "Q2";
        const catMatch = [c.nombre, c.tipo, "Servicios", "Agua", "Servicios Básicos", "Electricidad", "Luz", "Internet", "Teléfono", "Gas"].find(
          (k) => k && presupuesto?.[k]
        );
        const enPresupuestoMes = catMatch
          ? (Number(presupuesto?.[catMatch]?.[mesActual]?.[qActual]) || 0) + (Number(presupuesto?.[catMatch]?.[mesActual]?.Q1) || 0) + (Number(presupuesto?.[catMatch]?.[mesActual]?.Q2) || 0)
          : 0;
        const estaPresupuestado = tieneMontoEstimado || enPresupuestoMes > 0;

        list.push({
          id: `c-${c.id}`,
          icon: Zap,
          titulo: `Pago de ${c.nombre}`,
          subtitulo: estaPresupuestado
            ? `${c.tipo || "Servicio"} · Día ${c.diaPago}${tieneMontoEstimado ? ` · $${Number(c.montoEstimado).toLocaleString("es")}` : ""}`
            : `⚠️ ${c.tipo || "Servicio"} · Día ${c.diaPago} (Sin presupuestar)`,
          dias,
          tab: "contratos",
          contrato: c,
          noPresupuestado: !estaPresupuestado,
          tipoServicio: c.tipo || "Servicio",
        });
      }
    }

    if (isOwner) {
      for (const p of products || []) {
        const dias = diasRestantesProducto(p);
        const unidades = unidadesRestantesProducto(p);
        const entidad = p.entidadId ? (entidades || []).find((e) => e.docId === p.entidadId) : null;
        const esFarmacia = entidad?.type === "Farmacia" || /farmacia|hidalgos|medicament|pastilla|medicina|remedio|salud|dosis|tableta/i.test(`${p.name} ${p.category || ""} ${entidad?.name || ""}`);

        // 1. Notificación si se disparó un Pedido Automático a la farmacia
        if (p.ultimoPedidoAutomatico?.fecha) {
          const fechaPedido = new Date(p.ultimoPedidoAutomatico.fecha);
          const diasDesdePedido = Math.floor((Date.now() - fechaPedido.getTime()) / 86400000);
          if (diasDesdePedido <= 4 && p.ultimoPedidoAutomatico.estado === "solicitado") {
            const telefono = p.ultimoPedidoAutomatico.telefono || entidad?.phone || (esFarmacia ? "809-541-4141" : "");
            const entNombre = p.ultimoPedidoAutomatico.entidadName || entidad?.name || "Farmacia Los Hidalgos";
            list.push({
              id: `prod-auto-${p.id}`,
              icon: esFarmacia ? Pill : Package,
              color: "var(--sage)",
              tipoNotif: "exito",
              titulo: `Pedido automático solicitado: ${p.name}`,
              subtitulo: `Solicitado automáticamente a ${entNombre} (${p.ultimoPedidoAutomatico.cantidad || 1} paquete(s)). Toca para ver el producto o confirmar por WhatsApp.`,
              dias: 0,
              tab: "catalogo",
              productId: p.id,
              whatsapp: telefono ? {
                telefono,
                producto: p.name,
                entidadNombre: entNombre,
                cantidad: p.ultimoPedidoAutomatico.cantidad || 1,
                esFarmacia,
                esPedidoAutomatico: true,
              } : null,
            });
          }
        }

        // 2. Alerta de stock bajo / por agotarse
        if (dias != null && dias <= (p.diasAviso ?? 5)) {
          const cantTxt = unidades != null ? ` (quedan ${unidades} unidad${unidades !== 1 ? "es" : ""})` : "";
          const telefono = entidad?.phone || (esFarmacia ? "809-541-4141" : "");
          const entNombre = entidad?.name || (esFarmacia ? "Farmacia Los Hidalgos" : "");
          const subtitulo = entidad
            ? `Pedir a ${entidad.name}${entidad.phone ? " · WhatsApp disponible" : ""}`
            : (esFarmacia ? `Pedir a Farmacia Los Hidalgos (WhatsApp 809-541-4141)` : (p.category || "Producto de inventario"));

          list.push({
            id: `prod-${p.id}`,
            icon: esFarmacia ? Pill : Package,
            titulo: dias <= 0 ? `Se acabó: ${p.name}` : `Se acaba pronto: ${p.name}${cantTxt}`,
            subtitulo,
            dias,
            tab: "catalogo",
            productId: p.id,
            entidad,
            esFarmacia,
            whatsapp: telefono ? {
              telefono,
              producto: p.name,
              entidadNombre: entNombre || "Farmacia Los Hidalgos",
              cantidad: p.cantidadPedidoAuto || p.unidadesPorPaquete || 1,
              esFarmacia,
            } : null,
          });
        }
      }
    }

    for (const e of eventos || []) {
      if (e.estado !== "Pendiente" || !e.fecha) continue;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const target = new Date(e.fecha + "T00:00:00");
      const dias = Math.round((target - hoy) / 86400000);
      if (dias < 0) continue;
      if (dias <= (e.diasAviso ?? 1)) {
        list.push({
          id: `evt-${e.id}`,
          icon: Calendar,
          titulo: e.titulo,
          subtitulo: e.entidadName ? `${e.tipo} · ${e.entidadName}` : e.tipo,
          dias,
          tab: "calendario",
        });
      }
    }

    for (const s of seguros || []) {
      if (s.estado !== "Activo" || !s.fechaVencimiento) continue;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const target = new Date(s.fechaVencimiento + "T00:00:00");
      const dias = Math.round((target - hoy) / 86400000);
      if (dias <= (s.diasAviso ?? 15)) {
        list.push({
          id: `seguro-${s.id}`,
          icon: Shield,
          titulo: dias < 0 ? `Vencido: ${s.nombre}` : `Por vencer: ${s.nombre}`,
          subtitulo: s.entidadName ? `${s.tipo} · ${s.entidadName}` : s.tipo,
          dias,
          tab: "seguros",
        });
      }
    }

    for (const f of fuentesIngreso || []) {
      if (f.estado !== "Activo" || !f.diaPago) continue;
      const diasDelMes = (f.diaPago.match(/\d+/g) || []).map(Number).filter((d) => d >= 1 && d <= 31);
      if (diasDelMes.length === 0) continue;
      let mejorDias = null;
      let mejorDia = null;
      for (const d of diasDelMes) {
        const dd = diasHasta(d, today);
        if (mejorDias == null || dd < mejorDias) {
          mejorDias = dd;
          mejorDia = d;
        }
      }
      if (mejorDias != null && mejorDias <= UMBRAL_DIAS) {
        const periodoObjetivo = periodoObjetivoParaCobro(mejorDia, today);
        list.push({
          id: `cobro-${f.id}`,
          icon: Wallet,
          titulo: `Día de cobro: ${f.nombre}`,
          subtitulo: "Ver checklist de pagos de la quincena",
          dias: mejorDias,
          tab: "checklist-pagos",
          periodoObjetivo,
        });
      }
    }

    for (const sug of sugerenciasInversion || []) {
      if (!sug.superaUmbral) continue;
      // Solo mostrar sugerencias evaluadas en los últimos 5 días.
      const fechaEval = sug.evaluadoEn?.toDate ? sug.evaluadoEn.toDate() : null;
      if (!fechaEval) continue;
      const diasDesde = Math.floor((Date.now() - fechaEval.getTime()) / 86400000);
      if (diasDesde > 5) continue;
      list.push({
        id: `sugerencia-inversion-${sug.id}`,
        icon: TrendingUp,
        titulo: `Te sobraron ${formatMoneyNotif(sug.excedente)} esta quincena`,
        subtitulo: "Ya cumpliste tus obligaciones — considera destinarlo a un fondo de emergencia, ahorro o inversión.",
        dias: 0,
        tab: "puntos",
      });
    }

    for (const pen of habitosPenalizaciones || []) {
      const fechaEval = pen.createdAt?.toDate ? pen.createdAt.toDate() : null;
      if (!fechaEval) continue;
      const diasDesde = Math.floor((Date.now() - fechaEval.getTime()) / 86400000);
      if (diasDesde > 5) continue;
      list.push(
        pen.protegida
          ? {
              id: `habito-penalizacion-${pen.id}`,
              icon: Shield,
              titulo: `Tu racha de "${pen.habitoNombre}" quedó protegida`,
              subtitulo: `Usaste un protector de racha (premio de un cofre) — llevabas ${pen.rachaPrevia} seguidos y no se perdió. Márcalo pronto para seguir la racha.`,
              dias: 0,
              tab: "habitos",
            }
          : {
              id: `habito-penalizacion-${pen.id}`,
              icon: Flame,
              titulo: `Se rompió tu racha de "${pen.habitoNombre}"`,
              subtitulo: `Llevabas ${pen.rachaPrevia} seguidos — se restaron ${Math.abs(pen.puntos)} puntos. Vuelve a marcarlo para empezar de nuevo.`,
              dias: 0,
              tab: "habitos",
            }
      );
    }

    if (versiculoHoy) {
      list.push({
        id: `versiculo-${versiculoHoy.id}`,
        icon: BookOpen,
        titulo: "Tu versículo de hoy",
        subtitulo: `${versiculoHoy.referencia} — toca para leerlo`,
        dias: 0,
        tab: "versiculo-modal",
      });
    }

    const consejoHoy = obtenerConsejoDelDia(new Date(today.year, today.month - 1, today.day));
    list.push({
      id: `consejo-${today.year}-${today.month}-${today.day}`,
      icon: Lightbulb,
      titulo: "Consejo financiero de hoy",
      subtitulo: `"${consejoHoy.texto}" — ${consejoHoy.autor}`,
      dias: 0,
      tab: "consejo-modal",
    });

    // Inflación anual de RD (Banco Mundial): si está en un nivel
    // considerable, recuerda revisar si las categorías de gastos fijos
    // siguen siendo realistas — lo que costaba X hace un año, hoy cuesta
    // más, aunque el usuario no haya cambiado sus hábitos de gasto.
    if (inflacionRD?.valor != null && inflacionRD.valor >= 3) {
      list.push({
        id: `inflacion-${inflacionRD.anio}`,
        icon: TrendingUp,
        titulo: `Inflación anual: ${inflacionRD.valor.toFixed(2)}% (${inflacionRD.anio})`,
        subtitulo: "Lo que presupuestaste hace un año probablemente ya cuesta más — revisa si tus categorías de gastos fijos (comida, transporte, servicios) siguen alcanzando.",
        dias: 0,
        tab: "presupuesto-mensual",
      });
    }

    // Recordatorio de hábitos semanales cuyo día fijado es hoy — solo si
    // todavía no se han marcado como cumplidos esta semana.
    if (habitos && habitos.length > 0) {
      const hoy = new Date();
      const diaHoy = hoy.getDay();
      const registrosPorHabito = {};
      for (const r of habitosRegistro || []) {
        if (!registrosPorHabito[r.habitoId]) registrosPorHabito[r.habitoId] = new Set();
        registrosPorHabito[r.habitoId].add(r.fecha);
      }
      for (const h of habitos) {
        if (h.activo === false || h.frecuencia !== "Semanal" || h.diaRecurrencia == null) continue;
        if (h.diaRecurrencia !== diaHoy) continue;
        const periodoActual = periodoDeFecha("Semanal", hoy);
        const yaCumplido = registrosPorHabito[h.id]?.has(periodoActual);
        if (yaCumplido) continue;
        list.push({
          id: `recordatorio-habito-${h.id}`,
          icon: h.categoria === "Tarea" ? ListTodo : Bell,
          titulo: `Hoy toca: "${h.nombre}"`,
          subtitulo:
            h.categoria === "Tarea"
              ? "Es el día que fijaste para esta tarea — márcala desde Calendario."
              : "Es el día que fijaste para este hábito semanal — no olvides marcarlo.",
          dias: 0,
          tab: h.categoria === "Tarea" ? "calendario" : "habitos",
        });
      }
    }

    // Mapa de categorías para consulta rápida de clasificación y atributos
    const nombresCategoriasGasto = new Set((categoriasGasto || []).map((c) => c.nombre));
    const categoriasMap = {};
    (categoriasGasto || []).forEach((c) => {
      categoriasMap[c.nombre] = c;
    });

    for (const aj of ajustesPresupuesto || []) {
      // Solo mostrar ajustes de los últimos 3 días, para no acumular ruido.
      const fechaAjuste = aj.createdAt?.toDate ? aj.createdAt.toDate() : null;
      if (!fechaAjuste) continue;
      const diasDesde = Math.floor((Date.now() - fechaAjuste.getTime()) / 86400000);
      if (diasDesde > 3) continue;

      // Los gastos fijos no tienen tope de ajuste ni deben generar alerta de exceso
      const catObj = categoriasMap[aj.categoria];
      const esGastoFijo =
        catObj?.clasificacion === "Fijo" ||
        catObj?.tipoGastoChecklist === "pago_unico" ||
        GASTO_CATS_FIJO.includes(aj.categoria) ||
        /^(estacionamiento|parqueo|alquiler|renta|mantenimiento|colegiatura|universidad|colegio|gym|gimnasio|internet|telefono|celular|seguro|cuota|vivienda|servicios)/i.test(aj.categoria);
      if (esGastoFijo) continue;

      list.push({
        id: `ajuste-presupuesto-${aj.id}`,
        icon: Gauge,
        titulo: `Ajustamos "${aj.categoria}" a ${formatMoneyNotif(aj.montoNuevo)}`,
        subtitulo: `Ajustamos tu presupuesto para reflejar tu consumo real de ${formatMoneyNotif(aj.gastado)} en la quincena pasada.`,
        dias: -1,
        tab: "presupuesto-mensual",
      });
    }

    for (const ip of ingresosPuntuales || []) {
      if (ip.recibido || !ip.fecha) continue;
      const dias = diasHastaFecha(ip.fecha);
      if (dias == null || dias > UMBRAL_DIAS) continue;
      list.push({
        id: `ingreso-puntual-${ip.id}`,
        icon: Gift,
        titulo: `${ip.tipo} próximo: ${formatMoneyNotif(ip.monto)}`,
        subtitulo: `${ip.fuenteIngresoNombre || "Sin fuente"} — decide qué harás con ese ingreso`,
        dias,
        tab: "ingresos",
      });
    }

    if (presupuesto && presupuestoYear) {
      const { year, month, quincena } = periodoActualConfigurado(diasCobro);

      // Obtener el checklist de la quincena actual buscando ambas variantes de key (con o sin padding de mes)
      const pKeySinPad = `${year}-${month}-${quincena}`;
      const pKeyConPad = `${year}-${String(month).padStart(2, "0")}-${quincena}`;
      const checklistActual = {
        ...(checklistTodos?.[pKeySinPad]?.items || {}),
        ...(checklistTodos?.[pKeyConPad]?.items || {}),
      };

      if (year === presupuestoYear) {
        for (const categoria of Object.keys(presupuesto)) {
          if (!nombresCategoriasGasto.has(categoria)) continue;
          const catObj = categoriasMap[categoria];

          // Buscar el ítem en el checklist (exacto, trim o case-insensitive)
          let itemCheck = checklistActual[categoria] || checklistActual[categoria.trim()];
          if (!itemCheck) {
            const normCat = categoria.trim().toLowerCase();
            for (const [k, v] of Object.entries(checklistActual)) {
              if (k.trim().toLowerCase() === normCat) {
                itemCheck = v;
                break;
              }
            }
          }
          const pagadoEnCheck = !!itemCheck?.pagado;

          // Movimiento generado desde el checklist para esta categoría en la quincena
          const tieneMovimientoChecklist = (movimientos || []).some((m) => {
            if (m.type !== "Gasto") return false;
            if (m.category !== categoria && m.category?.trim().toLowerCase() !== categoria.trim().toLowerCase()) return false;
            const q = quincenaDeFecha(m.date, diasCobro);
            if (!q || q.year !== year || q.month !== month || q.quincena !== quincena) return false;
            return !!m.origenChecklist;
          });

          // Determinar si es gasto fijo:
          // 1) clasificacion explícita "Fijo"
          // 2) tipoGastoChecklist "pago_unico"
          // 3) pertenece a las categorías fijas por defecto (GASTO_CATS_FIJO)
          // 4) clasificacion no es "Variable"
          // 5) nombres comunes de gastos fijos (estacionamiento, parqueo, alquiler, servicios, etc.)
          const esFijo =
            catObj?.clasificacion === "Fijo" ||
            catObj?.tipoGastoChecklist === "pago_unico" ||
            GASTO_CATS_FIJO.includes(categoria) ||
            catObj?.clasificacion !== "Variable" ||
            /^(estacionamiento|parqueo|alquiler|renta|mantenimiento|colegiatura|universidad|colegio|gym|gimnasio|internet|telefono|celular|seguro|cuota|vivienda|servicios)/i.test(categoria);

          const resultado = consumoPresupuesto({ presupuesto, movimientos, categoria, year, month, quincena, diasCobro });
          if (!resultado) continue;

          const gastado = Number(resultado.gastado) || 0;
          const presupuestado = Number(resultado.presupuestado) || 0;
          if (presupuestado <= 0 && gastado <= 0) continue;

          // 1. CASO: GASTO FIJO O MARCADO EN EL CHECKLIST
          // Los gastos fijos no tienen un "tope" como los variables; pagar lo presupuestado o marcar el check es cumplir la obligación.
          if (esFijo || pagadoEnCheck || tieneMovimientoChecklist) {
            if (pagadoEnCheck || tieneMovimientoChecklist || (gastado > 0 && gastado <= presupuestado + 1)) {
              list.push({
                id: `presupuesto-${categoria}`,
                icon: CheckCircle2,
                color: "var(--sage)",
                tipoNotif: "exito",
                titulo: `${categoria}: Completaste el pago`,
                subtitulo: `Pagaste lo presupuestado (${formatMoneyNotif(gastado || presupuestado)}) para esta quincena.`,
                dias: 0,
                tab: "checklist-pagos",
              });
            } else if (gastado > presupuestado + 1) {
              list.push({
                id: `presupuesto-${categoria}`,
                icon: CheckCircle2,
                color: "var(--sage)",
                tipoNotif: "exito",
                titulo: `${categoria}: Completaste el pago`,
                subtitulo: `Pagaste ${formatMoneyNotif(gastado)} (presupuestado: ${formatMoneyNotif(presupuestado)}) para esta quincena.`,
                dias: 0,
                tab: "checklist-pagos",
              });
            }
            continue;
          }

          // 2. CASO GASTO VARIABLE (se va consumiendo gradualmente en la quincena)
          if (resultado.pct < 80) continue;

          const excedido = gastado > presupuestado + 1;
          const cumplioExacto = !excedido && gastado >= presupuestado - 1;

          if (cumplioExacto) {
            list.push({
              id: `presupuesto-${categoria}`,
              icon: CheckCircle2,
              color: "var(--sage)",
              tipoNotif: "exito",
              titulo: `${categoria}: Completaste el presupuesto`,
              subtitulo: `Alcanzaste el 100% presupuestado (${formatMoneyNotif(gastado)}) sin excederte.`,
              dias: 0,
              tab: "presupuesto-mensual",
            });
          } else if (excedido) {
            const diferencia = gastado - presupuestado;
            list.push({
              id: `presupuesto-${categoria}`,
              icon: AlertCircle,
              titulo: `${categoria}: Superaste el presupuesto`,
              subtitulo: `Gastaste ${formatMoneyNotif(gastado)} — superó por ${formatMoneyNotif(diferencia)} los ${formatMoneyNotif(presupuestado)} presupuestados.`,
              dias: -1,
              tab: "presupuesto-mensual",
            });
          } else {
            list.push({
              id: `presupuesto-${categoria}`,
              icon: Wallet,
              titulo: `${categoria}: ${Math.round(resultado.pct)}% del presupuesto usado`,
              subtitulo: `Has consumido ${formatMoneyNotif(gastado)} de ${formatMoneyNotif(presupuestado)}. Te quedan ${formatMoneyNotif(presupuestado - gastado)}.`,
              dias: 0,
              tab: "presupuesto-mensual",
            });
          }
        }
      }
    }

    // Alerta de gastos no presupuestados en la quincena actual
    const periodoAct = periodoActualConfigurado(diasCobro);
    const noPresup = obtenerGastosNoPresupuestados({
      presupuesto,
      movimientos,
      categoriasGasto,
      year: periodoAct.year,
      month: periodoAct.month,
      quincena: periodoAct.quincena,
      diasCobro,
    });

    if (noPresup.totalNoPresupuestado > 0 && noPresup.cantidadGastos > 0) {
      const topCats = noPresup.porCategoria.slice(0, 3).map((c) => c.categoria).join(", ");
      const extraCount = noPresup.porCategoria.length > 3 ? ` (+${noPresup.porCategoria.length - 3})` : "";
      list.push({
        id: `no-presupuestado-${periodoAct.year}-${periodoAct.month}-${periodoAct.quincena}`,
        icon: Receipt,
        color: "var(--amber)",
        tipoNotif: "advertencia",
        titulo: `Gastos no presupuestados: ${formatMoneyNotif(noPresup.totalNoPresupuestado)}`,
        subtitulo: `${noPresup.cantidadGastos} gasto(s) sin presupuestar esta quincena (${topCats}${extraCount}). Toca para ver el resumen.`,
        dias: 0,
        tab: "gastos-no-presupuestados-modal",
        esGastosNoPresupuestados: true,
      });
    }

    return list.sort((a, b) => a.dias - b.dias);
  }, [prestamos, tarjetas, membresias, contratos, movimientos, products, entidades, eventos, fuentesIngreso, presupuesto, presupuestoYear, seguros, categoriasGasto, ingresosPuntuales, ajustesPresupuesto, sugerenciasInversion, diasCobro, habitosPenalizaciones, versiculoHoy, habitos, habitosRegistro, estrategiaDeudas, tipoCambio, inflacionRD, isOwner, checklistTodos]);
}

export function etiquetaDias(dias, tipoNotif) {
  if (tipoNotif === "exito") return { label: "Completado", color: "var(--sage)", bg: "var(--sage-bg)" };
  if (dias <= 0) return { label: "Hoy", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  if (dias === 1) return { label: "Mañana", color: "var(--stamp)", bg: "var(--stamp-bg)" };
  if (dias <= 3) return { label: `En ${dias} días`, color: "var(--amber)", bg: "var(--amber-bg)" };
  return { label: `En ${dias} días`, color: "var(--ink-soft)", bg: "var(--line-soft)" };
}

export default function NotificationBell({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades, fuentesIngreso, eventos, presupuesto, presupuestoYear, seguros, onNavigate, categoriasGasto, ingresosPuntuales, ajustesPresupuesto, sugerenciasInversion, diasCobro, habitosPenalizaciones, versiculoHoy, habitos, habitosRegistro, estrategiaDeudas, tipoCambio, isOwner = false, checklistTodos }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [emailConfig, setEmailConfig] = useState(undefined);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [leidas, setLeidas] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("smart-finance-notif-leidas") || "[]"));
    } catch (e) {
      return new Set();
    }
  });
  const ref = useRef(null);
  const [contratoParaPresupuestar, setContratoParaPresupuestar] = useState(null);
  const [showModalNoPresupuestados, setShowModalNoPresupuestados] = useState(false);
  const notificaciones = useNotificaciones({ prestamos, tarjetas, membresias, contratos, movimientos, products, entidades, eventos, fuentesIngreso, presupuesto, presupuestoYear, seguros, categoriasGasto, ingresosPuntuales, ajustesPresupuesto, sugerenciasInversion, diasCobro, habitosPenalizaciones, versiculoHoy, habitos, habitosRegistro, estrategiaDeudas, tipoCambio, isOwner, checklistTodos });

  const firma = (n) => `${n.id}:${n.dias}`;
  const noLeidas = notificaciones.filter((n) => !leidas.has(firma(n)));

  useEffect(() => {
    // La insignia del sistema está disponible principalmente cuando la PWA
    // está instalada (por ejemplo, como app de escritorio en Chrome o Edge).
    if (typeof navigator === "undefined") return;
    try {
      if (noLeidas.length > 0 && typeof navigator.setAppBadge === "function") {
        Promise.resolve(navigator.setAppBadge(noLeidas.length)).catch(() => {});
      } else if (noLeidas.length === 0 && typeof navigator.clearAppBadge === "function") {
        Promise.resolve(navigator.clearAppBadge()).catch(() => {});
      }
    } catch (e) {
      // El navegador puede no tener soporte para insignias de aplicaciones.
    }
  }, [noLeidas.length]);

  const marcarLeida = (n) => {
    setLeidas((prev) => {
      const nuevo = new Set(prev);
      nuevo.add(firma(n));
      try {
        localStorage.setItem("smart-finance-notif-leidas", JSON.stringify([...nuevo]));
      } catch (e) {
        // localStorage no disponible, la marca solo dura esta sesión
      }
      return nuevo;
    });
  };

  useEffect(() => {
    const unsub = watchNotifConfig(setEmailConfig, () => {});
    return () => unsub();
  }, []);

  const handleSaveEmail = async () => {
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    try {
      await saveNotifConfig(emailInput.trim());
      setShowSettings(false);
    } finally {
      setSavingEmail(false);
    }
  };

  const codigoEmpleado = (fuentesIngreso || []).find((f) => f.estado === "Activo" && f.codigoEmpleado)?.codigoEmpleado || "";

  const pedirPorWhatsapp = (n, e) => {
    e.stopPropagation();
    if (!n.whatsapp?.telefono) return;
    const msg = n.whatsapp.esFarmacia
      ? construirMensajePedidoFarmacia(
          { name: n.whatsapp.producto, cantidadPedidoAuto: n.whatsapp.cantidad },
          { name: n.whatsapp.entidadNombre },
          { cantidad: n.whatsapp.cantidad, codigoEmpleado }
        )
      : (() => {
          const partes = [`Hola, quisiera pedir: ${n.whatsapp.producto}.`];
          if (codigoEmpleado) partes.push(`Código de empleado: ${codigoEmpleado}.`);
          return partes.join(" ");
        })();

    window.open(formatWhatsappUrl(n.whatsapp.telefono, msg), "_blank");
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--card)",
          color: "var(--ink-soft)",
          cursor: "pointer",
        }}
      >
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Bell size={16} />
          {noLeidas.length > 0 && (
            <span
              className="despensa-mono"
              style={{
                position: "absolute",
                top: -5,
                right: -7,
                minWidth: 15,
                height: 15,
                padding: "0 3px",
                borderRadius: 10,
                background: "var(--stamp)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid var(--card)",
                lineHeight: 1,
                pointerEvents: "none",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
              }}
            >
              {noLeidas.length > 99 ? "99+" : noLeidas.length}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(300px, calc(100vw - 24px))",
            maxHeight: 380,
            overflowY: "auto",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={13} /> Notificaciones
            </span>
            <button
              onClick={() => {
                setEmailInput(emailConfig?.email || "");
                setShowSettings((s) => !s);
              }}
              title="Configurar aviso diario por correo"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer" }}
            >
              <Settings size={13} />
            </button>
          </div>

          {showSettings && (
            <div style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", background: "var(--paper)" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={12} /> Recibe un resumen diario de estas alertas por correo
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="tu@correo.com"
                  style={{ flex: 1, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12 }}
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={savingEmail}
                  style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  {savingEmail ? "…" : "Guardar"}
                </button>
              </div>
            </div>
          )}

          {notificaciones.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12.5, color: "var(--ink-soft)" }}>
              No tienes alertas próximas en los siguientes {UMBRAL_DIAS} días.
            </div>
          ) : (
            notificaciones.map((n) => {
              const Icon = n.icon;
              const etiqueta = etiquetaDias(n.dias, n.tipoNotif);
              const yaLeida = leidas.has(firma(n));
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    marcarLeida(n);
                    if (n.esGastosNoPresupuestados) {
                      setShowModalNoPresupuestados(true);
                      setOpen(false);
                      return;
                    }
                    onNavigate(n.tab, n.periodoObjetivo, n.productId);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      marcarLeida(n);
                      if (n.esGastosNoPresupuestados) {
                        setShowModalNoPresupuestados(true);
                        setOpen(false);
                        return;
                      }
                      onNavigate(n.tab, n.periodoObjetivo, n.productId);
                      setOpen(false);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid var(--line-soft)",
                    cursor: "pointer",
                    textAlign: "left",
                    opacity: yaLeida ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: etiqueta.bg,
                      color: etiqueta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {n.dias <= 0 ? <AlertCircle size={14} /> : <Icon size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.titulo}
                    </div>
                    <div style={{ fontSize: 10.5, color: n.noPresupuestado || n.esGastosNoPresupuestados ? "var(--amber)" : "var(--ink-soft)", fontWeight: n.noPresupuestado || n.esGastosNoPresupuestados ? 600 : 400 }}>
                      {n.subtitulo}
                    </div>
                    {n.esGastosNoPresupuestados && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          marcarLeida(n);
                          setShowModalNoPresupuestados(true);
                          setOpen(false);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                          padding: "3px 8px",
                          fontSize: 10.5,
                          fontWeight: 600,
                          borderRadius: 5,
                          background: "var(--amber-bg)",
                          color: "var(--amber)",
                          border: "1px solid var(--amber)",
                          cursor: "pointer",
                        }}
                        title="Abrir resumen de gastos no presupuestados"
                      >
                        <Receipt size={11} /> Ver resumen
                      </button>
                    )}
                    {n.noPresupuestado && n.contrato && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContratoParaPresupuestar(n.contrato);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                          padding: "3px 8px",
                          fontSize: 10.5,
                          fontWeight: 600,
                          borderRadius: 5,
                          background: "var(--amber-bg)",
                          color: "var(--amber)",
                          border: "1px solid var(--amber)",
                          cursor: "pointer",
                        }}
                        title="Presupuestar monto estimado para este servicio"
                      >
                        <Plus size={11} /> Presupuestar servicio
                      </button>
                    )}
                  </div>
                  {n.whatsapp && (
                    <button
                      onClick={(e) => pedirPorWhatsapp(n, e)}
                      title="Pedir por WhatsApp"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        background: "var(--sage-bg)",
                        color: "var(--sage)",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <MessageCircle size={13} />
                    </button>
                  )}
                  <span
                    className="despensa-mono"
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: etiqueta.bg,
                      color: etiqueta.color,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Clock size={9} /> {etiqueta.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {contratoParaPresupuestar && (
        <ModalPresupuestarServicio
          isOpen={!!contratoParaPresupuestar}
          onClose={() => setContratoParaPresupuestar(null)}
          contrato={contratoParaPresupuestar}
          year={presupuestoYear}
        />
      )}

      {showModalNoPresupuestados && (
        <ModalResumenGastosNoPresupuestados
          isOpen={showModalNoPresupuestados}
          onClose={() => setShowModalNoPresupuestados(false)}
          presupuesto={presupuesto}
          movimientos={movimientos}
          categoriasGasto={categoriasGasto}
          diasCobro={diasCobro}
          presupuestoYear={presupuestoYear}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
