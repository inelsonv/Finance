import React, { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Search, X, Image as ImageIcon, Camera, Package, Clock, Sparkles, ShoppingCart, Check, ScanLine } from "lucide-react";
import {
  addProduct,
  deleteProduct,
  updateProductPrice,
  updateProducto,
  agregarItemABorrador,
  uploadProductImage,
  removeProductImage,
} from "../lib/db";
import { diasRestantesProducto, registrarReposicion } from "../lib/inventario";
import { calcularSugerenciasRecompra } from "../lib/recomendaciones";
import { confirm } from "../lib/confirm";
import BarcodeScanner from "./BarcodeScanner.jsx";

const CATEGORIES = ["Limpieza", "Higiene personal", "Alimentos", "Bebidas", "Otros"];
const UNITS = ["unidad", "kg", "g", "l", "ml", "paquete", "rollo"];

async function buscarProductoPorCodigo(codigo) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const nombre = [p.product_name, p.brands].filter(Boolean).join(" - ");
    return { nombre: nombre || p.generic_name || null, imagen: p.image_front_small_url || p.image_url || null };
  } catch {
    return null;
  }
}

export default function Catalogo({ products, entidades, historialCompras, ordenesCompra, onNavigate }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "", codigoBarras: "" });
  const [formImage, setFormImage] = useState(null);
  const [formImagePreview, setFormImagePreview] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [configuringId, setConfiguringId] = useState(null);
  const [configForm, setConfigForm] = useState(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [dismissedSugerencias, setDismissedSugerencias] = useState([]);
  const [agregadoId, setAgregadoId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState(null);
  const formFileRef = useRef(null);
  const rowFileRefs = useRef({});

  // Una orden "vigente" es cualquiera que aún no haya completado su ciclo
  // (no está Completada ni Cancelada) — puede estar en Borrador, ya enviada al
  // proveedor, o en compra presencial. Mientras siga vigente, los nuevos productos
  // se agregan ahí en vez de crear una orden nueva.
  const ordenVigente = useMemo(
    () => (ordenesCompra || []).find((o) => o.estado !== "Completada" && o.estado !== "Cancelada"),
    [ordenesCompra]
  );

  const sugerencias = useMemo(() => {
    const productIds = new Set(products.map((p) => p.id));
    return calcularSugerenciasRecompra(historialCompras || [])
      .filter((s) => productIds.has(s.productId) && !dismissedSugerencias.includes(s.productId))
      .slice(0, 6);
  }, [historialCompras, products, dismissedSugerencias]);

  const agregarACompra = async (product) => {
    await agregarItemABorrador(ordenVigente, { productId: product.id, productName: product.name, precioUnitario: product.price });
    setAgregadoId(product.id);
    setTimeout(() => setAgregadoId(null), 1500);
  };

  const agregarSugerenciaACompra = async (sugerencia) => {
    const product = products.find((p) => p.id === sugerencia.productId);
    await agregarItemABorrador(ordenVigente, {
      productId: sugerencia.productId,
      productName: sugerencia.productName,
      precioUnitario: product?.price ?? null,
    });
    setDismissedSugerencias((prev) => [...prev, sugerencia.productId]);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleBarcodeDetected = async (codigo) => {
    setShowScanner(false);
    setScanBusy(true);
    setScanMsg(null);
    try {
      const yaExiste = products.find((p) => p.codigoBarras === codigo);
      if (yaExiste) {
        await agregarACompra(yaExiste);
        setScanMsg({ tipo: "ok", texto: `"${yaExiste.name}" ya estaba en tu catálogo — lo agregué a tu orden de compra.` });
        return;
      }
      const resultado = await buscarProductoPorCodigo(codigo);
      setShowForm(true);
      if (resultado?.nombre) {
        setForm((f) => ({ ...f, name: resultado.nombre, codigoBarras: codigo }));
        setScanMsg({ tipo: "ok", texto: `Encontrado: ${resultado.nombre}. Revisa el nombre y completa el precio.` });
      } else {
        setForm((f) => ({ ...f, name: "", codigoBarras: codigo }));
        setScanMsg({ tipo: "info", texto: `No encontré este código (${codigo}) en la base de datos. Completa el nombre a mano.` });
      }
    } finally {
      setScanBusy(false);
    }
  };

  const handleFormImagePick = (file) => {
    if (!file) return;
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) return;
    setSaving(true);
    setFormError(null);
    try {
      const price = parseFloat(form.price);
      const docRef = await addProduct({
        name,
        category: form.category,
        unit: form.unit,
        price: Number.isFinite(price) ? price : 0,
        codigoBarras: form.codigoBarras || null,
      });
      if (formImage) {
        await uploadProductImage(docRef.id, formImage);
      }
      setForm({ name: "", category: CATEGORIES[0], unit: UNITS[0], price: "", codigoBarras: "" });
      setFormImage(null);
      setFormImagePreview(null);
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRowImagePick = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      await uploadProductImage(id, file);
    } catch (err) {
      // el error se ve reflejado si el producto no actualiza su imagen
    } finally {
      setUploadingId(null);
    }
  };

  const handlePriceBlur = (id, value) => {
    const price = parseFloat(value);
    if (Number.isFinite(price)) updateProductPrice(id, price);
  };

  const handleAddToList = (id) => {
    const product = products.find((p) => p.id === id);
    if (product) agregarACompra(product);
  };

  const openConfig = (p) => {
    setConfiguringId(p.id);
    setConfigForm({
      seguimiento: !!p.seguimiento,
      unidadesPorPaquete: p.unidadesPorPaquete != null ? String(p.unidadesPorPaquete) : "30",
      consumoDiario: p.consumoDiario != null ? String(p.consumoDiario) : "1",
      diasAviso: p.diasAviso != null ? String(p.diasAviso) : "5",
      cajasReponer: "",
      entidadId: p.entidadId || "",
    });
  };

  const closeConfig = () => {
    setConfiguringId(null);
    setConfigForm(null);
  };

  const saveConfig = async () => {
    const producto = products.find((p) => p.id === configuringId);
    if (!producto) return;
    setConfigSaving(true);
    try {
      const unidadesPorPaquete = parseFloat(configForm.unidadesPorPaquete) || 1;
      const consumoDiario = parseFloat(configForm.consumoDiario) || 1;
      const diasAviso = parseInt(configForm.diasAviso, 10) || 5;
      const cajas = parseFloat(configForm.cajasReponer);

      const fields = {
        seguimiento: configForm.seguimiento,
        unidadesPorPaquete,
        consumoDiario,
        diasAviso,
        entidadId: configForm.entidadId || null,
        entidadName: entidades.find((e) => e.docId === configForm.entidadId)?.name || "",
      };

      if (configForm.seguimiento && Number.isFinite(cajas) && cajas > 0) {
        const productoActualizado = { ...producto, unidadesPorPaquete, consumoDiario };
        Object.assign(fields, registrarReposicion(productoActualizado, cajas));
      }

      await updateProducto(configuringId, fields);
      closeConfig();
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div>
      {ordenVigente && (ordenVigente.items || []).length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "var(--sage-bg)",
            border: "1px solid var(--sage)",
            borderRadius: 10,
            padding: "9px 12px",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--sage)" }}>
            Tienes {ordenVigente.items.length} producto(s) en tu orden de compra {ordenVigente.folio} ({ordenVigente.estado}).
          </span>
          {onNavigate && (
            <button
              onClick={() => onNavigate("ordenes-compra")}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 11.5, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", flexShrink: 0 }}
            >
              <ShoppingCart size={12} /> Ver orden de compra
            </button>
          )}
        </div>
      )}

      {sugerencias.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={13} style={{ color: "var(--sage)" }} />
            <span className="despensa-tab-font" style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Sugerencias basadas en tus hábitos de compra
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sugerencias.map((s) => (
              <div
                key={s.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: s.vencido ? "var(--stamp-bg)" : "var(--sage-bg)",
                  border: `1px solid ${s.vencido ? "var(--stamp)" : "var(--sage)"}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.productName}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    Sueles comprarlo cada ~{s.promedioDias} días · última vez hace {s.diasDesdeUltima} días
                    {s.vencido && " · ya deberías haberlo repuesto"}
                  </div>
                </div>
                <button
                  onClick={() => agregarSugerenciaACompra(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 10px",
                    fontSize: 11.5,
                    fontWeight: 500,
                    background: s.vencido ? "var(--stamp)" : "var(--sage)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: "pointer",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <ShoppingCart size={12} /> Agregar a compra
                </button>
                <button
                  onClick={() => setDismissedSugerencias((prev) => [...prev, s.productId])}
                  title="Descartar"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", color: "var(--ink-soft)", border: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--ink-soft)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría"
            style={{
              width: "100%",
              padding: "8px 10px 8px 30px",
              border: "1px solid var(--line)",
              borderRadius: 8,
              background: "var(--card)",
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={() => {
            setScanMsg(null);
            setShowScanner(true);
          }}
          title="Escanear código de barras"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--sage)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ScanLine size={14} /> Escanear
        </button>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            background: "var(--ink)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Agregar producto"}
        </button>
      </div>

      {scanBusy && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>
          Buscando el producto…
        </div>
      )}
      {scanMsg && (
        <div
          style={{
            fontSize: 12.5,
            marginBottom: 12,
            padding: "9px 12px",
            borderRadius: 8,
            background: scanMsg.tipo === "ok" ? "var(--sage-bg)" : "var(--amber-bg)",
            color: scanMsg.tipo === "ok" ? "var(--sage)" : "var(--amber)",
          }}
        >
          {scanMsg.texto}
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}

      {showForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              ref={formFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFormImagePick(e.target.files[0])}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => formFileRef.current?.click()}
              title="Agregar foto"
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 8,
                border: "1px dashed var(--line)",
                background: formImagePreview ? `url(${formImagePreview}) center/cover` : "var(--card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-soft)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {!formImagePreview && <Camera size={18} />}
            </button>
            <div
              className="despensa-formgrid"
              style={{ flex: 1, display: "grid", gridTemplateColumns: "2fr 1.3fr 1fr 1fr", gap: 8 }}
            >
              <input
                autoFocus
                placeholder="Nombre del producto"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                className="despensa-mono"
                type="number"
                step="0.01"
                min="0"
                placeholder="Precio"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.name.trim() || saving}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: form.name.trim() ? "var(--sage)" : "var(--line)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: form.name.trim() && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Guardando…" : "Guardar producto"}
          </button>
          {formError && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--stamp)" }}>
              No se pudo guardar: {formError}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--ink-soft)", fontSize: 13 }}>
          {products.length === 0
            ? "Tu catálogo está vacío. Agrega tu primer producto."
            : "No hay productos que coincidan con la búsqueda."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              data-record-id={p.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <input
                ref={(el) => (rowFileRefs.current[p.id] = el)}
                type="file"
                accept="image/*"
                onChange={(e) => handleRowImagePick(p.id, e.target.files[0])}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => rowFileRefs.current[p.id]?.click()}
                title={p.imageUrl ? "Cambiar foto" : "Agregar foto"}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  border: "none",
                  borderBottom: "1px solid var(--line-soft)",
                  background: p.imageUrl ? `url(${p.imageUrl}) center/cover` : "var(--paper)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                  padding: 0,
                  opacity: uploadingId === p.id ? 0.5 : 1,
                }}
              >
                {!p.imageUrl && <ImageIcon size={26} />}
              </button>

              <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.25,
                    minHeight: 32,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2, marginBottom: 8 }}>
                  {p.category} · por {p.unit}
                </div>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                  <div className="despensa-mono" style={{ display: "flex", alignItems: "center", gap: 1, fontSize: 12.5, flex: 1, minWidth: 0 }}>
                    $
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(p.price || 0).toFixed(2)}
                      key={p.price}
                      onBlur={(e) => handlePriceBlur(p.id, e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 0,
                        padding: "4px 5px",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontFamily: "IBM Plex Mono, monospace",
                        textAlign: "right",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => openConfig(p)}
                    title="Seguimiento de inventario"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: p.seguimiento ? "var(--sage-bg)" : "transparent",
                      color: p.seguimiento ? "var(--sage)" : "var(--ink-soft)",
                      border: p.seguimiento ? "none" : "1px solid var(--line)",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Package size={13} />
                  </button>
                  <button
                    onClick={() => handleAddToList(p.id)}
                    title="Agregar a orden de compra"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: agregadoId === p.id ? "var(--sage)" : "var(--sage-bg)",
                      color: agregadoId === p.id ? "#fff" : "var(--sage)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {agregadoId === p.id ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                  <button
                    onClick={async () => {
                      if (await confirm("¿Eliminar este producto del catálogo?")) deleteProduct(p.id);
                    }}
                    title="Eliminar producto"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      background: "transparent",
                      color: "var(--stamp)",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {p.seguimiento && (() => {
                  const dias = diasRestantesProducto(p);
                  if (dias == null) return null;
                  const bajo = dias <= (p.diasAviso ?? 5);
                  return (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        color: bajo ? "var(--stamp)" : "var(--ink-soft)",
                      }}
                    >
                      <Clock size={10} />
                      {dias <= 0 ? "Se acabó" : `${dias} día${dias !== 1 ? "s" : ""} restantes`}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {configuringId && configForm && (
        <div style={{ background: "var(--card)", border: "1px solid var(--stamp)", borderRadius: 10, padding: 14, marginTop: 16 }}>
          <div className="despensa-tab-font" style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            Seguimiento de inventario: {products.find((p) => p.id === configuringId)?.name}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, marginBottom: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={configForm.seguimiento}
              onChange={(e) => setConfigForm({ ...configForm, seguimiento: e.target.checked })}
            />
            Avisarme cuando se esté por acabar
          </label>

          {configForm.seguimiento && (
            <>
              <div className="despensa-formgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Unidades por paquete</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.unidadesPorPaquete}
                    onChange={(e) => setConfigForm({ ...configForm, unidadesPorPaquete: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Consumo diario</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.consumoDiario}
                    onChange={(e) => setConfigForm({ ...configForm, consumoDiario: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>Avisar con (días)</div>
                  <input
                    className="despensa-mono"
                    type="number"
                    min="1"
                    value={configForm.diasAviso}
                    onChange={(e) => setConfigForm({ ...configForm, diasAviso: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>
                  Comprado en (para poder pedir por WhatsApp desde la notificación)
                </div>
                <select
                  value={configForm.entidadId}
                  onChange={(e) => setConfigForm({ ...configForm, entidadId: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "var(--card)" }}
                >
                  <option value="">Sin entidad (opcional)</option>
                  {entidades.map((e) => (
                    <option key={e.docId} value={e.docId}>{e.name}</option>
                  ))}
                </select>
                {configForm.entidadId && !entidades.find((e) => e.docId === configForm.entidadId)?.phone && (
                  <div style={{ fontSize: 11, color: "var(--stamp)", marginTop: 4 }}>
                    Esa entidad no tiene teléfono registrado — agrégalo en Entidades para poder pedir por WhatsApp.
                  </div>
                )}
              </div>

              {(() => {
                const producto = products.find((p) => p.id === configuringId);
                const dias = producto ? diasRestantesProducto(producto) : null;
                return (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
                    {dias == null
                      ? "Aún no has registrado ninguna compra — dile cuántos paquetes acabas de comprar abajo."
                      : dias <= 0
                      ? "Según lo registrado, ya se debería haber acabado."
                      : `Quedan aproximadamente ${dias} día${dias !== 1 ? "s" : ""} de inventario.`}
                  </div>
                );
              })()}

              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 3 }}>
                  ¿Compraste paquetes ahora? Escribe cuántos para sumarlos al inventario
                </div>
                <input
                  className="despensa-mono"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ej. 2"
                  value={configForm.cajasReponer}
                  onChange={(e) => setConfigForm({ ...configForm, cajasReponer: e.target.value })}
                  style={{ width: 120, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveConfig}
              disabled={configSaving}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--sage)", color: "#fff", border: "none", borderRadius: 8, cursor: configSaving ? "not-allowed" : "pointer" }}
            >
              {configSaving ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={closeConfig}
              style={{ padding: "7px 16px", fontSize: 13, fontWeight: 500, background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
