import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, List, Loader2 } from "lucide-react";
import ePub from "epubjs";

// Lector de libros .epub dentro de la app, usando epub.js. Se abre como un
// modal a pantalla completa sobre el resto de la interfaz.
export default function LectorEpub({ epubUrl, titulo, onClose }) {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarIndice, setMostrarIndice] = useState(false);
  const [capitulos, setCapitulos] = useState([]);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (!epubUrl || !viewerRef.current) return;
    let cancelado = false;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "auto",
    });
    renditionRef.current = rendition;

    rendition
      .display()
      .then(() => {
        if (!cancelado) setCargando(false);
      })
      .catch((err) => {
        if (!cancelado) {
          setError("No se pudo abrir el archivo epub: " + (err.message || String(err)));
          setCargando(false);
        }
      });

    book.loaded.navigation.then((nav) => {
      if (!cancelado) setCapitulos(nav.toc || []);
    });

    rendition.on("relocated", (location) => {
      if (!cancelado && location?.start?.percentage != null) {
        setProgreso(Math.round(location.start.percentage * 100));
      }
    });

    return () => {
      cancelado = true;
      rendition.destroy();
      book.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubUrl]);

  const irA = (href) => {
    renditionRef.current?.display(href);
    setMostrarIndice(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--paper)", zIndex: 1100, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{progreso}%</span>
          <button
            onClick={() => setMostrarIndice((s) => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <List size={15} />
          </button>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {cargando && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--ink-soft)", fontSize: 13 }}>
            <Loader2 size={16} className="despensa-spin" /> Abriendo el libro…
          </div>
        )}
        {error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "var(--stamp)", fontSize: 13 }}>
            {error}
          </div>
        )}
        <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />

        {mostrarIndice && (
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 260, maxWidth: "80%", background: "var(--card)", borderRight: "1px solid var(--line)", overflowY: "auto", padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--ink-soft)" }}>Índice</div>
            {capitulos.map((c, i) => (
              <button
                key={i}
                onClick={() => irA(c.href)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 6px", fontSize: 12.5, background: "transparent", border: "none", borderBottom: "1px solid var(--line-soft)", color: "var(--ink)", cursor: "pointer" }}
              >
                {c.label?.trim()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid var(--line)", background: "var(--card)" }}>
        <button
          onClick={() => renditionRef.current?.prev()}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          onClick={() => renditionRef.current?.next()}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
