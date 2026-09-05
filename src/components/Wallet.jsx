import React, { useMemo, useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { CardVisual } from "./Tarjetas.jsx";
import { MembershipCard } from "./Membresias.jsx";
import PilaApilada from "./PilaApilada.jsx";

export default function Wallet({ tarjetas, membresias, onNavigate }) {
  const [filtro, setFiltro] = useState("todas");

  const items = useMemo(() => {
    const t = (tarjetas || [])
      .filter((x) => x.estado === "Activa")
      .map((x) => ({ ...x, _tipo: "tarjeta" }));
    const m = (membresias || [])
      .filter((x) => x.estado === "Activa")
      .map((x) => ({ ...x, _tipo: "membresia" }));
    if (filtro === "tarjetas") return t;
    if (filtro === "membresias") return m;
    return [...t, ...m];
  }, [tarjetas, membresias, filtro]);

  const [frente, setFrente] = useState(null);

  return (
    <div style={{ overscrollBehaviorY: "contain" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { id: "todas", label: "Todas" },
          { id: "tarjetas", label: "Tarjetas" },
          { id: "membresias", label: "Membresías" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 20,
              border: `1px solid ${filtro === f.id ? "var(--sage)" : "var(--line)"}`,
              background: filtro === f.id ? "var(--sage-bg)" : "var(--card)",
              color: filtro === f.id ? "var(--sage)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 0 20px" }}>
        <PilaApilada
          items={items}
          renderItem={(item) => (item._tipo === "tarjeta" ? <CardVisual tarjeta={item} /> : <MembershipCard membresia={item} />)}
          onChangeFrente={setFrente}
          onTapFrente={(item) => onNavigate && onNavigate(item._tipo === "tarjeta" ? "tarjetas" : "membresias")}
          mensajeVacio="No tienes tarjetas ni membresías activas todavía."
        />
      </div>

      {frente && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "var(--card)", border: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-soft)" }}>
            {frente._tipo === "tarjeta" ? <CreditCard size={13} /> : <Sparkles size={13} />}
            {frente.nombre}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--ink-soft)" }}>
        Arrastra la de enfrente hacia abajo para pasar a la siguiente · Tócala para ir a su detalle
      </div>
    </div>
  );
}
