import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Endpoint para buscar productos e imágenes en vivo desde supermercadosrd.com
app.get('/api/supermercados/buscar', async (req, res) => {
  try {
    const query = ((req.query.q as string) || '').trim();
    if (!query) {
      return res.json({ productos: [] });
    }
    const url = `https://supermercadosrd.com/api/list/search-suggestions?value=${encodeURIComponent(query)}&limit=20`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return res.json({ productos: [] });
    }
    const data = await response.json();

    // Cargar catálogo de Bravo local para cruzar precios oficiales
    let catalogoBravo: any[] = [];
    try {
      const rutaCatalogo = path.resolve(__dirname, 'src/data/bravoProductos.json');
      if (fs.existsSync(rutaCatalogo)) {
        catalogoBravo = JSON.parse(fs.readFileSync(rutaCatalogo, 'utf-8'));
      }
    } catch {}

    const productos = (Array.isArray(data) ? data : [])
      .filter((d: any) => d.kind === 'product' && d.image)
      .map((d: any) => {
        const nombreLimpio = String(d.phrase || '').trim();
        const norm = nombreLimpio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 1. Coincidencia por ID o nombre en el catálogo oficial de Bravo
        const matchExacto = catalogoBravo.find((p: any) => p.id === d.productId || p.nombre.toLowerCase() === nombreLimpio.toLowerCase());
        const matchAprox = !matchExacto ? catalogoBravo.find((p: any) => {
          const pNorm = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const words = norm.split(' ').filter((w: string) => w.length > 2);
          return words.length > 0 && words.every((w: string) => pNorm.includes(w));
        }) : null;

        const info = matchExacto || matchAprox;

        // Estimación inteligente en RD$ si no está en el catálogo verificado
        let precio = info?.precio || 0;
        let unidad = info?.unidad || 'unidad';
        let categoria = info?.categoria || 'Despensa';

        if (!precio) {
          if (norm.includes('10 lb') && norm.includes('arroz')) precio = 435.0;
          else if (norm.includes('5 lb') && norm.includes('arroz')) precio = 225.0;
          else if (norm.includes('arroz')) precio = 240.0;
          else if (norm.includes('5 l') || norm.includes('5l') || norm.includes('galon')) precio = norm.includes('oliva') ? 1395.0 : 625.0;
          else if (norm.includes('aceite')) precio = norm.includes('oliva') ? 445.0 : 320.0;
          else if (norm.includes('huevo') && (norm.includes('30') || norm.includes('carton'))) precio = 275.0;
          else if (norm.includes('huevo')) precio = 135.0;
          else if (norm.includes('leche') && norm.includes('1 l')) precio = 92.0;
          else if (norm.includes('leche')) precio = 85.0;
          else if (norm.includes('cloro') && (norm.includes('3.8') || norm.includes('galon'))) precio = 165.0;
          else if (norm.includes('cloro')) precio = 115.0;
          else if (norm.includes('detergente') && (norm.includes('3.8') || norm.includes('galon'))) precio = 465.0;
          else if (norm.includes('lavaplatos')) precio = 145.0;
          else if (norm.includes('queso')) precio = 285.0;
          else if (norm.includes('jamon') || norm.includes('salchicha')) precio = 215.0;
          else if (norm.includes('atun')) precio = 115.0;
          else if (norm.includes('habichuela')) precio = 140.0;
          else if (norm.includes('cafe')) precio = 265.0;
          else if (norm.includes('pan')) precio = 95.0;
          else precio = 165.0;
        }

        return {
          id: d.productId,
          nombre: d.phrase,
          imagenUrl: d.image,
          tienda: d.image.includes('superbravo') ? 'Supermercados Bravo' : 'Supermercados RD',
          fuente: 'https://supermercadosrd.com/',
          precio: precio,
          moneda: 'DOP',
          unidad: unidad,
          categoria: categoria,
        };
      });

    res.json({ productos });
  } catch (err: any) {
    console.error('Error buscando en supermercadosrd.com:', err);
    res.status(500).json({ error: err.message || 'Error al buscar en supermercadosrd.com' });
  }
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

// Endpoint para procesar facturas y recibos con visión de Gemini
app.post('/api/escanear-factura', async (req, res) => {
  try {
    const { imageBase64, mediaType = 'image/jpeg' } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Falta la imagen de la factura' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const prompt = `Analiza con máxima precisión esta fotografía de una factura o recibo físico de supermercado o tienda (ej. Bravo, La Sirena, Nacional, etc.).
Extrae los datos estructurados en formato JSON ÚNICAMENTE con esta estructura:
{
  "tienda": "Nombre del supermercado o comercio",
  "fecha": "YYYY-MM-DD",
  "total": 1991.00,
  "moneda": "DOP",
  "items": [
    {
      "nombre": "Nombre del artículo",
      "cantidad": 1,
      "precioUnitario": 79.00,
      "totalLinea": 158.00
    }
  ]
}

Instrucciones específicas:
1. Identifica todos los renglones de productos (comestibles, higiene, carnes, vegetales, panadería, etc.).
2. Si un renglón tiene cantidad (ej. '2 x 79.00' o '2.71 x 129.00'), extrae la cantidad, el precio unitario y el valor total de la línea.
3. El total de la factura debe ser el monto que figura como 'TOTAL A PAGAR' o 'TOTAL' de la compra.
4. Ignora comprobantes bancarios, números de tarjeta, autorizaciones, NCF, RNC, e impuestos como ITBIS.
5. Devuelve JSON válido sin bloques markdown ni texto adicional.`;

    const modelCandidates = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let response;
    let lastErr;

    for (const model of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: mediaType,
                data: cleanBase64,
              },
            },
            prompt,
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response?.text) break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`Reintento de visión con ${model}:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!response || !response.text) {
      throw lastErr || new Error('No se pudo procesar la factura con IA');
    }

    const cleanJson = response.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error en /api/escanear-factura:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar la factura con IA' });
  }
});

// Endpoint TTS con voz de IA casi real y gratuita (Gemini Flash Lite TTS)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Aoede' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texto requerido para síntesis de voz' });
    }

    const textoLimpio = text.trim().slice(0, 800);
    const validVoices = ['Aoede', 'Charon', 'Kore', 'Fenrir', 'Puck'];
    const vozFinal = validVoices.includes(voice) ? voice : 'Aoede';

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: textoLimpio,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: vozFinal,
              },
            },
          },
        },
      });
    } catch (errLite: any) {
      console.warn('gemini-3.8-flash-lite-tts ocupado, reintentando con gemini-3.8-flash-tts:', errLite.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: textoLimpio,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: vozFinal,
              },
            },
          },
        },
      });
    }

    const part = response?.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData;

    if (!inlineData?.data) {
      return res.status(500).json({ error: 'No se pudo generar el audio de voz' });
    }

    res.json({
      audioBase64: inlineData.data,
      mimeType: inlineData.mimeType || 'audio/wav',
      voice: vozFinal,
    });
  } catch (error: any) {
    console.error('Error en /api/tts:', error);
    res.status(500).json({
      error: error.message || 'Error al generar voz IA',
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
