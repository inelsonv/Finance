import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const imageCache = new Map<string, string | null>();

async function fetchDishImage(term: string): Promise<string | null> {
  if (!term || typeof term !== 'string') return null;
  const cleanTerm = term.trim().toLowerCase();
  if (imageCache.has(cleanTerm)) {
    return imageCache.get(cleanTerm) || null;
  }

  // 1. Wikipedia en español
  try {
    const url = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartFinanceChef/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const first = Object.values(pages)[0] as any;
        if (first?.thumbnail?.source) {
          imageCache.set(cleanTerm, first.thumbnail.source);
          return first.thumbnail.source;
        }
      }
    }
  } catch {}

  // 2. Wikipedia en inglés
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'SmartFinanceChef/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const pages = data?.query?.pages;
      if (pages) {
        const first = Object.values(pages)[0] as any;
        if (first?.thumbnail?.source) {
          imageCache.set(cleanTerm, first.thumbnail.source);
          return first.thumbnail.source;
        }
      }
    }
  } catch {}

  // 3. TheMealDB
  try {
    const mealRes = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`);
    if (mealRes.ok) {
      const mealData = await mealRes.json();
      if (mealData?.meals?.[0]?.strMealThumb) {
        const img = mealData.meals[0].strMealThumb;
        imageCache.set(cleanTerm, img);
        return img;
      }
    }
  } catch {}

  imageCache.set(cleanTerm, null);
  return null;
}

app.get('/api/recetas/imagen', async (req, res) => {
  const query = (req.query.q as string) || '';
  if (!query) {
    return res.json({ imageUrl: null });
  }
  const imageUrl = await fetchDishImage(query);
  res.json({ imageUrl });
});

app.post('/api/recetas/sugerir', async (req, res) => {
  try {
    const {
      productosDisponibles = [],
      ingredientesExtra = '',
      tipoComida = 'Todos',
      tiempoMaximo = 45,
      estilo = 'Cualquiera',
      comensales = 2,
    } = req.body;

    const productosTexto = productosDisponibles.length > 0
      ? productosDisponibles
          .map((p: any) => `- ${p.name || p.nombre} (${p.category || p.categoria || 'Alimentos'}, unidad: ${p.unit || p.unidad || 'unidad'}${p.price ? ', precio: $' + p.price : ''})`)
          .join('\n')
      : 'No hay productos de alimentos registrados actualmente en el inventario o la despensa está vacía.';

    const prompt = `Analiza estos productos e ingredientes para sugerir platos y lista de compras:

PRODUCTOS ACTUALES EN DESPENSA / INVENTARIO:
${productosTexto}

${ingredientesExtra ? `INGREDIENTES ADICIONALES O EN CASA INFORMADOS POR EL USUARIO:\n${ingredientesExtra}\n` : ''}

PREFERENCIAS DEL USUARIO:
- Momento / Tipo de comida: ${tipoComida}
- Tiempo máximo disponible para cocinar: ${tiempoMaximo} minutos
- Estilo o enfoque: ${estilo} (ej. Saludable, Económico, Rápido, Reconfortante)
- Número de comensales / porciones: ${comensales}

INSTRUCCIONES CLAVES:
1. Si el usuario TIENE productos de cocina/alimentos disponibles, aprovecha al máximo lo que tiene. Propón platos creativos, deliciosos y viables que pueda hacer con esos ingredientes exactos.
2. Si le faltan 1 o 2 ingredientes clave para hacer un plato mucho mejor, detállalos en "platosConPocosIngredientesExtra" con nombres claros para que se puedan agregar a su lista de compras.
3. Si el usuario NO TIENE productos o tiene muy pocos (ej. solo 0 a 3 artículos), en "listaCompraRecomendada" sugiere una canasta inteligente, económica y versátil de compras de supermercado/despensa que le permita cocinar múltiples comidas nutritivas durante varios días.
4. Responde con un tono motivador, enfocado en el ahorro financiero y en no desperdiciar comida.`;

    const modelConfig = {
      systemInstruction: 'Eres el asistente chef y asesor de despensa de Smart Finance. Ayudas a los usuarios a planificar comidas con lo que tienen en su despensa, reducir el gasto en comida y compras impulsivas, y sugerir compras inteligentes cuando no tienen ingredientes.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnosticoDespensa: {
            type: Type.STRING,
            description: 'Breve análisis del estado de la despensa y potencial culinario.',
          },
          platosListosParaCocinar: {
            type: Type.ARRAY,
            description: 'Platos que se pueden preparar usando los productos disponibles.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                titulo: { type: Type.STRING },
                descripcion: { type: Type.STRING },
                tipoComida: { type: Type.STRING },
                tiempoMinutos: { type: Type.INTEGER },
                dificultad: { type: Type.STRING },
                terminoBusquedaImagen: {
                  type: Type.STRING,
                  description: 'Nombre común en español o inglés del plato para buscar su fotografía gastronómica (ej. Tortilla española, Shakshuka, Fried rice, Pasta al pesto)',
                },
                ingredientesDisponibles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                ingredientesBasicosComunes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                pasos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                consejoAhorro: { type: Type.STRING },
              },
              required: ['id', 'titulo', 'descripcion', 'tiempoMinutos', 'dificultad', 'ingredientesDisponibles', 'pasos'],
            },
          },
          platosConPocosIngredientesExtra: {
            type: Type.ARRAY,
            description: 'Platos que se pueden preparar agregando pocos ingredientes a comprar.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                titulo: { type: Type.STRING },
                descripcion: { type: Type.STRING },
                tiempoMinutos: { type: Type.INTEGER },
                dificultad: { type: Type.STRING },
                terminoBusquedaImagen: {
                  type: Type.STRING,
                  description: 'Nombre común en español o inglés del plato para buscar su fotografía gastronómica',
                },
                ingredientesDisponibles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                ingredientesAComprar: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nombre: { type: Type.STRING },
                      cantidadEstimada: { type: Type.STRING },
                      categoria: { type: Type.STRING },
                      unidad: { type: Type.STRING },
                      precioEstimadoSugerido: { type: Type.NUMBER },
                    },
                    required: ['nombre', 'cantidadEstimada', 'categoria', 'unidad'],
                  },
                },
                pasos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['id', 'titulo', 'descripcion', 'tiempoMinutos', 'ingredientesDisponibles', 'ingredientesAComprar', 'pasos'],
            },
          },
          listaCompraRecomendada: {
            type: Type.ARRAY,
            description: 'Canasta recomendada de productos para comprar y maximizar el menú.',
            items: {
              type: Type.OBJECT,
              properties: {
                nombre: { type: Type.STRING },
                categoria: { type: Type.STRING },
                unidad: { type: Type.STRING },
                motivo: { type: Type.STRING },
                prioridad: { type: Type.STRING },
                precioEstimado: { type: Type.NUMBER },
              },
              required: ['nombre', 'categoria', 'unidad', 'motivo', 'prioridad'],
            },
          },
          consejoGeneral: {
            type: Type.STRING,
            description: 'Consejo general de cocina o ahorro.',
          },
        },
        required: ['diagnosticoDespensa', 'platosListosParaCocinar', 'platosConPocosIngredientesExtra', 'listaCompraRecomendada'],
      },
    };

    let response;
    const modelCandidates = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastErr;
    for (const model of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: modelConfig,
        });
        if (response?.text) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Reintento por error con ${model}:`, err?.message || err);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!response || !response.text) {
      throw lastErr || new Error('No se recibió respuesta del modelo de IA');
    }

    const text = response.text;
    const parsed = JSON.parse(text);

    // Pre-poblar imágenes para los platos generados
    if (Array.isArray(parsed.platosListosParaCocinar)) {
      await Promise.all(
        parsed.platosListosParaCocinar.map(async (plato: any) => {
          const query = plato.terminoBusquedaImagen || plato.titulo;
          plato.imagenUrl = await fetchDishImage(query);
        })
      );
    }
    if (Array.isArray(parsed.platosConPocosIngredientesExtra)) {
      await Promise.all(
        parsed.platosConPocosIngredientesExtra.map(async (plato: any) => {
          const query = plato.terminoBusquedaImagen || plato.titulo;
          plato.imagenUrl = await fetchDishImage(query);
        })
      );
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error al generar recetas:', error);
    res.status(500).json({
      error: error.message || 'Error al generar sugerencias de platos',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
