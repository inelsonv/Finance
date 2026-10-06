import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, ChevronDown, List, Loader2, Palette, Highlighter, Trash2, Bookmark, Volume2, Pause, Maximize, Minimize, Settings2 } from "lucide-react";
import ePub from "epubjs";
import { updateLibro, agregarMarcadorLibro, quitarMarcadorLibro } from "../lib/db";

const TEMA_KEY = "smart-finance-lector-tema";
const BRILLO_KEY = "smart-finance-lector-brillo";
const FUENTE_KEY = "smart-finance-lector-fuente";
const VOZ_KEY = "smart-finance-lector-voz";
const MOTOR_VOZ_KEY = "smart-finance-lector-motor-voz";
const VOZ_IA_KEY = "smart-finance-lector-voz-ia";
const VELOCIDAD_VOZ_KEY = "smart-finance-lector-velocidad-voz";
const VOCES_IA = [
  { id: "Aoede", label: "Aoede (Femenina · Narradora cálida y natural)" },
  { id: "Charon", label: "Charon (Masculina · Narrador clásico y profundo)" },
  { id: "Kore", label: "Kore (Femenina · Suave, relajante y pausada)" },
  { id: "Fenrir", label: "Fenrir (Masculina · Firme y articulada)" },
  { id: "Puck", label: "Puck (Juvenil · Cercana, dinámica y fresca)" },
];
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

function cargarVelocidadVozGuardada() {
  const guardado = Number(localStorage.getItem(VELOCIDAD_VOZ_KEY));
  return Number.isFinite(guardado) && guardado >= 0.5 && guardado <= 2 ? guardado : 1;
}

function esVozNaturalEspanol(voz) {
  const nombre = (voz.name || "").toLowerCase();
  const vocesNaturales = /(?:^|\s)(alvaro|elvira|jorge|dalia|alonso|paloma|monica|paulina|helena|sabina|lucia)(?:\s|$)/i.test(nombre);
  return voz.lang?.toLowerCase().startsWith("es") &&
    (/natural|neural|online|google|enhanced/i.test(nombre) || vocesNaturales);
}

function elegirVozEspanol(voces) {
  const espanolas = voces.filter((voz) => voz.lang?.toLowerCase().startsWith("es"));
  const naturales = espanolas.filter(esVozNaturalEspanol);
  const preferidas = [
    ...naturales.filter((voz) => voz.lang.toLowerCase().startsWith("es-mx")),
    ...naturales,
    ...espanolas.filter((voz) => voz.lang.toLowerCase().startsWith("es-419")),
    ...espanolas.filter((voz) => voz.lang.toLowerCase().startsWith("es-bo")),
    ...espanolas.filter((voz) => voz.lang.toLowerCase().startsWith("es-mx")),
    ...espanolas.filter((voz) => voz.lang.toLowerCase().startsWith("es-us")),
    ...espanolas.filter((voz) => voz.lang.toLowerCase().startsWith("es-es")),
    ...espanolas,
  ];
  return preferidas[0] || voces.find((voz) => voz.default) || null;
}

