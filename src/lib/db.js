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
  arrayUnion,
  deleteField,
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

// Descarga una imagen desde una URL externa y la guarda en Firebase Storage
// (no solo enlaza la URL externa) — así la imagen sigue disponible aunque el
// sitio original la borre o cambie. Puede fallar si el sitio de origen no
// permite descargas desde el navegador (CORS); en ese caso se informa al
// usuario para que la descargue y suba manualmente.
export async function uploadProductImageFromUrl(id, url) {
  let response;
  try {
    response = await fetch(url, { mode: "cors" });
  } catch (err) {
    throw new Error("No se pudo descargar esa imagen — el sitio de origen no permite descargarla directo desde aquí. Descárgala tú y súbela como archivo.");
  }
  if (!response.ok) throw new Error("No se pudo descargar la imagen de esa URL (respuesta " + response.status + ")");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Esa URL no parece apuntar a una imagen");

  const imgRef = ref(storage, `productos/${id}`);
  await uploadBytes(imgRef, blob, { contentType: blob.type });
  const downloadUrl = await getDownloadURL(imgRef);
  await updateDoc(doc(db, "productos", id), { imageUrl: downloadUrl });
  return downloadUrl;
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
  monedaTarjeta,
  fechaPagoTarjeta,
  membresiaId,
  membresiaNombre,
  fuenteIngresoId,
  fuenteIngresoNombre,
  contratoId,
  contratoNombre,
  origen,
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
    monedaTarjeta: monedaTarjeta || null,
    fechaPagoTarjeta: fechaPagoTarjeta || null,
    pagado: type === "Gasto" && metodoPago === "Tarjeta de crédito" ? false : null,
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
  // monto de cada obligación cumplida (préstamo, categoría configurada como
  // generadora de puntos, aporte a ahorro).
  const PORCENTAJE_PUNTOS = 0.05;
  try {
    const montoNum = Number(amount) || 0;
    let montoParaPuntos = montoNum;
    if (category === "Pago de tarjeta" && monedaTarjeta === "USD") {
      // Convierte el pago en USD a su equivalente en pesos usando la misma
      // caché de tipo de cambio que usa la tarjeta de Dólar en Inicio.
      const tipoCambioSnap = await getDoc(doc(db, "config", "tipoCambioCache"));
      const tasaUSD = tipoCambioSnap.exists() ? tipoCambioSnap.data()?.rates?.USD : null;
      if (tasaUSD) montoParaPuntos = montoNum * tasaUSD;
    }
    const puntosGanados = Math.round(montoParaPuntos * PORCENTAJE_PUNTOS);
    if (category === "Pago de préstamo" && prestamoId && puntosGanados > 0) {
      await otorgarPuntos(`Pago de préstamo ${prestamoNumero || ""}`.trim(), puntosGanados, "prestamo", docRef.id);
    } else if (category === "Pago de tarjeta" && tarjetaId && puntosGanados > 0) {
      await otorgarPuntos(`Pago de tarjeta ${tarjetaNombre || ""}`.trim(), puntosGanados, "tarjeta", docRef.id);
    } else if (type === "Gasto" && puntosGanados > 0) {
      const categoriasPuntosSnap = await getDoc(doc(db, "config", "categoriasPuntos"));
      const categoriasQueGeneranPuntos = categoriasPuntosSnap.exists() ? categoriasPuntosSnap.data().nombres || [] : [];
      if (categoriasQueGeneranPuntos.includes(category)) {
        await otorgarPuntos(`Pago de "${category}"`, puntosGanados, "gastoFijo", docRef.id);
      }
    } else if (cuentaId && montoNum > 0 && puntosGanados > 0) {
      const metasSnap = await getDocs(
        query(collection(db, "metasAhorro"), where("cuentaId", "==", cuentaId), where("estado", "==", "Activa"))
      );
      if (!metasSnap.empty) {
        await otorgarPuntos("Aporte a meta de ahorro", puntosGanados, "metaAhorro", docRef.id);
      }
    }

    // Punto fijo, pequeño, por el simple hecho de registrar el movimiento
    // (no depende del monto ni de la categoría) — se suma aparte de
    // cualquier otro punto ya otorgado arriba. No aplica a Ingresos. Si se
    // registró desde el registro rápido de móvil (no desde el Checklist ni
    // el formulario completo), el bono es menor (1 punto en vez de 10) para
    // no incentivar registrar muchos gastos mínimos solo por los puntos.
    if (type !== "Ingreso") {
      const puntosRegistro = origen === "rapido" ? 5 : 10;
      await otorgarPuntos("Registraste un movimiento", puntosRegistro, "registro", docRef.id);
    }
  } catch (err) {
    console.error("No se pudieron otorgar puntos:", err);
  }

  // Si este pago es de un préstamo, verifica si con él queda completamente
  // saldado, y en ese caso marca el estado como "Pagado" automáticamente y
  // otorga un bono de puntos por cancelar la deuda. También revisa si el
  // pago se hizo antes de lo que tocaba (adelantado), y en ese caso otorga
  // un bono extra sobre los puntos ya ganados por el pago.
  // Este estado ya no se puede revertir manualmente (ver Prestamos.jsx).
  try {
    if (category === "Pago de préstamo" && prestamoId) {
      const prestamoSnap = await getDoc(doc(db, "prestamos", prestamoId));
      if (prestamoSnap.exists()) {
        const p = prestamoSnap.data();
        if (p.estado !== "Pagado") {
          let totalAPagar = 0;
          let meses = 0;
          if (p.frecuenciaCuota === "Personalizado") {
            totalAPagar = (p.cuotasPersonalizadas || []).reduce((s, c) => s + (Number(c.monto) || 0), 0);
          } else {
            meses = p.plazoUnidad === "años" ? (Number(p.plazo) || 0) * 12 : Number(p.plazo) || 0;
            totalAPagar = (Number(p.cuota) || 0) * meses;
          }
          if (totalAPagar > 0) {
            const pagosSnap = await getDocs(query(collection(db, "movimientos"), where("prestamoId", "==", prestamoId)));
            const totalPagado = pagosSnap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0);

            // Bono por adelantar cuota: compara lo pagado ANTES de este pago
            // contra lo que técnicamente tocaba pagar hasta hoy. Si ya
            // estaba al día (o adelantado) antes de este pago, este pago
            // cuenta como adelanto.
            const hoyStr = new Date().toISOString().slice(0, 10);
            let debidoHastaHoy = null;
            if (p.frecuenciaCuota === "Personalizado") {
              debidoHastaHoy = (p.cuotasPersonalizadas || [])
                .filter((c) => c.fecha && c.fecha <= hoyStr)
                .reduce((s, c) => s + (Number(c.monto) || 0), 0);
            } else if (p.fechaInicio) {
              const fechaInicioP = new Date(p.fechaInicio);
              const hoyDate = new Date();
              let mesesTranscurridos =
                (hoyDate.getFullYear() - fechaInicioP.getFullYear()) * 12 + (hoyDate.getMonth() - fechaInicioP.getMonth()) + 1;
              mesesTranscurridos = Math.max(0, Math.min(mesesTranscurridos, meses));
              debidoHastaHoy = (Number(p.cuota) || 0) * mesesTranscurridos;
            }
            const totalPagadoAntes = totalPagado - montoNum;
            if (debidoHastaHoy != null && totalPagadoAntes >= debidoHastaHoy && puntosGanados > 0) {
              const bonoAdelanto = Math.round(puntosGanados * 0.2);
              if (bonoAdelanto > 0) {
                await otorgarPuntos(
                  `Bono por adelantar cuota de préstamo ${p.numero || ""}`.trim(),
                  bonoAdelanto,
                  "prestamoAdelanto",
                  docRef.id
                );
              }
            }

            if (totalPagado >= totalAPagar) {
              await updateDoc(doc(db, "prestamos", prestamoId), { estado: "Pagado" });
              const bonoCancelacion = Math.round(totalAPagar * 0.08);
              if (bonoCancelacion > 0) {
                await otorgarPuntos(
                  `¡Cancelaste el préstamo ${p.numero || ""}! Bono por deuda saldada`.trim(),
                  bonoCancelacion,
                  "prestamoCancelado",
                  docRef.id
                );
              }
              await abrirCofre(docRef.id, `Cancelaste el préstamo ${p.numero || ""}`.trim()).catch((err) =>
                console.error("No se pudo abrir el cofre de recompensa:", err)
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("No se pudo verificar/actualizar el estado del préstamo:", err);
  }

  // Si este pago/compra es de una tarjeta, ajusta el saldo correspondiente
  // (en pesos o en USD según lo que se haya elegido en Movimientos), sin
  // bajar de cero.
  try {
    const esPagoTarjeta = category === "Pago de tarjeta" && tarjetaId;
    const esCompraTarjeta = type === "Gasto" && tarjetaId;
    if (esPagoTarjeta || esCompraTarjeta) {
      const tarjetaSnap = await getDoc(doc(db, "tarjetas", tarjetaId));
      if (tarjetaSnap.exists()) {
        const t = tarjetaSnap.data();
        const esUSD = monedaTarjeta === "USD" && t.tieneMonedaSecundaria;
        const campo = esUSD ? "saldoActualUSD" : "saldoActual";
        const saldoPrevio = Number(t[campo]) || 0;
        const nuevoSaldo = esPagoTarjeta
          ? Math.max(saldoPrevio - (Number(amount) || 0), 0)
          : saldoPrevio + (Number(amount) || 0);
        await updateDoc(doc(db, "tarjetas", tarjetaId), { [campo]: nuevoSaldo });
      }
    }
  } catch (err) {
    console.error("No se pudo actualizar el saldo de la tarjeta:", err);
  }

  return docRef;
}

export async function otorgarPuntos(motivo, puntos, tipo, movimientoId = null) {
  // Si hay un multiplicador de puntos activo (premio de un cofre) y no ha
  // expirado, se aplica automáticamente a cualquier otorgamiento positivo de
  // puntos — así el jugador no tiene que hacer nada especial para
  // beneficiarse de él.
  let puntosFinales = puntos;
  let multiplicadorAplicado = null;
  if (puntos > 0) {
    try {
      const recompensasSnap = await getDoc(doc(db, "config", "recompensas"));
      const mult = recompensasSnap.exists() ? recompensasSnap.data().multiplicador : null;
      if (mult?.activo && mult.expiraEn && mult.expiraEn > Date.now()) {
        puntosFinales = Math.round(puntos * (mult.factor || 1));
        multiplicadorAplicado = mult.factor;
      }
    } catch (err) {
      // Si falla la consulta del multiplicador, se otorgan los puntos
      // normales sin bloquear el resto del flujo.
    }
  }

  await addDoc(collection(db, "puntosHistorial"), {
    motivo: multiplicadorAplicado ? `${motivo} (x${multiplicadorAplicado} activo)` : motivo,
    puntos: puntosFinales,
    tipo,
    movimientoId: movimientoId || null,
    fecha: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", "puntos"), { total: increment(puntosFinales) }, { merge: true });
}

const PREMIOS_COFRE = ["puntosExtra", "multiplicador", "protectorRacha", "insignia"];
const INSIGNIAS_POSIBLES = ["Cazador de Deudas", "Libre de Intereses", "Cero Deuda"];

// Abre un cofre de recompensa (premio por cancelar una deuda por completo):
// elige un premio al azar entre 4 tipos, lo aplica, y deja un registro para
// poder mostrar la animación de apertura y notificar. Protegido contra
// abrir dos cofres por el mismo evento (mismo movimientoId).
export async function abrirCofre(movimientoId, contexto) {
  const cofreId = `cofre_${movimientoId}`;
  const ref = doc(db, "cofresGanados", cofreId);
  const snap = await getDoc(ref);
  if (snap.exists()) return null;

  const premio = PREMIOS_COFRE[Math.floor(Math.random() * PREMIOS_COFRE.length)];
  let detalle = {};

  if (premio === "puntosExtra") {
    const monto = 50 + Math.floor(Math.random() * 251); // 50-300
    await otorgarPuntos(`Cofre de recompensa: bono sorpresa (${contexto})`, monto, "cofrePuntos", movimientoId);
    detalle = { monto };
  } else if (premio === "multiplicador") {
    const expiraEn = Date.now() + 48 * 60 * 60 * 1000; // 48 horas
    await setDoc(doc(db, "config", "recompensas"), { multiplicador: { activo: true, factor: 2, expiraEn } }, { merge: true });
    detalle = { factor: 2, expiraEn };
  } else if (premio === "protectorRacha") {
    await setDoc(doc(db, "config", "recompensas"), { protectoresRacha: increment(1) }, { merge: true });
    detalle = { cantidad: 1 };
  } else if (premio === "insignia") {
    const insignia = INSIGNIAS_POSIBLES[Math.floor(Math.random() * INSIGNIAS_POSIBLES.length)];
    await setDoc(doc(db, "config", "recompensas"), { insignias: arrayUnion(insignia) }, { merge: true });
    detalle = { insignia };
  }

  await setDoc(ref, { movimientoId, contexto, premio, detalle, createdAt: serverTimestamp(), visto: false });
  return { premio, detalle };
}

export function watchRecompensas(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "recompensas"),
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (err) => onError && onError(err)
  );
}

export function watchCofresGanados(onChange, onError) {
  return onSnapshot(
    query(collection(db, "cofresGanados"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

export async function marcarCofreVisto(cofreId) {
  await updateDoc(doc(db, "cofresGanados", cofreId), { visto: true });
}

// ---- Salud: datos corporales ----
// Guardados en un solo documento (no hay historial por ahora) — se usan
// como variables para calcular recomendaciones, como cuánta agua tomar.
export function watchDatosCorporales(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "datosCorporales"),
    (snap) => onChange(snap.exists() ? snap.data() : null),
    (err) => onError && onError(err)
  );
}

export async function saveDatosCorporales({ peso, estatura, edad, nivelActividad }) {
  await setDoc(
    doc(db, "config", "datosCorporales"),
    { peso: peso ?? null, estatura: estatura ?? null, edad: edad ?? null, nivelActividad: nivelActividad ?? null, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ---- Habit Tracker ----
// Hábitos definidos libremente por el usuario (ej. "Buena alimentación",
// "Consumo de agua"), con seguimiento diario y puntos por cumplirlos.
const PUNTOS_POR_HABITO = 5;

export function watchHabitos(onChange, onError) {
  return onSnapshot(
    query(collection(db, "habitos"), orderBy("createdAt", "asc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

export async function addHabito(nombre, icono, frecuencia) {
  const nombreTrim = (nombre || "").trim();
  if (!nombreTrim) throw new Error("Ponle un nombre al hábito");
  await addDoc(collection(db, "habitos"), {
    nombre: nombreTrim,
    icono: icono || "check",
    frecuencia: frecuencia || "Diario",
    activo: true,
    createdAt: serverTimestamp(),
  });
}

export async function deleteHabito(id) {
  await deleteDoc(doc(db, "habitos", id));
}

export async function updateHabito(id, fields) {
  await updateDoc(doc(db, "habitos", id), fields);
}

// Guarda el nuevo orden de los hábitos (arrastrar y soltar en la lista).
// habitosEnOrden es un array de IDs en el orden deseado, de arriba a abajo.
export async function reordenarHabitos(habitosEnOrden) {
  await Promise.all(habitosEnOrden.map((id, index) => updateDoc(doc(db, "habitos", id), { orden: index })));
}

const PENALIZACION_RACHA_ROTA = 2;

// Si un hábito rompió una racha de al menos 3 periodos (día/semana/mes,
// según su frecuencia), resta 2 puntos y deja un registro para poder
// notificarlo — protegido contra evaluar el mismo hueco dos veces con un
// documento por (habitoId + periodoFaltante).
export async function evaluarPenalizacionHabito(habitoId, periodoFaltante, rachaPrevia, habitoNombre) {
  const evalId = `${habitoId}_${periodoFaltante}`;
  const ref = doc(db, "habitosPenalizaciones", evalId);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  // Si hay un protector de racha disponible (premio de un cofre), se
  // consume automáticamente en vez de aplicar la penalización — se deja un
  // registro igual, pero sin restar puntos, para que quede visible que la
  // racha quedó protegida.
  const recompensasSnap = await getDoc(doc(db, "config", "recompensas"));
  const protectoresDisponibles = recompensasSnap.exists() ? recompensasSnap.data().protectoresRacha || 0 : 0;

  if (protectoresDisponibles > 0) {
    await setDoc(doc(db, "config", "recompensas"), { protectoresRacha: increment(-1) }, { merge: true });
    await setDoc(ref, {
      habitoId,
      habitoNombre,
      periodoFaltante,
      rachaPrevia,
      puntos: 0,
      protegida: true,
      createdAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(ref, {
    habitoId,
    habitoNombre,
    periodoFaltante,
    rachaPrevia,
    puntos: -PENALIZACION_RACHA_ROTA,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "puntosHistorial"), {
    motivo: `Se rompió tu racha de "${habitoNombre}" (llevabas ${rachaPrevia})`,
    puntos: -PENALIZACION_RACHA_ROTA,
    tipo: "habitoRoto",
    fecha: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", "puntos"), { total: increment(-PENALIZACION_RACHA_ROTA) }, { merge: true });
}

export function watchHabitosPenalizaciones(onChange, onError) {
  return onSnapshot(
    query(collection(db, "habitosPenalizaciones"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// Versículo diario — se elige uno al azar la primera vez que se abre la app
// cada día, y se guarda (un documento por fecha) para que sea el mismo todo
// el día, sin importar cuántas veces recargues.
export async function evaluarVersiculoDiario(fechaStr, obtenerVersiculo) {
  const ref = doc(db, "versiculoDiario", fechaStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  const v = await obtenerVersiculo();
  await setDoc(ref, { fecha: fechaStr, referencia: v.referencia, texto: v.texto, fuente: v.fuente || "local", createdAt: serverTimestamp() });
}

export function watchVersiculoHoy(fechaStr, onChange, onError) {
  return onSnapshot(
    doc(db, "versiculoDiario", fechaStr),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => onError && onError(err)
  );
}

export function watchHabitosRegistro(onChange, onError) {
  return onSnapshot(
    collection(db, "habitosRegistro"),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// Marca o desmarca un hábito para una fecha específica. Al marcarlo, otorga
// puntos fijos; al desmarcarlo, revierte esos mismos puntos (protegido
// contra doble-otorgamiento usando el ID del registro como llave del
// documento).
export async function toggleHabitoRegistro(habitoId, fecha, habitoNombre) {
  const regId = `${habitoId}_${fecha}`;
  const ref = doc(db, "habitosRegistro", regId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await deleteDoc(ref);
    const puntosSnap = await getDocs(query(collection(db, "puntosHistorial"), where("habitoRegistroId", "==", regId)));
    for (const d of puntosSnap.docs) {
      const puntos = Number(d.data().puntos) || 0;
      await setDoc(doc(db, "config", "puntos"), { total: increment(-puntos) }, { merge: true });
      await deleteDoc(d.ref);
    }
  } else {
    await setDoc(ref, { habitoId, fecha, createdAt: serverTimestamp() });
    await addDoc(collection(db, "puntosHistorial"), {
      motivo: `Hábito cumplido: ${habitoNombre}`,
      puntos: PUNTOS_POR_HABITO,
      tipo: "habito",
      fecha,
      habitoRegistroId: regId,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "config", "puntos"), { total: increment(PUNTOS_POR_HABITO) }, { merge: true });
  }
}

// Evalúa si una quincena YA CERRADA cumplió el presupuesto (gastado <=
// presupuestado). Se protege contra evaluar la misma quincena dos veces
// usando un documento por periodo en "presupuestoCumplimiento". Otorga el 5%
// de lo presupuestado como puntos si cumplió (mismo criterio que el resto del
// sistema de puntos).
export async function evaluarCumplimientoQuincena(periodoKey, presupuestado, gastado) {
  if (!presupuestado || presupuestado <= 0) return;
  const ref = doc(db, "presupuestoCumplimiento", periodoKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // ya evaluada antes, no repetir

  const cumplio = gastado <= presupuestado;
  await setDoc(ref, {
    evaluado: true,
    cumplio,
    presupuestado,
    gastado,
    evaluadoEn: serverTimestamp(),
  });

  if (cumplio) {
    const puntos = Math.round(presupuestado * 0.05);
    if (puntos > 0) {
      await otorgarPuntos(`Cumpliste el presupuesto de la quincena (${periodoKey})`, puntos, "cumplimientoPresupuesto");
    }
  }
}

// Detecta si sobró una cantidad significativa de dinero en una quincena ya
// cerrada (presupuestado - gastado), después de cumplir las obligaciones. Si
// el excedente supera el umbral, guarda una sugerencia genérica para que se
// muestre como notificación. No recomienda instrumentos específicos, solo
// categorías generales (fondo de emergencia, ahorro, inversión).
export async function evaluarExcedenteQuincena(periodoKey, presupuestado, gastado) {
  if (!presupuestado || presupuestado <= 0) return;
  const ref = doc(db, "sugerenciasInversion", periodoKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // ya evaluada antes, no repetir

  const excedente = Math.round((presupuestado - gastado) * 100) / 100;
  const umbral = Math.max(1000, presupuestado * 0.1);

  await setDoc(ref, {
    evaluado: true,
    excedente,
    superaUmbral: excedente >= umbral,
    presupuestado,
    gastado,
    evaluadoEn: serverTimestamp(),
  });
}

export function watchSugerenciasInversion(onChange, onError) {
  return onSnapshot(
    query(collection(db, "sugerenciasInversion"), orderBy("evaluadoEn", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
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
export function watchCategoriasPuntosConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "categoriasPuntos"),
    (snap) => onChange(snap.exists() ? snap.data().nombres || [] : []),
    (err) => onError && onError(err)
  );
}

export async function saveCategoriasPuntosConfig(nombres) {
  await setDoc(doc(db, "config", "categoriasPuntos"), { nombres: nombres || [] });
}

export function watchTopesAjusteConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "topesAjusteAutomatico"),
    (snap) => onChange(snap.exists() ? snap.data().topes || {} : {}),
    (err) => onError && onError(err)
  );
}

export async function saveTopeAjuste(categoria, monto) {
  const montoNum = monto === null || monto === "" ? null : Number(monto);
  if (montoNum === null || !Number.isFinite(montoNum) || montoNum <= 0) {
    await updateDoc(doc(db, "config", "topesAjusteAutomatico"), { [`topes.${categoria}`]: deleteField() }).catch(async () => {
      // El doc puede no existir aún; en ese caso no hay nada que borrar.
    });
    return;
  }
  await setDoc(doc(db, "config", "topesAjusteAutomatico"), { topes: { [categoria]: montoNum } }, { merge: true });
}

export function watchAjustesPresupuestoHistorial(onChange, onError) {
  return onSnapshot(
    query(collection(db, "ajustesPresupuestoHistorial"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// Revisa, para una quincena YA CERRADA, cada categoría con un tope
// configurado que se haya excedido, y ajusta automáticamente el presupuesto
// de la PRÓXIMA quincena a lo que realmente se gastó (sin pasar del tope).
// Protegido contra doble-ejecución con un documento por periodo, igual que la
// evaluación de cumplimiento general.
export async function evaluarAjustesPresupuesto(periodoKey, gastoPorCategoria, presupuestoPorCategoria, topes, destino) {
  const ref = doc(db, "presupuestoAjustesEvaluados", periodoKey);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, { evaluado: true, evaluadoEn: serverTimestamp() });

  for (const categoria of Object.keys(topes || {})) {
    const tope = Number(topes[categoria]);
    if (!Number.isFinite(tope) || tope <= 0) continue;
    const gastado = Number(gastoPorCategoria[categoria]) || 0;
    const presupuestado = Number(presupuestoPorCategoria[categoria]) || 0;
    if (gastado <= presupuestado) continue; // no se excedió, nada que ajustar

    const nuevoMonto = Math.min(Math.round(gastado), tope);

    const presupuestoSnap = await getDoc(doc(db, "presupuestos", String(destino.year)));
    const valorActualDestino = presupuestoSnap.exists()
      ? presupuestoSnap.data()?.[categoria]?.[String(destino.month)]?.[destino.quincena] || 0
      : 0;
    if (nuevoMonto <= valorActualDestino) continue; // no bajamos un presupuesto ya mayor

    await setDoc(
      doc(db, "presupuestos", String(destino.year)),
      { [categoria]: { [String(destino.month)]: { [destino.quincena]: nuevoMonto } } },
      { merge: true }
    );

    await addDoc(collection(db, "ajustesPresupuestoHistorial"), {
      categoria,
      periodoOrigen: periodoKey,
      montoAnterior: valorActualDestino,
      montoNuevo: nuevoMonto,
      gastado,
      tope,
      createdAt: serverTimestamp(),
    });
  }
}

// Si una tarjeta con TAE configurada no fue saldada dentro de su plazo de
// gracia (días desde el corte), suma automáticamente al saldo actual el
// interés mensual (TAE/12) sobre el saldo, más la mora configurada (si hay).
// Protegido contra doble-aplicación con un documento por ciclo (tarjeta +
// mes de corte).
export async function evaluarInteresYMoraTarjeta(tarjetaId, cicloKey, saldoActual, tasaTAE, montoMora) {
  const ref = doc(db, "tarjetaCiclosEvaluados", `${tarjetaId}_${cicloKey}`);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, { evaluado: true, evaluadoEn: serverTimestamp() });

  if (!saldoActual || saldoActual <= 0) return; // nada pendiente, no genera cargos

  const tasaMensual = (Number(tasaTAE) || 0) / 100 / 12;
  const interes = Math.round(saldoActual * tasaMensual * 100) / 100;
  const mora = Number(montoMora) || 0;
  if (interes <= 0 && mora <= 0) return;

  const nuevoSaldo = saldoActual + interes + mora;

  await updateDoc(doc(db, "tarjetas", tarjetaId), { saldoActual: nuevoSaldo });

  await addDoc(collection(db, "tarjetaCargosHistorial"), {
    tarjetaId,
    cicloKey,
    interes,
    mora,
    saldoAnterior: saldoActual,
    saldoNuevo: nuevoSaldo,
    createdAt: serverTimestamp(),
  });
}

// Días de cobro configurables (por defecto 15 y 30), usados por la nueva
// función de clasificación de quincena en lib/quincenaConfig.js.
export function watchDiasCobroConfig(onChange, onError) {
  return onSnapshot(
    doc(db, "config", "diasCobro"),
    (snap) => onChange(snap.exists() && snap.data().dias?.length ? snap.data().dias : [15, 30]),
    (err) => onError && onError(err)
  );
}

export async function saveDiasCobroConfig(dias) {
  const limpio = [...new Set((dias || []).map((d) => parseInt(d, 10)).filter((d) => Number.isFinite(d) && d >= 1 && d <= 31))].sort((a, b) => a - b);
  if (limpio.length === 0) throw new Error("Debes tener al menos un día de cobro válido (1-31)");
  await setDoc(doc(db, "config", "diasCobro"), { dias: limpio });
}

export function watchTarjetaCargosHistorial(onChange, onError) {
  return onSnapshot(
    query(collection(db, "tarjetaCargosHistorial"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

export async function canjearPuntos({ montoACanjear, year, month, quincena, categoria, topeCategoria, ingresoQuincenalFijo }) {
  const monto = Math.round(Number(montoACanjear) || 0);
  if (monto <= 0) throw new Error("El monto a canjear debe ser mayor a cero");

  const categoriasPuntosSnap = await getDoc(doc(db, "config", "categoriasPuntos"));
  const categoriasQueGeneranPuntos = categoriasPuntosSnap.exists() ? categoriasPuntosSnap.data().nombres || [] : [];
  if (categoriasQueGeneranPuntos.includes(categoria)) {
    throw new Error("No puedes canjear puntos hacia una categoría que también los genera");
  }

  const puntosSnap = await getDoc(doc(db, "config", "puntos"));
  const puntosDisponibles = puntosSnap.exists() ? puntosSnap.data().total || 0 : 0;
  if (monto > puntosDisponibles) throw new Error("No tienes suficientes puntos para ese canje");

  const presupuestoSnap = await getDoc(doc(db, "presupuestos", String(year)));
  const valorActual = presupuestoSnap.exists() ? presupuestoSnap.data()?.[categoria]?.[String(month)]?.[quincena] || 0 : 0;
  const nuevoValor = valorActual + monto;

  // No permitir que el canje haga que la categoría supere su tope
  // configurado en Configuración → "Tope de ajuste automático de
  // presupuesto" (el mismo usado para los ajustes automáticos por exceso).
  if (topeCategoria != null && Number.isFinite(topeCategoria) && topeCategoria > 0 && nuevoValor > topeCategoria) {
    throw new Error(`Ese canje haría que "${categoria}" supere su tope configurado (${formatMoneyErr(topeCategoria)})`);
  }

  // No permitir canjear, en total hacia esta misma quincena, más de lo que
  // realmente vas a percibir de ingreso fijo esa quincena (sin descontar
  // impuestos ni deducciones) — evita desbloquear más gasto del que tu
  // ingreso real puede sostener, sin importar cuántos puntos tengas.
  const destinoPeriodoKey = `${year}-${month}-${quincena}`;
  if (ingresoQuincenalFijo != null && Number.isFinite(ingresoQuincenalFijo) && ingresoQuincenalFijo > 0) {
    const canjesPreviosSnap = await getDocs(
      query(collection(db, "puntosHistorial"), where("destinoPeriodoKey", "==", destinoPeriodoKey))
    );
    const totalYaCanjeadoDestino = canjesPreviosSnap.docs.reduce((s, d) => s + Math.abs(Number(d.data().puntos) || 0), 0);
    if (totalYaCanjeadoDestino + monto > ingresoQuincenalFijo) {
      const disponible = Math.max(ingresoQuincenalFijo - totalYaCanjeadoDestino, 0);
      throw new Error(`No puedes canjear más de tu ingreso fijo de esa quincena. Disponible: ${formatMoneyErr(disponible)}`);
    }
  }

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
    destinoPeriodoKey,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "config", "puntos"), { total: increment(-monto) }, { merge: true });
}

function formatMoneyErr(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Calcula, a partir de una fecha de inicio, la lista de quincenas
// consecutivas (year, month, quincena) donde caerá cada cuota.
function calcularQuincenasConsecutivas(fechaInicio, cantidad) {
  const [y, m, d] = fechaInicio.split("-").map(Number);
  let year = y;
  let month = m;
  let quincena = d > 15 ? "Q2" : "Q1";
  const lista = [];
  for (let i = 0; i < cantidad; i++) {
    lista.push({ year, month, quincena });
    if (quincena === "Q1") {
      quincena = "Q2";
    } else {
      quincena = "Q1";
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  return lista;
}

// Registra una compra prorateada: divide el monto total en N cuotas iguales
// (la última absorbe el redondeo) y suma cada cuota al presupuesto de la
// categoría indicada, en quincenas consecutivas a partir de la fecha de
// compra. Todo en una sola operación, para que quede reflejado de inmediato.
export async function addCompraProrateada({ nombre, montoTotal, cuotas, categoria, fechaInicio }) {
  const total = Math.round((Number(montoTotal) || 0) * 100) / 100;
  const numCuotas = Math.max(1, parseInt(cuotas, 10) || 1);
  if (total <= 0) throw new Error("El monto total debe ser mayor a cero");

  const montoCuotaBase = Math.round((total / numCuotas) * 100) / 100;
  const quincenas = calcularQuincenasConsecutivas(fechaInicio, numCuotas);

  const cuotasDetalle = quincenas.map((q, i) => {
    const esUltima = i === numCuotas - 1;
    const montoAcumuladoPrevio = montoCuotaBase * i;
    const monto = esUltima ? Math.round((total - montoAcumuladoPrevio) * 100) / 100 : montoCuotaBase;
    return { ...q, monto };
  });

  // Suma cada cuota al presupuesto de su quincena correspondiente, agrupando
  // las escrituras por año para minimizar operaciones.
  const porAño = {};
  for (const c of cuotasDetalle) {
    if (!porAño[c.year]) porAño[c.year] = [];
    porAño[c.year].push(c);
  }
  for (const [year, lista] of Object.entries(porAño)) {
    const presupuestoSnap = await getDoc(doc(db, "presupuestos", year));
    const data = presupuestoSnap.exists() ? presupuestoSnap.data() : {};
    const merge = {};
    for (const c of lista) {
      const valorActual = data?.[categoria]?.[String(c.month)]?.[c.quincena] || 0;
      if (!merge[categoria]) merge[categoria] = {};
      if (!merge[categoria][String(c.month)]) merge[categoria][String(c.month)] = {};
      merge[categoria][String(c.month)][c.quincena] = valorActual + c.monto;
    }
    await setDoc(doc(db, "presupuestos", year), merge, { merge: true });
  }

  await addDoc(collection(db, "comprasProrateadas"), {
    nombre: nombre || "Compra prorateada",
    montoTotal: total,
    cuotas: numCuotas,
    montoCuota: montoCuotaBase,
    categoria,
    fechaInicio,
    cuotasDetalle,
    createdAt: serverTimestamp(),
  });
}

export function watchComprasProrateadas(onChange, onError) {
  return onSnapshot(
    query(collection(db, "comprasProrateadas"), orderBy("createdAt", "desc")),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError && onError(err)
  );
}

// Elimina una compra prorateada y revierte los montos que había sumado al
// presupuesto de cada quincena afectada.
export async function deleteCompraProrateada(id, compra) {
  const porAño = {};
  for (const c of compra.cuotasDetalle || []) {
    if (!porAño[c.year]) porAño[c.year] = [];
    porAño[c.year].push(c);
  }
  for (const [year, lista] of Object.entries(porAño)) {
    const presupuestoSnap = await getDoc(doc(db, "presupuestos", year));
    if (!presupuestoSnap.exists()) continue;
    const data = presupuestoSnap.data();
    const merge = {};
    for (const c of lista) {
      const valorActual = data?.[compra.categoria]?.[String(c.month)]?.[c.quincena] || 0;
      const nuevoValor = Math.max(valorActual - c.monto, 0);
      if (!merge[compra.categoria]) merge[compra.categoria] = {};
      if (!merge[compra.categoria][String(c.month)]) merge[compra.categoria][String(c.month)] = {};
      merge[compra.categoria][String(c.month)][c.quincena] = nuevoValor;
    }
    await setDoc(doc(db, "presupuestos", year), merge, { merge: true });
  }
  await deleteDoc(doc(db, "comprasProrateadas", id));
}

// Cambia la fecha de un movimiento, exigiendo un motivo de justificación.
// Guarda un historial de cambios (no sobreescribe el motivo anterior).
export async function updateMovimientoFecha(id, nuevaFecha, motivo, fechaAnterior) {
  const motivoLimpio = (motivo || "").trim();
  if (!motivoLimpio) throw new Error("Debes justificar el cambio de fecha");
  await updateDoc(doc(db, "movimientos", id), {
    date: nuevaFecha,
    historialCambiosFecha: arrayUnion({
      fechaAnterior: fechaAnterior || null,
      fechaNueva: nuevaFecha,
      motivo: motivoLimpio,
      cambiadoEn: new Date().toISOString(),
    }),
  });
}

// Marca una lista de consumos de tarjeta (movimientos de tipo Gasto con
// tarjeta) como pagados, vinculándolos al pago que los saldó — se usa al
// registrar un "Pago de tarjeta" y elegir cuáles consumos pendientes cubre.
export async function marcarConsumosComoPagados(movimientoIds, pagoId) {
  await Promise.all(
    movimientoIds.map((id) => updateDoc(doc(db, "movimientos", id), { pagado: true, pagoTarjetaId: pagoId || null }))
  );
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

// Mueve la cuota que naturalmente cae en (origenMonth, origenYear) hacia
// cualquier otra quincena/mes/año destino (incluso cruzando de mes), sin
// cambiar la configuración general del préstamo.
export async function setPrestamoQuincenaOverride(id, origenYear, origenMonth, destino) {
  await updateDoc(doc(db, "prestamos", id), {
    [`quincenaOverrides.${origenMonth}-${origenYear}`]: destino,
  });
}

export async function quitarPrestamoQuincenaOverride(id, origenYear, origenMonth) {
  await updateDoc(doc(db, "prestamos", id), {
    [`quincenaOverrides.${origenMonth}-${origenYear}`]: deleteField(),
  });
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

const ingresosPuntualesCol = collection(db, "ingresosPuntuales");

export function watchIngresosPuntuales(onChange, onError) {
  return onSnapshot(
    ingresosPuntualesCol,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
      onChange(docs);
    },
    (err) => onError && onError(err)
  );
}

export async function addIngresoPuntual({ fuenteIngresoId, fuenteIngresoNombre, tipo, monto, fecha, notas }) {
  await addDoc(ingresosPuntualesCol, {
    fuenteIngresoId,
    fuenteIngresoNombre: fuenteIngresoNombre || "",
    tipo,
    monto: monto ?? null,
    fecha: fecha || null,
    notas: notas || "",
    recibido: false,
    createdAt: serverTimestamp(),
  });
}

export async function deleteIngresoPuntual(id) {
  await deleteDoc(doc(db, "ingresosPuntuales", id));
}

// Marca un ingreso puntual como recibido y registra el movimiento
// correspondiente. No debe poder revertirse una vez recibido.
export async function marcarIngresoPuntualRecibido(id, ingreso) {
  await addMovimiento({
    type: "Ingreso",
    category: ingreso.tipo,
    amount: ingreso.monto,
    description: `${ingreso.tipo} — ${ingreso.fuenteIngresoNombre}`,
    date: ingreso.fecha || new Date().toISOString().slice(0, 10),
    fuenteIngresoId: ingreso.fuenteIngresoId,
    fuenteIngresoNombre: ingreso.fuenteIngresoNombre,
  });
  await updateDoc(doc(db, "ingresosPuntuales", id), { recibido: true });
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

export async function saveFlujo(nodes, edges, viewport) {
  await setDoc(doc(db, "flujo", "diagrama"), { nodes, edges, viewport: viewport || null, updatedAt: serverTimestamp() });
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

// Trae TODOS los períodos del checklist a la vez (usado para calcular la
// racha de quincenas cumplidas). La colección es pequeña (una quincena a la
// vez), así que traerla completa es económico.
export function watchChecklistTodos(onChange, onError) {
  return onSnapshot(
    collection(db, "checklistPagos"),
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      onChange(map);
    },
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
