import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Check, X, Landmark, Wallet, Banknote, CreditCard, ArrowLeftRight, HelpCircle, Briefcase, Mail, Send, Trash2, ChevronDown, ChevronUp, BarChart3, Copy } from "lucide-react";
import ModalEnviarReporteEmail from "./ModalEnviarReporteEmail.jsx";
import { generarItemsPeriodo } from "../lib/generadorChecklistItems";
import { watchChecklistPeriodo, setChecklistItem, addMovimiento, setPrestamoQuincenaOverride, quitarPrestamoQuincenaOverride, setPrestamoCuotaPersonalizadaFechaOverride, quitarPrestamoCuotaPersonalizadaFechaOverride, watchPagoRapido, setPresupuestoCelda, watchTransferenciasPresupuesto, moverGastoQuincena, revertirMoverGastoQuincena, updateCategoriaGasto, addCategoriaGasto, watchWhatsappNotifConfig, watchPresupuestoAnual, watchPresupuestoCompartido, watchEstadoPresupuestoCompartido } from "../lib/db";
import { abrirNotificacionWhatsapp } from "../lib/whatsappNotif";
import { WhatsAppIcon } from "./WhatsAppGroupButton.jsx";
import { lanzarCoheteHaciaPuntos } from "../lib/coheteVolando";
import { calcularResumenQuincena } from "../lib/quincenaResumen";
import { ingresoMensualNeto } from "../lib/deduccionesLey";
import { periodoActualConfigurado, periodoAdyacenteConfigurado, rangoFechasQuincenaConfigurado } from "../lib/quincenaConfig";
import { consumoPresupuesto } from "../lib/presupuestoConsumo";
import { confirm } from "../lib/confirm";
import { GASTO_CATS_FIJO } from "../lib/categorias";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const METODOS = ["Efectivo", "Transferencia", "Tarjeta", "Descuento Nómina", "Otro"];
const METODO_ICONS = { Efectivo: Banknote, Transferencia: ArrowLeftRight, Tarjeta: CreditCard, "Descuento Nómina": Briefcase, Otro: HelpCircle, "Sin definir": HelpCircle };

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaCuotaEnMes(year, month, day) {
  const ultimoDia = new Date(year, month, 0).getDate();
  const dia = Math.min(Math.max(Number(day) || 1, 1), ultimoDia);
  return `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function formatoFechaCuota(fecha) {
  if (!fecha) return "";
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const MES_NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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

function periodoActual(diasCobro) {
  return periodoActualConfigurado(diasCobro);
}

function periodoAdyacente(periodo, dir) {
  let { year, month, quincena } = periodo;
  if (dir > 0) {
    if (quincena === "Q1") return { year, month, quincena: "Q2" };
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return { year, month, quincena: "Q1" };
  } else {
    if (quincena === "Q2") return { year, month, quincena: "Q1" };
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    return { year, month, quincena: "Q2" };
  }
}

export default function ChecklistPagos({
  categoriasGasto,
  presupuesto,
  prestamos,
  tarjetas,
  contratos = [],
  presupuestoYear,
  periodoInicial,
  onConsumePeriodoInicial,
  fuentesIngreso,
  diasCobro,
  movimientos,
  estrategiaDeudas,
  tipoCambio,
  onOpenPrestamo,
  onNavigate,
  userEmail,
  entidades = [],
}) {
  const [periodo, setPeriodo] = useState(() => periodoInicial || periodoActual(diasCobro));
  const [checklist, setChecklist] = useState({});
  const [overridesLocales, setOverridesLocales] = useState({});
  const [whatsappConfig, setWhatsappConfig] = useState({ activo: true });
  const [whatsappToast, setWhatsappToast] = useState(null);

  const guardarOverrideLocal = (prestamoId, tipo, origenKey, valor) => {
    setOverridesLocales((actuales) => ({
      ...actuales,
      [prestamoId]: {
        ...actuales[prestamoId],
        [tipo]: { ...actuales[prestamoId]?.[tipo], [origenKey]: valor },
      },
    }));
  };

  // Cuando llegamos aquí desde la notificación de "día de cobro", saltamos directo
  // a la quincena que corresponde pagar (Q1 del mes siguiente si el cobro es a fin
  // de mes, o Q2 del mismo mes si el cobro es a mitad de mes). Una vez aplicado, se
  // limpia para que una visita normal (desde el menú) no quede "pegada" a esa quincena.
  useEffect(() => {
    if (periodoInicial) {
      setPeriodo(periodoInicial);
      if (onConsumePeriodoInicial) onConsumePeriodoInicial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoInicial]);

  const periodoKey = `${periodo.year}-${periodo.month}-${periodo.quincena}`;

  useEffect(() => {
    const unsub = watchChecklistPeriodo(periodoKey, setChecklist, () => {});
    return () => unsub();
  }, [periodoKey]);

  // Sincronización en tiempo real del presupuesto para el año del período activo
  const [presupuestoYearLive, setPresupuestoYearLive] = useState(null);
  const [infoCompartido, setInfoCompartido] = useState(null);
  const [presupuestoCompartido, setPresupuestoCompartido] = useState(null);

  useEffect(() => {
    const unsub = watchPresupuestoAnual(
      periodo.year,
      (data) => setPresupuestoYearLive(data || {}),
      () => setPresupuestoYearLive({})
    );
    return () => unsub && unsub();
  }, [periodo.year]);

  useEffect(() => {
    if (!userEmail) return;
    const unsub = watchEstadoPresupuestoCompartido({ email: userEmail }, (info) => {
      setInfoCompartido(info);
    });
    return () => unsub && unsub();
  }, [userEmail]);

  useEffect(() => {
    if (!infoCompartido?.tieneAcceso || !infoCompartido?.titularEmail) {
      setPresupuestoCompartido(null);
      return;
    }
    const unsub = watchPresupuestoCompartido(
      periodo.year,
      infoCompartido.titularEmail,
      infoCompartido.titularUid,
      setPresupuestoCompartido
    );
    return () => unsub && unsub();
  }, [infoCompartido?.tieneAcceso, infoCompartido?.titularEmail, infoCompartido?.titularUid, periodo.year]);

  const presupuestoEfectivo = useMemo(() => {
    const base = (presupuestoYearLive && Object.keys(presupuestoYearLive).length > 0)
      ? presupuestoYearLive
      : (periodo.year === presupuestoYear && presupuesto ? presupuesto : {});
    if (infoCompartido?.tieneAcceso && presupuestoCompartido && Object.keys(presupuestoCompartido).length > 0) {
      return { ...base, ...presupuestoCompartido };
    }
    return base;
  }, [presupuestoYearLive, periodo.year, presupuestoYear, presupuesto, infoCompartido?.tieneAcceso, presupuestoCompartido]);

  const presupuestoDisponible =
    Boolean(presupuestoEfectivo && Object.keys(presupuestoEfectivo).length > 0) ||
    periodo.year === presupuestoYear;

  const [pagoRapido, setPagoRapido] = useState({});

  useEffect(() => {
    const unsub = watchPagoRapido(setPagoRapido, () => setPagoRapido({}));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = watchWhatsappNotifConfig(setWhatsappConfig, () => {});
    return () => unsub && unsub();
  }, []);

  const items = useMemo(() => {
    return generarItemsPeriodo({
      periodo,
      categoriasGasto,
      presupuesto: presupuestoEfectivo,
      prestamos,
      tarjetas,
      contratos,
      presupuestoYear: periodo.year,
      movimientos,
      estrategiaDeudas,
      tipoCambio,
      pagoRapido,
      fuentesIngreso,
      checklist,
      overridesLocales,
      diasCobro,
    });
  }, [categoriasGasto, presupuestoEfectivo, prestamos, tarjetas, contratos, periodo, movimientos, diasCobro, estrategiaDeudas, tipoCambio, pagoRapido, fuentesIngreso, checklist, overridesLocales]);

  // Ítems presupuestados en la otra quincena del mismo mes (para aviso rápido y navegación)
  const otraQuincena = periodo.quincena === "Q1" ? "Q2" : "Q1";
  const itemsOtraQuincena = useMemo(() => {
    return generarItemsPeriodo({
      periodo: { ...periodo, quincena: otraQuincena },
      categoriasGasto,
      presupuesto: presupuestoEfectivo,
      prestamos,
      tarjetas,
      contratos,
      presupuestoYear: periodo.year,
      movimientos,
      estrategiaDeudas,
      tipoCambio,
      pagoRapido,
      fuentesIngreso,
      checklist,
      overridesLocales,
      diasCobro,
    });
  }, [periodo, otraQuincena, categoriasGasto, presupuestoEfectivo, prestamos, tarjetas, contratos, movimientos, diasCobro, estrategiaDeudas, tipoCambio, pagoRapido, fuentesIngreso, checklist, overridesLocales]);

  const totales = useMemo(() => {
    let total = 0;
    let pagado = 0;
    for (const it of items) {
      total += it.monto;
      if (it.bloqueadoPagado || checklist?.items?.[it.key]?.pagado) pagado += it.monto;
    }
    return { total, pagado, pendiente: total - pagado };
  }, [items, checklist]);

  const resumenPorMetodo = useMemo(() => {
    const map = {};
    for (const it of items) {
      if (it.bloqueadoPagado) continue;
      const estado = checklist?.items?.[it.key] || {};
      if (estado.pagado) continue;
      const metodo = estado.metodoPago || it.metodoDefault || "Sin definir";
      map[metodo] = (map[metodo] || 0) + it.monto;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items, checklist]);

  const [confirmandoKey, setConfirmandoKey] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editandoMontoKey, setEditandoMontoKey] = useState(null);
  const [montoEditado, setMontoEditado] = useState("");
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [moviendoKey, setMoviendoKey] = useState(null);
  const [moviendoAbiertoKey, setMoviendoAbiertoKey] = useState(null);
  const [destinoFecha, setDestinoFecha] = useState("");
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(null);
  const [copiadoCampo, setCopiadoCampo] = useState(null);

  // Bloquear el scroll del fondo y de la pantalla mientras el messagebox de pago/transferencia esté abierto
  useEffect(() => {
    if (modalTransferencia) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = document.body.style.overscrollBehavior;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.overscrollBehavior = prevOverscroll;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [modalTransferencia]);

  const copiarTexto = async (texto, campo) => {
    if (!texto) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiadoCampo(campo);
      setTimeout(() => setCopiadoCampo(null), 2000);
    } catch (e) {
      console.error("Error al copiar texto:", e);
    }
  };

  const [transferenciasPresupuesto, setTransferenciasPresupuesto] = useState([]);
  useEffect(() => {
    const unsub = watchTransferenciasPresupuesto(
      (list) => setTransferenciasPresupuesto(Array.isArray(list) ? list : []),
      () => setTransferenciasPresupuesto([])
    );
    return () => unsub && unsub();
  }, []);

  const siguienteQuincena = useMemo(() => {
    return periodoAdyacenteConfigurado(periodo, diasCobro, 1);
  }, [periodo, diasCobro]);

  const opcionesQuincenasFuturas = useMemo(() => {
    const res = [];
    let cur = { year: periodo.year, month: periodo.month, quincena: periodo.quincena };
    for (let i = 0; i < 8; i++) {
      cur = periodoAdyacenteConfigurado(cur, diasCobro, 1);
      const rango = rangoFechasQuincenaConfigurado(cur.year, cur.month, cur.quincena, diasCobro);
      let rangoTexto = "";
      if (rango?.fechaInicio && rango?.fechaFin) {
        const [, mI, dI] = rango.fechaInicio.split("-");
        const [, mF, dF] = rango.fechaFin.split("-");
        const mesI = MESES[Number(mI) - 1]?.slice(0, 3).toLowerCase();
        const mesF = MESES[Number(mF) - 1]?.slice(0, 3).toLowerCase();
        rangoTexto = mI === mF ? `(${dI} al ${dF} de ${mesF})` : `(${dI} ${mesI} al ${dF} ${mesF})`;
      }
      const quincenaLabel = cur.quincena === "Q1" ? "1ra" : cur.quincena === "Q2" ? "2da" : `${cur.quincena.replace("Q", "")}ta`;
      res.push({
        ...cur,
        label: `${quincenaLabel} quincena de ${MESES[cur.month - 1]} ${cur.year} ${rangoTexto}`.trim(),
      });
    }
    return res;
  }, [periodo, diasCobro]);

  const transferenciasDesdePeriodo = useMemo(() => {
    return (transferenciasPresupuesto || []).filter(
      (t) =>
        t?.origen?.year === periodo.year &&
        t?.origen?.month === periodo.month &&
        t?.origen?.quincena === periodo.quincena
    );
  }, [transferenciasPresupuesto, periodo]);

  const transferenciasHaciaPeriodo = useMemo(() => {
    return (transferenciasPresupuesto || []).filter(
      (t) =>
        t?.destino?.year === periodo.year &&
        t?.destino?.month === periodo.month &&
        t?.destino?.quincena === periodo.quincena
    );
  }, [transferenciasPresupuesto, periodo]);

  const [moviendoGastoKey, setMoviendoGastoKey] = useState(null);
  const [moviendoGastoTarget, setMoviendoGastoTarget] = useState(null);
  const [moviendoGastoMonto, setMoviendoGastoMonto] = useState("");
  const [moviendoGastoCargando, setMoviendoGastoCargando] = useState(false);
  const [eliminandoGastoKey, setEliminandoGastoKey] = useState(null);

  const abrirMoverGasto = (it) => {
    setMoviendoAbiertoKey(null);
    setMoviendoGastoKey(it.key);
    setMoviendoGastoMonto(String(it.monto || ""));
    setMoviendoGastoTarget(siguienteQuincena);
  };

  const confirmarMoverGasto = async (it) => {
    const montoNum = Number(moviendoGastoMonto) || Number(it.monto) || 0;
    if (montoNum <= 0) return;
    setMoviendoGastoCargando(true);
    try {
      const target = moviendoGastoTarget || siguienteQuincena;
      await moverGastoQuincena({
        categoria: it.nombre,
        monto: montoNum,
        origen: { year: periodo.year, month: periodo.month, quincena: periodo.quincena },
        destino: { year: target.year, month: target.month, quincena: target.quincena },
        motivo: `Pasado de ${periodo.quincena === "Q1" ? "1ra" : "2da"} quincena a ${target.quincena === "Q1" ? "1ra" : "2da"} quincena`,
      });
      setMoviendoGastoKey(null);
    } catch (err) {
      console.error("Error al pasar gasto a siguiente quincena:", err);
    } finally {
      setMoviendoGastoCargando(false);
    }
  };

  const eliminarGastoQuincena = async (it) => {
    if (!it || it.esPrestamo || it.esTarjeta) return;
    const nombre = it.nombre || it.key;
    const quincenaLabel = periodo.quincena === "Q1" ? "1ra" : "2da";
    const periodoTxt = `${quincenaLabel} quincena de ${MESES[periodo.month - 1]} ${periodo.year}`;

    const ok = await confirm(
      `¿Estás seguro de eliminar el monto presupuestado de ${formatMoney(it.monto)} para "${nombre}" en la ${periodoTxt}? El monto quedará en $0 en el presupuesto de esta quincena.`,
      { confirmLabel: "Eliminar", danger: true }
    );
    if (!ok) return;

    setEliminandoGastoKey(it.key);
    try {
      // 1. Asigna 0 a la celda de presupuesto para esta quincena
      await setPresupuestoCelda(periodo.year, nombre, periodo.month, periodo.quincena, 0);

      // 2. Limpia el estado de checklist para no dejar residuos
      await setChecklistItem(periodoKey, it.key, { pagado: false, montoOverride: null });

      // 3. Si había transferencias pendientes hacia este gasto en este periodo, limpiarlas
      const transferenciasEsteGasto = (transferenciasPresupuesto || []).filter(
        (t) =>
          t.categoria === nombre &&
          t?.destino?.year === periodo.year &&
          t?.destino?.month === periodo.month &&
          t?.destino?.quincena === periodo.quincena
      );
      for (const tr of transferenciasEsteGasto) {
        try {
          await revertirMoverGastoQuincena(tr);
        } catch {}
      }

      if (moviendoGastoKey === it.key) {
        setMoviendoGastoKey(null);
      }
    } catch (err) {
      console.error("Error al eliminar gasto de la quincena:", err);
    } finally {
      setEliminandoGastoKey(null);
    }
  };

  const handleRevertirTransferencia = async (transf) => {
    if (!transf) return;
    setMoviendoGastoCargando(true);
    try {
      await revertirMoverGastoQuincena(transf);
    } catch (err) {
      console.error("Error al revertir gasto transferido:", err);
    } finally {
      setMoviendoGastoCargando(false);
    }
  };

  const renderPanelMoverGasto = (it) => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "var(--paper)",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          width: "100%",
          marginTop: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Mover "{it.nombre}" a otra quincena
          </span>
          <button
            type="button"
            onClick={() => setMoviendoGastoKey(null)}
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 500 }}>
            Quincena destino:
          </label>
          <select
            value={`${moviendoGastoTarget?.year}-${moviendoGastoTarget?.month}-${moviendoGastoTarget?.quincena}`}
            onChange={(e) => {
              const [y, m, q] = e.target.value.split("-");
              setMoviendoGastoTarget({ year: Number(y), month: Number(m), quincena: q });
            }}
            style={{
              fontSize: 12,
              padding: "6px 8px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--card)",
              color: "var(--ink)",
              width: "100%",
            }}
          >
            {opcionesQuincenasFuturas.map((op) => (
              <option key={`${op.year}-${op.month}-${op.quincena}`} value={`${op.year}-${op.month}-${op.quincena}`}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 500 }}>Monto a mover:</span>
            <input
              type="number"
              value={moviendoGastoMonto}
              onChange={(e) => setMoviendoGastoMonto(e.target.value)}
              style={{
                width: 90,
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => confirmarMoverGasto(it)}
              disabled={moviendoGastoCargando}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11.5,
                padding: "5px 12px",
                background: "var(--sage)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <ArrowLeftRight size={12} /> {moviendoGastoCargando ? "Moviendo…" : "Confirmar mover"}
            </button>
            <button
              type="button"
              onClick={() => eliminarGastoQuincena(it)}
              disabled={eliminandoGastoKey === it.key}
              title="Eliminar este gasto en vez de moverlo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11.5,
                padding: "5px 10px",
                background: "var(--stamp-bg)",
                color: "var(--stamp)",
                border: "1px solid var(--stamp)",
                borderRadius: 6,
                cursor: eliminandoGastoKey === it.key ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              <Trash2 size={12} /> Eliminar
            </button>
            <button
              type="button"
              onClick={() => setMoviendoGastoKey(null)}
              style={{
                fontSize: 11.5,
                padding: "5px 10px",
                background: "transparent",
                color: "var(--ink-soft)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const abrirMoverQuincena = (it) => {
    setMoviendoGastoKey(null);
    setMoviendoAbiertoKey(it.key);
    const nextMonth = periodo.month === 12
      ? { year: periodo.year + 1, month: 1 }
      : { year: periodo.year, month: periodo.month + 1 };
    const diaBase = it.diaCuota || Number(it.fechaCuota?.slice(-2)) || 1;
    setDestinoFecha(fechaCuotaEnMes(nextMonth.year, nextMonth.month, diaBase));
  };

  const confirmarMoverQuincena = async (it) => {
    if (!destinoFecha) return;
    const [destYear, destMonth, destDay] = destinoFecha.split("-").map(Number);
    if (!destYear || !destMonth || !destDay) return;
    setMoviendoKey(it.key);
    try {
      if (it.cuotaPersonalizada) {
        guardarOverrideLocal(it.prestamoId, "personalizadas", it.origenKey, destinoFecha);
        try {
          await setPrestamoCuotaPersonalizadaFechaOverride(it.prestamoId, it.origenKey, destinoFecha);
        } catch (error) {
          guardarOverrideLocal(it.prestamoId, "personalizadas", it.origenKey, it.tieneOverride ? it.fechaCuota : null);
          throw error;
        }
      } else {
        const [origenMonth, origenYear] = it.origenKey.split("-").map(Number);
        const destino = {
          year: destYear,
          month: destMonth,
          quincena: destDay >= 15 ? "Q2" : "Q1",
          fecha: destinoFecha,
        };
        guardarOverrideLocal(it.prestamoId, "mensuales", it.origenKey, destino);
        try {
          await setPrestamoQuincenaOverride(it.prestamoId, origenYear, origenMonth, destino);
        } catch (error) {
          const fechaAnterior = it.tieneOverride ? it.fechaCuota : null;
          const [yearAnterior, monthAnterior, dayAnterior] = (fechaAnterior || "").split("-").map(Number);
          const overrideAnterior = fechaAnterior
            ? { year: yearAnterior, month: monthAnterior, quincena: dayAnterior >= 15 ? "Q2" : "Q1", fecha: fechaAnterior }
            : null;
          guardarOverrideLocal(it.prestamoId, "mensuales", it.origenKey, overrideAnterior);
          throw error;
        }
      }
      setMoviendoAbiertoKey(null);
    } finally {
      setMoviendoKey(null);
    }
  };

  const quitarMover = async (it) => {
    setMoviendoKey(it.key);
    try {
      if (it.cuotaPersonalizada) {
        guardarOverrideLocal(it.prestamoId, "personalizadas", it.origenKey, null);
        try {
          await quitarPrestamoCuotaPersonalizadaFechaOverride(it.prestamoId, it.origenKey);
        } catch (error) {
          guardarOverrideLocal(it.prestamoId, "personalizadas", it.origenKey, it.fechaCuota);
          throw error;
        }
      } else {
        const [origMes, origYear] = it.origenKey.split("-").map(Number);
        const overrideAnterior = { year: periodo.year, month: periodo.month, quincena: periodo.quincena, fecha: it.fechaCuota };
        guardarOverrideLocal(it.prestamoId, "mensuales", it.origenKey, null);
        try {
          await quitarPrestamoQuincenaOverride(it.prestamoId, origYear, origMes);
        } catch (error) {
          guardarOverrideLocal(it.prestamoId, "mensuales", it.origenKey, overrideAnterior);
          throw error;
        }
      }
    } finally {
      setMoviendoKey(null);
    }
  };

  const toggleModoChecklist = async (it) => {
    const cat = (categoriasGasto || []).find(
      (c) => (c.nombre || "").trim().toLowerCase() === (it.nombre || "").trim().toLowerCase()
    );
    const nuevoTipo = it.esConsumoGradual ? "pago_unico" : "consumo_gradual";
    try {
      if (cat?.id) {
        await updateCategoriaGasto(cat.id, { tipoGastoChecklist: nuevoTipo });
      } else {
        await addCategoriaGasto({
          nombre: it.nombre,
          clasificacion: it.clasificacion || "Variable",
          metodoPagoDefault: it.metodoDefault || "Efectivo",
          tipoGastoChecklist: nuevoTipo,
        });
      }
    } catch (e) {
      console.error("Error al alternar modo de checklist:", e);
    }
  };

  // Lógica central de registrar un pago ya confirmado: marca el ítem como
  // pagado y crea el movimiento correspondiente. La usan tanto el flujo de
  // un solo ítem como el de confirmación en lote (selección múltiple).
  const confirmarPagoItem = async (it) => {
    const actual = checklist?.items?.[it.key] || {};
    const metodoPago = actual.metodoPago || it.metodoDefault || "Efectivo";
    await setChecklistItem(periodoKey, it.key, { ...actual, pagado: true, metodoPago });

    if (it.esPrestamo) {
      lanzarCoheteHaciaPuntos(undefined, undefined, { puntos: Math.round((Number(it.monto) || 0) * 0.05) });

      await addMovimiento({
        type: "Pago de préstamo",
        category: "Pago de préstamo",
        amount: it.monto,
        description: it.nombre,
        date: todayStr(),
        metodoPago,
        entidadId: it.entidadId || null,
        entidadName: it.entidadName || "",
        prestamoId: it.prestamoId,
        prestamoNumero: it.prestamoNumero || "",
        origenChecklist: { periodoKey, itemKey: it.key },
      });

      // Notificación vía WhatsApp si está activada en la entidad (módulo Entidades)
      if (whatsappConfig?.activo !== false) {
        const prestamo = (prestamos || []).find((p) => p.id === it.prestamoId || p.numero === it.prestamoNumero);
        const entidadId = it.entidadId || prestamo?.entidadId;
        const entidad = (entidades || []).find(
          (e) => (entidadId && e.docId === entidadId) ||
                 (it.entidadName && e.name && e.name.toLowerCase() === it.entidadName.toLowerCase()) ||
                 (prestamo?.entidadName && e.name && e.name.toLowerCase() === prestamo.entidadName.toLowerCase())
        );
        const entidadNotificaWs = entidad ? (entidad.notificarWhatsapp !== false) : true;
        const telefono = (entidad?.phone || prestamo?.telefono || "").trim();

        if (entidadNotificaWs) {
          if (telefono) {
            const res = abrirNotificacionWhatsapp({
              telefono,
              entidadNombre: entidad?.name || it.entidadName || "Entidad",
              prestamoNumero: prestamo?.numero || it.prestamoNumero || it.nombre,
              monto: it.monto,
              fecha: todayStr(),
              metodoPago,
            });
            setWhatsappToast({
              tipo: "exito",
              entidadNombre: entidad?.name || it.entidadName || "Entidad",
              prestamoNumero: prestamo?.numero || it.prestamoNumero || "Préstamo",
              telefono,
              url: res.url,
              abierto: res.abierto,
            });
          } else {
            setWhatsappToast({
              tipo: "sin_telefono",
              entidadNombre: entidad?.name || it.entidadName || "la entidad",
              prestamoNumero: prestamo?.numero || it.prestamoNumero || "Préstamo",
            });
          }
        }
      }
    } else if (it.esTarjeta) {
      lanzarCoheteHaciaPuntos(undefined, undefined, { puntos: Math.round((Number(it.monto) || 0) * 0.05) });

      await addMovimiento({
        type: "Pago de tarjeta",
        category: "Pago de tarjeta",
        amount: it.monto,
        description: it.nombre,
        date: todayStr(),
        metodoPago,
        tarjetaId: it.tarjetaId,
        tarjetaNombre: it.tarjetaNombre || "",
        origenChecklist: { periodoKey, itemKey: it.key },
      });
    } else {
      await addMovimiento({
        type: "Gasto",
        category: it.nombre,
        amount: it.monto,
        description: it.nombre,
        date: todayStr(),
        clasificacion: it.clasificacion || (GASTO_CATS_FIJO.includes(it.nombre) ? "Fijo" : "Variable"),
        metodoPago,
        origenChecklist: { periodoKey, itemKey: it.key },
      });

      // Si se pagó MENOS de lo presupuestado, el resto se suma
      // automáticamente al monto ya presupuestado de la PRÓXIMA quincena
      // para esta misma categoría (ej. cita odontológica: si faltó pagar
      // parte, se espera saldarlo en la próxima cita).
      const resto = (it.montoPresupuestado || 0) - (it.monto || 0);
      if (resto > 0 && !it.esPrestamo && !it.esTarjeta) {
        const siguiente = periodoAdyacente(periodo, 1);
        const yaPresupuestadoSiguiente = Number(presupuesto?.[it.nombre]?.[String(siguiente.month)]?.[siguiente.quincena]) || 0;
        await setPresupuestoCelda(siguiente.year, it.nombre, siguiente.month, siguiente.quincena, yaPresupuestadoSiguiente + resto);
      }
    }
  };

  const toggleItem = async (it) => {
    const actual = checklist?.items?.[it.key] || {};

    if (actual.pagado) {
      // Desmarcar no requiere confirmación ni registra nada (el movimiento ya
      // creado, si lo hay, se puede editar/eliminar desde Movimientos).
      setChecklistItem(periodoKey, it.key, { ...actual, pagado: false });
      return;
    }

    const metodo = actual.metodoPago || it.metodoDefault || "Transferencia";
    const esTransferencia = metodo === "Transferencia" || it.cuentaDestinoNumero || it.prestamoNumero === "PT01";
    if (it.esPrestamo && esTransferencia) {
      setModalTransferencia({ item: it });
      return;
    }

    setConfirmandoKey(it.key);
    let confirmado;
    try {
      confirmado = await confirm(`¿Confirmar el pago de "${it.nombre}" por ${formatMoney(it.monto)}?`, {
        confirmLabel: "Confirmar pago",
        danger: false,
      });
    } finally {
      setConfirmandoKey(null);
    }
    if (!confirmado) return;

    await confirmarPagoItem(it);
  };

  const fuenteIngresoActiva = useMemo(() => (fuentesIngreso || []).find((f) => f.estado === "Activo"), [fuentesIngreso]);

  const toggleSeleccion = (key) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const salirModoSeleccion = () => {
    setModoSeleccion(false);
    setSeleccionados(new Set());
  };

  const confirmarSeleccionados = async () => {
    const itemsSeleccionados = items.filter((it) => seleccionados.has(it.key));
    if (itemsSeleccionados.length === 0) return;
    const total = itemsSeleccionados.reduce((s, it) => s + (Number(it.monto) || 0), 0);
    const confirmado = await confirm(
      `¿Confirmar el pago de ${itemsSeleccionados.length} ítem${itemsSeleccionados.length !== 1 ? "s" : ""} seleccionado${itemsSeleccionados.length !== 1 ? "s" : ""} por un total de ${formatMoney(total)}?`,
      { confirmLabel: "Confirmar pagos", danger: false }
    );
    if (!confirmado) return;
    setConfirmandoLote(true);
    try {
      for (const it of itemsSeleccionados) {
        await confirmarPagoItem(it);
      }
    } finally {
      setConfirmandoLote(false);
      salirModoSeleccion();
    }
  };

  const setMetodo = (key, metodo) => {
    const actual = checklist?.items?.[key] || {};
    const extra =
      metodo === "Descuento Nómina" && fuenteIngresoActiva
        ? { fuenteIngresoId: fuenteIngresoActiva.id, fuenteIngresoNombre: fuenteIngresoActiva.nombre }
        : { fuenteIngresoId: null, fuenteIngresoNombre: null };
    setChecklistItem(periodoKey, key, { ...actual, metodoPago: metodo, ...extra });
  };

  const navegarPeriodo = (direccion) => {
    if (moviendoKey || moviendoGastoCargando) return;
    setChecklist({});
    setMoviendoAbiertoKey(null);
    setMoviendoGastoKey(null);
    setModoSeleccion(false);
    setSeleccionados(new Set());
    setPeriodo((actual) => periodoAdyacente(actual, direccion));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => navegarPeriodo(-1)}
          disabled={!!moviendoKey}
          title="Periodo anterior"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--blue-bg)",
            color: "var(--blue)",
            cursor: moviendoKey ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 220 }}>
          <div className="despensa-tab-font" style={{ fontSize: 16, fontWeight: 700, textAlign: "center", color: "var(--ink)" }}>
            {MESES[periodo.month - 1]} {periodo.year}
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--paper)", padding: "3px 4px", borderRadius: 8, border: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => {
                if (periodo.quincena !== "Q1") {
                  setChecklist({});
                  setPeriodo((p) => ({ ...p, quincena: "Q1" }));
                }
              }}
              style={{
                padding: "3px 10px",
                fontSize: 11.5,
                fontWeight: periodo.quincena === "Q1" ? 700 : 500,
                borderRadius: 6,
                border: "none",
                background: periodo.quincena === "Q1" ? "var(--sage-bg)" : "transparent",
                color: periodo.quincena === "Q1" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              1ra quincena (Q1)
            </button>
            <button
              type="button"
              onClick={() => {
                if (periodo.quincena !== "Q2") {
                  setChecklist({});
                  setPeriodo((p) => ({ ...p, quincena: "Q2" }));
                }
              }}
              style={{
                padding: "3px 10px",
                fontSize: 11.5,
                fontWeight: periodo.quincena === "Q2" ? 700 : 500,
                borderRadius: 6,
                border: "none",
                background: periodo.quincena === "Q2" ? "var(--sage-bg)" : "transparent",
                color: periodo.quincena === "Q2" ? "var(--sage)" : "var(--ink-soft)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              2da quincena (Q2)
            </button>
          </div>
        </div>
        <button
          onClick={() => navegarPeriodo(1)}
          disabled={!!moviendoKey}
          title="Periodo siguiente"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--blue-bg)",
            color: "var(--blue)",
            cursor: moviendoKey ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {itemsOtraQuincena.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "8px 14px",
            marginBottom: 14,
            fontSize: 12,
            color: "var(--ink)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span>
              En la <strong>{otraQuincena === "Q1" ? "1ra quincena (Q1)" : "2da quincena (Q2)"}</strong> de {MESES[periodo.month - 1]} tienes <strong>{itemsOtraQuincena.length} pago(s)</strong> presupuestado(s): {itemsOtraQuincena.map((it) => it.nombre).slice(0, 3).join(", ")}{itemsOtraQuincena.length > 3 ? "…" : ""}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setChecklist({});
              setPeriodo((p) => ({ ...p, quincena: otraQuincena }));
            }}
            style={{
              background: "var(--card)",
              border: "1px solid var(--sage)",
              borderRadius: 7,
              padding: "4px 10px",
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--sage)",
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            Ver {otraQuincena === "Q1" ? "1ra" : "2da"} quincena →
          </button>
        </div>
      )}

      <div key={`${periodo.year}-${periodo.month}-${periodo.quincena}`} className="fade-in-quick">
      {whatsappToast && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            background: whatsappToast.tipo === "exito" ? "rgba(37, 211, 102, 0.14)" : "var(--amber-bg)",
            border: `1px solid ${whatsappToast.tipo === "exito" ? "#25D366" : "var(--amber)"}`,
            borderRadius: 10,
            marginBottom: 14,
            width: "100%",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <WhatsAppIcon size={20} color={whatsappToast.tipo === "exito" ? "#25D366" : "var(--amber)"} />
            <div style={{ fontSize: 13, minWidth: 0, flex: 1 }}>
              {whatsappToast.tipo === "exito" ? (
                <>
                  <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "normal", wordBreak: "keep-all" }}>
                    Pago registrado y notificación de WhatsApp preparada
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", whiteSpace: "normal", wordBreak: "normal", marginTop: 2 }}>
                    {whatsappToast.abierto ? "Se abrió una pestaña de WhatsApp para enviar a " : "Lista para enviar a "}
                    <strong style={{ color: "var(--ink)" }}>{whatsappToast.entidadNombre}</strong> ({whatsappToast.telefono})
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: "var(--amber)", whiteSpace: "normal", wordBreak: "keep-all" }}>
                    Pago registrado sin notificación por WhatsApp
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", whiteSpace: "normal", wordBreak: "normal", marginTop: 2 }}>
                    {whatsappToast.entidadNombre} no tiene número de teléfono asignado. Puedes asignarlo en <strong>Configuración</strong> para notificar automáticamente.
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {whatsappToast.tipo === "exito" && (
              <a
                href={whatsappToast.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#25D366",
                  color: "#ffffff",
                  borderRadius: 7,
                  textDecoration: "none",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(37,211,102,0.4)",
                }}
              >
                <Send size={13} />
                <span>{whatsappToast.abierto ? "Reabrir WhatsApp" : "Abrir WhatsApp"}</span>
              </a>
            )}
            <button
              onClick={() => setWhatsappToast(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
              title="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {/* Barra de control: Botón para desplegar resumen y selección múltiple */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setResumenAbierto((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 13px",
            fontSize: 12.5,
            fontWeight: 600,
            borderRadius: 9,
            border: resumenAbierto ? "1px solid var(--sage)" : "1px solid var(--line)",
            background: resumenAbierto ? "var(--sage-bg)" : "var(--card)",
            color: resumenAbierto ? "var(--sage)" : "var(--ink)",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "all 0.15s ease",
          }}
          aria-expanded={resumenAbierto}
          title={resumenAbierto ? "Ocultar resumen de montos" : "Desplegar totales y desglose"}
        >
          <BarChart3 size={15} style={{ color: resumenAbierto ? "var(--sage)" : "var(--ink-soft)" }} />
          <span>{resumenAbierto ? "Ocultar totales" : "Ver totales y resumen"}</span>
          {!resumenAbierto && (
            <span
              className="despensa-mono"
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: totales.pendiente > 0 ? "var(--stamp)" : "var(--sage)",
                marginLeft: 4,
                padding: "1px 6px",
                borderRadius: 6,
                background: "var(--paper)",
                border: "1px solid var(--line)",
              }}
            >
              {formatMoney(totales.pendiente)} pend.
            </span>
          )}
          {resumenAbierto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <div>
          {modoSeleccion ? (
            <button
              type="button"
              onClick={salirModoSeleccion}
              disabled={confirmandoLote}
              style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >
              Cancelar selección
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModoSeleccion(true)}
              style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, background: "var(--sage-bg)", color: "var(--sage)", border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Seleccionar varios
            </button>
          )}
        </div>
      </div>

      {/* Sección desplegable con totales, dashboard y qué hacer con lo pendiente */}
      {resumenAbierto && (
        <div
          className="fade-in-quick"
          style={{
            marginBottom: 16,
            padding: "12px",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Total a pagar</div>
              <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700 }}>{formatMoney(totales.total)}</div>
            </div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Ya pagado</div>
              <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--sage)" }}>{formatMoney(totales.pagado)}</div>
            </div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Pendiente</div>
              <div className="despensa-mono" style={{ fontSize: 17, fontWeight: 700, color: totales.pendiente > 0 ? "var(--stamp)" : "var(--sage)" }}>{formatMoney(totales.pendiente)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                background: "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%)",
                color: "var(--accent, #3b82f6)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                borderRadius: 10,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Mail size={15} />
              <span>Enviar dashboard por email{userEmail ? ` a ${userEmail}` : ""}</span>
            </button>
          </div>

          {resumenPorMetodo.length > 0 && (
            <div>
              <div className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
                Qué hacer con lo pendiente
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {resumenPorMetodo.map(([metodo, monto]) => {
                  const Icon = METODO_ICONS[metodo] || HelpCircle;
                  return (
                    <div
                      key={metodo}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        background: metodo === "Sin definir" ? "var(--amber-bg)" : "var(--sage-bg)",
                        border: `1px solid ${metodo === "Sin definir" ? "var(--amber)" : "var(--sage)"}`,
                        borderRadius: 10,
                        padding: "7px 11px",
                      }}
                    >
                      <Icon size={14} style={{ color: metodo === "Sin definir" ? "var(--amber)" : "var(--sage)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: metodo === "Sin definir" ? "var(--amber)" : "var(--ink)" }}>
                        {metodo === "Sin definir" ? "Sin definir aún" : metodo}
                      </span>
                      <span className="despensa-mono" style={{ fontSize: 12.5, fontWeight: 700, color: metodo === "Sin definir" ? "var(--amber)" : "var(--sage)" }}>
                        {formatMoney(monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {resumenPorMetodo.some(([m]) => m === "Sin definir") && (
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
                  Define un método de pago habitual en cada categoría (Presupuesto → Categoría de gasto) para que esto se calcule solo.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!presupuestoDisponible && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 12 }}>
          Solo se muestran categorías presupuestadas del año {presupuestoYear} (el que estás usando en Presupuesto mensual). Los préstamos sí se calculan para cualquier año.
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          No hay montos presupuestados para esta quincena. Ve a{" "}
          <strong style={{ color: "var(--ink)" }}>Presupuesto → Presupuesto mensual</strong> para llenar los
          montos de cada categoría, o revisa que tengas préstamos activos.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const estado = it.bloqueadoPagado ? { pagado: true } : checklist?.items?.[it.key] || {};
            const Icon = it.icon;

            if (it.esConsumoGradual) {
              const pct = it.monto > 0 ? Math.min((it.gastadoReal / it.monto) * 100, 100) : 0;
              const excedido = it.gastadoReal > it.monto;
              return (
                <div
                  key={`${periodoKey}:${it.key}`}
                  className="checklist-variable-card"
                  style={{
                    background: "var(--card)",
                    border: `1px solid ${excedido ? "var(--stamp)" : "var(--line)"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Fila superior: Icono y Nombre a la izquierda, Monto a la derecha */}
                  <div className="checklist-variable-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                      <Icon size={15} style={{ color: "var(--ink-soft)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {it.nombre}
                      </span>
                    </div>
                    <span
                      title="Se calcula solo según lo registrado en Movimientos durante la quincena"
                      className="despensa-mono"
                      style={{ fontSize: 12.5, fontWeight: 600, color: excedido ? "var(--stamp)" : "var(--ink)", flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      {formatMoney(it.gastadoReal)} / {formatMoney(it.monto)}
                    </span>
                  </div>

                  {/* Barra de progreso de consumo continuo */}
                  <div style={{ height: 6, background: "var(--line-soft)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: excedido ? "var(--stamp)" : "var(--sage)", borderRadius: 4 }} />
                  </div>

                  {/* Fila inferior: Indicador de consumo gradual y botón para cambiar de modo */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 7 }}>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                      Consumo gradual ({pct.toFixed(0)}%{excedido ? " — ¡Excedido!" : ""})
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleModoChecklist(it)}
                      title="Cambiar este gasto a pago único (para marcarlo con casilla como un gasto puntual)"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--paper)",
                        color: "var(--ink-soft)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      Cambiar a pago único
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${periodoKey}:${it.key}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: estado.pagado
                    ? "rgba(16, 185, 129, 0.22)"
                    : it.esTarjeta
                      ? "rgba(147, 51, 234, 0.12)"
                      : it.esPrestamo
                        ? "var(--amber-bg)"
                        : "var(--card)",
                  border: `1px solid ${
                    estado.pagado
                      ? "#10b981"
                      : it.esTarjeta
                        ? "rgba(168, 85, 247, 0.55)"
                        : it.esPrestamo
                          ? "var(--amber)"
                          : "var(--line)"
                  }`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  opacity: 1,
                  boxShadow: estado.pagado
                    ? "0 2px 8px rgba(16, 185, 129, 0.2)"
                    : it.esTarjeta
                      ? "0 2px 10px rgba(147, 51, 234, 0.18)"
                      : "none",
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
              >
                <button
                  onClick={() => {
                    if (it.bloqueadoPagado) return;
                    if (modoSeleccion) {
                      if (!estado.pagado) toggleSeleccion(it.key);
                      return;
                    }
                    toggleItem(it);
                  }}
                  disabled={confirmandoKey === it.key || it.bloqueadoPagado || confirmandoLote || (modoSeleccion && estado.pagado)}
                  title={
                    it.bloqueadoPagado
                      ? "Préstamo saldado — ya no se puede modificar"
                      : modoSeleccion
                        ? seleccionados.has(it.key)
                          ? "Quitar de la selección"
                          : "Seleccionar para pagar"
                        : estado.pagado
                          ? "Marcar como pendiente"
                          : "Marcar como pagado"
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    border: modoSeleccion
                      ? seleccionados.has(it.key)
                        ? "2px solid #10b981"
                        : it.esTarjeta
                          ? "2px solid #a855f7"
                          : it.esPrestamo
                            ? "2px solid var(--amber, #f59e0b)"
                            : "2px solid var(--ink-soft, #94a3b8)"
                      : estado.pagado
                        ? "2px solid #059669"
                        : it.esTarjeta
                          ? "2px solid #a855f7"
                          : it.esPrestamo
                            ? "2px solid var(--amber, #f59e0b)"
                            : "2px solid var(--ink-soft, #94a3b8)",
                    background: modoSeleccion
                      ? seleccionados.has(it.key)
                        ? "#10b981"
                        : it.esTarjeta
                          ? "rgba(168, 85, 247, 0.22)"
                          : it.esPrestamo
                            ? "rgba(245, 158, 11, 0.16)"
                            : "rgba(148, 163, 184, 0.15)"
                      : estado.pagado
                        ? "#10b981"
                        : it.esTarjeta
                          ? "rgba(168, 85, 247, 0.22)"
                          : it.esPrestamo
                            ? "rgba(245, 158, 11, 0.16)"
                            : "rgba(148, 163, 184, 0.15)",
                    color: "#ffffff",
                    boxShadow: (modoSeleccion ? seleccionados.has(it.key) : estado.pagado)
                      ? "0 2px 6px rgba(16, 185, 129, 0.45)"
                      : it.esTarjeta
                        ? "0 0 0 1px rgba(168, 85, 247, 0.4)"
                        : it.esPrestamo
                          ? "0 0 0 1px rgba(245, 158, 11, 0.25)"
                          : "none",
                    cursor: it.bloqueadoPagado || (modoSeleccion && estado.pagado) ? "not-allowed" : confirmandoKey === it.key ? "wait" : "pointer",
                    flexShrink: 0,
                    opacity: modoSeleccion && estado.pagado ? 0.4 : 1,
                    transition: "all 0.15s ease",
                    marginTop: 1,
                  }}
                >
                  {(modoSeleccion ? seleccionados.has(it.key) : estado.pagado) && (
                    <Check size={16} strokeWidth={3.5} style={{ color: "#ffffff" }} />
                  )}
                </button>

                <Icon
                  size={15}
                  style={{
                    color: estado.pagado
                      ? "#10b981"
                      : it.esTarjeta
                        ? "#a855f7"
                        : it.esPrestamo
                          ? "var(--amber)"
                          : "var(--ink-soft)",
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onDoubleClick={it.esPrestamo && onOpenPrestamo ? () => onOpenPrestamo(it.prestamoId) : undefined}
                    title={it.esPrestamo && onOpenPrestamo ? "Doble clic para abrir este préstamo" : undefined}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 500,
                      textDecoration: estado.pagado ? "line-through" : "none",
                      cursor: it.esPrestamo && onOpenPrestamo ? "pointer" : undefined,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{it.nombre}</span>
                    {it.esTarjeta && (
                      <span
                        className="despensa-mono"
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: "1px 7px",
                          borderRadius: 10,
                          background: "rgba(168, 85, 247, 0.22)",
                          color: "#d8b4fe",
                          border: "1px solid rgba(168, 85, 247, 0.45)",
                          textDecoration: "none",
                          display: "inline-block",
                          verticalAlign: "middle",
                        }}
                      >
                        Tarjeta
                      </span>
                    )}
                    {it.bloqueadoPagado && (
                      <span className="despensa-mono" style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "var(--sage-bg)", color: "var(--sage)", textDecoration: "none", display: "inline-block", verticalAlign: "middle" }}>
                        Saldado
                      </span>
                    )}
                    {it.esPrioridadDeuda && !estado.pagado && (
                      <span className="despensa-mono" style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 10, background: "var(--stamp-bg)", color: "var(--stamp)", textDecoration: "none", display: "inline-block", verticalAlign: "middle" }}>
                        Prioridad
                      </span>
                    )}
                    {it.esVariable && !it.esPrestamo && !it.esTarjeta && (
                      <span
                        className="despensa-mono"
                        title="Gasto variable — pago único"
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          color: "var(--ink-soft)",
                          textDecoration: "none",
                          display: "inline-block",
                          verticalAlign: "middle",
                        }}
                      >
                        Variable
                      </span>
                    )}
                    {it.gastadoReal > 0 && !estado.pagado && (
                      <span
                        title={`Registrado en movimientos durante esta quincena: ${formatMoney(it.gastadoReal)}`}
                        style={{
                          fontSize: 9.5,
                          color: "var(--ink-soft)",
                          background: "var(--line-soft)",
                          padding: "1px 6px",
                          borderRadius: 6,
                          display: "inline-block",
                          verticalAlign: "middle",
                          textDecoration: "none",
                        }}
                      >
                        Registrado: {formatMoney(it.gastadoReal)}
                      </span>
                    )}
                  </div>

                  {it.esVariable && !it.esPrestamo && !it.esTarjeta && !it.bloqueadoPagado && (
                    <div style={{ marginTop: 2, marginBottom: 2 }}>
                      <button
                        type="button"
                        onClick={() => toggleModoChecklist(it)}
                        title="Cambiar a barra de avance de consumo continuo (estilo gasolina)"
                        style={{
                          fontSize: 10.5,
                          color: "var(--ink-soft)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecorationLine: "underline",
                          textDecorationStyle: "dotted",
                        }}
                      >
                        Ver como barra de consumo
                      </button>
                    </div>
                  )}

                  {it.esPrestamo && it.fechaCuota && (
                    <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 1 }}>
                      Vence: {formatoFechaCuota(it.fechaCuota)}
                    </div>
                  )}
                  {(it.esPrestamo || it.esTarjeta) && it.entidadName && (
                    <div style={{ fontSize: 11, color: it.esTarjeta ? "#c084fc" : "var(--ink-soft)", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      {it.esTarjeta ? <CreditCard size={10} style={{ color: "#a855f7" }} /> : <Landmark size={10} />} Pagar a: {it.entidadName}
                    </div>
                  )}
                  {it.esTarjeta && it.monedaOriginal === "USD" && it.montoOriginalUSD > 0 && (
                    <div style={{ fontSize: 10.5, color: "#d8b4fe", marginTop: 2, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>Monto en dólares: US${Number(it.montoOriginalUSD).toFixed(2)}</span>
                    </div>
                  )}
                  {it.esPrestamo && (it.cuentaDestinoNumero || it.prestamoNumero === "PT01") && (
                    <div style={{ fontSize: 11, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2, background: "rgba(59, 130, 246, 0.08)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                      <Landmark size={11} style={{ color: "#2563eb" }} />
                      <span>
                        <strong>{it.cuentaDestinoBanco || (it.prestamoNumero === "PT01" ? "Banco Popular" : "Banco Popular")}:</strong> <span className="despensa-mono">{it.cuentaDestinoNumero || (it.prestamoNumero === "PT01" ? "0002804611" : "")}</span> ({it.cuentaDestinoBeneficiario || (it.prestamoNumero === "PT01" ? "Julian Ochoa" : "")})
                      </span>
                    </div>
                  )}
                  {it.esPagoRapido && (
                    <div style={{ fontSize: 11, color: "var(--amber)", display: "flex", alignItems: "center", gap: 3, marginTop: 1, fontWeight: 600 }}>
                      🚀 Monto aumentado por Pago rápido
                    </div>
                  )}
                  {estado.metodoPago === "Descuento Nómina" && estado.fuenteIngresoNombre && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                      <Briefcase size={10} /> Descontado de: {estado.fuenteIngresoNombre}
                    </div>
                  )}

                  {it.esPrestamo && !it.bloqueadoPagado && it.origenKey && (
                    <div style={{ marginTop: 3 }}>
                      {moviendoAbiertoKey === it.key ? (
                        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            value={destinoFecha}
                            onChange={(e) => setDestinoFecha(e.target.value)}
                            style={{ fontSize: 10.5, padding: "3px 5px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)", color: "var(--ink)" }}
                            type="date"
                          />
                          {destinoFecha && (() => {
                            const [year, month, day] = destinoFecha.split("-").map(Number);
                            const quincenaDestino = day >= 15 ? "2da" : "1ra";
                            return <span style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Se mostrará en {quincenaDestino} quincena de {MES_NOMBRES[month - 1]} {year}</span>;
                          })()}
                          <button
                            onClick={() => confirmarMoverQuincena(it)}
                            disabled={moviendoKey === it.key}
                            style={{ fontSize: 10.5, padding: "3px 8px", background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                          >
                            {moviendoKey === it.key ? "…" : "Confirmar"}
                          </button>
                          <button
                            onClick={() => setMoviendoAbiertoKey(null)}
                            style={{ fontSize: 10.5, padding: "3px 8px", background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {it.tieneOverride && (
                            <button
                              onClick={() => quitarMover(it)}
                              disabled={moviendoKey === it.key}
                              title="Volver esta cuota a su quincena original"
                              style={{ display: "flex", alignItems: "center", gap: 3, padding: 0, fontSize: 10.5, color: "var(--amber)", background: "transparent", border: "none", cursor: moviendoKey === it.key ? "wait" : "pointer" }}
                            >
                              <ArrowLeftRight size={10} /> Volver a la quincena original
                            </button>
                          )}
                          <button
                            onClick={() => abrirMoverQuincena(it)}
                            title="Mover esta cuota a otra quincena, aunque sea de otro mes"
                            style={{ display: "flex", alignItems: "center", gap: 3, padding: 0, fontSize: 10.5, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer" }}
                          >
                            <ArrowLeftRight size={10} /> {it.tieneOverride ? "Mover otra vez" : "Mover a otra quincena"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Para gastos fijos y rubros presupuestados (como Gym, Alquiler, etc.) */}
                  {!it.esPrestamo && !it.esTarjeta && !it.bloqueadoPagado && (
                    <div style={{ marginTop: 4 }}>
                      {transferenciasHaciaPeriodo.filter((t) => t.categoria === it.nombre).map((t) => (
                        <div key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--sage)", background: "var(--sage-bg)", padding: "2px 7px", borderRadius: 6, marginBottom: 4 }}>
                          <span>🔄 Incluye {formatMoney(t.monto)} pasado de {t.origen?.quincena === "Q1" ? "1ra" : "2da"} quincena</span>
                          <button
                            onClick={() => handleRevertirTransferencia(t)}
                            disabled={moviendoGastoCargando}
                            title="Devolver a la quincena original"
                            style={{ background: "transparent", border: "none", color: "var(--amber)", fontSize: 10.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                          >
                            Devolver
                          </button>
                        </div>
                      ))}

                      {!estado.pagado && (
                        <div style={{ marginTop: 2 }}>
                          {moviendoGastoKey === it.key ? (
                            renderPanelMoverGasto(it)
                          ) : (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => abrirMoverGasto(it)}
                                title="Mover este monto presupuestado a otra quincena (ej. primera quincena de noviembre)"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  color: "var(--sage)",
                                  background: "var(--sage-bg)",
                                  border: "1px solid var(--sage)",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                <ArrowLeftRight size={11} /> Mover quincena
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarGastoQuincena(it)}
                                disabled={eliminandoGastoKey === it.key}
                                title="Eliminar este gasto presupuestado de esta quincena (el monto quedará en $0 en esta quincena)"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  color: "var(--stamp)",
                                  background: "var(--stamp-bg)",
                                  border: "1px solid var(--stamp)",
                                  borderRadius: 6,
                                  cursor: eliminandoGastoKey === it.key ? "wait" : "pointer",
                                  fontWeight: 600,
                                }}
                              >
                                <Trash2 size={11} /> {eliminandoGastoKey === it.key ? "Eliminando…" : "Eliminar"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selector de método */}
                <select
                  value={estado.metodoPago || it.metodoDefault || ""}
                  onChange={(e) => setMetodo(it.key, e.target.value)}
                  disabled={it.bloqueadoPagado}
                  style={{
                    padding: "5px 6px",
                    border: "1px solid var(--line)",
                    borderRadius: 7,
                    fontSize: 11.5,
                    background: it.bloqueadoPagado ? "var(--line-soft)" : "var(--paper)",
                    color: it.bloqueadoPagado ? "var(--ink-soft)" : "var(--ink)",
                    flexShrink: 0,
                    cursor: it.bloqueadoPagado ? "not-allowed" : "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  <option value="">Método…</option>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Monto editable o botón de monto */}
                <div style={{ flexShrink: 0, textAlign: "right", alignSelf: "flex-start" }}>
                  {editandoMontoKey === it.key ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        value={montoEditado}
                        onChange={(e) => setMontoEditado(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                        style={{ width: 85, padding: "4px 6px", fontSize: 12.5, border: "1px solid var(--sage)", borderRadius: 6, textAlign: "right" }}
                      />
                      <button
                        onClick={async () => {
                          const actual = checklist?.items?.[it.key] || {};
                          await setChecklistItem(periodoKey, it.key, { ...actual, montoOverride: Number(montoEditado) || 0 });
                          setEditandoMontoKey(null);
                        }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => setEditandoMontoKey(null)}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", flexShrink: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (it.bloqueadoPagado) return;
                        setEditandoMontoKey(it.key);
                        setMontoEditado(String(it.monto || ""));
                      }}
                      disabled={it.bloqueadoPagado}
                      title={it.bloqueadoPagado ? "Préstamo saldado — ya no se puede modificar" : "Tocar para editar el monto"}
                      className="despensa-mono"
                      style={{
                        fontSize: 13.5,
                        fontWeight: estado.pagado ? 700 : 600,
                        minWidth: 70,
                        textAlign: "right",
                        background: estado.pagado ? "rgba(16, 185, 129, 0.14)" : "transparent",
                        border: estado.pagado ? "1px solid rgba(16, 185, 129, 0.4)" : "none",
                        borderRadius: 6,
                        padding: estado.pagado ? "2px 7px" : 0,
                        color: estado.pagado ? "var(--ink)" : it.esTarjeta ? "#c084fc" : "var(--ink)",
                        cursor: it.bloqueadoPagado ? "default" : "pointer",
                        textDecorationLine: it.bloqueadoPagado || estado.pagado ? "none" : "underline",
                        textDecorationStyle: "dotted",
                        textDecorationColor: it.esTarjeta ? "rgba(168, 85, 247, 0.5)" : "var(--line)",
                        textUnderlineOffset: 3,
                      }}
                    >
                      {formatMoney(it.monto)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {transferenciasDesdePeriodo.length > 0 && (
        <div
          style={{
            marginTop: 14,
            marginBottom: 14,
            padding: "12px 14px",
            background: "var(--paper)",
            border: "1px dashed var(--line)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
            <ArrowLeftRight size={13} style={{ color: "var(--sage)" }} />
            <span>Gastos pasados a otra quincena ({transferenciasDesdePeriodo.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {transferenciasDesdePeriodo.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 8px",
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink)" }}>{t.categoria}</strong>:{" "}
                  <span className="despensa-mono" style={{ fontWeight: 700, color: "var(--sage)" }}>
                    {formatMoney(t.monto)}
                  </span>{" "}
                  <span style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>
                    → pasado a la {t.destino?.quincena === "Q1" ? "1ra" : "2da"} quincena de {MESES[t.destino?.month - 1]} {t.destino?.year}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevertirTransferencia(t)}
                  disabled={moviendoGastoCargando}
                  title="Devolver este gasto a esta quincena"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--sage)",
                    background: "var(--sage-bg)",
                    border: "1px solid var(--sage)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Devolver a esta quincena
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {modoSeleccion && seleccionados.size > 0 && (
        <div
          style={{
            position: "sticky",
            bottom: 12,
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 14px",
            background: "var(--card)",
            border: "1px solid var(--sage)",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {seleccionados.size} ítem{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""} ·{" "}
            {formatMoney(items.filter((it) => seleccionados.has(it.key)).reduce((s, it) => s + (Number(it.monto) || 0), 0))}
          </span>
          <button
            onClick={confirmarSeleccionados}
            disabled={confirmandoLote}
            style={{
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              background: "var(--sage)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: confirmandoLote ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {confirmandoLote ? "Confirmando…" : "Confirmar pagos"}
          </button>
        </div>
      )}

      {modalTransferencia && (() => {
        const it = modalTransferencia.item;
        const esPT01 = it.prestamoNumero === "PT01";
        const banco = it.cuentaDestinoBanco || it.prestamo?.cuentaDestinoBanco || (esPT01 ? "Banco Popular" : (it.entidadName || "Banco Popular"));
        const tipoProducto = it.cuentaDestinoTipo || it.prestamo?.cuentaDestinoTipo || (esPT01 ? "Cuentas de Terceros" : "Cuentas de Terceros");
        const numeroCuenta = it.cuentaDestinoNumero || it.prestamo?.cuentaDestinoNumero || (esPT01 ? "0002804611" : "");
        const beneficiario = it.cuentaDestinoBeneficiario || it.prestamo?.cuentaDestinoBeneficiario || (esPT01 ? "Julian Ochoa" : "");

        const modalContent = (
          <div
            style={{
              position: "fixed",
              inset: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
              padding: "16px",
              boxSizing: "border-box",
              touchAction: "none",
              overscrollBehavior: "contain",
              overflow: "hidden",
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => setModalTransferencia(null)}
          >
            <div
              style={{
                background: "var(--card)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: "16px 18px",
                maxWidth: 430,
                width: "100%",
                margin: "auto",
                overflow: "hidden",
                touchAction: "none",
                overscrollBehavior: "contain",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
                boxSizing: "border-box",
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado compacto */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowLeftRight size={15} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, margin: 0, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Transferencia para pago
                    </h3>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.nombre}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalTransferencia(null)}
                  style={{ background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", padding: 3 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Monto a transferir compacto */}
              <div
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Monto a transferir:
                </span>
                <span className="despensa-mono" style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)" }}>
                  {formatMoney(it.monto)}
                </span>
              </div>

              {/* Tarjeta de datos bancarios con botones copiar integrados */}
              <div
                style={{
                  background: "rgba(59, 130, 246, 0.05)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                {/* Banco y tipo */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, paddingBottom: 4, borderBottom: "1px solid rgba(59, 130, 246, 0.12)" }}>
                  <span style={{ color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Landmark size={12} style={{ color: "#2563eb" }} /> Banco:
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {banco} {tipoProducto ? `· ${tipoProducto}` : ""}
                  </span>
                </div>

                {/* Cuenta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>No. de cuenta:</div>
                    <div className="despensa-mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.02em" }}>
                      {numeroCuenta || "No registrado"}
                    </div>
                  </div>
                  {numeroCuenta && (
                    <button
                      type="button"
                      onClick={() => copiarTexto(numeroCuenta, "cuenta")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 9px",
                        background: copiadoCampo === "cuenta" ? "var(--sage)" : "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copiadoCampo === "cuenta" ? <Check size={11} /> : <Copy size={11} />}
                      {copiadoCampo === "cuenta" ? "Copiado" : "Copiar"}
                    </button>
                  )}
                </div>

                {/* Beneficiario */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>Beneficiario:</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {beneficiario || "No registrado"}
                    </div>
                  </div>
                  {beneficiario && (
                    <button
                      type="button"
                      onClick={() => copiarTexto(beneficiario, "beneficiario")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 9px",
                        background: copiadoCampo === "beneficiario" ? "var(--sage)" : "var(--paper)",
                        color: copiadoCampo === "beneficiario" ? "#fff" : "var(--ink)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {copiadoCampo === "beneficiario" ? <Check size={11} /> : <Copy size={11} />}
                      {copiadoCampo === "beneficiario" ? "Copiado" : "Copiar"}
                    </button>
                  )}
                </div>
              </div>

              {/* Mensaje breve */}
              {/* Mensaje breve centrado */}
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 14, lineHeight: 1.35, textAlign: "center" }}>
                💡 Transfiere desde la app de tu banco y confirma al terminar para registrar el pago.
              </div>

              {/* Acciones compactas centralizadas */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", width: "100%" }}>
                <button
                  type="button"
                  onClick={() => setModalTransferencia(null)}
                  style={{
                    flex: 1,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 500,
                    background: "var(--card)",
                    color: "var(--ink-soft)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const item = modalTransferencia.item;
                    setModalTransferencia(null);
                    await confirmarPagoItem(item);
                  }}
                  style={{
                    flex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 18px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    background: "var(--sage)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    textAlign: "center",
                  }}
                >
                  <Check size={14} /> Confirmar pago realizado
                </button>
              </div>
            </div>
          </div>
        );

        return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
      })()}

      <ModalEnviarReporteEmail
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        periodo={periodo}
        items={items}
        totales={totales}
        resumenPorMetodo={resumenPorMetodo}
        diasCobro={diasCobro}
        userEmail={userEmail || "iventuramena@gmail.com"}
        categoriasGasto={categoriasGasto}
        presupuesto={presupuesto}
        prestamos={prestamos}
        tarjetas={tarjetas}
        presupuestoYear={presupuestoYear}
        movimientos={movimientos}
        estrategiaDeudas={estrategiaDeudas}
        tipoCambio={tipoCambio}
        pagoRapido={pagoRapido}
        fuentesIngreso={fuentesIngreso}
        overridesLocales={overridesLocales}
      />
      </div>
    </div>
  );
}