// Lector de libros .epub dentro de la app, usando epub.js. Se abre como un
// modal a pantalla completa sobre el resto de la interfaz.
export default function LectorEpub({ epubUrl, titulo, libroId, ultimaPosicion, marcadores, onClose, portadaUrl, ultimoFragmentoVoz }) {
  const viewerRef = useRef(null);
  const contenedorRef = useRef(null);
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
  const [transicion, setTransicion] = useState(null);
  const [leyendoEnVoz, setLeyendoEnVoz] = useState(false);
  const [textoFragmentoActual, setTextoFragmentoActual] = useState("");
  const [palabraActualIndex, setPalabraActualIndex] = useState(0);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [vocesDisponibles, setVocesDisponibles] = useState([]);
  const [vozSeleccionada, setVozSeleccionada] = useState(() => localStorage.getItem(VOZ_KEY) || "");
  const [motorVoz, setMotorVoz] = useState(() => localStorage.getItem(MOTOR_VOZ_KEY) || "ia");
  const [vozIA, setVozIA] = useState(() => localStorage.getItem(VOZ_IA_KEY) || "Aoede");
  const [estadoVozIA, setEstadoVozIA] = useState("");
  const [velocidadVoz, setVelocidadVoz] = useState(cargarVelocidadVozGuardada);
  const [mostrarPanelVoz, setMostrarPanelVoz] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const utteranceRef = useRef(null);
  const sintetizadorIARef = useRef(null);
  const audioIARef = useRef(null);
  const urlAudioIARef = useRef(null);
  const contextoAudioIARef = useRef(null);
  const fuenteAudioIARef = useRef(null);
  const fragmentosVozRef = useRef([]);
  const indiceFragmentoVozRef = useRef(0);
  const sesionVozRef = useRef(0);
  const leerDesdeClickRef = useRef(null);
  const leerSeleccionRef = useRef(null);
  const elementoResaltadoRef = useRef(null);
  const avanzandoAutomaticamenteRef = useRef(false);
  const cambiandoPaginaConAudioRef = useRef(false);
  const leyendoEnVozRef = useRef(false);
  const palabraTimerRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragEnCursoRef = useRef(false);

  useEffect(() => {
    leyendoEnVozRef.current = leyendoEnVoz;
  }, [leyendoEnVoz]);

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
    const cargarVoces = () => {
      const voces = window.speechSynthesis.getVoices();
      if (voces.length > 0) {
        setVocesDisponibles(voces);
        const preferenciaGuardada = localStorage.getItem(VOZ_KEY);
        const vozGuardadaExiste = voces.some((voz) => voz.voiceURI === preferenciaGuardada);
        if (preferenciaGuardada === null || (preferenciaGuardada && !vozGuardadaExiste)) {
          const vozPreferida = elegirVozEspanol(voces);
          if (vozPreferida) {
            setVozSeleccionada(vozPreferida.voiceURI);
            localStorage.setItem(VOZ_KEY, vozPreferida.voiceURI);
          }
        }
      }
    };
    cargarVoces();
    window.speechSynthesis.addEventListener("voiceschanged", cargarVoces);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargarVoces);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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
          if (cancelado) return;
          const seleccion = contents.window.getSelection();
          const texto = seleccion?.toString()?.trim();
          if (!texto) return;
          const elementoSeleccionado = seleccion?.anchorNode?.parentElement;
          if (libroId) {
            const nuevoMarcador = { cfi: cfiRange, texto: texto.slice(0, 500), fecha: new Date().toISOString() };
            try {
              rendition.annotations.add("highlight", cfiRange, {}, null, "epub-marcador", {
                fill: "#f5c518",
                "fill-opacity": "0.35",
                "mix-blend-mode": "multiply",
              });
            } catch {}
            agregarMarcadorLibro(libroId, nuevoMarcador).catch(() => {});
            setMarcadoresLocal((prev) => [...prev, nuevoMarcador]);
          }
          leerSeleccionRef.current?.(texto, elementoSeleccionado);
          seleccion?.removeAllRanges();
        });

        // "Toca para leer desde aquí": un clic simple (sin arrastrar, eso
        // ya dispara "selected" arriba) en cualquier parte del texto hace
        // que la voz empiece a leer desde ese punto exacto en vez de
        // desde el inicio de la página.
        rendition.on("rendered", (section, view) => {
          if (cancelado || !view?.document) return;
          view.document.addEventListener("click", (e) => {
            if (view.document.getSelection()?.toString()?.trim()) return;
            leerDesdeClickRef.current?.(view.document, e.clientX, e.clientY, e.target);
          });
        });

        rendition.on("relocated", (location) => {
          if (cancelado) return;
          // Si el audio está activo o pasando de página automáticamente, NO cancelamos el audio
          if (!cambiandoPaginaConAudioRef.current && !avanzandoAutomaticamenteRef.current && !leyendoEnVozRef.current) {
            sesionVozRef.current += 1;
            window.speechSynthesis.cancel();
            fragmentosVozRef.current = [];
            indiceFragmentoVozRef.current = 0;
            elementoResaltadoRef.current = null;
            setTextoFragmentoActual("");
            setPalabraActualIndex(0);
            setLeyendoEnVoz(false);
          }
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
      sesionVozRef.current += 1;
      window.speechSynthesis.cancel();
      limpiarAudioIA();
      fragmentosVozRef.current = [];
      indiceFragmentoVozRef.current = 0;
      elementoResaltadoRef.current = null;
      if (guardarTimeoutRef.current) clearTimeout(guardarTimeoutRef.current);
      if (cfiActualRef.current && libroId) {
        updateLibro(libroId, { ultimaPosicion: cfiActualRef.current, progresoPct: progresoActualRef.current }).catch(() => {});
      }
      renditionRef.current?.destroy();
      bookRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubUrl]);

  const SELECTOR_PARRAFO = "p, li, h1, h2, h3, h4, h5, h6, blockquote";

  const quitarResaltado = () => {
    if (elementoResaltadoRef.current) {
      quitarResaltadoPalabra(elementoResaltadoRef.current);
      elementoResaltadoRef.current.style.backgroundColor = "";
      elementoResaltadoRef.current = null;
    }
  };

  const asegurarVisibilidadElemento = (el) => {
    if (!el || !renditionRef.current) return;
    try {
      const doc = el.ownerDocument;
      const win = doc?.defaultView;
      if (!win) return;
      const rect = el.getBoundingClientRect();
      const winW = win.innerWidth || doc.documentElement.clientWidth;
      const winH = win.innerHeight || doc.documentElement.clientHeight;

      // Si el elemento está fuera del viewport (ej. en la siguiente columna/página del epub)
      const fueraDeVista =
        rect.left >= winW - 30 ||
        rect.right <= 10 ||
        rect.top >= winH - 20 ||
        rect.bottom <= 10;

      if (fueraDeVista) {
        const contents = renditionRef.current?.getContents();
        const content = contents?.[contents.length - 1];
        if (content && typeof content.cfiFromNode === "function") {
          const cfi = content.cfiFromNode(el);
          if (cfi) {
            cambiandoPaginaConAudioRef.current = true;
            renditionRef.current.display(cfi).then(() => {
              setTimeout(() => {
                cambiandoPaginaConAudioRef.current = false;
              }, 200);
            }).catch(() => {
              cambiandoPaginaConAudioRef.current = false;
            });
            return;
          }
        }
      }
      el.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
    } catch (e) {
      el.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
    }
  };

  const resaltarElemento = (el) => {
    if (elementoResaltadoRef.current && elementoResaltadoRef.current !== el) {
      elementoResaltadoRef.current.style.backgroundColor = "";
      elementoResaltadoRef.current.style.boxShadow = "";
      elementoResaltadoRef.current.style.borderRadius = "";
    }
    if (el) {
      el.style.transition = "all 0.25s ease";
      el.style.backgroundColor = "rgba(245, 197, 24, 0.3)";
      el.style.boxShadow = "0 0 0 3px rgba(245, 197, 24, 0.2)";
      el.style.borderRadius = "4px";
      asegurarVisibilidadElemento(el);
    }
    elementoResaltadoRef.current = el;
  };

  // Quita el resaltado de la palabra actual (deshace el <span> que se
  // insertó, dejando el texto tal cual estaba).
  const quitarResaltadoPalabra = (elemento) => {
    if (!elemento) return;
    const actual = elemento.querySelector?.(".voz-palabra-actual");
    if (actual) {
      const padre = actual.parentNode;
      while (actual.firstChild) padre.insertBefore(actual.firstChild, actual);
      padre.removeChild(actual);
      padre.normalize();
    }
  };

  // Resalta la palabra exacta que se está pronunciando dentro del párrafo,
  // usando la posición que reporta el navegador (evento "boundary" de
  // SpeechSynthesisUtterance). Si la palabra cruza varios nodos de texto
  // (ej. texto en negrita a mitad de palabra), simplemente no la resalta —
  // el resaltado del párrafo completo sigue funcionando igual.
  const resaltarPalabraEnElemento = (elemento, charIndex, charLength) => {
    if (!elemento) return;
    quitarResaltadoPalabra(elemento);

    const doc = elemento.ownerDocument;
    const walker = doc.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    let acumulado = 0;
    let nodoInicio = null;
    let offsetInicio = 0;
    let nodo;
    while ((nodo = walker.nextNode())) {
      const len = nodo.textContent.length;
      if (acumulado + len > charIndex) {
        nodoInicio = nodo;
        offsetInicio = charIndex - acumulado;
        break;
      }
      acumulado += len;
    }
    if (!nodoInicio) return;

    let longitud = charLength;
    if (!longitud) {
      const resto = nodoInicio.textContent.slice(offsetInicio);
      const coincidencia = resto.match(/^\S+/);
      longitud = coincidencia ? coincidencia[0].length : 1;
    }

    try {
      const range = doc.createRange();
      range.setStart(nodoInicio, offsetInicio);
      range.setEnd(nodoInicio, Math.min(offsetInicio + longitud, nodoInicio.textContent.length));
      const span = doc.createElement("span");
      span.className = "voz-palabra-actual";
      span.style.background = "#f5c518";
      span.style.color = "#1a1a1a";
      span.style.borderRadius = "3px";
      span.style.padding = "0 1px";
      range.surroundContents(span);
    } catch (err) {
      // La palabra cruza dos nodos de texto (ej. formato mixto) — no se
      // puede envolver limpiamente, se omite el resaltado de esa palabra.
    }
  };

  // Arma la lista de fragmentos a leer de una página, a nivel de párrafo
  // (no de todo el texto junto) — cada fragmento recuerda a qué elemento
  // del DOM pertenece, para poder resaltarlo mientras se lee. Los párrafos
  // muy largos se dividen además por oración (por el límite de Chrome),
  // pero conservan el mismo elemento para el resaltado.
  const obtenerFragmentosDePagina = (doc) => {
    const candidatos = Array.from(doc.querySelectorAll(SELECTOR_PARRAFO));
    const fragmentos = [];
    for (const el of candidatos) {
      if (el.querySelector(SELECTOR_PARRAFO)) continue; // evita contenedores duplicados
      const texto = el.textContent.trim();
      if (!texto) continue;
      const oraciones = (texto.match(/[^.!?\n]+[.!?\n]*/g) || [texto]).map((s) => s.trim()).filter(Boolean);
      for (const oracion of oraciones) {
        fragmentos.push({ texto: oracion, elemento: el });
      }
    }
    return fragmentos;
  };

  const pausadoRef = useRef(false);

  const limpiarAudioIA = () => {
    if (fuenteAudioIARef.current) {
      fuenteAudioIARef.current.onended = null;
      try { fuenteAudioIARef.current.stop(); } catch {}
      fuenteAudioIARef.current.disconnect();
      fuenteAudioIARef.current = null;
    }
    if (audioIARef.current) {
      audioIARef.current.pause();
      audioIARef.current.onended = null;
      audioIARef.current.onerror = null;
      audioIARef.current.removeAttribute("src");
      audioIARef.current.load();
      audioIARef.current = null;
    }
    if (urlAudioIARef.current) {
      URL.revokeObjectURL(urlAudioIARef.current);
      urlAudioIARef.current = null;
    }
  };

  const detenerVoz = () => {
    sesionVozRef.current += 1;
    avanzandoAutomaticamenteRef.current = false;
    cambiandoPaginaConAudioRef.current = false;
    pausadoRef.current = false;
    if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
    window.speechSynthesis.cancel();
    limpiarAudioIA();
    fragmentosVozRef.current = [];
    indiceFragmentoVozRef.current = 0;
    setTextoFragmentoActual("");
    setPalabraActualIndex(0);
    quitarResaltado();
    setLeyendoEnVoz(false);
    setEstadoVozIA("");
  };

  // Cuando se termina de leer toda la página, avanza automáticamente a la
  // siguiente y sigue leyendo sin interrupciones.
  const avanzarPaginaYSeguirLeyendo = (sesion) => {
    if (sesion !== sesionVozRef.current || !renditionRef.current) {
      setLeyendoEnVoz(false);
      return;
    }
    quitarResaltado();
    avanzandoAutomaticamenteRef.current = true;
    cambiandoPaginaConAudioRef.current = true;
    renditionRef.current
      .next()
      .then(() => {
        setTimeout(() => {
          avanzandoAutomaticamenteRef.current = false;
          cambiandoPaginaConAudioRef.current = false;
          if (sesion !== sesionVozRef.current) return;
          const contents = renditionRef.current?.getContents();
          const contentActual = contents?.[contents.length - 1];
          const nuevosFragmentos = contentActual?.document ? obtenerFragmentosDePagina(contentActual.document) : [];
          if (nuevosFragmentos.length === 0) {
            // Reintento rápido por si el DOM tardó en poblarse
            setTimeout(() => {
              if (sesion !== sesionVozRef.current) return;
              const contents2 = renditionRef.current?.getContents();
              const content2 = contents2?.[contents2.length - 1];
              const frags2 = content2?.document ? obtenerFragmentosDePagina(content2.document) : [];
              if (frags2.length > 0) {
                fragmentosVozRef.current = frags2;
                indiceFragmentoVozRef.current = 0;
                hablarSiguienteFragmento(sesion);
              } else {
                setLeyendoEnVoz(false);
              }
            }, 300);
            return;
          }
          fragmentosVozRef.current = nuevosFragmentos;
          indiceFragmentoVozRef.current = 0;
          hablarSiguienteFragmento(sesion);
        }, 220);
      })
      .catch(() => {
        avanzandoAutomaticamenteRef.current = false;
        cambiandoPaginaConAudioRef.current = false;
        setLeyendoEnVoz(false);
      });
  };

  const guardarFragmentoVozTimeoutRef = useRef(null);

  const guardarFragmentoVoz = (texto) => {
    if (!libroId || !texto) return;
    if (guardarFragmentoVozTimeoutRef.current) clearTimeout(guardarFragmentoVozTimeoutRef.current);
    guardarFragmentoVozTimeoutRef.current = setTimeout(() => {
      updateLibro(libroId, { ultimoFragmentoVoz: texto.slice(0, 300) }).catch(() => {});
    }, 800);
  };

  const hablarFragmentoIA = async (frag, sesion) => {
    try {
      if (sesion !== sesionVozRef.current) return;
      setEstadoVozIA("Narrando con voz IA...");

      let audioBlob = null;
      try {
        const respuesta = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: frag.texto,
            voice: vozIA || "Aoede",
          }),
        });

        if (respuesta.ok) {
          const datos = await respuesta.json();
          if (datos.audioBase64) {
            const byteCharacters = atob(datos.audioBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            audioBlob = new Blob([byteArray], { type: datos.mimeType || "audio/wav" });
          }
        }
      } catch (errApi) {
        console.warn("No se pudo conectar con /api/tts, usando voz natural:", errApi);
      }

      if (sesion !== sesionVozRef.current) return;

      // Si no hay backend (ej. en despliegue estático de GitHub Pages sin servidor),
      // se utiliza la mejor voz natural de español del navegador para garantizar lectura fluida
      if (!audioBlob) {
        const esFemenina = ["Aoede", "Kore"].includes(vozIA) || vozIA.startsWith("F");
        let vozCandidata = null;

        if (esFemenina) {
          vozCandidata = vocesDisponibles.find(
            (v) =>
              v.lang?.toLowerCase().startsWith("es") &&
              /(dalia|elvira|monica|paulina|helena|sabina|lucia|female|mujer|femenin|zira|eva|rosa|camila|sofia|laura|ana)/i.test(v.name)
          );
        } else {
          vozCandidata = vocesDisponibles.find(
            (v) =>
              v.lang?.toLowerCase().startsWith("es") &&
              /(jorge|alvaro|alonso|male|hombre|masculin|david|pablo|diego|carlos|miguel|manuel|raul)/i.test(v.name)
          );
        }

        if (!vozCandidata) {
          vozCandidata = vocesDisponibles.find(esVozNaturalEspanol) || elegirVozEspanol(vocesDisponibles);
        }

        const utterance = new SpeechSynthesisUtterance(frag.texto);
        utterance.lang = vozCandidata?.lang || "es-MX";
        // Diferenciación acústica clara de género: tono agudo y melodioso para femenina, grave para masculina
        utterance.pitch = esFemenina ? 1.18 : 0.86;
        utterance.rate = Math.max(0.85, Math.min(1.25, velocidadVoz * (esFemenina ? 1.02 : 0.98)));
        if (vozCandidata) utterance.voice = vozCandidata;

        utterance.onboundary = (event) => {
          if (event.name && event.name !== "word") return;
          const charIndex = event.charIndex;
          const palabrasList = (frag.texto || "").split(/\s+/);
          let acum = 0;
          let wIdx = 0;
          for (let w = 0; w < palabrasList.length; w++) {
            if (acum + palabrasList[w].length >= charIndex) {
              wIdx = w;
              break;
            }
            acum += palabrasList[w].length + 1;
          }
          setPalabraActualIndex(wIdx);
          resaltarPalabraEnElemento(frag.elemento, event.charIndex, event.charLength);
        };
        utterance.onend = () => {
          if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
          if (sesion !== sesionVozRef.current) return;
          quitarResaltadoPalabra(frag.elemento);
          indiceFragmentoVozRef.current += 1;
          hablarSiguienteFragmento(sesion);
        };
        utterance.onerror = () => {
          if (sesion === sesionVozRef.current) setLeyendoEnVoz(false);
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setLeyendoEnVoz(true);
        setEstadoVozIA("");
        return;
      }

      const url = URL.createObjectURL(audioBlob);
      urlAudioIARef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = velocidadVoz;
      audioIARef.current = audio;

      audio.onended = () => {
        if (sesion !== sesionVozRef.current) return;
        limpiarAudioIA();
        indiceFragmentoVozRef.current += 1;
        hablarSiguienteFragmento(sesion);
      };

      audio.onerror = () => {
        if (sesion !== sesionVozRef.current) return;
        limpiarAudioIA();
        pausadoRef.current = false;
        setEstadoVozIA("No se pudo reproducir el audio IA. Inténtalo de nuevo.");
        setLeyendoEnVoz(false);
      };

      setEstadoVozIA("");
      if (!pausadoRef.current) {
        await audio.play();
        if (sesion === sesionVozRef.current) setLeyendoEnVoz(true);
      }
    } catch (err) {
      if (sesion === sesionVozRef.current) {
        pausadoRef.current = false;
        setEstadoVozIA(`No se pudo iniciar la voz IA: ${err?.message || "error"}`);
        setLeyendoEnVoz(false);
        quitarResaltadoPalabra(frag.elemento);
      }
    }
  };

  const hablarSiguienteFragmento = (sesion) => {
    // Si cambió de página (u ocurrió otra cosa que incrementó la sesión)
    // mientras este fragmento terminaba de hablar, no continúa — evita que
    // una lectura vieja siga sonando después de cambiar de página.
    if (sesion !== sesionVozRef.current) return;
    const fragmentos = fragmentosVozRef.current;
    const i = indiceFragmentoVozRef.current;
    if (i >= fragmentos.length) {
      avanzarPaginaYSeguirLeyendo(sesion);
      return;
    }
    const frag = fragmentos[i];
    resaltarElemento(frag.elemento);
    setTextoFragmentoActual(frag.texto);
    setPalabraActualIndex(0);
    guardarFragmentoVoz(frag.texto);

    // Iniciar temporizador progresivo de palabras para sincronización visual en tiempo real
    if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
    const listaPalabras = (frag.texto || "").split(/\s+/).filter(Boolean);
    if (listaPalabras.length > 0) {
      const duracionEstimadaMs = Math.max(1200, (frag.texto.length * 60) / velocidadVoz);
      const msPorPalabra = Math.max(120, duracionEstimadaMs / listaPalabras.length);
      palabraTimerRef.current = setInterval(() => {
        setPalabraActualIndex((prev) => {
          if (prev + 1 >= listaPalabras.length) {
            clearInterval(palabraTimerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, msPorPalabra);
    }
    if (motorVoz === "ia") {
      hablarFragmentoIA(frag, sesion);
      return;
    }
    const vozElegida = vocesDisponibles.find((v) => v.voiceURI === vozSeleccionada);
    const utterance = new SpeechSynthesisUtterance(frag.texto);
    utterance.lang = vozElegida?.lang || "es-ES";
    utterance.rate = velocidadVoz;
    if (vozElegida) utterance.voice = vozElegida;
    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word") return;
      const charIndex = event.charIndex;
      const palabrasList = (frag.texto || "").split(/\s+/);
      let acum = 0;
      let wIdx = 0;
      for (let w = 0; w < palabrasList.length; w++) {
        if (acum + palabrasList[w].length >= charIndex) {
          wIdx = w;
          break;
        }
        acum += palabrasList[w].length + 1;
      }
      setPalabraActualIndex(wIdx);
      resaltarPalabraEnElemento(frag.elemento, event.charIndex, event.charLength);
    };
    utterance.onend = () => {
      if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
      if (sesion !== sesionVozRef.current) return;
      quitarResaltadoPalabra(frag.elemento);
      indiceFragmentoVozRef.current += 1;
      hablarSiguienteFragmento(sesion);
    };
    utterance.onerror = () => {
      if (sesion === sesionVozRef.current) setLeyendoEnVoz(false);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const iniciarLecturaDeFragmentos = (fragmentos) => {
    if (!fragmentos || fragmentos.length === 0) return;
    // Activar el contexto durante el gesto del usuario permite reproducir el
    // audio IA aunque la descarga y la síntesis terminen unos segundos después.
    if (motorVoz === "ia" && typeof window !== "undefined") {
      const ContextoAudio = window.AudioContext || window.webkitAudioContext;
      if (ContextoAudio && !contextoAudioIARef.current) contextoAudioIARef.current = new ContextoAudio();
      if (contextoAudioIARef.current?.state === "suspended") contextoAudioIARef.current.resume().catch(() => {});
    }
    sesionVozRef.current += 1;
    const sesionActual = sesionVozRef.current;
    window.speechSynthesis.cancel();
    limpiarAudioIA();
    fragmentosVozRef.current = fragmentos;
    indiceFragmentoVozRef.current = 0;
    setLeyendoEnVoz(true);
    hablarSiguienteFragmento(sesionActual);
  };

  const yaIntentoResumirVozRef = useRef(false);

  const alternarVoz = () => {
    if (leyendoEnVoz) {
      // Pausa de verdad (no detiene del todo) — usa pause() del navegador
      // para poder retomar exactamente a mitad de la oración donde quedó,
      // no solo desde el inicio del párrafo.
      pausadoRef.current = true;
      if (motorVoz === "ia" && contextoAudioIARef.current) contextoAudioIARef.current.suspend();
      else if (audioIARef.current) audioIARef.current.pause();
      else window.speechSynthesis.pause();
      setLeyendoEnVoz(false);
      return;
    }
    if (pausadoRef.current) {
      pausadoRef.current = false;
      if (fuenteAudioIARef.current && contextoAudioIARef.current) contextoAudioIARef.current.resume().catch((err) => setEstadoVozIA(err.message || "No se pudo reanudar el audio."));
      else if (audioIARef.current) audioIARef.current.play().catch((err) => setEstadoVozIA(err.message || "No se pudo reanudar el audio."));
      else window.speechSynthesis.resume();
      setLeyendoEnVoz(true);
      return;
    }
    if (motorVoz === "ia" && typeof window !== "undefined") {
      const ContextoAudio = window.AudioContext || window.webkitAudioContext;
      if (ContextoAudio && !contextoAudioIARef.current) contextoAudioIARef.current = new ContextoAudio();
      if (contextoAudioIARef.current?.state === "suspended") contextoAudioIARef.current.resume().catch(() => {});
    }
    const contents = renditionRef.current?.getContents();
    // getContents() puede devolver más de una vista si epub.js no limpió
    // la anterior — la vista realmente visible suele ser la última, no la
    // primera (que podría quedar de una página vieja/la introducción).
    const contentActual = contents?.[contents.length - 1];
    if (!contentActual?.document) return;
    const fragmentos = obtenerFragmentosDePagina(contentActual.document);

    // La primera vez que se toca "play" en esta sesión de lectura, intenta
    // retomar desde el mismo párrafo exacto donde se quedó la última vez
    // (guardado en ultimoFragmentoVoz), en vez de siempre desde el inicio
    // de la página.
    if (!yaIntentoResumirVozRef.current && ultimoFragmentoVoz) {
      yaIntentoResumirVozRef.current = true;
      const indiceGuardado = fragmentos.findIndex((f) => f.texto.trim() === ultimoFragmentoVoz.trim() || f.texto.trim().startsWith(ultimoFragmentoVoz.trim().slice(0, 60)));
      if (indiceGuardado > 0) {
        iniciarLecturaDeFragmentos(fragmentos.slice(indiceGuardado));
        return;
      }
    }
    yaIntentoResumirVozRef.current = true;
    iniciarLecturaDeFragmentos(fragmentos);
  };

  // "Toca para leer desde aquí" — encuentra el párrafo que se tocó y
  // empieza a leer desde ahí (en vez de desde el inicio de la página).
  const leerDesdeClick = (doc, x, y, targetEl) => {
    const fragmentos = obtenerFragmentosDePagina(doc);
    if (fragmentos.length === 0) return;
    const parrafoTocado = targetEl?.closest?.(SELECTOR_PARRAFO);
    const indiceInicio = parrafoTocado ? fragmentos.findIndex((f) => f.elemento === parrafoTocado) : 0;
    iniciarLecturaDeFragmentos(fragmentos.slice(indiceInicio > 0 ? indiceInicio : 0));
  };

  const leerTextoSeleccionado = (texto, targetEl) => {
    const elemento = targetEl?.closest?.(SELECTOR_PARRAFO) || targetEl;
    const oraciones = (texto.match(/[^.!?\n]+[.!?\n]*/g) || [texto]).map((parte) => parte.trim()).filter(Boolean);
    iniciarLecturaDeFragmentos(oraciones.map((parte) => ({ texto: parte, elemento })));
  };

  useEffect(() => {
    leerDesdeClickRef.current = leerDesdeClick;
    leerSeleccionRef.current = leerTextoSeleccionado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });




  const handleCambiarVoz = (voiceURI) => {
    const estabaLeyendo = leyendoEnVoz;
    detenerVoz();
    setVozSeleccionada(voiceURI);
    localStorage.setItem(VOZ_KEY, voiceURI);
    if (estabaLeyendo) {
      setTimeout(() => {
        alternarVoz();
      }, 150);
    }
  };

  const handleCambiarMotorVoz = (motor) => {
    const estabaLeyendo = leyendoEnVoz;
    detenerVoz();
    setMotorVoz(motor);
    localStorage.setItem(MOTOR_VOZ_KEY, motor);
    if (estabaLeyendo) {
      setTimeout(() => {
        alternarVoz();
      }, 150);
    }
  };

  const handleCambiarVozIA = (id) => {
    const estabaLeyendo = leyendoEnVoz;
    detenerVoz();
    setVozIA(id);
    localStorage.setItem(VOZ_IA_KEY, id);
    if (estabaLeyendo) {
      setTimeout(() => {
        alternarVoz();
      }, 150);
    }
  };

  const handleCambiarVelocidadVoz = (valor) => {
    setVelocidadVoz(valor);
    localStorage.setItem(VELOCIDAD_VOZ_KEY, String(valor));
    if (leyendoEnVoz) {
      detenerVoz();
      setTimeout(alternarVoz, 150);
    }
  };

  const alternarPantallaCompleta = () => {
    if (!document.fullscreenElement) {
      contenedorRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const irA = (href) => {
    renditionRef.current?.display(href);
    setMostrarIndice(false);
  };

  const saltarSiguienteFragmento = () => {
    if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
    window.speechSynthesis.cancel();
    limpiarAudioIA();
    indiceFragmentoVozRef.current += 1;
    hablarSiguienteFragmento(sesionVozRef.current);
  };

  const reproducirFragmentoAnterior = () => {
    if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
    window.speechSynthesis.cancel();
    limpiarAudioIA();
    indiceFragmentoVozRef.current = Math.max(0, indiceFragmentoVozRef.current - 1);
    hablarSiguienteFragmento(sesionVozRef.current);
  };

  const cambiarPagina = (direccion) => {
    if (!renditionRef.current) return;

    // Si el usuario está leyendo con audio, NO se detiene la lectura:
    // Pasamos a la siguiente página y continuamos narrando fluidamente!
    if (leyendoEnVoz) {
      cambiandoPaginaConAudioRef.current = true;
      setTransicion(direccion);
      if (palabraTimerRef.current) clearInterval(palabraTimerRef.current);
      window.speechSynthesis.cancel();
      limpiarAudioIA();
      const accion = direccion === "adelante" ? renditionRef.current.next() : renditionRef.current.prev();
      accion
        .then(() => {
          setTimeout(() => {
            setTransicion(null);
            cambiandoPaginaConAudioRef.current = false;
            sesionVozRef.current += 1;
            const sesionActual = sesionVozRef.current;
            const contents = renditionRef.current?.getContents();
            const contentActual = contents?.[contents.length - 1];
            if (contentActual?.document) {
              const nuevosFragmentos = obtenerFragmentosDePagina(contentActual.document);
              if (nuevosFragmentos.length > 0) {
                fragmentosVozRef.current = nuevosFragmentos;
                indiceFragmentoVozRef.current = 0;
                setLeyendoEnVoz(true);
                hablarSiguienteFragmento(sesionActual);
                return;
              }
            }
          }, 240);
        })
        .catch(() => {
          setTransicion(null);
          cambiandoPaginaConAudioRef.current = false;
        });
      return;
    }

    setTransicion(direccion);
    setTimeout(() => {
      if (direccion === "adelante") renditionRef.current?.next();
      else renditionRef.current?.prev();
      setTransicion(null);
    }, 180);
  };

  const handlePointerDownViewer = (e) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragEnCursoRef.current = false;
  };

  const handlePointerMoveViewer = (e) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    // Solo se considera arrastre horizontal si el movimiento en X supera
    // claramente al de Y — evita interferir con el scroll vertical normal.
    if (!dragEnCursoRef.current && Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      dragEnCursoRef.current = true;
    }
  };

  const handlePointerUpViewer = (e) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    dragStartRef.current = null;
    if (!dragEnCursoRef.current) return;
    dragEnCursoRef.current = false;
    const UMBRAL = 50;
    if (deltaX < -UMBRAL) cambiarPagina("adelante"); // deslizó hacia la izquierda
    else if (deltaX > UMBRAL) cambiarPagina("atras"); // deslizó hacia la derecha
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
    <div
      ref={contenedorRef}
      style={
        minimizado
          ? { position: "fixed", bottom: 16, right: 16, width: 360, height: 64, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, zIndex: 1100, boxShadow: "0 6px 24px rgba(0,0,0,0.25)", overflow: "hidden" }
          : { position: "fixed", inset: 0, background: "var(--paper)", zIndex: 1100, display: "flex", flexDirection: "column" }
      }
    >
      {minimizado && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
            background: "var(--card)",
            zIndex: 1,
          }}
        >
          {portadaUrl ? (
            <img
              src={portadaUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {titulo?.charAt(0)?.toUpperCase() || "📖"}
            </div>
          )}
          <button
            onClick={alternarVoz}
            title={leyendoEnVoz ? "Pausar" : "Reanudar"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "var(--sage)", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}
          >
            {leyendoEnVoz ? <Pause size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={() => cambiarPagina("atras")}
            title="Página anterior"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0 }}
          >
            <ChevronLeft size={14} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {textoFragmentoActual || titulo}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>
              {leyendoEnVoz ? "🔊 Narrando texto…" : "En pausa"} · {progreso}%
            </div>
          </div>
          <button
            onClick={() => cambiarPagina("adelante")}
            title="Página siguiente"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0 }}
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setMinimizado(false)}
            title="Expandir"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0 }}
          >
            <Maximize size={13} />
          </button>
          <button
            onClick={() => {
              detenerVoz();
              onClose();
            }}
            title="Cerrar"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        </div>
      )}
      <div style={{ display: minimizado ? "none" : "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(10px + env(safe-area-inset-top, 0px)) 14px 10px", borderBottom: "1px solid var(--line)", background: "var(--card)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titulo}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{progreso}%</span>
          <button
            onClick={alternarVoz}
            title={leyendoEnVoz ? "Pausar lectura en voz alta" : "Leer esta página en voz alta"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              background: leyendoEnVoz ? "var(--sage-bg)" : "transparent",
              border: `1px solid ${leyendoEnVoz ? "var(--sage)" : "var(--line)"}`,
              borderRadius: 8,
              color: leyendoEnVoz ? "var(--sage)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {leyendoEnVoz ? <Pause size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            onClick={() => setMostrarPanelVoz((s) => !s)}
            title="Ajustes de voz"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <Settings2 size={15} />
          </button>
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
            onClick={alternarPantallaCompleta}
            title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            {pantallaCompleta ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
          <button
            onClick={() => setMinimizado(true)}
            title="Minimizar (seguir escuchando en segundo plano)"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <ChevronDown size={15} />
          </button>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink-soft)", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div
        style={{ display: minimizado ? "none" : "block", flex: 1, position: "relative", overflow: "hidden" }}
        onPointerDown={handlePointerDownViewer}
        onPointerMove={handlePointerMoveViewer}
        onPointerUp={handlePointerUpViewer}
        onPointerCancel={() => {
          dragStartRef.current = null;
          dragEnCursoRef.current = false;
        }}
      >
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
        <div
          ref={viewerRef}
          style={{
            width: "100%",
            maxWidth: 720,
            height: "100%",
            margin: "0 auto",
            transition: transicion ? "transform 0.18s ease, opacity 0.18s ease" : "none",
            transform: transicion === "adelante" ? "translateX(-18px)" : transicion === "atras" ? "translateX(18px)" : "translateX(0)",
            opacity: transicion ? 0.4 : 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: (100 - brillo) / 100,
            pointerEvents: "none",
          }}
        />

        {/* BARRA FLOTANTE DE LECTURA SINCRONIZADA Y SUBTÍTULOS (KARAOKE TELEPROMPTER) */}
        {leyendoEnVoz && textoFragmentoActual && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(660px, calc(100% - 24px))",
              background: "rgba(15, 23, 42, 0.94)",
              backdropFilter: "blur(12px)",
              color: "#ffffff",
              padding: "12px 16px",
              borderRadius: 14,
              boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.18)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              transition: "all 0.2s ease",
            }}
          >
            {/* Cabecera */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                <span>Audio en sincronía</span>
                <span>·</span>
                <span className="despensa-mono">
                  Frase {indiceFragmentoVozRef.current + 1} de {fragmentosVozRef.current.length || 1}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="despensa-mono">{velocidadVoz}x</span>
                <button
                  onClick={detenerVoz}
                  title="Detener audio"
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13, padding: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Texto en tiempo real con efecto Karaoke / Teleprompter */}
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.55,
                fontWeight: 500,
                maxHeight: 70,
                overflowY: "auto",
                textAlign: "left",
                color: "#e2e8f0",
              }}
            >
              {textoFragmentoActual.split(/\s+/).filter(Boolean).map((palabra, idx) => {
                const esActual = idx === palabraActualIndex;
                const yaLeida = idx < palabraActualIndex;
                return (
                  <span
                    key={idx}
                    style={{
                      display: "inline-block",
                      marginRight: 4,
                      padding: "1px 3px",
                      borderRadius: 4,
                      transition: "all 0.12s ease",
                      color: esActual ? "#ffffff" : yaLeida ? "#94a3b8" : "#cbd5e1",
                      backgroundColor: esActual ? "#059669" : "transparent",
                      fontWeight: esActual ? 700 : yaLeida ? 400 : 500,
                      transform: esActual ? "scale(1.04)" : "scale(1)",
                    }}
                  >
                    {palabra}
                  </span>
                );
              })}
            </div>

            {/* Controles de avance rápido */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={reproducirFragmentoAnterior}
                  title="Frase anterior"
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "none",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  ⏮ Frase anterior
                </button>
                <button
                  onClick={alternarVoz}
                  title={leyendoEnVoz ? "Pausar" : "Reanudar"}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {leyendoEnVoz ? <Pause size={12} /> : <Volume2 size={12} />}
                  {leyendoEnVoz ? "Pausar" : "Seguir"}
                </button>
                <button
                  onClick={saltarSiguienteFragmento}
                  title="Siguiente frase"
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "none",
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  Siguiente frase ⏭
                </button>
              </div>

              <button
                onClick={() => cambiarPagina("adelante")}
                title="Pasar a la siguiente página sin pausar el audio"
                style={{
                  padding: "4px 9px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.15)",
                  color: "#38bdf8",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Página siguiente ➔
              </button>
            </div>
          </div>
        )}

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

        {mostrarPanelVoz && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 260, maxWidth: "85%", background: "var(--card)", borderLeft: "1px solid var(--line)", overflowY: "auto", padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: "var(--ink-soft)" }}>Ajustes de voz</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>Motor de lectura</div>
              <select
                value={motorVoz}
                onChange={(e) => handleCambiarMotorVoz(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--paper)" }}
              >
                <option value="ia">✨ Voz IA casi real (Gemini) · Gratis</option>
                <option value="dispositivo">Voz del dispositivo / navegador</option>
              </select>

              {motorVoz === "ia" ? (
                <>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 7, lineHeight: 1.45 }}>
                    Narración con inteligencia artificial acústica casi humana. Totalmente gratuita, sin descargas pesadas y con modulación natural.
                  </div>
                  <select
                    value={vozIA}
                    onChange={(e) => handleCambiarVozIA(e.target.value)}
                    style={{ width: "100%", marginTop: 8, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--paper)" }}
                  >
                    {VOCES_IA.map((voz) => <option key={voz.id} value={voz.id}>{voz.label}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: "var(--sage)", marginTop: 7, lineHeight: 1.4, fontWeight: 500 }}>
                    ✓ Generación instantánea · Calidad de audiolibro
                  </div>
                  {estadoVozIA && (
                    <div role="status" style={{ fontSize: 10.5, color: estadoVozIA.startsWith("No se pudo") || estadoVozIA.startsWith("Error") ? "var(--stamp)" : "var(--sage)", marginTop: 8, lineHeight: 1.4 }}>
                      {estadoVozIA}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 7, marginBottom: 6, lineHeight: 1.4 }}>
                    Usa gratis las voces instaladas en tu equipo.
                  </div>
                  {!vocesDisponibles.some(esVozNaturalEspanol) && (
                    <div style={{ fontSize: 10.5, color: "var(--amber)", marginBottom: 6, lineHeight: 1.4 }}>
                      No se encontró una voz natural en español. En Windows puedes agregar una desde Narrador con Win + Ctrl + N.
                    </div>
                  )}
                  <select
                    value={vozSeleccionada}
                    onChange={(e) => handleCambiarVoz(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, background: "var(--paper)" }}
                  >
                    <option value="">Predeterminada del dispositivo</option>
                    {vocesDisponibles.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}{esVozNaturalEspanol(v) ? " · Natural/IA" : ""} ({v.lang})
                      </option>
                    ))}
                  </select>
                  {vocesDisponibles.length === 0 && (
                    <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 6 }}>
                      Cargando voces disponibles del dispositivo…
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>Velocidad</span>
                <span className="despensa-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{velocidadVoz.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={velocidadVoz}
                onChange={(e) => handleCambiarVelocidadVoz(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
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

      <div style={{ display: minimizado ? "none" : "flex", flexDirection: "column", borderTop: "1px solid var(--line)", background: "var(--card)" }}>
        {totalPaginas != null && paginaActual != null && (
          <div style={{ textAlign: "center", padding: "6px 0 0", fontSize: 11, color: "var(--ink-soft)" }} className="despensa-mono">
            Página {paginaActual} de {totalPaginas}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px" }}>
          <button
            onClick={() => cambiarPagina("atras")}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button
            onClick={() => cambiarPagina("adelante")}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 16px", fontSize: 12.5, fontWeight: 500, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", cursor: "pointer" }}
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
