import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Paginación reutilizable con flechas y números de página. Si totalItems cabe
// en una sola página, no renderiza nada.
export default function Pagination({ page, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const paginas = [];
  const ventana = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - ventana && p <= page + ventana)) {
      paginas.push(p);
    } else if (paginas[paginas.length - 1] !== "…") {
      paginas.push("…");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        marginTop: 16,
        flexWrap: "wrap",
        position: "sticky",
        bottom: 0,
        background: "var(--paper)",
        padding: "10px 0",
        zIndex: 5,
      }}
    >
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 7,
          border: "1px solid var(--line)",
          background: "var(--card)",
          color: page === 1 ? "var(--line)" : "var(--ink-soft)",
          cursor: page === 1 ? "not-allowed" : "pointer",
        }}
      >
        <ChevronLeft size={14} />
      </button>

      {paginas.map((p, idx) =>
        p === "…" ? (
          <span key={`ellipsis-${idx}`} style={{ fontSize: 12, color: "var(--ink-soft)", padding: "0 4px" }}>
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              minWidth: 30,
              height: 30,
              padding: "0 6px",
              borderRadius: 7,
              border: "1px solid var(--line)",
              background: p === page ? "var(--sage)" : "var(--card)",
              color: p === page ? "#fff" : "var(--ink)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 7,
          border: "1px solid var(--line)",
          background: "var(--card)",
          color: page === totalPages ? "var(--line)" : "var(--ink-soft)",
          cursor: page === totalPages ? "not-allowed" : "pointer",
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
