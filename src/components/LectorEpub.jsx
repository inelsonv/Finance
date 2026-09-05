import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, List, Loader2, Palette, Highlighter, Trash2, Bookmark } from "lucide-react";
import ePub from "epubjs";
import { updateLibro, agregarMarcadorLibro, quitarMarcadorLibro } from "../lib/db";

const TEMA_KEY = "smart-finance-lector-tema";
const BRILLO_KEY = "smart-finance-lector-brillo";
const FUENTE_KEY = "smart-finance-lector-fuente";
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

function cargarBrilloGuardado() {
  const guardado = Number(localStorage.getItem(BRILLO_KEY));
  return Number.isFinite(guardado) && guardado >= 20 && guardado <= 100 ? guardado : 100;
}

function cargarFuenteGuardada() {
  const guardado = Number(localStorage.getItem(FUENTE_KEY));
  return Number.isFinite(guardado) && guardado >= 70 && guardado <= 200 ? guardado : 100;
}

// Lector de libros .epub dentro de la app, usando epub.js. Se abre como un
// modal a pantalla completa sobre el resto de la interfaz.
export default function LectorEpub({ epubUrl, titulo, libroId, ultimaPosicion, marcadores, onClose }) {
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeCarga, setMensajeCarga] = useState("Descargando el libro…");
  const [error, setError] = useState(null);
  const [mostrarIndice, setMostrarIndice] = useState(false);
  const [mostrarPersonalizar, setMostrarPersonalizar] = useState(false);
  const [mostrarMarcadores, setMostrarMarcadores] = useState(false);
  const [marcadoresLocal, setMarcadoresLocal] = useState(marcadores || []);
  const [capitulos, setCapitulos] = useState([]);
  const [progreso, setProgreso] = useState(0);
  const [paginaActual, setPaginaActual] = useState(null);
  const [totalPaginas, setTotalPaginas] = useState(null);
  const [tema, setTema] = useState(cargarTemaGuardado);
  const [brillo, setBrillo] = useState(cargarBrilloGuardado);
  const [tamanoFuente, setTamanoFuente] = useState(cargarFuenteGuardada);

  const handleCambiarFuente = (valor) => {
    const clamped = Math.max(70, Math.min(200, valor));
    setTamanoFuente(clamped);
    localStorage.setItem(FUENTE_KEY, String(clamped));
    renditionRef.current?.themes.fontSize(`${clamped}%`);
  };
  const cfiActualRef = useRef(ultimaPosicion || null);
  const progresoActualRef = useRef(0);
  const guardarTimeoutRef = useRef(null);

  const guardarPosicion = (cfi, pct, inmediato) => {
    cfiActualRef.current = cfi;
    progresoActualRef.current = pct;
    if (!libroId) return;
    if (guardarTimeoutRef.current) clearTimeout(guardarTimeoutRef.current);
    const ejecutar = () => updateLibro(libroId, { ultimaPosicion: cfi, progresoPct: pct }).catch(() => {});
    if (inmediato) ejecutar();
    else guardarTimeoutRef.current = setTimeout(ejecutar, 1500);
  };

  const handleCambiarBrillo = (valor) => {
    setBrillo(valor);
    localStorage.setItem(BRILLO_KEY, String(valor));
  };

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
          .display(ultimaPosicion || undefined)
          .then(() => {
            if (!cancelado) {
              setCargando(false);
              aplicarTema(tema);
              rendition.themes.fontSize(`${tamanoFuente}%`);
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

        // Genera un mapa de "páginas" estimadas según el contenido del
        // libro (epub no tiene páginas fijas de por sí, ya que el texto se
        // reacomoda según el tamaño de pantalla) — puede tardar unos
        // segundos en libros largos, se actualiza cuando termina.
        book.locations.generate(1600).then(() => {
          if (!cancelado) setTotalPaginas(book.locations.length());
        });

        // Vuelve a resaltar los marcadores ya guardados de este libro.
        (marcadores || []).forEach((m) => {
          try {
            rendition.annotations.add("highlight", m.cfi, {}, null, "epub-marcador", {
              fill: "#f5c518",
              "fill-opacity": "0.35",
              "mix-blend-mode": "multiply",
            });
          } catch (err) {
            // Un marcador con un CFI inválido (ej. de una versión distinta
            // del archivo) simplemente no se resalta, sin romper el resto.
          }
        });

        // Cuando el usuario selecciona texto en el libro, lo resalta y lo
        // guarda como marcador importante.
        rendition.on("selected", (cfiRange, contents) => {
          if (cancelado || !libroId) return;
          const texto = contents.window.getSelection()?.toString()?.trim();
          if (!texto) return;
          const nuevoMarcador = { cfi: cfiRange, texto: texto.slice(0, 500), fecha: new Date().toISOString() };
          rendition.annotations.add("highlight", cfiRange, {}, null, "epub-marcador", {
            fill: "#f5c518",
            "fill-opacity": "0.35",
            "mix-blend-mode": "multiply",
          });
          agregarMarcadorLibro(libroId, nuevoMarcador).catch(() => {});
          setMarcadoresLocal((prev) => [...prev, nuevoMarcador]);
          contents.window.getSelection()?.removeAllRanges();
        });

        rendition.on("relocated", (location) => {
          if (cancelado) return;
          let pct = null;
          if (location?.start?.percentage != null) {
            pct = Math.round(location.start.percentage * 100);
            setProgreso(pct);
          }
          if (location?.start?.cfi) {
            guardarPosicion(location.start.cfi, pct, false);
            if (book.locations.length() > 0) {
              const idx = book.locations.locationFromCfi(location.start.cfi);
              if (idx != null) setPaginaActual(idx + 1);
            }
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
      if (guardarTimeoutRef.current) clearTimeout(guardarTimeoutRef.current);
      if (cfiActualRef.current && libroId) {
        updateLibro(libroId, { ultimaPosicion: cfiActualRef.current, progresoPct: progresoActualRef.current }).catch(() => {});
      }
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubUrl]);

  const irA = (href) => {
    renditionRef.current?.display(href);
    setMostrarIndice(false);
  };

  const irAMarcador = (cfi) => {
    renditionRef.current?.display(cfi);
    setMostrarMarcadores(false);
  };

  const handleQuitarMarcador = (marcador) => {
    if (!libroId) return;
    renditionRef.current?.annotations.remove(marcador.cfi, "highlight");
    quitarMarcadorLibro(libroId, marcador).catch(() => {});
    setMarcadoresLocal((prev) => prev.filter((m) => m.cfi !== marcador.cfi));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--paper)", zIndex: 1100, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{progreso}%</span>
          <button
            onClick={() => setMostrarMarcadores((s) => !s)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <Bookmark size={15} />
          </button>
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: (100 - brillo) / 100,
            pointerEvents: "none",
          }}
        />

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

        {mostrarMarcadores && (
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 280, maxWidth: "85%", background: "var(--card)", borderRight: "1px solid var(--line)", overflowY: "auto", padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--ink-soft)" }}>Marcadores importantes</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginBottom: 10, lineHeight: 1.4 }}>
              Selecciona texto en el libro para resaltarlo y guardarlo aquí.
            </div>
            {marcadoresLocal.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center", padding: "20px 0" }}>Todavía no tienes marcadores.</div>
            ) : (
              marcadoresLocal.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", padding: "8px 4px", borderBottom: "1px solid var(--line-soft)" }}>
                  <button
                    onClick={() => irAMarcador(m.cfi)}
                    style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                      <Highlighter size={11} style={{ color: "#d9a441", flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.35 }}>"{m.texto}"</div>
                  </button>
                  <button
                    onClick={() => handleQuitarMarcador(m)}
                    title="Quitar marcador"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, background: "transparent", border: "none", color: "var(--stamp)", cursor: "pointer", flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
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

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Tamaño de letra</span>
                <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{tamanoFuente}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleCambiarFuente(tamanoFuente - 10)}
                  disabled={tamanoFuente <= 70}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, fontSize: 13, fontWeight: 700, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: tamanoFuente <= 70 ? "var(--line)" : "var(--ink)", cursor: tamanoFuente <= 70 ? "default" : "pointer" }}
                >
                  A-
                </button>
                <input
                  type="range"
                  min={70}
                  max={200}
                  step={10}
                  value={tamanoFuente}
                  onChange={(e) => handleCambiarFuente(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleCambiarFuente(tamanoFuente + 10)}
                  disabled={tamanoFuente >= 200}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, fontSize: 16, fontWeight: 700, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: tamanoFuente >= 200 ? "var(--line)" : "var(--ink)", cursor: tamanoFuente >= 200 ? "default" : "pointer" }}
                >
                  A+
                </button>
              </div>
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

            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Brillo</span>
                <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{brillo}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={brillo}
                onChange={(e) => handleCambiarBrillo(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--line)", background: "var(--card)" }}>
        {totalPaginas != null && paginaActual != null && (
          <div style={{ textAlign: "center", padding: "6px 0 0", fontSize: 11, color: "var(--ink-soft)" }} className="despensa-mono">
            Página {paginaActual} de {totalPaginas}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px" }}>
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
    </div>
  );
}
