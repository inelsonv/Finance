import React, { useRef, useState, useMemo, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Camera, Check, X, Loader2, AlertTriangle, Receipt } from "lucide-react";
import { addProduct, addMovimiento, updateProductPrice, registrarCompraProducto, updateOrdenCompra, escanearFactura } from "../lib/db";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];

// Palabras que indican que la línea NO es un producto (totales, impuestos, encabezados típicos
// de facturas dominicanas/latinoamericanas).
const PALABRAS_IGNORAR = [
  "total", "subtotal", "itbis", "iva", "impuesto", "cambio", "efectivo", "tarjeta",
  "rnc", "ncf", "fecha", "hora", "cajero", "caja", "gracias", "factura", "recibo",
  "cliente", "direccion", "telefono", "articulos", "cantidad de items", "descuento",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("No se pudo preparar la imagen."));
    reader.readAsDataURL(blob);
  });
}

// Heurística simple: busca un precio (número con 2 decimales, opcionalmente con separador
// de miles) al final de la línea, y toma el resto como nombre del producto.
function parsearLineas(textoCrudo) {
  const lineas = textoCrudo.split("\n").map((l) => l.trim()).filter(Boolean);
  const precioRegex = /(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*$/;
  const resultados = [];

  for (const linea of lineas) {
    const lower = linea.toLowerCase();
    if (PALABRAS_IGNORAR.some((p) => lower.includes(p))) continue;
    if (linea.length < 3) continue;

    const match = linea.match(precioRegex);
    if (!match) continue;

    let precioTexto = match[1].replace(/\./g, "").replace(",", ".");
    // si el separador decimal ya era punto (ej. 123.45 sin miles), lo anterior lo rompe;
    // corregimos detectando cuál era el formato original
    if (match[1].includes(",") && match[1].lastIndexOf(",") > match[1].lastIndexOf(".")) {
      precioTexto = match[1].replace(/\./g, "").replace(",", ".");
    } else {
      precioTexto = match[1].replace(/,/g, "");
    }
    const precio = parseFloat(precioTexto);
    if (!Number.isFinite(precio) || precio <= 0 || precio > 100000) continue;

    let nombre = linea.slice(0, match.index).trim();
    nombre = nombre.replace(/^\d+\s*[xX]?\s*/, "").replace(/[-·.]+$/, "").trim();
    if (nombre.length < 2) continue;

    resultados.push({ nombre, precio });
  }
  return resultados;
}

export default function EscanearFactura({ products, ordenesCompra = [], onNavigate }) {
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ordenSeleccionadaId, setOrdenSeleccionadaId] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [gastoCategoria, setGastoCategoria] = useState("Alimentos");
  const [fecha, setFecha] = useState(todayStr());
  const [tienda, setTienda] = useState("");
  const [totalFactura, setTotalFactura] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");

  const productosPorNombre = (nombre) =>
    products.find((p) => p.name.trim().toLowerCase() === nombre.trim().toLowerCase());

  // Las fotos de cámara moderna suelen venir en resoluciones muy altas
  // (12MP+), lo cual hace que el OCR tarde muchísimo más de lo necesario
  // sin ninguna mejora real en la lectura del texto. Se reduce la imagen a
  // un ancho máximo razonable antes de pasarla al OCR — acelera el
  // procesamiento drásticamente sin perder legibilidad del texto.
  const redimensionarImagen = (file, maxWidth = 1600) =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }
        const escala = maxWidth / img.width;
        const canvas = document.createElement("canvas");
        canvas.width = maxWidth;
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });

  const handleFile = async (file) => {
    if (!file) return;
    setScanError(null);
    setItems([]);
    setSavedOk(false);
    setImagePreview(URL.createObjectURL(file));
    setScanning(true);
    setScanProgress(0);
    try {
      const imagenParaLeer = await redimensionarImagen(file);
      let encontrados = [];
      let datosFactura = null;
      try {
        const imageBase64 = await blobABase64(imagenParaLeer);
        datosFactura = await escanearFactura(imageBase64, imagenParaLeer.type || file.type || "image/jpeg");
        encontrados = (datosFactura.items || []).map((it) => {
          const cantidad = Number(it.cantidad) > 0 ? Number(it.cantidad) : 1;
          const precio = Number(it.precioUnitario) > 0
            ? Number(it.precioUnitario)
            : Number(it.totalLinea) > 0 ? Number(it.totalLinea) / cantidad : 0;
          return { nombre: it.nombre, precio, cantidad };
        }).filter((it) => it.nombre && it.precio > 0);
        if (datosFactura.tienda) setTienda(datosFactura.tienda);
        if (datosFactura.fecha) setFecha(datosFactura.fecha);
        setTotalFactura(datosFactura.total != null ? String(datosFactura.total) : "");
      } catch {
        // Conserva el registro básico si la función de visión aún no está desplegada.
        const worker = await createWorker("spa", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") setScanProgress(Math.round((m.progress || 0) * 100));
          },
        });
        const { data } = await worker.recognize(imagenParaLeer);
        await worker.terminate();
        encontrados = parsearLineas(data.text || "").map((it) => ({ ...it, cantidad: 1 }));
        setTotalFactura("");
        if (encontrados.length) {
          setScanError("No se pudo usar la lectura inteligente; se aplicó OCR básico. Revisa con cuidado cada producto y el total.");
        }
      }
      const itemsConEstado = encontrados.map((it) => {
        const itemOrden = itemDeOrdenPorNombre(it.nombre);
        const existente = itemOrden
          ? { id: itemOrden.productId, name: itemOrden.productName, price: itemOrden.precioUnitario }
          : productosPorNombre(it.nombre);
        return {
          nombre: it.nombre,
          precio: it.precio,
          cantidad: it.cantidad || 1,
          incluir: true,
          esNuevo: !existente,
          productoExistente: existente || null,
          deOrden: !!itemOrden,
        };
      });
      setItems(itemsConEstado);
      if (itemsConEstado.length === 0) {
        setScanError(Number(datosFactura?.total) > 0
          ? "No se detectaron productos. Puedes guardar el gasto por el total de la factura o añadir productos manualmente para el catálogo."
          : "No se detectaron líneas con precio reconocible. Agrega productos manualmente o intenta con una foto más nítida y bien iluminada.");
      }
    } catch (err) {
      setScanError(err.message || String(err));
    } finally {
      setScanning(false);
    }
  };

  const actualizarItem = (idx, cambios) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));
  };

  const eliminarItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const agregarLineaVacia = () => {
    setItems((prev) => [...prev, { nombre: "", precio: "", cantidad: 1, incluir: true, esNuevo: true, productoExistente: null }]);
  };

  const ordenesEnCurso = useMemo(
    () => (ordenesCompra || []).filter((o) => o.estado === "Compra presencial" || o.estado === "Enviada a proveedor"),
    [ordenesCompra]
  );
  const ordenActual = ordenesEnCurso.find((o) => o.id === ordenSeleccionadaId) || null;

  // Al elegir una orden de compra como referencia, la tienda se llena por
  // defecto con la entidad/proveedor de esa orden — el usuario igual puede
  // editarla si el proveedor real fue otro.
  useEffect(() => {
    if (ordenActual?.proveedorNombre) setTienda(ordenActual.proveedorNombre);
  }, [ordenSeleccionadaId]);

  // Busca, dentro de los items de la orden seleccionada, uno cuyo nombre se
  // parezca al renglón leído por el OCR — coincidencia simple por texto
  // contenido en ambos sentidos (ej. "Coca Cola 2L" con "Coca Cola").
  const itemDeOrdenPorNombre = (nombre) => {
    if (!ordenActual) return null;
    const nombreNorm = nombre.trim().toLowerCase();
    return (
      ordenActual.items || []
    ).find((it) => {
      const itNombre = (it.productName || "").trim().toLowerCase();
      return itNombre && (nombreNorm.includes(itNombre) || itNombre.includes(nombreNorm));
    });
  };

  const totalCalculado = items.filter((it) => it.incluir).reduce((s, it) => s + (parseFloat(it.precio) || 0) * (parseFloat(it.cantidad) || 1), 0);
  const totalARegistrar = Number(totalFactura) > 0 ? Number(totalFactura) : totalCalculado;

  const confirmarGuardado = async () => {
    setSaving(true);
    try {
      const itemsOrdenActualizados = ordenActual ? [...(ordenActual.items || [])] : null;

      for (const it of items) {
        if (!it.incluir || !it.nombre.trim()) continue;
        const precio = parseFloat(it.precio) || 0;
        const cantidad = parseFloat(it.cantidad) || 1;
        let productId = it.productoExistente?.id || null;
        if (it.esNuevo) {
          const docRef = await addProduct({ name: it.nombre.trim(), category: gastoCategoria, unit: "unidad", price: precio });
          productId = docRef.id;
        } else if (it.productoExistente && precio > 0 && precio !== it.productoExistente.price && !it.deOrden) {
          await updateProductPrice(it.productoExistente.id, precio);
        }
        if (productId) {
          await registrarCompraProducto({ productId, productName: it.nombre.trim(), fecha, cantidad });
        }

        // Si este renglón coincidió con un item de la orden de compra
        // seleccionada, márcalo como comprado y actualiza su precio real
        // (el que muestra la factura, que puede diferir del estimado).
        if (it.deOrden && itemsOrdenActualizados) {
          const idx = itemsOrdenActualizados.findIndex((oi) => oi.productName === it.productoExistente?.name);
          if (idx !== -1) {
            itemsOrdenActualizados[idx] = { ...itemsOrdenActualizados[idx], comprado: true, precioUnitario: precio || itemsOrdenActualizados[idx].precioUnitario };
          }
        }
      }

      const nombreTienda = tienda.trim() ? ` en ${tienda.trim()}` : "";
      await addMovimiento({
        type: "Gasto",
        category: gastoCategoria,
        amount: totalARegistrar,
        description: `Compra${nombreTienda} (factura escaneada)`,
        date: fecha,
        clasificacion: "Variable",
        metodoPago,
      });

      if (ordenActual && itemsOrdenActualizados) {
        // Al registrar la compra a través de la factura escaneada, la orden
        // se marca como Completada directamente — sin importar si TODOS
        // los productos originales de la lista coincidieron o no (puede que
        // algunos no se hayan comprado finalmente, o que el OCR no los
        // haya detectado, pero la orden ya se dio por concluida).
        await updateOrdenCompra(ordenActual.id, {
          items: itemsOrdenActualizados,
          estado: "Completada",
        });
      }

      setSavedOk(true);
    } catch (err) {
      setScanError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const reiniciar = () => {
    setImagePreview(null);
    setItems([]);
    setScanError(null);
    setSavedOk(false);
    setTienda("");
    setFecha(todayStr());
    setTotalFactura("");
    setMetodoPago("Efectivo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mostrandoRevision = (items.length > 0 || (imagePreview && !scanning)) && !savedOk;

  return (
    <div>
      {ordenesEnCurso.length > 0 && !imagePreview && !scanning && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 5 }}>
            ¿Esta factura corresponde a una orden de compra en curso? (opcional)
          </div>
          <select
            value={ordenSeleccionadaId}
            onChange={(e) => setOrdenSeleccionadaId(e.target.value)}
            style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
          >
            <option value="">Ninguna — registrar como compra suelta</option>
            {ordenesEnCurso.map((o) => (
              <option key={o.id} value={o.id}>
                {o.proveedorNombre || "Sin proveedor"} · {(o.items || []).length} producto{(o.items || []).length !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
          {ordenActual && (
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
              Los renglones que coincidan con esta orden se marcarán como comprados y su precio se actualizará al de la factura.
            </div>
          )}
        </div>
      )}

      {!imagePreview && !scanning && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12 }}>
          <Receipt size={32} style={{ color: "var(--ink-soft)", marginBottom: 10 }} />
          <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>Registrar compra desde una factura</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
            Toma una foto o sube la factura. La imagen se procesa con la IA de la app para leer tienda, fecha,
            productos y total; revisa y corrige los datos antes de guardarlos.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 500,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Camera size={15} /> Tomar o subir foto
          </button>
        </div>
      )}

      {imagePreview && (
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
          <img src={imagePreview} alt="Factura" style={{ maxWidth: 220, maxHeight: 260, borderRadius: 10, border: "1px solid var(--line)", objectFit: "contain" }} />
        </div>
      )}

      {scanning && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "1.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          <Loader2 size={22} style={{ animation: "despensa-spin 1s linear infinite" }} />
          Analizando la factura… {scanProgress > 0 ? `OCR de respaldo ${scanProgress}%` : ""}
          <style>{`@keyframes despensa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {scanError && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--stamp)", background: "var(--stamp-bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {scanError}
        </div>
      )}

      {mostrandoRevision && (
        <div>
          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <input
              placeholder="Tienda (opcional)"
              value={tienda}
              onChange={(e) => setTienda(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
            />
          </div>

          <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--ink-soft)" }}>
              Total de la factura
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={formatMoney(totalCalculado)}
                value={totalFactura}
                onChange={(e) => setTotalFactura(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, color: "var(--ink-soft)" }}>
              Método de pago
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                <option>Efectivo</option>
                <option>Tarjeta de crédito</option>
                <option>Transferencia</option>
                <option>Otro</option>
              </select>
            </label>
          </div>

          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Categoría del gasto:</span>
            <select
              value={gastoCategoria}
              onChange={(e) => setGastoCategoria(e.target.value)}
              style={{ padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--card)" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--card)",
                  border: `1px solid ${it.incluir ? "var(--line)" : "var(--line-soft)"}`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  opacity: it.incluir ? 1 : 0.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={it.incluir}
                  onChange={(e) => actualizarItem(idx, { incluir: e.target.checked })}
                  style={{ flexShrink: 0 }}
                />
                <input
                  placeholder="Nombre del producto"
                  value={it.nombre}
                  onChange={(e) => actualizarItem(idx, { nombre: e.target.value })}
                  style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                />
                <input
                  className="despensa-mono"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Cant."
                  value={it.cantidad ?? 1}
                  onChange={(e) => actualizarItem(idx, { cantidad: e.target.value })}
                  style={{ width: 58, padding: "6px 6px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                />
                <input
                  className="despensa-mono"
                  type="number"
                  step="0.01"
                  placeholder="Precio unit."
                  value={it.precio}
                  onChange={(e) => actualizarItem(idx, { precio: e.target.value })}
                  style={{ width: 88, padding: "6px 7px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                />
                <span className="despensa-mono" style={{ minWidth: 68, textAlign: "right", fontSize: 11.5, color: "var(--ink-soft)" }}>
                  {formatMoney((parseFloat(it.precio) || 0) * (parseFloat(it.cantidad) || 1))}
                </span>
                <span
                  className="despensa-tab-font"
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: it.esNuevo ? "var(--sage-bg)" : "var(--line-soft)",
                    color: it.esNuevo ? "var(--sage)" : "var(--ink-soft)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {it.esNuevo ? "Nuevo" : "Ya existe"}
                </span>
                <button
                  onClick={() => eliminarItem(idx)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={agregarLineaVacia}
            style={{ fontSize: 12, color: "var(--sage)", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}
          >
            + Agregar producto manualmente
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: "var(--ink-soft)" }}>Total a registrar:</span>
            <span className="despensa-mono" style={{ fontWeight: 700, fontSize: 15 }}>{formatMoney(totalARegistrar)}</span>
          </div>
          {Number(totalFactura) > 0 && Math.abs(totalFactura - totalCalculado) > 0.02 && (
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: -10, marginBottom: 14 }}>
              La suma de productos ({formatMoney(totalCalculado)}) no coincide con el total leído. Se registrará el total de factura; puedes corregirlo arriba.
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={confirmarGuardado}
              disabled={saving || (items.filter((it) => it.incluir && it.nombre.trim()).length === 0 && totalARegistrar <= 0)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer" }}
            >
              <Check size={14} /> {saving ? "Guardando…" : "Confirmar y guardar"}
            </button>
            <button
              onClick={reiniciar}
              style={{ padding: "9px 16px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {savedOk && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--sage-bg)", border: "1px solid var(--sage)", borderRadius: 12 }}>
          <Check size={28} style={{ color: "var(--sage)", marginBottom: 8 }} />
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--sage)", marginBottom: 4 }}>¡Compra registrada!</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16 }}>
            Los productos nuevos ya están en Catálogo y el gasto quedó en Movimientos.
          </div>
          <button
            onClick={reiniciar}
            style={{ padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--ink)", color: "var(--paper)", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Escanear otra factura
          </button>
        </div>
      )}
    </div>
  );
}
