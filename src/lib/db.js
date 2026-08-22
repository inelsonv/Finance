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
  entidadId,
  entidadName,
  prestamoId,
  prestamoNumero,
  cuentaId,
  cuentaNombre,
  tarjetaId,
  tarjetaNombre,
}) {
  await addDoc(movimientosCol, {
    type,
    category,
    amount,
    description: description || "",
    date,
    entidadId: entidadId || null,
    entidadName: entidadName || "",
    prestamoId: prestamoId || null,
    prestamoNumero: prestamoNumero || "",
    cuentaId: cuentaId || null,
    cuentaNombre: cuentaNombre || "",
    tarjetaId: tarjetaId || null,
    tarjetaNombre: tarjetaNombre || "",
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
