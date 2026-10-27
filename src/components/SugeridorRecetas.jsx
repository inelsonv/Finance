import React, { useState, useMemo } from "react";
import {
  Sparkles,
  UtensilsCrossed,
  Clock,
  ChefHat,
  ShoppingCart,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Flame,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { agregarItemsABorrador, addProduct } from "../lib/db";

const TIPOS_COMIDA = ["Todos", "Desayuno", "Almuerzo", "Cena", "Snack"];
const TIEMPOS = [
  { label: "15 min (Exprés)", valor: 15 },
  { label: "30 min (Rápido)", valor: 30 },
  { label: "45 min (Estándar)", valor: 45 },
  { label: "60+ min (Elaborado)", valor: 60 },
];
const ESTILOS = ["Económico (Ahorro)", "Saludable y Balanceado", "Fácil (Pocos pasos)", "Reconfortante"];

async function buscarImagenWikipediaCliente(termino) {
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(termino)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      const first = Object.values(pages)[0];
      if (first?.thumbnail?.source) return first.thumbnail.source;
    }
  } catch {}
  return null;
}

async function generarRecetasClienteFallback(productosDisponibles, ingredientesExtra) {
  const nombresDisponibles = productosDisponibles.map((p) => p.name || p.nombre || "");
  const todosTexto = (nombresDisponibles.join(" ") + " " + (ingredientesExtra || "")).toLowerCase();

  const tieneHuevo = todosTexto.includes("huevo");
  const tienePapa = todosTexto.includes("papa") || todosTexto.includes("patata");
  const tieneArroz = todosTexto.includes("arroz");
  const tieneTomate = todosTexto.includes("tomate");
  const tieneCebolla = todosTexto.includes("cebolla");
  const tienePasta = todosTexto.includes("pasta") || todosTexto.includes("fideo") || todosTexto.includes("espagueti");
  const tieneAtun = todosTexto.includes("atun") || todosTexto.includes("atún");
  const tienePollo = todosTexto.includes("pollo") || todosTexto.includes("carne");
  const tieneQueso = todosTexto.includes("queso");
  const tienePan = todosTexto.includes("pan");

  const listos = [];
  const pocosExtra = [];

  if (tieneHuevo && tienePapa) {
    listos.push({
      id: "tortilla-patatas",
      titulo: "Tortilla de Patatas Clásica",
      descripcion: "El gran clásico de la cocina económica: nutritiva, saciante y perfecta para cualquier hora.",
      tipoComida: "Almuerzo o Cena",
      tiempoMinutos: 25,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Tortilla de patatas",
      ingredientesDisponibles: ["Huevos", "Papas", "Aceite", "Sal"],
      pasos: [
        "Pela y corta las patatas en rodajas finas.",
        "Fríe o pocha las patatas en una sartén con aceite a fuego medio hasta que estén tiernas.",
        "Bate los huevos en un bol grande con un toque de sal e incorpora las patatas escurridas.",
        "Cuaja en la sartén durante 3-4 minutos por lado hasta que dore a tu gusto.",
      ],
      consejoAhorro: "Aprovecha el aceite de freír las patatas colándolo para futuros guisos o sofritos.",
    });
  } else if (tieneHuevo && tieneTomate) {
    listos.push({
      id: "shakshuka-express",
      titulo: "Shakshuka de Tomate y Huevos Pochados",
      descripcion: "Huevos cocinados en un sofrito aromático de tomate y condimentos. Delicioso para untar con pan.",
      tipoComida: "Cena o Desayuno",
      tiempoMinutos: 20,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Shakshuka",
      ingredientesDisponibles: ["Huevos", "Tomates", "Aceite", "Sal", "Ajo"],
      pasos: [
        "Sofríe ajo o cebolla picada en una sartén con aceite.",
        "Agrega los tomates troceados y cocina a fuego suave hasta que se forme una salsa espesa.",
        "Haz pequeños huecos en la salsa y rompe los huevos dentro.",
        "Tapa la sartén 4 minutos hasta que las claras estén listas y la yema permanezca cremosa.",
      ],
      consejoAhorro: "Usa los tomates más maduros para obtener una salsa mucho más dulce y rendidora.",
    });
  }

  if (tieneArroz) {
    listos.push({
      id: "arroz-salteado",
      titulo: "Arroz Salteado con Huevos y Verduras",
      descripcion: "Un salteado rápido de arroz estilo oriental, ultra económico y muy versátil.",
      tipoComida: "Almuerzo",
      tiempoMinutos: 15,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Arroz frito",
      ingredientesDisponibles: ["Arroz", tieneHuevo ? "Huevos" : null, tieneTomate ? "Tomates" : null].filter(Boolean),
      pasos: [
        "Cocina el arroz blanco o aprovecha arroz que haya sobrado de días previos.",
        "Saltea en sartén caliente con aceite y ajo o condimentos que tengas.",
        tieneHuevo ? "Empuja el arroz a un lado, casca los huevos y revuelve hasta que cuajen." : "Saltea con las verduras a fuego vivo.",
        "Integra todo y sazona con sal o salsa de soja.",
      ],
      consejoAhorro: "El arroz de la víspera en la nevera queda aún más crujiente y suelto al saltearlo.",
    });
  }

  if (tienePasta) {
    listos.push({
      id: "pasta-ajo-aceite",
      titulo: "Pasta al Ajillo y Aceite de Oliva",
      descripcion: "Un plato italiano legendario (Aglio e Olio) que cuesta centavos y sabe a restaurante gourmet.",
      tipoComida: "Almuerzo o Cena",
      tiempoMinutos: 15,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Spaghetti aglio e olio",
      ingredientesDisponibles: ["Pasta", "Aceite de oliva", "Ajo", "Sal"],
      pasos: [
        "Hierve la pasta en abundante agua con sal hasta que esté al dente.",
        "En una sartén dora láminas de ajo en aceite a fuego bajo sin quemarlo.",
        "Escurre la pasta reservando media taza de agua de cocción.",
        "Mezcla la pasta con el aceite aromatizado y un chorrito del agua para crear una emulsión sedosa.",
      ],
      consejoAhorro: "El agua con almidón de la pasta es el secreto de los chefs para salsas sedosas sin gastar crema.",
    });
  }

  if (tienePan && tieneQueso) {
    listos.push({
      id: "sandwich-tostado",
      titulo: "Tostado Crocante de Queso",
      descripcion: "Sándwich dorado y crocante por fuera, con queso fundido por dentro.",
      tipoComida: "Desayuno o Merienda",
      tiempoMinutos: 10,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Grilled cheese sandwich",
      ingredientesDisponibles: ["Pan", "Queso", "Aceite"],
      pasos: [
        "Arma el sándwich con el queso entre las rodajas de pan.",
        "Dora en la sartén a fuego medio con una gota de aceite o mantequilla.",
        "Tapa 2 minutos para que el queso se derrita a la perfección.",
      ],
      consejoAhorro: "Ideal para aprovechar pan del día anterior que haya perdido frescura.",
    });
  }

  // Platos con pocos ingredientes extra
  if (!tienePollo) {
    pocosExtra.push({
      id: "pollo-salteado",
      titulo: "Salteado de Pollo con Verduras de Temporada",
      descripcion: "Proteína magra combinada con tus ingredientes disponibles para una comida nutritiva.",
      tiempoMinutos: 25,
      dificultad: "Media",
      terminoBusquedaImagen: "Chicken stir fry",
      ingredientesDisponibles: nombresDisponibles.slice(0, 3),
      ingredientesAComprar: [
        { nombre: "Pechuga de pollo", cantidadEstimada: "500g", categoria: "Carnes", unidad: "kg", precioEstimadoSugerido: 4.5 },
      ],
      pasos: [
        "Corta la pechuga en tiras y salpimienta.",
        "Dora a fuego fuerte en sartén con aceite.",
        "Incorpora las verduras o guarnición disponible y cocina 5 minutos más.",
      ],
    });
  }

  if (!tieneCebolla) {
    pocosExtra.push({
      id: "sofrito-guisado",
      titulo: "Guiso Casero con Sofrito Aromatizado",
      descripcion: "Añadiendo cebolla desbloqueas una base aromática para enriquecer arroces y legumbres.",
      tiempoMinutos: 30,
      dificultad: "Fácil",
      terminoBusquedaImagen: "Guiso casero",
      ingredientesDisponibles: nombresDisponibles.slice(0, 2),
      ingredientesAComprar: [
        { nombre: "Cebollas", cantidadEstimada: "1 kg", categoria: "Vegetales", unidad: "kg", precioEstimadoSugerido: 1.2 },
      ],
      pasos: [
        "Pica la cebolla y sofríela lentamente.",
        "Añade los ingredientes que tienes y cocina tapado a fuego lento.",
      ],
    });
  }

  const listaCompra = [
    { nombre: "Huevos", categoria: "Alimentos", unidad: "docena", motivo: "La proteína más versátil y económica para cualquier comida.", prioridad: "Alta", precioEstimado: 3.5 },
    { nombre: "Arroz", categoria: "Alimentos", unidad: "kg", motivo: "Carbohidrato base que rinde múltiples porciones.", prioridad: "Alta", precioEstimado: 1.8 },
    { nombre: "Cebollas", categoria: "Alimentos", unidad: "kg", motivo: "Base imprescindible para dar sabor a cualquier plato.", prioridad: "Media", precioEstimado: 1.2 },
    { nombre: "Tomates", categoria: "Alimentos", unidad: "kg", motivo: "Aportan humedad, frescura y salsas caseras naturales.", prioridad: "Media", precioEstimado: 2.0 },
    { nombre: "Lentejas secas", categoria: "Alimentos", unidad: "kg", motivo: "Legumbre de larga duración rica en fibra y hierro.", prioridad: "Media", precioEstimado: 2.2 },
  ];

  // Resolver imágenes en paralelo
  await Promise.all([
    ...listos.map(async (plato) => {
      plato.imagenUrl = await buscarImagenWikipediaCliente(plato.terminoBusquedaImagen || plato.titulo);
    }),
    ...pocosExtra.map(async (plato) => {
      plato.imagenUrl = await buscarImagenWikipediaCliente(plato.terminoBusquedaImagen || plato.titulo);
    }),
  ]);

  return {
    diagnosticoDespensa: `Hemos analizado ${productosDisponibles.length} productos de tu despensa. Tienes opciones prácticas y económicas para cocinar hoy sin necesidad de gastar en domicilios.`,
    platosListosParaCocinar: listos,
    platosConPocosIngredientesExtra: pocosExtra,
    listaCompraRecomendada: listaCompra,
    consejoGeneral: "Comprar ingredientes versátiles como huevos, arroz y cebolla te asegura tener siempre entre 4 y 6 platos distintos listos para armar en menos de 20 minutos.",
  };
}

