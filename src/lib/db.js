import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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

export async function addProduct({ name, category, unit, price }) {
  const docRef = await addDoc(productsCol, {
    name,
    category,
    unit,
    price,
    imageUrl: null,
    updatedAt: null,
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
  await addDoc(movimientosCol, {
    type,
    category,
    amount,
    description: description || "",
    date,
    clasificacion: clasificacion || null,
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
}

export async function deleteMovimiento(id) {
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
}) {
  await addDoc(prestamosCol, {
    numero,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    montoAprobado,
    plazo,
    plazoUnidad,
    tasaInteres,
    cuota: cuota ?? null,
    fechaInicio,
    estado,
    notas: notas || "",
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
}) {
  await addDoc(tarjetasCol, {
    nombre,
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

export async function addCategoriaGasto({ nombre, clasificacion }) {
  await addDoc(categoriasGastoCol, {
    nombre,
    clasificacion,
    createdAt: serverTimestamp(),
  });
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
