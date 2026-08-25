import React, { useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Camera, Upload, Check, X, Loader2, AlertTriangle, Package, Receipt } from "lucide-react";
import { functions } from "../firebase";
import { addProduct, addMovimiento, updateProductPrice } from "../lib/db";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n) {
  const v = Number.isFinite(n) ? n : 0;
  return "$" + v.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EscanearFactura({ products }) {
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [resultado, setResultado] = useState(null); // { tienda, fecha, items, total }
  const [items, setItems] = useState([]); // items editables con estado agregarACatalogo, existente
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [gastoCategoria, setGastoCategoria] = useState("Alimentos");

  const productosPorNombre = (nombre) =>
    products.find((p) => p.name.trim().toLowerCase() === nombre.trim().toLowerCase());

  const handleFile = async (file) => {
    if (!file) return;
    setScanError(null);
    setResultado(null);
    setItems([]);
    setSavedOk(false);
    setImagePreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const escanear = httpsCallable(functions, "escanearFactura");
      const res = await escanear({ imageBase64: base64, mediaType: file.type || "image/jpeg" });
      const data = res.data;
      setResultado(data);
      const itemsConEstado = (data.items || []).map((it) => {
        const existente = productosPorNombre(it.nombre || "");
        return {
          nombre: it.nombre || "",
          precio: it.precio ?? "",
          cantidad: it.cantidad || 1,
          incluir: true,
          esNuevo: !existente,
          productoExistente: existente || null,
        };
      });
      setItems(itemsConEstado);
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

  const totalCalculado = items.filter((it) => it.incluir).reduce((s, it) => s + (parseFloat(it.precio) || 0) * (it.cantidad || 1), 0);

  const confirmarGuardado = async () => {
    setSaving(true);
    try {
      for (const it of items) {
        if (!it.incluir) continue;
        const precio = parseFloat(it.precio) || 0;
        if (it.esNuevo) {
          await addProduct({ name: it.nombre.trim(), category: gastoCategoria, unit: "unidad", price: precio });
        } else if (it.productoExistente && precio > 0 && precio !== it.productoExistente.price) {
          await updateProductPrice(it.productoExistente.id, precio);
        }
      }

      const total = resultado?.total != null ? resultado.total : totalCalculado;
      const nombreTienda = resultado?.tienda ? ` en ${resultado.tienda}` : "";
      await addMovimiento({
        type: "Gasto",
        category: gastoCategoria,
        amount: total,
        description: `Compra${nombreTienda} (factura escaneada)`,
        date: resultado?.fecha || todayStr(),
        clasificacion: "Variable",
        metodoPago: "Efectivo",
      });

      setSavedOk(true);
    } catch (err) {
      setScanError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const reiniciar = () => {
    setImagePreview(null);
    setResultado(null);
    setItems([]);
    setScanError(null);
    setSavedOk(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      {!resultado && !scanning && (
        <div style={{ textAlign: "center", padding: "2rem 1rem", background: "var(--card)", border: "1px dashed var(--line)", borderRadius: 12 }}>
          <Receipt size={32} style={{ color: "var(--ink-soft)", marginBottom: 10 }} />
          <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 4 }}>Registrar compra desde una factura</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
            Toma una foto o sube una imagen de tu factura o recibo. La IA va a leer los productos y precios
            para que los revises antes de guardar nada.
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "2rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          <Loader2 size={22} className="despensa-spin" style={{ animation: "despensa-spin 1s linear infinite" }} />
          Leyendo la factura con IA, un momento…
          <style>{`@keyframes despensa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {scanError && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--stamp)", background: "var(--stamp-bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {scanError}
        </div>
      )}

      {resultado && !savedOk && (
        <div>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12.5, color: "var(--ink-soft)" }}>
            {resultado.tienda && <div><strong style={{ color: "var(--ink)" }}>{resultado.tienda}</strong></div>}
            {resultado.fecha && <div>Fecha: {resultado.fecha}</div>}
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

          {items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", padding: "1rem 0" }}>
              No se detectaron productos en la imagen. Intenta con una foto más clara.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
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
                    value={it.nombre}
                    onChange={(e) => actualizarItem(idx, { nombre: e.target.value })}
                    style={{ flex: 1, minWidth: 0, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                  />
                  <input
                    className="despensa-mono"
                    type="number"
                    step="0.01"
                    value={it.precio}
                    onChange={(e) => actualizarItem(idx, { precio: e.target.value })}
                    style={{ width: 80, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5 }}
                  />
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
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: "var(--ink-soft)" }}>Total a registrar:</span>
            <span className="despensa-mono" style={{ fontWeight: 700, fontSize: 15 }}>
              {formatMoney(resultado.total != null ? resultado.total : totalCalculado)}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={confirmarGuardado}
              disabled={saving}
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