export default function SugeridorRecetas({ products = [], ordenesCompra = [], onNavigate }) {
  // Filtrar productos que son alimentos o bebidas preferentemente
  const productosAlimentos = useMemo(() => {
    return products.filter((p) => {
      const cat = (p.category || "").toLowerCase();
      return cat.includes("alimento") || cat.includes("bebida") || !p.category;
    });
  }, [products]);

  // Si no hay categorías de alimentos definidas, usar todos los productos
  const listaDespensa = productosAlimentos.length > 0 ? productosAlimentos : products;

  // Estado de selección de ingredientes de la despensa
  const [seleccionados, setSeleccionados] = useState(() => {
    const ids = new Set();
    listaDespensa.slice(0, 15).forEach((p) => ids.add(p.id));
    return ids;
  });

  const [ingredientesExtra, setIngredientesExtra] = useState("Sal, pimienta, aceite de oliva, agua");
  const [tipoComida, setTipoComida] = useState("Todos");
  const [tiempoMaximo, setTiempoMaximo] = useState(30);
  const [estilo, setEstilo] = useState("Económico (Ahorro)");
  const [comensales, setComensales] = useState(2);

  // Estados de carga y resultados
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [pestanaActiva, setPestanaActiva] = useState("listos"); // "listos" | "pocos-extra" | "canasta"

  // Estado para pasos completados al cocinar
  const [pasosCompletados, setPasosCompletados] = useState({});
  // Feedback al agregar a orden de compra
  const [itemsAgregados, setItemsAgregados] = useState({});
  const [agregandoGlobal, setAgregandoGlobal] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  };

  const seleccionarTodos = () => {
    setSeleccionados(new Set(listaDespensa.map((p) => p.id)));
  };

  const deseleccionarTodos = () => {
    setSeleccionados(new Set());
  };

  const togglePaso = (platoId, pasoIdx) => {
    setPasosCompletados((prev) => {
      const clave = `${platoId}-${pasoIdx}`;
      return { ...prev, [clave]: !prev[clave] };
    });
  };

  // Orden abierta o borrador actual
  const ordenBorrador = useMemo(() => {
    return (ordenesCompra || []).find((o) => o.estado === "Borrador") || null;
  }, [ordenesCompra]);

  const handleSugerir = async () => {
    setCargando(true);
    setError(null);
    setMensajeExito(null);

    const productosSeleccionados = listaDespensa
      .filter((p) => seleccionados.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || "Alimentos",
        unit: p.unit || "unidad",
        price: p.price ?? null,
      }));

    try {
      let data = null;
      try {
        const res = await fetch("/api/recetas/sugerir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productosDisponibles: productosSeleccionados,
            ingredientesExtra,
            tipoComida,
            tiempoMaximo,
            estilo,
            comensales,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn("Fallo endpoint backend, usando generador cliente:", e);
      }

      if (!data || (!data.platosListosParaCocinar?.length && !data.listaCompraRecomendada?.length)) {
        data = await generarRecetasClienteFallback(productosSeleccionados, ingredientesExtra);
      }

      setResultado(data);
      if (data.platosListosParaCocinar?.length > 0) {
        setPestanaActiva("listos");
      } else if (data.platosConPocosIngredientesExtra?.length > 0) {
        setPestanaActiva("pocos-extra");
      } else {
        setPestanaActiva("canasta");
      }
    } catch (err) {
      console.error("Error al obtener sugerencias:", err);
      setError(err.message || "No se pudo conectar con el asistente de recetas.");
    } finally {
      setCargando(false);
    }
  };

  // Agregar ingrediente faltante a la orden de compra
  const handleAgregarAOrden = async (item, itemKey) => {
    try {
      setItemsAgregados((prev) => ({ ...prev, [itemKey]: "agregando" }));

      // Verificar si ya existe en catálogo
      const existente = products.find(
        (p) => p.name.toLowerCase().trim() === item.nombre.toLowerCase().trim()
      );

      let productId = existente?.id;
      if (!productId) {
        // Opcionalmente registrar en catálogo como producto de alimentos
        try {
          const nuevoProd = await addProduct({
            name: item.nombre,
            category: item.categoria || "Alimentos",
            unit: item.unidad || "unidad",
            price: item.precioEstimadoSugerido || item.precioEstimado || null,
          });
          productId = nuevoProd.id;
        } catch {
          productId = `gen_${Date.now()}`;
        }
      }

      await agregarItemsABorrador(ordenBorrador, [
        {
          productId,
          productName: item.nombre,
          cantidad: 1,
          precioUnitario: item.precioEstimadoSugerido || item.precioEstimado || null,
        },
      ]);

      setItemsAgregados((prev) => ({ ...prev, [itemKey]: "agregado" }));
      setMensajeExito(`"${item.nombre}" se agregó a la orden de compra.`);
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err) {
      console.error("Error al agregar a orden:", err);
      setItemsAgregados((prev) => ({ ...prev, [itemKey]: "error" }));
    }
  };

  // Agregar toda la canasta sugerida a la orden de compras
  const handleAgregarTodaLaCanasta = async () => {
    if (!resultado?.listaCompraRecomendada?.length) return;
    setAgregandoGlobal(true);
    try {
      const itemsParaAgregar = [];
      for (const item of resultado.listaCompraRecomendada) {
        const existente = products.find(
          (p) => p.name.toLowerCase().trim() === item.nombre.toLowerCase().trim()
        );
        let productId = existente?.id;
        if (!productId) {
          try {
            const nuevoProd = await addProduct({
              name: item.nombre,
              category: item.categoria || "Alimentos",
              unit: item.unidad || "unidad",
              price: item.precioEstimado || null,
            });
            productId = nuevoProd.id;
          } catch {
            productId = `gen_${Date.now()}_${Math.random()}`;
          }
        }
        itemsParaAgregar.push({
          productId,
          productName: item.nombre,
          cantidad: 1,
          precioUnitario: item.precioEstimado || null,
        });
      }

      await agregarItemsABorrador(ordenBorrador, itemsParaAgregar);
      setMensajeExito("¡Se agregaron todos los productos sugeridos a tu orden de compra!");
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      console.error("Error al agregar canasta:", err);
      setError("No se pudo agregar toda la canasta a la orden de compra.");
    } finally {
      setAgregandoGlobal(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Encabezado */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--card) 0%, var(--paper) 100%)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--sage-bg)",
            color: "var(--sage)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ChefHat size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
            Chef & Despensa Inteligente
          </h2>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 }}>
            Genera recetas con los ingredientes que ya compraste en tu catálogo, o descubre qué comprar para
            maximizar tus comidas de la semana sin desperdiciar dinero.
          </div>
        </div>
      </div>

      {mensajeExito && (
        <div
          style={{
            background: "var(--sage-bg)",
            color: "var(--sage)",
            border: "1px solid var(--sage)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{mensajeExito}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("ordenes-compra")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--sage)",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: 12,
              }}
            >
              Ver orden
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "var(--stamp-bg)",
            color: "var(--stamp)",
            border: "1px solid var(--stamp)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Configuración: Despensa y Preferencias */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Panel 1: Ingredientes de tu Despensa */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
              <Package size={16} color="var(--sage)" />
              <span>Productos en tu Despensa ({seleccionados.size}/{listaDespensa.length})</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={seleccionarTodos}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-soft)",
                  fontSize: 11.5,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Todos
              </button>
              <span style={{ color: "var(--line)" }}>•</span>
              <button
                type="button"
                onClick={deseleccionarTodos}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-soft)",
                  fontSize: 11.5,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Ninguno
              </button>
            </div>
          </div>

          <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ink-soft)" }}>
            Selecciona qué productos tienes disponibles en este momento:
          </p>

          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: 4,
              border: "1px solid var(--line-soft, #ece7dc)",
              borderRadius: 8,
              background: "var(--paper)",
              marginBottom: 12,
            }}
          >
            {listaDespensa.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12, color: "var(--ink-soft)", textAlign: "center", width: "100%" }}>
                No tienes productos registrados en catálogo. ¡No te preocupes! El chef te sugerirá qué comprar.
              </div>
            ) : (
              listaDespensa.map((p) => {
                const activo = seleccionados.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSeleccion(p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: activo ? "1px solid var(--sage)" : "1px solid var(--line)",
                      background: activo ? "var(--sage-bg)" : "var(--card)",
                      color: activo ? "var(--sage)" : "var(--ink)",
                      cursor: "pointer",
                      fontWeight: activo ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {activo ? <Check size={12} /> : <Plus size={12} style={{ opacity: 0.5 }} />}
                    <span>{p.name}</span>
                  </button>
                );
              })
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
              Otros ingredientes que tienes en casa (sueltos / condimentos):
            </label>
            <input
              type="text"
              value={ingredientesExtra}
              onChange={(e) => setIngredientesExtra(e.target.value)}
              placeholder="Ej. huevos, ajo, cebolla, arroz, sal, aceite..."
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 12.5,
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--ink)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Panel 2: Preferencias Culinarias */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              <Flame size={16} color="var(--amber)" />
              <span>Preferencias de Cocina</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                  Momento del día
                </label>
                <select
                  value={tipoComida}
                  onChange={(e) => setTipoComida(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  {TIPOS_COMIDA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                  Tiempo máximo
                </label>
                <select
                  value={tiempoMaximo}
                  onChange={(e) => setTiempoMaximo(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  {TIEMPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                  Enfoque
                </label>
                <select
                  value={estilo}
                  onChange={(e) => setEstilo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  {ESTILOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 4 }}>
                  Comensales
                </label>
                <select
                  value={comensales}
                  onChange={(e) => setComensales(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 9px",
                    fontSize: 12,
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                  }}
                >
                  <option value={1}>1 pers.</option>
                  <option value={2}>2 pers.</option>
                  <option value={3}>3 pers.</option>
                  <option value={4}>4 pers.</option>
                  <option value={6}>6 pers.</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSugerir}
            disabled={cargando}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "11px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              background: "var(--ink)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 8,
              cursor: cargando ? "not-allowed" : "pointer",
              opacity: cargando ? 0.7 : 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {cargando ? (
              <>
                <RefreshCw size={16} className="despensa-spin" />
                <span>Analizando despensa y creando menú…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} color="#e5a93c" />
                <span>Sugerir platos con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultados de Gemini */}
      {resultado && (
        <div style={{ marginTop: 24 }}>
          {/* Diagnóstico de la Despensa */}
          {resultado.diagnosticoDespensa && (
            <div
              style={{
                background: "var(--sage-bg)",
                border: "1px solid var(--sage)",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--ink)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--sage)", marginBottom: 4 }}>
                <Sparkles size={15} />
                <span>Diagnóstico del Chef</span>
              </div>
              <div>{resultado.diagnosticoDespensa}</div>
            </div>
          )}

          {/* Selector de Pestañas de Resultados */}
          <div
            style={{
              display: "flex",
              gap: 8,
              borderBottom: "1px solid var(--line)",
              paddingBottom: 10,
              marginBottom: 18,
              overflowX: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setPestanaActiva("listos")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: pestanaActiva === "listos" ? "var(--sage)" : "var(--card)",
                color: pestanaActiva === "listos" ? "#fff" : "var(--ink)",
              }}
            >
              <UtensilsCrossed size={14} />
              <span>Listos para cocinar ({resultado.platosListosParaCocinar?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setPestanaActiva("pocos-extra")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: pestanaActiva === "pocos-extra" ? "var(--amber)" : "var(--card)",
                color: pestanaActiva === "pocos-extra" ? "#fff" : "var(--ink)",
              }}
            >
              <Plus size={14} />
              <span>Con 1-2 compras extra ({resultado.platosConPocosIngredientesExtra?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setPestanaActiva("canasta")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: pestanaActiva === "canasta" ? "var(--ink)" : "var(--card)",
                color: pestanaActiva === "canasta" ? "var(--paper)" : "var(--ink)",
              }}
            >
              <ShoppingCart size={14} />
              <span>Canasta recomendada ({resultado.listaCompraRecomendada?.length || 0})</span>
            </button>
          </div>

          {/* Contenido Pestaña 1: Platos listos para cocinar YA */}
          {pestanaActiva === "listos" && (
            <div>
              {resultado.platosListosParaCocinar?.length === 0 ? (
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px dashed var(--line)",
                    borderRadius: 12,
                    padding: "2rem",
                    textAlign: "center",
                    color: "var(--ink-soft)",
                    fontSize: 13,
                  }}
                >
                  <p style={{ margin: "0 0 10px" }}>
                    No se encontraron platos completos con los ingredientes actuales seleccionados.
                  </p>
                  <button
                    onClick={() => setPestanaActiva("pocos-extra")}
                    style={{
                      background: "var(--amber)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Ver platos que puedes hacer comprando 1 o 2 ingredientes →
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
                  {resultado.platosListosParaCocinar.map((plato) => (
                    <div
                      key={plato.id || plato.titulo}
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        overflow: "hidden",
                      }}
                    >
                      <div>
                        {plato.imagenUrl && (
                          <div
                            style={{
                              width: "calc(100% + 2.5rem)",
                              height: 180,
                              margin: "-1.25rem -1.25rem 14px -1.25rem",
                              overflow: "hidden",
                              background: "var(--paper)",
                            }}
                          >
                            <img
                              src={plato.imagenUrl}
                              alt={plato.titulo}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) parent.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{plato.titulo}</h3>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              background: "var(--sage-bg)",
                              color: "var(--sage)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {plato.tipoComida || "Plato"}
                          </span>
                        </div>

                        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                          {plato.descripcion}
                        </p>

                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={13} /> {plato.tiempoMinutos} min
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Layers size={13} /> Dificultad: {plato.dificultad}
                          </span>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                            Ingredientes que tienes:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(plato.ingredientesDisponibles || []).map((ing, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: 11,
                                  background: "var(--paper)",
                                  border: "1px solid var(--line)",
                                  borderRadius: 4,
                                  padding: "2px 6px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  color: "var(--ink)",
                                }}
                              >
                                <Check size={11} color="var(--sage)" />
                                {ing}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                            Preparación paso a paso:
                          </div>
                          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
                            {(plato.pasos || []).map((paso, pIdx) => {
                              const checkClave = `${plato.id || plato.titulo}-${pIdx}`;
                              const completado = pasosCompletados[checkClave];
                              return (
                                <li
                                  key={pIdx}
                                  onClick={() => togglePaso(plato.id || plato.titulo, pIdx)}
                                  style={{
                                    marginBottom: 6,
                                    cursor: "pointer",
                                    textDecoration: completado ? "line-through" : "none",
                                    color: completado ? "var(--ink-soft)" : "var(--ink)",
                                  }}
                                >
                                  {paso}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      </div>

                      {plato.consejoAhorro && (
                        <div
                          style={{
                            background: "var(--paper)",
                            borderRadius: 6,
                            padding: "8px 10px",
                            fontSize: 11.5,
                            color: "var(--ink-soft)",
                            borderLeft: "3px solid var(--sage)",
                            marginTop: 10,
                          }}
                        >
                          💡 <strong>Consejo del chef:</strong> {plato.consejoAhorro}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contenido Pestaña 2: Platos con pocos ingredientes extra */}
          {pestanaActiva === "pocos-extra" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
              {(resultado.platosConPocosIngredientesExtra || []).map((plato) => (
                <div
                  key={plato.id || plato.titulo}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                  }}
                >
                  <div>
                    {plato.imagenUrl && (
                      <div
                        style={{
                          width: "calc(100% + 2.5rem)",
                          height: 180,
                          margin: "-1.25rem -1.25rem 14px -1.25rem",
                          overflow: "hidden",
                          background: "var(--paper)",
                        }}
                      >
                        <img
                          src={plato.imagenUrl}
                          alt={plato.titulo}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) parent.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{plato.titulo}</h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: "var(--amber-bg)",
                          color: "var(--amber)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        +{plato.ingredientesAComprar?.length || 1} ingrediente
                      </span>
                    </div>

                    <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>
                      {plato.descripcion}
                    </p>

                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={13} /> {plato.tiempoMinutos} min
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Layers size={13} /> Dificultad: {plato.dificultad}
                      </span>
                    </div>

                    {/* Ingredientes a comprar */}
                    <div
                      style={{
                        background: "var(--amber-bg)",
                        border: "1px solid var(--amber)",
                        borderRadius: 8,
                        padding: "10px",
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a5800", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <ShoppingCart size={13} />
                        <span>Comprar para completar este plato:</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(plato.ingredientesAComprar || []).map((item, iIdx) => {
                          const itemKey = `${plato.id || plato.titulo}-${item.nombre}`;
                          const estado = itemsAgregados[itemKey];
                          return (
                            <div
                              key={iIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "var(--card)",
                                borderRadius: 6,
                                padding: "6px 8px",
                                fontSize: 12,
                              }}
                            >
                              <div>
                                <strong style={{ color: "var(--ink)" }}>{item.nombre}</strong>
                                <span style={{ color: "var(--ink-soft)", marginLeft: 6, fontSize: 11 }}>
                                  ({item.cantidadEstimada})
                                  {item.precioEstimadoSugerido ? ` • ~$${item.precioEstimadoSugerido}` : ""}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAgregarAOrden(item, itemKey)}
                                disabled={estado === "agregado" || estado === "agregando"}
                                style={{
                                  background: estado === "agregado" ? "var(--sage)" : "var(--ink)",
                                  color: "var(--paper)",
                                  border: "none",
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  fontSize: 11,
                                  fontWeight: 500,
                                  cursor: estado === "agregado" ? "default" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                {estado === "agregado" ? (
                                  <>
                                    <Check size={11} /> Agregado
                                  </>
                                ) : estado === "agregando" ? (
                                  "Agregando…"
                                ) : (
                                  <>
                                    <Plus size={11} /> A orden
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
                        Preparación paso a paso:
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: "var(--ink)" }}>
                        {(plato.pasos || []).map((paso, pIdx) => (
                          <li key={pIdx} style={{ marginBottom: 4 }}>
                            {paso}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contenido Pestaña 3: Canasta inteligente para comprar */}
          {pestanaActiva === "canasta" && (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                    Canasta Inteligente de Compras
                  </h3>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    Productos esenciales, nutritivos y versátiles recomendados para tu despensa al menor costo.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAgregarTodaLaCanasta}
                  disabled={agregandoGlobal || !resultado.listaCompraRecomendada?.length}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background: "var(--sage)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: agregandoGlobal ? "not-allowed" : "pointer",
                    opacity: agregandoGlobal ? 0.7 : 1,
                  }}
                >
                  <ShoppingBag size={14} />
                  <span>{agregandoGlobal ? "Agregando canasta…" : "Agregar toda la canasta a mi orden"}</span>
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {(resultado.listaCompraRecomendada || []).map((item, idx) => {
                  const itemKey = `canasta-${item.nombre}`;
                  const estado = itemsAgregados[itemKey];
                  const esPrioridadAlta = item.prioridad?.toLowerCase() === "alta";

                  return (
                    <div
                      key={idx}
                      style={{
                        background: "var(--paper)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{item.nombre}</span>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              borderRadius: 4,
                              padding: "2px 6px",
                              background: esPrioridadAlta ? "var(--stamp-bg)" : "var(--line-soft, #ece7dc)",
                              color: esPrioridadAlta ? "var(--stamp)" : "var(--ink-soft)",
                            }}
                          >
                            {item.prioridad}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 6 }}>
                          {item.categoria} • Unidad: {item.unidad}
                          {item.precioEstimado ? ` • ~$${item.precioEstimado}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4, marginBottom: 10 }}>
                          {item.motivo}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleAgregarAOrden(item, itemKey)}
                          disabled={estado === "agregado" || estado === "agregando"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background: estado === "agregado" ? "var(--sage)" : "var(--card)",
                            color: estado === "agregado" ? "#fff" : "var(--ink)",
                            border: estado === "agregado" ? "none" : "1px solid var(--line)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: estado === "agregado" ? "default" : "pointer",
                          }}
                        >
                          {estado === "agregado" ? (
                            <>
                              <Check size={12} /> En orden
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Agregar a orden
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {resultado.consejoGeneral && (
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px dashed var(--line)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginTop: 16,
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Tip de compra inteligente:</strong> {resultado.consejoGeneral}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
