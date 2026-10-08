import React, { useMemo, useState, useEffect } from "react";
import {
  Snowflake,
  Mountain,
  Landmark,
  CreditCard,
  Info,
  Check,
  Power,
  Sparkles,
  Rocket,
  CheckCircle2,
  X,
  Calendar,
  Wallet,
  AlertCircle,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import {
  activarEstrategiaDeudas,
  desactivarEstrategiaDeudas,
  watchPagoRapido,
  activarPagoRapido,
  desactivarPagoRapido,
  addMovimiento,
  updatePrestamoEstado,
  updateTarjeta,
  marcarConsumosComoPagados,
} from "../lib/db";
import { calcularResumenQuincena } from "../lib/quincenaResumen";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { periodoActualConfigurado } from "../lib/quincenaConfig";

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EstrategiaDeudas({
  prestamos,
  tarjetas,
  movimientos,
  estrategiaDeudas,
  tipoCambio,
  fuentesIngreso,
  categoriasGasto,
  presupuesto,
  presupuestoYear,
  diasCobro,
  cuentas = [],
  entidades = [],
}) {
  const [metodo, setMetodo] = useState(() => (estrategiaDeudas?.activo ? estrategiaDeudas.metodo : "bola"));
  const [pagoRapido, setPagoRapido] = useState({});

  useEffect(() => {
    const unsub = watchPagoRapido(setPagoRapido, () => setPagoRapido({}));
    return () => unsub && unsub();
  }, []);
  const [activando, setActivando] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(() => periodoActualConfigurado(diasCobro));

  // Estados para el flujo de pago de deudas desde este módulo
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [deudaSeleccionadaId, setDeudaSeleccionadaId] = useState("");
  const [tipoPagoModo, setTipoPagoModo] = useState("completo"); // "completo" | "parcial"
  const [montoPago, setMontoPago] = useState("");
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10));
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [cuentaId, setCuentaId] = useState("");
  const [descripcionPago, setDescripcionPago] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState(null);
  const [alertaExito, setAlertaExito] = useState(null);

  const estaActivaEsteMetodo = estrategiaDeudas?.activo && estrategiaDeudas.metodo === metodo;

  const handleActivar = async () => {
    setActivando(true);
    try {
      await activarEstrategiaDeudas(metodo);
    } finally {
      setActivando(false);
    }
  };

  const handleDesactivar = async () => {
    setActivando(true);
    try {
      await desactivarEstrategiaDeudas();
    } finally {
      setActivando(false);
    }
  };

  const pagadoPorPrestamo = useMemo(() => {
    const map = {};
    for (const m of movimientos) {
      if (m.category !== "Pago de préstamo" || !m.prestamoId) continue;
      map[m.prestamoId] = (map[m.prestamoId] || 0) + (Number(m.amount) || 0);
    }
    return map;
  }, [movimientos]);

  const deudas = useMemo(() => {
    const list = [];

    for (const p of prestamos) {
      if (p.estado !== "Activo" && p.estado !== "En mora") continue;
      const pagado = pagadoPorPrestamo[p.id] || 0;
      const saldo = Math.max((Number(p.montoAprobado) || 0) - pagado, 0);
      if (saldo <= 0) continue;
      list.push({
        id: `p-${p.id}`,
        tipo: "prestamo",
        prestamoId: p.id,
        prestamoObj: p,
        nombre: `Préstamo ${p.numero}`,
        subtitulo: p.entidadName || "Sin entidad",
        saldo,
        tasaInteres: p.tasaInteres ?? null,
        cuotaMinima: p.cuota ?? null,
        icon: Landmark,
      });
    }

    for (const t of tarjetas) {
      if (t.estado !== "Activa" || (t.tipoTarjeta || "Crédito") !== "Crédito") continue;
      if (t.saldoActual != null && t.saldoActual > 0) {
        list.push({
          id: `t-${t.id}`,
          tipo: "tarjeta",
          tarjetaId: t.id,
          tarjetaObj: t,
          nombre: t.nombre,
          subtitulo: t.entidadName || "Sin entidad",
          saldo: t.saldoActual,
          tasaInteres: t.tasaInteres ?? null,
          cuotaMinima: t.pagoMinimo ?? null,
          icon: CreditCard,
        });
      }
      // Si la tarjeta también maneja saldo en dólares, se agrega como una
      // deuda aparte — convertida a RD$ (con la tasa de cambio actual) solo
      // para poder ordenarla junto a las demás, pero el pago mínimo se
      // muestra en su moneda original.
      if (t.saldoActualUSD != null && t.saldoActualUSD > 0) {
        const saldoEnRDS = tipoCambio ? t.saldoActualUSD * tipoCambio : t.saldoActualUSD;
        list.push({
          id: `t-${t.id}-usd`,
          tipo: "tarjeta",
          tarjetaId: t.id,
          tarjetaObj: t,
          nombre: `${t.nombre} (USD)`,
          subtitulo: t.entidadName || "Sin entidad",
          saldo: saldoEnRDS,
          saldoOriginalUSD: t.saldoActualUSD,
          tasaInteres: t.tasaInteres ?? null,
          cuotaMinima: t.pagoMinimoUSD ?? null,
          esUSD: true,
          icon: CreditCard,
        });
      }
    }

    const ordenadas =
      metodo === "bola"
        ? [...list].sort((a, b) => a.saldo - b.saldo)
        : [...list].sort((a, b) => (b.tasaInteres ?? -1) - (a.tasaInteres ?? -1));

    return ordenadas;
  }, [prestamos, tarjetas, pagadoPorPrestamo, metodo, tipoCambio]);

  // Manejo de apertura y cambio de deuda para pagar
  const abrirModalPago = (d) => {
    const deuda = d || deudas[0];
    if (!deuda) return;
    setDeudaSeleccionadaId(deuda.id);
    setTipoPagoModo("completo");
    const montoTotal = deuda.esUSD ? deuda.saldoOriginalUSD : deuda.saldo;
    setMontoPago(String(montoTotal));
    setFechaPago(new Date().toISOString().slice(0, 10));
    setMetodoPago("Transferencia");
    setCuentaId("");
    setDescripcionPago(
      deuda.tipo === "prestamo"
        ? `Liquidación total Préstamo ${deuda.prestamoObj?.numero || ""}`
        : `Pago total de saldo ${deuda.nombre}`
    );
    setErrorPago(null);
    setModalPagoAbierto(true);
  };

  const handleSeleccionarDeuda = (id) => {
    setDeudaSeleccionadaId(id);
    const d = deudas.find((item) => item.id === id);
    if (d) {
      const montoTotal = d.esUSD ? d.saldoOriginalUSD : d.saldo;
      if (tipoPagoModo === "completo") {
        setMontoPago(String(montoTotal));
      }
      setDescripcionPago(
        d.tipo === "prestamo"
          ? (tipoPagoModo === "completo"
              ? `Liquidación total Préstamo ${d.prestamoObj?.numero || ""}`
              : `Abono a Préstamo ${d.prestamoObj?.numero || ""}`)
          : (tipoPagoModo === "completo"
              ? `Pago total de saldo ${d.nombre}`
              : `Abono a saldo ${d.nombre}`)
      );
    }
  };

  const handleCambiarModoPago = (nuevoModo) => {
    setTipoPagoModo(nuevoModo);
    const d = deudas.find((item) => item.id === deudaSeleccionadaId);
    if (d) {
      const montoTotal = d.esUSD ? d.saldoOriginalUSD : d.saldo;
      if (nuevoModo === "completo") {
        setMontoPago(String(montoTotal));
        setDescripcionPago(
          d.tipo === "prestamo"
            ? `Liquidación total Préstamo ${d.prestamoObj?.numero || ""}`
            : `Pago total de saldo ${d.nombre}`
        );
      } else {
        setDescripcionPago(
          d.tipo === "prestamo"
            ? `Abono a Préstamo ${d.prestamoObj?.numero || ""}`
            : `Abono a saldo ${d.nombre}`
        );
      }
    }
  };

  const handleConfirmarPago = async () => {
    setErrorPago(null);
    const d = deudas.find((item) => item.id === deudaSeleccionadaId);
    if (!d) {
      setErrorPago("Por favor selecciona una deuda válida.");
      return;
    }

    const montoNum = parseFloat(montoPago);
    if (!montoNum || isNaN(montoNum) || montoNum <= 0) {
      setErrorPago("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    const saldoMaximo = d.esUSD ? d.saldoOriginalUSD : d.saldo;
    const esCompleto = tipoPagoModo === "completo" || montoNum >= saldoMaximo;

    setProcesandoPago(true);
    try {
      const cuentaObj = cuentas?.find((c) => c.id === cuentaId);

      if (d.tipo === "prestamo") {
        const prestamo = d.prestamoObj;
        const desc =
          descripcionPago.trim() ||
          (esCompleto
            ? `Liquidación total Préstamo ${prestamo.numero || ""}`
            : `Pago de préstamo ${prestamo.numero || ""}`);

        // 1. Registrar movimiento en la colección de movimientos
        const nuevoMovRef = await addMovimiento({
          type: "Pago de préstamo",
          category: "Pago de préstamo",
          amount: montoNum,
          description: desc,
          date: fechaPago,
          metodoPago,
          entidadId: prestamo.entidadId || null,
          entidadName: prestamo.entidadName || "",
          prestamoId: prestamo.id,
          prestamoNumero: prestamo.numero || "",
          cuentaId: cuentaId || null,
          cuentaNombre: cuentaObj?.nombre || "",
        });

        // 2. Si se paga completo, asegurar que el estado del préstamo cambia a 'Pagado'
        if (esCompleto) {
          await updatePrestamoEstado(prestamo.id, "Pagado");
        }

        setAlertaExito({
          titulo: esCompleto ? "¡Préstamo liquidado por completo!" : "Pago de préstamo registrado",
          detalle: esCompleto
            ? `Se registró el pago de ${formatMoney(montoNum)} en tus movimientos y el Préstamo ${prestamo.numero} cambió de estado a PAGADO.`
            : `Se registró el abono de ${formatMoney(montoNum)} al Préstamo ${prestamo.numero} en tus movimientos.`,
        });
      } else if (d.tipo === "tarjeta") {
        const tarjeta = d.tarjetaObj;
        const esUSD = !!d.esUSD;
        const desc =
          descripcionPago.trim() ||
          (esCompleto
            ? `Pago total de saldo ${tarjeta.nombre || ""}`
            : `Abono a saldo ${tarjeta.nombre || ""}`);

        // 1. Registrar movimiento en la colección de movimientos
        const nuevoMovRef = await addMovimiento({
          type: "Pago de tarjeta",
          category: "Pago de tarjeta",
          amount: montoNum,
          description: desc,
          date: fechaPago,
          metodoPago,
          entidadId: tarjeta.entidadId || null,
          entidadName: tarjeta.entidadName || "",
          tarjetaId: tarjeta.id,
          tarjetaNombre: tarjeta.nombre || "",
          monedaTarjeta: esUSD ? "USD" : "RDS",
          cuentaId: cuentaId || null,
          cuentaNombre: cuentaObj?.nombre || "",
        });

        // 2. Actualizar saldo actual en la tarjeta a 0 (o restar el abono)
        const campo = esUSD ? "saldoActualUSD" : "saldoActual";
        const saldoPrevio = Number(tarjeta[campo]) || 0;
        const nuevoSaldo = esCompleto ? 0 : Math.max(saldoPrevio - montoNum, 0);
        await updateTarjeta(tarjeta.id, { [campo]: nuevoSaldo });

        // 3. Marcar consumos pendientes de tarjeta como pagados si los hay
        const consumosPendientes = (movimientos || [])
          .filter(
            (m) =>
              m.tarjetaId === tarjeta.id &&
              m.type === "Gasto" &&
              m.metodoPago === "Tarjeta de crédito" &&
              !m.pagado
          )
          .map((m) => m.id);
        if (consumosPendientes.length > 0 && nuevoMovRef?.id) {
          await marcarConsumosComoPagados(consumosPendientes, nuevoMovRef.id);
        }

        const montoFormateado = esUSD
          ? `US$${montoNum.toLocaleString("es", { minimumFractionDigits: 2 })}`
          : formatMoney(montoNum);

        setAlertaExito({
          titulo: esCompleto ? "¡Tarjeta saldada por completo!" : "Pago de tarjeta registrado",
          detalle: esCompleto
            ? `Se registró el pago de ${montoFormateado} en tus movimientos y el saldo de la tarjeta ${tarjeta.nombre} se actualizó a $0.00 (deuda saldada).`
            : `Se registró el abono de ${montoFormateado} a la tarjeta ${tarjeta.nombre} en tus movimientos.`,
        });
      }

      setModalPagoAbierto(false);
    } catch (err) {
      console.error("Error al registrar pago de deuda:", err);
      setErrorPago(err?.message || "Ocurrió un error al procesar el pago.");
    } finally {
      setProcesandoPago(false);
    }
  };

  const deudaActivaParaModal = deudas.find((item) => item.id === deudaSeleccionadaId) || deudas[0];

  const totales = useMemo(() => {
    const saldoTotal = deudas.reduce((s, d) => s + d.saldo, 0);
    const cuotaTotal = deudas.reduce((s, d) => {
      const monto = d.cuotaMinima || 0;
      return s + (d.esUSD && tipoCambio ? monto * tipoCambio : d.esUSD ? 0 : monto);
    }, 0);
    return { saldoTotal, cuotaTotal };
  }, [deudas, tipoCambio]);

  // La deuda con la tasa de interés más alta — se resalta con color de
  // advertencia porque es la que más "sangra" en intereses con el tiempo.
  const mayorTasaInteres = useMemo(() => {
    const tasas = deudas.map((d) => d.tasaInteres).filter((t) => t != null);
    return tasas.length > 0 ? Math.max(...tasas) : null;
  }, [deudas]);

  // Cuánto dinero "extra" queda disponible esta quincena, después de tu
  // ingreso esperado menos todo lo presupuestado (gastos fijos/variables +
  // cuotas de préstamo) y los pagos mínimos de tarjeta — esa es la parte que
  // se sugiere destinar a tu deuda prioritaria.
  const disponibleExtra = useMemo(() => {
    if (!fuentesIngreso || !categoriasGasto || !presupuesto) return null;
    const periodo = periodoSeleccionado;
    const ingreso = ingresoMensualNeto(fuentesIngreso) / 2;
    const resumen = calcularResumenQuincena({
      year: periodo.year,
      month: periodo.month,
      quincena: periodo.quincena,
      presupuesto,
      categoriasGasto,
      prestamos,
      movimientos,
      diasCobro,
    });

    let minimoTarjetas = 0;
    for (const t of tarjetas || []) {
      if (t.estado !== "Activa" || !t.fechaPago) continue;
      const diasEnMes = new Date(periodo.year, periodo.month, 0).getDate();
      const diaPago = Math.min(Number(t.fechaPago), diasEnMes);
      const q = diaPago >= 15 ? "Q2" : "Q1";
      if (q !== periodo.quincena) continue;
      if (t.saldoActual > 0 && t.pagoMinimo) minimoTarjetas += Number(t.pagoMinimo) || 0;
      if (t.saldoActualUSD > 0 && t.pagoMinimoUSD) minimoTarjetas += (Number(t.pagoMinimoUSD) || 0) * (tipoCambio || 1);
    }

    const extra = ingreso - resumen.presupuestado - minimoTarjetas;
    return { ingreso, presupuestado: resumen.presupuestado, minimoTarjetas, extra, periodo };
  }, [fuentesIngreso, categoriasGasto, presupuesto, prestamos, tarjetas, movimientos, diasCobro, tipoCambio, periodoSeleccionado]);

  // Proyección de "Pago rápido": cuánto se tardaría en saldar la deuda
  // prioritaria a ritmo normal (solo la cuota mínima) vs. destinándole
  // también todo el excedente disponible (que ya excluye gastos fijos y
  // cuotas mínimas) — sin tocar el dinero que necesita para vivir.
  const pagoRapidoInfo = useMemo(() => {
    const dPrioridad = deudas[0];
    if (!dPrioridad || !dPrioridad.cuotaMinima || dPrioridad.cuotaMinima <= 0) return null;
    const extraMensual = disponibleExtra ? Math.max(disponibleExtra.extra, 0) * 2 : 0;
    const mesesActual = Math.ceil(dPrioridad.saldo / dPrioridad.cuotaMinima);
    const mesesRapido = extraMensual > 0 ? Math.ceil(dPrioridad.saldo / (dPrioridad.cuotaMinima + extraMensual)) : mesesActual;
    return { deuda: dPrioridad, extraMensual, mesesActual, mesesRapido, mesesAhorrados: mesesActual - mesesRapido };
  }, [deudas, disponibleExtra]);

  const tarjetasSinSaldo = tarjetas.filter((t) => t.estado === "Activa" && t.saldoActual == null);

  return (
    <div>
      {/* Alerta de confirmación de pago exitoso */}
      {alertaExito && (
        <div
          style={{
            background: "var(--sage-bg)",
            border: "1px solid var(--sage)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            animation: "fadeIn 0.25s ease",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <CheckCircle2 size={22} style={{ color: "var(--sage)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--sage)" }}>
                {alertaExito.titulo}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink)", marginTop: 2 }}>
                {alertaExito.detalle}
              </div>
            </div>
          </div>
          <button
            onClick={() => setAlertaExito(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ink-soft)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
            title="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {deudas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          🎉 ¡Felicidades! No tienes deudas activas registradas (todos tus préstamos están pagados y tus tarjetas al día).
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Deuda total</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700, color: "var(--stamp)" }}>{formatMoney(totales.saldoTotal)}</div>
            </div>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Cuotas mínimas mensuales</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatMoney(totales.cuotaTotal)}</div>
            </div>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Deudas activas</div>
              <div className="despensa-mono" style={{ fontSize: 18, fontWeight: 700 }}>{deudas.length}</div>
            </div>
            {/* Botón rápido para pagar deuda directamente */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(234, 154, 41, 0.08) 0%, rgba(45, 140, 110, 0.08) 100%)",
                border: "1px solid var(--amber)",
                borderRadius: 10,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => abrirModalPago(deudas[0])}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  background: "var(--amber)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  width: "100%",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <DollarSign size={15} /> Pagar deuda seleccionada
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button
              onClick={() => setMetodo("bola")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: metodo === "bola" ? "var(--sage-bg)" : "var(--card)",
                color: metodo === "bola" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <Snowflake size={14} /> Bola de nieve
            </button>
            <button
              onClick={() => setMetodo("avalancha")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 8px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: metodo === "avalancha" ? "var(--sage-bg)" : "var(--card)",
                color: metodo === "avalancha" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <Mountain size={14} /> Avalancha
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5, display: "flex", gap: 6 }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {metodo === "bola"
              ? "Bola de nieve: ordena tus deudas de menor a mayor saldo. Paga el mínimo en todas, y todo el dinero extra que puedas destínalo a la más pequeña hasta liquidarla; luego sigue con la siguiente. Genera avances rápidos y motivación."
              : "Avalancha: ordena tus deudas de mayor a menor tasa de interés. Paga el mínimo en todas, y el dinero extra destínalo a la de tasa más alta primero. Matemáticamente es la que menos intereses totales termina pagando."}
          </div>

          <div style={{ marginBottom: 16 }}>
            {estaActivaEsteMetodo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)", borderRadius: 8 }}>
                  <Check size={13} /> Estrategia activa
                </div>
                <button
                  onClick={handleDesactivar}
                  disabled={activando}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", fontSize: 11.5, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
                >
                  <Power size={12} /> Desactivar
                </button>
              </div>
            ) : (
              <button
                onClick={handleActivar}
                disabled={activando}
                style={{ padding: "8px 16px", fontSize: 12.5, fontWeight: 600, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
              >
                {activando ? "Activando…" : `Activar esta estrategia`}
              </button>
            )}
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
              Al activarla, recibirás una notificación si tu deuda prioritaria según este plan queda atrasada.
            </div>
          </div>

          {disponibleExtra && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select
                value={periodoSeleccionado.month}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, month: Number(e.target.value) })}
                style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
              >
                {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(
                  (nombre, i) => (
                    <option key={nombre} value={i + 1}>{nombre}</option>
                  )
                )}
              </select>
              <input
                type="number"
                value={periodoSeleccionado.year}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, year: Number(e.target.value) || periodoSeleccionado.year })}
                style={{ width: 80, padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              />
              <select
                value={periodoSeleccionado.quincena}
                onChange={(e) => setPeriodoSeleccionado({ ...periodoSeleccionado, quincena: e.target.value })}
                style={{ padding: "7px 9px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, background: "var(--card)" }}
              >
                <option value="Q1">1ra quincena</option>
                <option value="Q2">2da quincena</option>
              </select>
            </div>
          )}

          {disponibleExtra && (
            <div
              style={{
                background: disponibleExtra.extra > 0 ? "var(--sage-bg)" : "var(--stamp-bg)",
                border: `1px solid ${disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Sparkles size={14} style={{ color: disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: disponibleExtra.extra > 0 ? "var(--sage)" : "var(--stamp)" }}>
                  {disponibleExtra.extra > 0 ? "Dinero extra disponible" : "No hay dinero extra"} —{" "}
                  {disponibleExtra.periodo.quincena === "Q1" ? "1ra" : "2da"} quincena de{" "}
                  {["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][disponibleExtra.periodo.month - 1]}
                </span>
              </div>
              {disponibleExtra.extra > 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>
                  Después de tu ingreso NETO esperado ({formatMoney(disponibleExtra.ingreso)}, ya con AFP/SFS/ISR
                  descontados donde aplica) menos tus gastos presupuestados y cuotas mínimas (
                  {formatMoney(disponibleExtra.presupuestado + disponibleExtra.minimoTarjetas)}), te quedarían{" "}
                  <strong className="despensa-mono">{formatMoney(disponibleExtra.extra)}</strong> libres.
                  {deudas[0] && (
                    <>
                      {" "}Sugerencia: destínalos a <strong>{deudas[0].nombre}</strong>, tu deuda prioritaria según este plan.
                    </>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.6 }}>
                  Con tu ingreso neto esperado y tus compromisos en esta quincena, no queda margen extra para adelantar
                  deuda — con cumplir los mínimos vas bien.
                </div>
              )}
            </div>
          )}

          {pagoRapidoInfo && (
            <div
              style={{
                background: pagoRapido.activo ? "var(--amber-bg)" : "var(--card)",
                border: `1px solid ${pagoRapido.activo ? "var(--amber)" : "var(--line)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Rocket size={14} style={{ color: pagoRapido.activo ? "var(--amber)" : "var(--ink-soft)" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: pagoRapido.activo ? "var(--amber)" : "var(--ink)" }}>
                  {pagoRapido.activo ? "Pago rápido activo" : "Pago rápido"} — {pagoRapidoInfo.deuda.nombre}
                </span>
              </div>

              {pagoRapidoInfo.extraMensual > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>A tu ritmo actual</div>
                      <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700 }}>{pagoRapidoInfo.mesesActual} meses</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Con pago rápido (+{formatMoney(pagoRapidoInfo.extraMensual)}/mes)</div>
                      <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--amber)" }}>{pagoRapidoInfo.mesesRapido} meses</div>
                    </div>
                    {pagoRapidoInfo.mesesAhorrados > 0 && (
                      <div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Te ahorrarías</div>
                        <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--sage)" }}>{pagoRapidoInfo.mesesAhorrados} meses</div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.5 }}>
                    Destina tu excedente disponible (el que ya calculamos arriba, después de tus gastos fijos y
                    cuotas mínimas) directo a esta deuda cada quincena, sin comprometer lo que necesitas para vivir.
                  </div>
                  {pagoRapido.activo && pagoRapido.deudaId === pagoRapidoInfo.deuda.id ? (
                    <button
                      onClick={() => desactivarPagoRapido()}
                      style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
                    >
                      Desactivar pago rápido
                    </button>
                  ) : (
                    <button
                      onClick={() => activarPagoRapido(pagoRapidoInfo.deuda.id, pagoRapidoInfo.deuda.nombre, pagoRapidoInfo.extraMensual)}
                      style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, background: "var(--amber)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
                    >
                      🚀 Activar pago rápido
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  Por ahora no tienes excedente disponible para acelerar el pago sin afectar tus gastos fijos — en
                  cuanto quede margen libre, aquí verás cuánto tiempo podrías ahorrarte.
                </div>
              )}
            </div>
          )}

          {/* Lista de deudas con orden y botón para pagar cada una */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              Orden de deudas a liquidar ({deudas.length})
            </div>
            <button
              onClick={() => abrirModalPago(deudas[0])}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--card)",
                color: "var(--amber)",
                border: "1px solid var(--amber)",
                borderRadius: 7,
                cursor: "pointer",
              }}
            >
              <CreditCard size={13} /> Elegir deuda y pagar
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {deudas.map((d, i) => {
              const Icon = d.icon;
              const esPrioridad = i === 0;
              const esMayorInteres = mayorTasaInteres != null && d.tasaInteres === mayorTasaInteres && d.tasaInteres > 0;
              return (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--card)",
                    border: esPrioridad ? "2px solid var(--amber)" : "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    className="despensa-mono"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: esPrioridad ? "var(--amber)" : "var(--line-soft)",
                      color: esPrioridad ? "#fff" : "var(--ink-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <Icon size={16} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{d.nombre}</span>
                      {esPrioridad && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--amber-bg)", color: "var(--amber)" }}
                        >
                          Prioridad
                        </span>
                      )}
                      {d.esUSD && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--blue-bg)", color: "var(--blue)" }}
                          title="Esta deuda está denominada en dólares, no en pesos"
                        >
                          Consumo en USD
                        </span>
                      )}
                      {esMayorInteres && (
                        <span
                          className="despensa-tab-font"
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 8px", borderRadius: 20, background: "var(--stamp-bg)", color: "var(--stamp)" }}
                          title="La tasa de interés más alta entre todas tus deudas — es la que más te cuesta con el tiempo"
                        >
                          ⚠ Mayor interés
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {d.subtitulo}
                      {d.tasaInteres != null && ` · ${d.tasaInteres}% interés`}
                      {d.cuotaMinima != null && ` · mín. ${d.esUSD ? "US$" + d.cuotaMinima.toLocaleString("es", { minimumFractionDigits: 2 }) : formatMoney(d.cuotaMinima)}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="despensa-mono" style={{ fontSize: 15, fontWeight: 700, color: esPrioridad ? "var(--amber)" : "var(--ink)" }}>
                        {d.esUSD ? "US$" + d.saldoOriginalUSD.toLocaleString("es", { minimumFractionDigits: 2 }) : formatMoney(d.saldo)}
                      </div>
                      {d.esUSD && (
                        <div className="despensa-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                          ≈ {formatMoney(d.saldo)}
                        </div>
                      )}
                    </div>

                    {/* Botón directo para pagar esta deuda */}
                    <button
                      onClick={() => abrirModalPago(d)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "7px 12px",
                        borderRadius: 7,
                        border: "1px solid " + (esPrioridad ? "var(--amber)" : "var(--line)"),
                        background: esPrioridad ? "var(--amber)" : "var(--paper)",
                        color: esPrioridad ? "#fff" : "var(--ink)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: esPrioridad ? "0 2px 4px rgba(234, 154, 41, 0.25)" : "none",
                      }}
                      title={`Pagar completa o abonar a ${d.nombre}`}
                    >
                      <CheckCircle2 size={13} /> Pagar completa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tarjetasSinSaldo.length > 0 && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 16, lineHeight: 1.5 }}>
          Nota: {tarjetasSinSaldo.map((t) => t.nombre).join(", ")} no {tarjetasSinSaldo.length === 1 ? "tiene" : "tienen"} un
          "Saldo actual" configurado en Tarjetas, así que no {tarjetasSinSaldo.length === 1 ? "aparece" : "aparecen"} aquí.
        </div>
      )}

      <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.5, borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
        Esto es información general basada en dos métodos conocidos de pago de deudas, no un consejo financiero
        personalizado. Ajusta según tu propia situación.
      </div>

      {/* MODAL PARA REALIZAR PAGO Y LIQUIDAR DEUDA COMPLETA */}
      {modalPagoAbierto && deudaActivaParaModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !procesandoPago && setModalPagoAbierto(false)}
        >
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              width: "100%",
              maxWidth: 520,
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--line)",
              padding: "20px 24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--amber-bg)",
                    color: "var(--amber)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                    Pagar Deuda
                  </h3>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                    Estrategia de Pago y Liquidación
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalPagoAbierto(false)}
                disabled={procesandoPago}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {errorPago && (
              <div
                style={{
                  background: "var(--stamp-bg)",
                  border: "1px solid var(--stamp)",
                  color: "var(--stamp)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorPago}</span>
              </div>
            )}

            {/* Selector de Deuda */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 }}>
                Selecciona la deuda a pagar
              </label>
              <select
                value={deudaSeleccionadaId}
                onChange={(e) => handleSeleccionarDeuda(e.target.value)}
                disabled={procesandoPago}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontSize: 13,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              >
                {deudas.map((d, index) => (
                  <option key={d.id} value={d.id}>
                    {index + 1}. {d.nombre} ({d.subtitulo}) — Saldo:{" "}
                    {d.esUSD
                      ? `US$${d.saldoOriginalUSD.toLocaleString("es", { minimumFractionDigits: 2 })}`
                      : formatMoney(d.saldo)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha Resumen de la Deuda Seleccionada */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {deudaActivaParaModal.tipo === "prestamo" ? (
                    <Landmark size={15} style={{ color: "var(--ink-soft)" }} />
                  ) : (
                    <CreditCard size={15} style={{ color: "var(--ink-soft)" }} />
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {deudaActivaParaModal.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: 12,
                      background:
                        deudaActivaParaModal.tipo === "prestamo" ? "var(--sage-bg)" : "var(--blue-bg)",
                      color:
                        deudaActivaParaModal.tipo === "prestamo" ? "var(--sage)" : "var(--blue)",
                    }}
                  >
                    {deudaActivaParaModal.tipo === "prestamo" ? "Préstamo" : "Tarjeta de Crédito"}
                  </span>
                </div>
                <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--stamp)" }}>
                  {deudaActivaParaModal.esUSD
                    ? `US$${deudaActivaParaModal.saldoOriginalUSD.toLocaleString("es", { minimumFractionDigits: 2 })}`
                    : formatMoney(deudaActivaParaModal.saldo)}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
                Entidad: <strong>{deudaActivaParaModal.subtitulo}</strong>
                {deudaActivaParaModal.tasaInteres != null && ` · Tasa: ${deudaActivaParaModal.tasaInteres}%`}
                {deudaActivaParaModal.cuotaMinima != null && (
                  <>
                    {" "}· Pago mín:{" "}
                    <strong>
                      {deudaActivaParaModal.esUSD
                        ? `US$${deudaActivaParaModal.cuotaMinima.toLocaleString("es", { minimumFractionDigits: 2 })}`
                        : formatMoney(deudaActivaParaModal.cuotaMinima)}
                    </strong>
                  </>
                )}
              </div>
            </div>

            {/* Selector de Modo de Pago (Completo / Parcial) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                Modalidad de pago
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleCambiarModoPago("completo")}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid " + (tipoPagoModo === "completo" ? "var(--amber)" : "var(--line)"),
                    background: tipoPagoModo === "completo" ? "var(--amber-bg)" : "var(--paper)",
                    color: tipoPagoModo === "completo" ? "var(--amber)" : "var(--ink)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={14} /> Pagar completa (Liquidación)
                </button>
                <button
                  type="button"
                  onClick={() => handleCambiarModoPago("parcial")}
                  style={{
                    padding: "9px 10px",
                    borderRadius: 8,
                    border: "1px solid " + (tipoPagoModo === "parcial" ? "var(--sage)" : "var(--line)"),
                    background: tipoPagoModo === "parcial" ? "var(--sage-bg)" : "var(--paper)",
                    color: tipoPagoModo === "parcial" ? "var(--sage)" : "var(--ink)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={14} /> Abono o pago parcial
                </button>
              </div>
            </div>

            {/* Input de Monto */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)" }}>
                  Monto a pagar ({deudaActivaParaModal.esUSD ? "USD" : "RD$"})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const montoTotal = deudaActivaParaModal.esUSD
                      ? deudaActivaParaModal.saldoOriginalUSD
                      : deudaActivaParaModal.saldo;
                    setMontoPago(String(montoTotal));
                    setTipoPagoModo("completo");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--amber)",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Llenar saldo total (
                  {deudaActivaParaModal.esUSD
                    ? `US$${deudaActivaParaModal.saldoOriginalUSD.toLocaleString("es", { minimumFractionDigits: 2 })}`
                    : formatMoney(deudaActivaParaModal.saldo)}
                  )
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                disabled={procesandoPago}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>

            {/* Fecha y Método de Pago */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 }}>
                  Fecha de pago
                </label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  disabled={procesandoPago}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12.5,
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 }}>
                  Método de pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  disabled={procesandoPago}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12.5,
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito">Tarjeta de débito</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Cuenta de Origen (opcional si hay cuentas registradas) */}
            {cuentas && cuentas.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 }}>
                  Cuenta de donde sale el dinero (opcional)
                </label>
                <select
                  value={cuentaId}
                  onChange={(e) => setCuentaId(e.target.value)}
                  disabled={procesandoPago}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontSize: 12.5,
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  <option value="">Sin especificar cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.entidadName ? `(${c.entidadName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Descripción */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 }}>
                Descripción del movimiento
              </label>
              <input
                type="text"
                value={descripcionPago}
                onChange={(e) => setDescripcionPago(e.target.value)}
                disabled={procesandoPago}
                placeholder="Descripción para tu historial de movimientos"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
              />
            </div>

            {/* Mensaje Informativo de Consecuencia del Pago */}
            <div
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 11.5,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              {deudaActivaParaModal.tipo === "prestamo" ? (
                <>
                  ✅ <strong>Consecuencias:</strong> Se registrará automáticamente en tu historial de{" "}
                  <strong>Movimientos</strong> bajo la categoría <em>"Pago de préstamo"</em>.
                  {tipoPagoModo === "completo" ||
                  parseFloat(montoPago) >= deudaActivaParaModal.saldo ? (
                    <>
                      {" "}Y el estado del <strong>Préstamo {deudaActivaParaModal.prestamoObj?.numero}</strong> pasará
                      a <strong>PAGADO</strong>, liberándote de esta obligación.
                    </>
                  ) : (
                    <>
                      {" "}Se actualizará el saldo pendiente y el préstamo continuará activo con la deuda reducida.
                    </>
                  )}
                </>
              ) : (
                <>
                  ✅ <strong>Consecuencias:</strong> Se registrará automáticamente en tu historial de{" "}
                  <strong>Movimientos</strong> bajo la categoría <em>"Pago de tarjeta"</em>.
                  {tipoPagoModo === "completo" ||
                  parseFloat(montoPago) >=
                    (deudaActivaParaModal.esUSD
                      ? deudaActivaParaModal.saldoOriginalUSD
                      : deudaActivaParaModal.saldo) ? (
                    <>
                      {" "}El saldo de la <strong>{deudaActivaParaModal.nombre}</strong> se actualizará a{" "}
                      <strong>$0.00</strong> (completamente saldada) y los consumos pendientes quedarán cubiertos.
                    </>
                  ) : (
                    <>
                      {" "}El saldo de la tarjeta se reducirá por el monto pagado.
                    </>
                  )}
                </>
              )}
            </div>

            {/* Botones de Acción */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setModalPagoAbierto(false)}
                disabled={procesandoPago}
                style={{
                  padding: "9px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarPago}
                disabled={procesandoPago}
                style={{
                  padding: "9px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: "var(--amber)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(234, 154, 41, 0.3)",
                }}
              >
                {procesandoPago ? (
                  "Procesando pago…"
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirmar y pagar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

