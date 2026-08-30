import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  runTransaction,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

const productsCol = collection(db, "productos");
const listCol = collection(db, "listaCompra");
const entidadesCol = collection(db, "entidades");
const movimientosCol = collection(db, "movimientos");
const prestamosCol = collection(db, "prestamos");
const cuentasCol = collection(db, "cuentas");
const tarjetasCol = collection(db, "tarjetas");
const membresiasCol = collection(db, "membresias");
const fuentesIngresoCol = collection(db, "fuentesIngreso");
const categoriasGastoCol = collection(db, "categoriasGasto");
const contratosCol = collection(db, "contratos");

export function watchConnectionStatus(onChange) {
  return onSnapshot(
    productsCol,
    { includeMetadataChanges: true },
    (snap) => onChange(!snap.metadata.fromCache),
    () => onChange(false)
  );
}

export function watchProducts(onChange, onError) {
  const q = query(productsCol, orderBy("name"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

export function watchList(onChange, onError) {
  return onSnapshot(
    listCol,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

export async function addProduct({ name, category, unit, price, codigoBarras }) {
  const docRef = await addDoc(productsCol, {
    name,
    category,
    unit,
    price,
    imageUrl: null,
    updatedAt: null,
    codigoBarras: codigoBarras || null,
  });
  return docRef;
}

export async function uploadProductImage(id, file) {
  const imgRef = ref(storage, `productos/${id}`);
  await uploadBytes(imgRef, file, { contentType: file.type });
  const url = await getDownloadURL(imgRef);
  await updateDoc(doc(db, "productos", id), { imageUrl: url });
  return url;
}

export async function removeProductImage(id) {
  try {
    await deleteObject(ref(storage, `productos/${id}`));
  } catch (err) {
    // si el archivo ya no existe, seguimos igual
  }
  await updateDoc(doc(db, "productos", id), { imageUrl: null });
}

export async function updateProductPrice(id, price) {
  await updateDoc(doc(db, "productos", id), {
    price,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProducto(id, fields) {
  await updateDoc(doc(db, "productos", id), fields);
}

export async function deleteProduct(id) {
  await deleteDoc(doc(db, "productos", id));
}

export async function addToList(productId) {
  await setDoc(doc(db, "listaCompra", productId), { productId, qty: 1, checked: false }, { merge: true });
}

export async function setListQty(productId, qty) {
  await updateDoc(doc(db, "listaCompra", productId), { qty });
}

export async function setListChecked(productId, checked) {
  await updateDoc(doc(db, "listaCompra", productId), { checked });
}

export async function removeFromList(productId) {
  await deleteDoc(doc(db, "listaCompra", productId));
}

export async function incrementListQty(productId, current, delta) {
  await updateDoc(doc(db, "listaCompra", productId), { qty: Math.max(1, current + delta) });
}

export function watchEntidades(onChange, onError) {
  return onSnapshot(
    entidadesCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.toMillis() : Infinity;
        const tb = b.createdAt ? b.createdAt.toMillis() : Infinity;
        return ta - tb;
      });
      onChange(docs.map((d, i) => ({ ...d, num: i + 1 })));
    },
    (err) => onError && onError(err)
  );
}

export async function addEntidad({ name, type, address, phone, notes }) {
  await addDoc(entidadesCol, {
    name,
    type,
    address: address || "",
    phone: phone || "",
    notes: notes || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateEntidad(docId, fields) {
  await updateDoc(doc(db, "entidades", docId), fields);
}

export async function deleteEntidad(docId) {
  await deleteDoc(doc(db, "entidades", docId));
}

const tiposEntidadCol = collection(db, "tiposEntidad");

export function watchTiposEntidad(onChange, onError) {
  return onSnapshot(
    tiposEntidadCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addTipoEntidad(nombre) {
  await addDoc(tiposEntidadCol, { nombre, createdAt: serverTimestamp() });
}

export async function deleteTipoEntidad(id) {
  await deleteDoc(doc(db, "tiposEntidad", id));
}

export function watchMovimientos(onChange, onError) {
  return onSnapshot(
    movimientosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addMovimiento({
  type,
  category,
  amount,
  description,
  date,
  clasificacion,
  metodoPago,
  entidadId,
  entidadName,
  prestamoId,
  prestamoNumero,
  cuentaId,
  cuentaNombre,
  tarjetaId,
  tarjetaNombre,
  membresiaId,
  membresiaNombre,
  fuenteIngresoId,
  fuenteIngresoNombre,
  contratoId,
  contratoNombre,
}) {
  const docRef = await addDoc(movimientosCol, {
    type,
    category,
    amount,
    description: description || "",
    date,
    clasificacion: clasificacion || null,
    metodoPago: metodoPago || null,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    prestamoId: prestamoId || null,
    prestamoNumero: prestamoNumero || "",
    cuentaId: cuentaId || null,
    cuentaNombre: cuentaNombre || "",
    tarjetaId: tarjetaId || null,
    tarjetaNombre: tarjetaNombre || "",
    membresiaId: membresiaId || null,
    membresiaNombre: membresiaNombre || "",
    fuenteIngresoId: fuenteIngresoId || null,
    fuenteIngresoNombre: fuenteIngresoNombre || "",
    contratoId: contratoId || null,
    contratoNombre: contratoNombre || "",
    createdAt: serverTimestamp(),
  });

  // Otorga puntos automáticamente según el tipo de movimiento registrado
  // (cumplir una obligación rígida genera puntos). No debe romper el guardado
  // del movimiento si algo falla aquí.
  // 1 punto = $1 peso disponible para gastos flexibles. Se otorga el 5% del
  // monto de cada obligación cumplida (préstamo, gasto fijo, aporte a ahorro).
  const PORCENTAJE_PUNTOS = 0.05;
  try {
    const montoNum = Number(amount) || 0;
    const puntosGanados = Math.round(montoNum * PORCENTAJE_PUNTOS);
    if (type === "Pago de préstamo" && prestamoId && puntosGanados > 0) {
      await otorgarPuntos(`Pago de préstamo ${prestamoNumero || ""}`.trim(), puntosGanados, "prestamo", docRef.id);
    } else if (type === "Gasto" && clasificacion === "Fijo" && puntosGanados > 0) {
      await otorgarPuntos(`Pago de gasto fijo: ${category}`, puntosGanados, "gastoFijo", docRef.id);
    } else if (cuentaId && montoNum > 0 && puntosGanados > 0) {
      const metasSnap = await getDocs(
        query(collection(db, "metasAhorro"), where("cuentaId", "==", cuentaId), where("estado", "==", "Activa"))
      );
      if (!metasSnap.empty) {
        await otorgarPuntos("Aporte a meta de ahorro", puntosGanados, "metaAhorro", docRef.id);
      }
    }
  } catch (err) {
    console.error("No se pudieron otorgar puntos:", err);
  }

  return docRef;
}

export async function otorgarPuntos(motivo, puntos, tipo, movimientoId = null) {
  await addDoc(collection(db, "puntosHistorial"), {
    motivo,
    puntos,
    tipo,
    movimientoId: movimientoId || null,
    fecha: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", "puntos"), { total: increment(puntos) }, { merge: true });
}

export function watchPuntos(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "puntos"),
    (snap) => onChange(snap.exists() ? snap.data().total || 0 : 0),
    (err) => onError && onError(err)
  );
}

export function watchPuntosHistorial(onChange, onError) {
  return onSnapshot(
    query(collection(db, "puntosHistorial"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// Canjea puntos acumulados: libera ese monto (1 punto = $1) como presupuesto
// extra en una categoría de gasto variable, para una quincena específica
// (normalmente del mes siguiente). Lee y suma sobre el valor ya presupuestado
// en esa celda, en vez de sobreescribirlo.
export async function canjearPuntos({ montoACanjear, year, month, quincena, categoria }) {
  const monto = Math.round(Number(montoACanjear) || 0);
  if (monto <= 0) throw new Error("El monto a canjear debe ser mayor a cero");

  const puntosSnap = await getDoc(doc(db, "config", "puntos"));
  const puntosDisponibles = puntosSnap.exists() ? puntosSnap.data().total || 0 : 0;
  if (monto > puntosDisponibles) throw new Error("No tienes suficientes puntos para ese canje");

  const presupuestoSnap = await getDoc(doc(db, "presupuestos", String(year)));
  const valorActual = presupuestoSnap.exists() ? presupuestoSnap.data()?.[categoria]?.[String(month)]?.[quincena] || 0 : 0;
  const nuevoValor = valorActual + monto;

  await setDoc(
    doc(db, "presupuestos", String(year)),
    { [categoria]: { [String(month)]: { [quincena]: nuevoValor } } },
    { merge: true }
  );

  await addDoc(collection(db, "puntosHistorial"), {
    motivo: `Canje: $${monto} liberados para "${categoria}"`,
    puntos: -monto,
    tipo: "canje",
    fecha: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", "puntos"), { total: increment(-monto) }, { merge: true });
}

export async function deleteMovimiento(id) {
  // Si este movimiento había generado puntos, los revierte antes de eliminarlo
  // (no debe romper el borrado si algo falla aquí).
  try {
    const puntosSnap = await getDocs(query(collection(db, "puntosHistorial"), where("movimientoId", "==", id)));
    for (const d of puntosSnap.docs) {
      const puntosOtorgados = d.data().puntos || 0;
      if (puntosOtorgados !== 0) {
        await setDoc(doc(db, "config", "puntos"), { total: increment(-puntosOtorgados) }, { merge: true });
      }
      await deleteDoc(d.ref);
    }
  } catch (err) {
    console.error("No se pudieron revertir los puntos de este movimiento:", err);
  }

  await deleteDoc(doc(db, "movimientos", id));
}

export function watchPrestamos(onChange, onError) {
  return onSnapshot(
    prestamosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.numero || "").localeCompare(b.numero || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addPrestamo({
  numero,
  tipo,
  entidadId,
  entidadName,
  montoAprobado,
  plazo,
  plazoUnidad,
  tasaInteres,
  cuota,
  fechaInicio,
  estado,
  notas,
  notificarWhatsapp,
  activoId,
  activoNombre,
  esRevolvente,
  saldoActual,
  montoMinimoRetiro,
  frecuenciaCuota,
  cuotasPersonalizadas,
}) {
  await addDoc(prestamosCol, {
    numero,
    tipo: tipo || "Otro",
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    activoId: activoId || null,
    activoNombre: activoNombre || "",
    esRevolvente: !!esRevolvente,
    saldoActual: saldoActual ?? null,
    montoMinimoRetiro: montoMinimoRetiro ?? null,
    montoAprobado,
    plazo,
    plazoUnidad,
    tasaInteres,
    cuota: cuota ?? null,
    fechaInicio,
    estado,
    notas: notas || "",
    notificarWhatsapp: !!notificarWhatsapp,
    frecuenciaCuota: frecuenciaCuota || "Mensual",
    cuotasPersonalizadas: cuotasPersonalizadas || [],
    createdAt: serverTimestamp(),
  });
}

export async function updatePrestamoEstado(id, estado) {
  await updateDoc(doc(db, "prestamos", id), { estado });
}

export async function updatePrestamo(id, fields) {
  await updateDoc(doc(db, "prestamos", id), fields);
}

export async function deletePrestamo(id) {
  await deleteDoc(doc(db, "prestamos", id));
}

export function watchCuentas(onChange, onError) {
  return onSnapshot(
    cuentasCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addCuenta({ nombre, tipo, entidadId, entidadName, numeroCuenta, saldoInicial, notas }) {
  await addDoc(cuentasCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    numeroCuenta: numeroCuenta || "",
    saldoInicial: saldoInicial ?? null,
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateCuenta(id, fields) {
  await updateDoc(doc(db, "cuentas", id), fields);
}

export async function deleteCuenta(id) {
  await deleteDoc(doc(db, "cuentas", id));
}

export function watchTarjetas(onChange, onError) {
  return onSnapshot(
    tarjetasCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addTarjeta({
  nombre,
  tipoTarjeta,
  entidadId,
  entidadName,
  ultimos4,
  limiteCredito,
  tasaInteres,
  pagoMinimo,
  fechaCorte,
  fechaPago,
  estado,
  notas,
  color,
  marca,
  saldoActual,
}) {
  await addDoc(tarjetasCol, {
    nombre,
    tipoTarjeta: tipoTarjeta || "Crédito",
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    ultimos4: ultimos4 || "",
    limiteCredito: limiteCredito ?? null,
    tasaInteres: tasaInteres ?? null,
    pagoMinimo: pagoMinimo ?? null,
    fechaCorte: fechaCorte ?? null,
    fechaPago: fechaPago ?? null,
    estado,
    notas: notas || "",
    color: color || "azul",
    marca: marca || "Otra",
    saldoActual: saldoActual ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function updateTarjeta(id, fields) {
  await updateDoc(doc(db, "tarjetas", id), fields);
}

export async function updateTarjetaEstado(id, estado) {
  await updateDoc(doc(db, "tarjetas", id), { estado });
}

export async function deleteTarjeta(id) {
  await deleteDoc(doc(db, "tarjetas", id));
}

export function watchMembresias(onChange, onError) {
  return onSnapshot(
    membresiasCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addMembresia({
  nombre,
  tipo,
  entidadId,
  entidadName,
  costo,
  frecuencia,
  diaPago,
  fechaInicio,
  estado,
  notas,
  color,
  nivel,
}) {
  await addDoc(membresiasCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    costo: costo ?? null,
    frecuencia,
    diaPago: diaPago ?? null,
    fechaInicio: fechaInicio || null,
    color: color || "azul",
    nivel: nivel || "",
    estado,
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateMembresia(id, fields) {
  await updateDoc(doc(db, "membresias", id), fields);
}

export async function updateMembresiaEstado(id, estado) {
  await updateDoc(doc(db, "membresias", id), { estado });
}

export async function deleteMembresia(id) {
  await deleteDoc(doc(db, "membresias", id));
}

export function watchFuentesIngreso(onChange, onError) {
  return onSnapshot(
    fuentesIngresoCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addFuenteIngreso({
  nombre,
  tipo,
  entidadId,
  entidadName,
  montoEsperado,
  frecuencia,
  diaPago,
  estado,
  notas,
  codigoEmpleado,
  diasVacacionesAnuales,
}) {
  await addDoc(fuentesIngresoCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    montoEsperado: montoEsperado ?? null,
    frecuencia,
    diaPago: diaPago || "",
    estado,
    notas: notas || "",
    codigoEmpleado: codigoEmpleado || "",
    diasVacacionesAnuales: diasVacacionesAnuales ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function updateFuenteIngreso(id, fields) {
  await updateDoc(doc(db, "fuentesIngreso", id), fields);
}

export async function updateFuenteIngresoEstado(id, estado) {
  await updateDoc(doc(db, "fuentesIngreso", id), { estado });
}

export async function deleteFuenteIngreso(id) {
  await deleteDoc(doc(db, "fuentesIngreso", id));
}

export function watchCategoriasGasto(onChange, onError) {
  return onSnapshot(
    categoriasGastoCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addCategoriaGasto({ nombre, clasificacion, metodoPagoDefault }) {
  await addDoc(categoriasGastoCol, {
    nombre,
    clasificacion,
    metodoPagoDefault: metodoPagoDefault || "Efectivo",
    createdAt: serverTimestamp(),
  });
}

export async function updateCategoriaGasto(id, fields) {
  await updateDoc(doc(db, "categoriasGasto", id), fields);
}

export async function deleteCategoriaGasto(id) {
  await deleteDoc(doc(db, "categoriasGasto", id));
}

export function watchPresupuestoAnual(year, onChange, onError) {
  return onSnapshot(
    doc(db, "presupuestos", String(year)),
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (err) => onError && onError(err)
  );
}

export async function setPresupuestoCelda(year, category, month, quincena, amount) {
  await setDoc(
    doc(db, "presupuestos", String(year)),
    { [category]: { [String(month)]: { [quincena]: amount } } },
    { merge: true }
  );
}

export function watchContratos(onChange, onError) {
  return onSnapshot(
    contratosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addContrato({
  nombre,
  tipo,
  entidadId,
  entidadName,
  numeroContrato,
  montoEstimado,
  diaPago,
  estado,
  notas,
}) {
  await addDoc(contratosCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    numeroContrato: numeroContrato || "",
    montoEstimado: montoEstimado ?? null,
    diaPago: diaPago ?? null,
    estado,
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateContrato(id, fields) {
  await updateDoc(doc(db, "contratos", id), fields);
}

export async function updateContratoEstado(id, estado) {
  await updateDoc(doc(db, "contratos", id), { estado });
}

export async function deleteContrato(id) {
  await deleteDoc(doc(db, "contratos", id));
}

export function watchFlujo(onChange, onError) {
  return onSnapshot(
    doc(db, "flujo", "diagrama"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveFlujo(nodes, edges) {
  await setDoc(doc(db, "flujo", "diagrama"), { nodes, edges, updatedAt: serverTimestamp() });
}

const accionesCol = collection(db, "acciones");

export function watchAcciones(onChange, onError) {
  return onSnapshot(
    accionesCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.symbol || "").localeCompare(b.symbol || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addAccion({ symbol, nombre }) {
  await addDoc(accionesCol, { symbol: symbol.toUpperCase(), nombre: nombre || "", createdAt: serverTimestamp() });
}

export async function deleteAccion(id) {
  await deleteDoc(doc(db, "acciones", id));
}

export function watchAccionesConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "acciones"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveAccionesConfig(apiKey) {
  await setDoc(doc(db, "config", "acciones"), { apiKey });
}

export function watchAccionesPrecios(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "accionesPrecios"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveAccionesPrecios(prices, symbols) {
  await setDoc(doc(db, "config", "accionesPrecios"), {
    prices,
    symbols,
    fetchedAt: serverTimestamp(),
  });
}

export function watchTipoCambioCache(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "tipoCambio"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveTipoCambioCache(rates) {
  await setDoc(doc(db, "config", "tipoCambio"), { rates, fetchedAt: serverTimestamp() });
}

export function watchNotifConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "notificaciones"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveNotifConfig(email) {
  await setDoc(doc(db, "config", "notificaciones"), { email });
}

export function watchDiezmoConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "diezmo"),
    (snap) => onChange(snap.exists() ? snap.data() : { activo: false, porcentaje: 10 }),
    (err) => onError && onError(err)
  );
}

export async function saveDiezmoConfig({ activo, porcentaje }) {
  await setDoc(doc(db, "config", "diezmo"), { activo: !!activo, porcentaje: porcentaje ?? 10 });
}

export function watchAhorroAutoConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "ahorroAutomatico"),
    (snap) => onChange(snap.exists() ? snap.data() : { activo: false, porcentaje: 10, condicionadoADeuda: true }),
    (err) => onError && onError(err)
  );
}

export async function saveAhorroAutoConfig({ activo, porcentaje, condicionadoADeuda }) {
  await setDoc(doc(db, "config", "ahorroAutomatico"), {
    activo: !!activo,
    porcentaje: porcentaje ?? 10,
    condicionadoADeuda: condicionadoADeuda !== false,
  });
}

export function watchCombustibleConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "combustible"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveCombustibleConfig(precios) {
  await setDoc(doc(db, "config", "combustible"), { precios, updatedAt: serverTimestamp() });
}

export function watchChecklistPeriodo(periodoKey, onChange, onError) {
  return onSnapshot(
    doc(db, "checklistPagos", periodoKey),
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (err) => onError && onError(err)
  );
}

export async function setChecklistItem(periodoKey, itemKey, fields) {
  await setDoc(doc(db, "checklistPagos", periodoKey), { items: { [itemKey]: fields } }, { merge: true });
}

export function watchInicioOrden(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "inicioOrden"),
    (snap) => onChange(snap.exists() ? snap.data().orden : null),
    (err) => onError && onError(err)
  );
}

export async function saveInicioOrden(orden) {
  await setDoc(doc(db, "config", "inicioOrden"), { orden });
}

const calendarioCol = collection(db, "calendario");

export function watchCalendario(onChange, onError) {
  return onSnapshot(
    calendarioCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => `${a.fecha || ""}${a.hora || ""}`.localeCompare(`${b.fecha || ""}${b.hora || ""}`));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addEvento({ titulo, tipo, fecha, hora, entidadId, entidadName, diasAviso, estado, notas, categoriaGasto, montoEstimado }) {
  await addDoc(calendarioCol, {
    titulo,
    tipo,
    fecha,
    hora: hora || "",
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    diasAviso: diasAviso ?? 1,
    estado: estado || "Pendiente",
    notas: notas || "",
    categoriaGasto: categoriaGasto || null,
    montoEstimado: montoEstimado ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function updateEvento(id, fields) {
  await updateDoc(doc(db, "calendario", id), fields);
}

export async function updateEventoEstado(id, estado) {
  await updateDoc(doc(db, "calendario", id), { estado });
}

export async function deleteEvento(id) {
  await deleteDoc(doc(db, "calendario", id));
}

const activosCol = collection(db, "activos");

export function watchActivos(onChange, onError) {
  return onSnapshot(
    activosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addActivo({
  nombre,
  tipo,
  marca,
  modelo,
  anio,
  identificador,
  fechaCompra,
  valorCompra,
  proximoMantenimiento,
  estado,
  notas,
}) {
  await addDoc(activosCol, {
    nombre,
    tipo,
    marca: marca || "",
    modelo: modelo || "",
    anio: anio ?? null,
    identificador: identificador || "",
    fechaCompra: fechaCompra || null,
    valorCompra: valorCompra ?? null,
    proximoMantenimiento: proximoMantenimiento || null,
    estado: estado || "Activo",
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateActivo(id, fields) {
  await updateDoc(doc(db, "activos", id), fields);
}

export async function updateActivoEstado(id, estado) {
  await updateDoc(doc(db, "activos", id), { estado });
}

export async function deleteActivo(id) {
  await deleteDoc(doc(db, "activos", id));
}

const mantenimientosCol = collection(db, "mantenimientos");

export function watchMantenimientos(onChange, onError) {
  return onSnapshot(
    mantenimientosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addMantenimiento({ activoId, activoNombre, fecha, tipo, costo, kilometraje, notas }) {
  await addDoc(mantenimientosCol, {
    activoId,
    activoNombre: activoNombre || "",
    fecha,
    tipo,
    costo: costo ?? null,
    kilometraje: kilometraje ?? null,
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function deleteMantenimiento(id) {
  await deleteDoc(doc(db, "mantenimientos", id));
}

const metasAhorroCol = collection(db, "metasAhorro");

export function watchMetasAhorro(onChange, onError) {
  return onSnapshot(
    metasAhorroCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addMetaAhorro({
  nombre,
  tipoMeta,
  cuentaId,
  cuentaNombre,
  montoObjetivo,
  porcentaje,
  fechaObjetivo,
  estado,
  notas,
}) {
  await addDoc(metasAhorroCol, {
    nombre,
    tipoMeta,
    cuentaId: cuentaId || null,
    cuentaNombre: cuentaNombre || "",
    montoObjetivo: montoObjetivo ?? null,
    porcentaje: porcentaje ?? null,
    fechaObjetivo: fechaObjetivo || null,
    estado: estado || "Activa",
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateMetaAhorro(id, fields) {
  await updateDoc(doc(db, "metasAhorro", id), fields);
}

export async function updateMetaAhorroEstado(id, estado) {
  await updateDoc(doc(db, "metasAhorro", id), { estado });
}

export async function deleteMetaAhorro(id) {
  await deleteDoc(doc(db, "metasAhorro", id));
}

const segurosCol = collection(db, "seguros");

export function watchSeguros(onChange, onError) {
  return onSnapshot(
    segurosCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addSeguro({
  nombre,
  tipo,
  entidadId,
  entidadName,
  activoId,
  activoNombre,
  numeroPoliza,
  fechaInicio,
  fechaVencimiento,
  primaMonto,
  primaFrecuencia,
  diasAviso,
  estado,
  notas,
}) {
  await addDoc(segurosCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    activoId: activoId || null,
    activoNombre: activoNombre || "",
    numeroPoliza: numeroPoliza || "",
    fechaInicio: fechaInicio || null,
    fechaVencimiento: fechaVencimiento || null,
    primaMonto: primaMonto ?? null,
    primaFrecuencia: primaFrecuencia || "Anual",
    diasAviso: diasAviso ?? 15,
    estado: estado || "Activo",
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateSeguro(id, fields) {
  await updateDoc(doc(db, "seguros", id), fields);
}

export async function updateSeguroEstado(id, estado) {
  await updateDoc(doc(db, "seguros", id), { estado });
}

export async function deleteSeguro(id) {
  await deleteDoc(doc(db, "seguros", id));
}

const renovacionesCol = collection(db, "renovaciones");

export function watchRenovaciones(onChange, onError) {
  return onSnapshot(
    renovacionesCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addRenovacion({
  nombre,
  tipo,
  entidadId,
  entidadName,
  activoId,
  activoNombre,
  numeroReferencia,
  fechaInicio,
  fechaVencimiento,
  monto,
  diasAviso,
  estado,
  categoriaGasto,
  notas,
}) {
  await addDoc(renovacionesCol, {
    nombre,
    tipo,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    activoId: activoId || null,
    activoNombre: activoNombre || "",
    numeroReferencia: numeroReferencia || "",
    fechaInicio: fechaInicio || null,
    fechaVencimiento: fechaVencimiento || null,
    monto: monto ?? null,
    diasAviso: diasAviso ?? 15,
    estado: estado || "Activo",
    categoriaGasto: categoriaGasto || null,
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateRenovacion(id, fields) {
  await updateDoc(doc(db, "renovaciones", id), fields);
}

export async function updateRenovacionEstado(id, estado) {
  await updateDoc(doc(db, "renovaciones", id), { estado });
}

export async function deleteRenovacion(id) {
  await deleteDoc(doc(db, "renovaciones", id));
}

const historialComprasCol = collection(db, "historialCompras");

export function watchHistorialCompras(onChange, onError) {
  return onSnapshot(
    historialComprasCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function registrarCompraProducto({ productId, productName, fecha, cantidad }) {
  const docRef = await addDoc(historialComprasCol, {
    productId,
    productName: productName || "",
    fecha,
    cantidad: cantidad || 1,
    createdAt: serverTimestamp(),
  });
  return docRef;
}

export async function deleteHistorialCompra(id) {
  await deleteDoc(doc(db, "historialCompras", id));
}

const ordenesCompraCol = collection(db, "ordenesCompra");

export function watchOrdenesCompra(onChange, onError) {
  return onSnapshot(
    ordenesCompraCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.folio || "").localeCompare(a.folio || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

// Genera el siguiente folio (OC00001, OC00002, ...) de forma atómica, usando un
// contador en Firestore para evitar folios repetidos.
async function siguienteFolioOC() {
  const contadorRef = doc(db, "config", "contadorOC");
  const nuevoNumero = await runTransaction(db, async (tx) => {
    const snap = await tx.get(contadorRef);
    const actual = snap.exists() ? snap.data().ultimo || 0 : 0;
    const siguiente = actual + 1;
    tx.set(contadorRef, { ultimo: siguiente });
    return siguiente;
  });
  return `OC${String(nuevoNumero).padStart(5, "0")}`;
}

export async function addOrdenCompra({ items, proveedorId, proveedorNombre, notas, categoriaGasto, fechaPlaneada }) {
  const folio = await siguienteFolioOC();
  const docRef = await addDoc(ordenesCompraCol, {
    folio,
    fecha: new Date().toISOString().slice(0, 10),
    estado: "Borrador",
    modalidad: null,
    proveedorId: proveedorId || null,
    proveedorNombre: proveedorNombre || "",
    items: items || [],
    notas: notas || "",
    categoriaGasto: categoriaGasto || null,
    fechaPlaneada: fechaPlaneada || null,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, folio };
}

// Agrega (o incrementa la cantidad de) un producto en la orden de compra que esté
// en Borrador. Si no existe ninguna en borrador, crea una nueva automáticamente.
// Así, "agregar a la lista" desde Catálogo alimenta directo la orden de compra.
export async function agregarItemABorrador(ordenBorrador, { productId, productName, precioUnitario }) {
  if (!ordenBorrador) {
    const { id } = await addOrdenCompra({
      items: [{ productId, productName, cantidad: 1, precioUnitario: precioUnitario ?? null }],
    });
    return id;
  }
  const items = ordenBorrador.items || [];
  const idx = items.findIndex((it) => it.productId === productId);
  let nuevosItems;
  if (idx >= 0) {
    nuevosItems = items.map((it, i) => (i === idx ? { ...it, cantidad: (Number(it.cantidad) || 0) + 1 } : it));
  } else {
    nuevosItems = [...items, { productId, productName, cantidad: 1, precioUnitario: precioUnitario ?? null }];
  }
  await updateOrdenCompra(ordenBorrador.id, { items: nuevosItems });
  return ordenBorrador.id;
}

export async function updateOrdenCompra(id, fields) {
  await updateDoc(doc(db, "ordenesCompra", id), fields);
}

export async function deleteOrdenCompra(id) {
  await deleteDoc(doc(db, "ordenesCompra", id));
}

const vacacionesCol = collection(db, "vacaciones");

export function watchVacaciones(onChange, onError) {
  return onSnapshot(
    vacacionesCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (a.fechaInicio || "").localeCompare(b.fechaInicio || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addVacacion({
  destino,
  fuenteIngresoId,
  fuenteIngresoName,
  fechaInicio,
  fechaFin,
  diasUtilizados,
  presupuestoEstimado,
  categoriaGasto,
  estado,
  notas,
}) {
  await addDoc(vacacionesCol, {
    destino,
    fuenteIngresoId: fuenteIngresoId || null,
    fuenteIngresoName: fuenteIngresoName || "",
    fechaInicio,
    fechaFin,
    diasUtilizados: diasUtilizados ?? 0,
    presupuestoEstimado: presupuestoEstimado ?? null,
    categoriaGasto: categoriaGasto || null,
    estado: estado || "Planificada",
    notas: notas || "",
    createdAt: serverTimestamp(),
  });
}

export async function updateVacacion(id, fields) {
  await updateDoc(doc(db, "vacaciones", id), fields);
}

export async function deleteVacacion(id) {
  await deleteDoc(doc(db, "vacaciones", id));
}
