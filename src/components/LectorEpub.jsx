import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, List, Loader2, Palette } from "lucide-react";
import ePub from "epubjs";

const TEMA_KEY = "smart-finance-lector-tema";
const PRESETS = [
  { nombre: "Claro", texto: "#1a1a1a", fondo: "#ffffff" },
  { nombre: "Oscuro", texto: "#e8e8e8", fondo: "#1a1a1a" },
  { nombre: "Sepia", texto: "#3b2f2a", fondo: "#f2e8d5" },
];

function cargarTemaGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(TEMA_KEY));
    if (guardado?.texto && guardado?.fondo) return guardado;
  } catch (e) {
    // ignorar y usar el tema por defecto
  }
  return PRESETS[0];
}

// Lector de libros .epub dentro de la app, usando epub.js. Se abre como un
// modal a pantalla completa sobre el resto de la interfaz.
export default function LectorEpub({ epubUrl, titulo, onClose }) {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeCarga, setMensajeCarga] = useState("Descargando el libro…");
  const [error, setError] = useState(null);
  const [mostrarIndice, setMostrarIndice] = useState(false);
  const [mostrarPersonalizar, setMostrarPersonalizar] = useState(false);
  const [capitulos, setCapitulos] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const [tema, setTema] = useState(cargarTemaGuardado);

  const aplicarTema = (nuevoTema) => {
    setTema(nuevoTema);
    localStorage.setItem(TEMA_KEY, JSON.stringify(nuevoTema));
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.register("personalizado", {
      body: { color: `${nuevoTema.texto} !important`, background: `${nuevoTema.fondo} !important` },
      "p, div, span, li, h1, h2, h3, h4, h5, h6": { color: `${nuevoTema.texto} !important` },
    });
    rendition.themes.select("personalizado");
  };

  useEffect(() => {
    if (!epubUrl || !viewerRef.current) return;
    let cancelado = false;

    // Se descarga el archivo completo de una sola vez (en vez de dejar que
    // epub.js haga muchas peticiones pequeñas por HTTP Range mientras lee
    // el zip) — con la latencia de red, muchas peticiones chiquitas se
    // sienten más lentas que una sola descarga completa, aunque el archivo
    // sea pequeño.
    fetch(epubUrl)
      .then((resp) => {
        if (!resp.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${resp.status})`);
        return resp.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (cancelado) return;
        setMensajeCarga("Abriendo el libro…");
        const book = ePub(arrayBuffer);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          spread: "none",
        });
        renditionRef.current = rendition;

        rendition
          .display()
          .then(() => {
            if (!cancelado) {
              setCargando(false);
              aplicarTema(tema);
            }
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
      })
      .catch((err) => {
        if (!cancelado) {
          setError("No se pudo descargar el archivo: " + (err.message || String(err)));
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
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
            onClick={() => setMostrarPersonalizar((s) => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <Palette size={15} />
          </button>
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
            <Loader2 size={16} className="despensa-spin" /> {mensajeCarga}
          </div>
        )}
        {error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", color: "var(--stamp)", fontSize: 13 }}>
            {error}
          </div>
        )}
        <div ref={viewerRef} style={{ width: "100%", maxWidth: 720, height: "100%", margin: "0 auto" }} />

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

        {mostrarPersonalizar && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 220, maxWidth: "80%", background: "var(--card)", borderLeft: "1px solid var(--line)", overflowY: "auto", padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "var(--ink-soft)" }}>Apariencia</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.nombre}
                  onClick={() => aplicarTema(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    fontSize: 12.5,
                    fontWeight: 500,
                    borderRadius: 8,
                    border: tema.texto === p.texto && tema.fondo === p.fondo ? "2px solid var(--sage)" : "1px solid var(--line)",
                    background: p.fondo,
                    color: p.texto,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: p.texto, border: "1px solid rgba(0,0,0,0.2)" }} />
                  {p.nombre}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 8 }}>Colores personalizados</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12 }}>Letra</span>
              <input
                type="color"
                value={tema.texto}
                onChange={(e) => aplicarTema({ ...tema, texto: e.target.value })}
                style={{ width: 36, height: 28, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", padding: 0 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12 }}>Fondo</span>
              <input
                type="color"
                value={tema.fondo}
                onChange={(e) => aplicarTema({ ...tema, fondo: e.target.value })}
                style={{ width: 36, height: 28, border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer", padding: 0 }}
              />
            </div>
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
