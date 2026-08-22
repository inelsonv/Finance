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
import { db } from "../firebase";

const productsCol = collection(db, "productos");
const listCol = collection(db, "listaCompra");
const entidadesCol = collection(db, "entidades");

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
  await addDoc(productsCol, {
    name,
    category,
    unit,
    price,
    updatedAt: null,
  });
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
  const q = query(entidadesCol, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d, i) => ({ docId: d.id, num: i + 1, ...d.data() }))),
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
