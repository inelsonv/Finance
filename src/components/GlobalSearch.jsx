import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Package,
  Landmark,
  Banknote,
  CreditCard,
  Ticket,
  Zap,
  Vault,
  Car,
  Shield,
  Calendar,
  ClipboardList,
  PiggyBank,
  Briefcase,
  Compass,
} from "lucide-react";

// Módulos/secciones navegables de la app, para que buscar "préstamo" también
// ofrezca ir directo al módulo de Préstamos, no solo a registros existentes.
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const MODULOS = [
  { nombre: "Inicio", tab: "inicio" },
  { nombre: "Presupuesto", tab: "presupuesto" },
  { nombre: "Categoría de gasto", tab: "presupuesto-categoria-gasto" },
  { nombre: "Presupuesto mensual", tab: "presupuesto-mensual" },
  { nombre: "Editor de flujo", tab: "presupuesto-flujo" },
  { nombre: "Estrategia de deudas", tab: "estrategia-deudas" },
  { nombre: "Checklist de pagos", tab: "checklist-pagos" },
  { nombre: "Movimientos", tab: "movimientos" },
  { nombre: "Calendario", tab: "calendario" },
  { nombre: "Cuentas", tab: "cuentas" },
  { nombre: "Ahorro", tab: "ahorro" },
  { nombre: "Inversión", tab: "inversion" },
  { nombre: "Ingresos", tab: "ingresos" },
  { nombre: "Préstamos", tab: "prestamos" },
  { nombre: "Tarjetas", tab: "tarjetas" },
  { nombre: "Membresías", tab: "membresias" },
  { nombre: "Contratos", tab: "contratos" },
  { nombre: "Activos", tab: "activos" },
  { nombre: "Seguros", tab: "seguros" },
  { nombre: "Catálogo", tab: "catalogo" },
  { nombre: "Órdenes de compra", tab: "ordenes-compra" },
  { nombre: "Entidades", tab: "entidades" },
  { nombre: "Configuración", tab: "configuracion" },
  { nombre: "Registrar compra (factura)", tab: "escanear-factura" },
];

export default function GlobalSearch({
  products,
  entidades,
  prestamos,
  tarjetas,
  membresias,
  contratos,
  cuentas,
  activos,
  seguros,
  eventos,
  ordenesCompra,
  metasAhorro,
  fuentesIngreso,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) setQuery("");
  }, [open]);

  const indice = useMemo(() => {
    const items = [];
    for (const m of MODULOS) items.push({ id: null, tipo: "Ir a módulo", icon: Compass, nombre: m.nombre, subtitulo: null, tab: m.tab });
    for (const p of products || []) items.push({ id: p.id, tipo: "Catálogo", icon: Package, nombre: p.name, subtitulo: p.category, tab: "catalogo" });
    for (const e of entidades || []) items.push({ id: e.docId, tipo: "Entidad", icon: Landmark, nombre: e.name, subtitulo: e.type, tab: "entidades" });
    for (const p of prestamos || []) items.push({ id: p.id, tipo: "Préstamo", icon: Banknote, nombre: `${p.numero} · ${p.entidadName || ""}`, subtitulo: p.tipo, tab: "prestamos" });
    for (const t of tarjetas || []) items.push({ id: t.id, tipo: "Tarjeta", icon: CreditCard, nombre: t.nombre, subtitulo: t.entidadName, tab: "tarjetas" });
    for (const m of membresias || []) items.push({ id: m.id, tipo: "Membresía", icon: Ticket, nombre: m.nombre, subtitulo: m.entidadName, tab: "membresias" });
    for (const c of contratos || []) items.push({ id: c.id, tipo: "Contrato", icon: Zap, nombre: c.nombre, subtitulo: c.tipo, tab: "contratos" });
    for (const c of cuentas || []) items.push({ id: c.id, tipo: "Cuenta", icon: Vault, nombre: c.nombre, subtitulo: `${c.tipo} · ${c.entidadName || ""}`, tab: "cuentas" });
    for (const a of activos || []) items.push({ id: a.id, tipo: "Activo", icon: Car, nombre: a.nombre, subtitulo: a.tipo, tab: "activos" });
    for (const s of seguros || []) items.push({ id: s.id, tipo: "Seguro", icon: Shield, nombre: s.nombre, subtitulo: s.tipo, tab: "seguros" });
    for (const e of eventos || []) items.push({ id: e.id, tipo: "Evento", icon: Calendar, nombre: e.titulo, subtitulo: e.tipo, tab: "calendario" });
    for (const o of ordenesCompra || []) items.push({ id: o.id, tipo: "Orden de compra", icon: ClipboardList, nombre: o.folio, subtitulo: o.estado, tab: "ordenes-compra" });
    for (const m of metasAhorro || []) items.push({ id: m.id, tipo: "Meta de ahorro", icon: PiggyBank, nombre: m.nombre, subtitulo: m.tipoMeta, tab: "ahorro" });
    for (const f of fuentesIngreso || []) items.push({ id: f.id, tipo: "Ingreso", icon: Briefcase, nombre: f.nombre, subtitulo: f.frecuencia, tab: "ingresos" });
    return items;
  }, [products, entidades, prestamos, tarjetas, membresias, contratos, cuentas, activos, seguros, eventos, ordenesCompra, metasAhorro, fuentesIngreso]);

  const resultados = useMemo(() => {
    const q = normalizar(query.trim());
    if (q.length < 2) return [];
    return indice
      .filter((it) => normalizar(it.nombre || "").includes(q) || normalizar(it.subtitulo || "").includes(q))
      .slice(0, 20);
  }, [query, indice]);

  const irA = (tab, id) => {
    onNavigate(tab, id);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 32,
          width: open ? "min(340px, 85vw)" : 32,
          borderRadius: 20,
          border: "1px solid var(--line)",
          background: open ? "var(--card)" : "var(--card)",
          overflow: "hidden",
          transition: "width 0.22s ease",
          boxShadow: open ? "0 4px 14px rgba(0,0,0,0.12)" : "none",
        }}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          title="Buscar en toda la app"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            flexShrink: 0,
            border: "none",
            background: "transparent",
            color: open ? "var(--sage)" : "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <Search size={15} />
        </button>
        {open && (
          <>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Buscar…"
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "var(--ink)", fontSize: 13, padding: "0 6px 0 0" }}
            />
            <button
              onClick={() => (query ? setQuery("") : setOpen(false))}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, marginRight: 3, background: "transparent", border: "none", color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(340px, calc(100vw - 24px))",
            maxHeight: 420,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 60,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowY: "auto" }}>
            {resultados.length === 0 ? (
              <div style={{ padding: "16px 12px", fontSize: 12, color: "var(--ink-soft)", textAlign: "center" }}>
                Sin resultados para "{query}".
              </div>
            ) : (
              resultados.map((r, idx) => {
                const Icon = r.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => irA(r.tab, r.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 12px",
                      background: "transparent",
                      border: "none",
                      borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "var(--sage-bg)",
                        color: "var(--sage)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nombre}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
                        {r.tipo}
                        {r.subtitulo && <> · {r.subtitulo}</>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
