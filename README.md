# Mi Despensa

App para gestionar un catálogo de productos de primera necesidad, con precios,
y armar listas de compra a partir de ese catálogo. Los datos se guardan en
Firestore (Firebase).

## Estructura

- `src/App.jsx` — pantalla principal, tabs de Catálogo / Lista de compra.
- `src/components/Catalogo.jsx` — alta, edición de precio y borrado de productos.
- `src/components/ListaCompra.jsx` — lista de compra estilo ticket con total.
- `src/lib/db.js` — funciones que leen/escriben en Firestore.
- `src/firebase.js` — inicialización de Firebase a partir de variables de entorno.

## Configurar Firebase

1. Crea un proyecto en https://console.firebase.google.com
2. Dentro del proyecto, activa **Firestore Database** (modo de producción o de prueba).
3. Ve a *Configuración del proyecto → General → Tus apps* y crea una app web.
   Copia los valores del `firebaseConfig` que te muestra.
4. Copia `.env.example` a `.env` y completa cada valor:

   ```
   cp .env.example .env
   ```

5. Instala las dependencias y corre el proyecto:

   ```
   npm install
   npm run dev
   ```

## Reglas de seguridad (importante)

`firestore.rules` viene con reglas **abiertas** (`allow read, write: if true`)
para poder probar la app rápido sin login. Esto significa que cualquiera con
tu configuración de Firebase (que queda visible en el código del navegador)
puede leer y modificar tus datos.

Antes de usarla con datos reales o de compartir el link, agrega autenticación
(por ejemplo Firebase Auth con email/contraseña) y cambia las reglas para
exigir `request.auth != null`. Puedo ayudarte a agregar eso cuando lo quieras.

Para publicar las reglas actuales a tu proyecto de Firebase:

```
npm install -g firebase-tools
firebase login
firebase use --add        # selecciona tu proyecto
firebase deploy --only firestore:rules
```

## Publicar la app (opcional, Firebase Hosting)

```
npm run build
firebase deploy --only hosting
```

## Publicar en GitHub Pages

El repo incluye `.github/workflows/deploy.yml`: cada push a `main` construye
la app y la publica en GitHub Pages automáticamente. Pasos únicos para
activarlo:

1. En GitHub, ve a **Settings → Pages → Build and deployment → Source** y
   selecciona **GitHub Actions**.
2. En **Settings → Secrets and variables → Actions → New repository secret**,
   crea estos 6 secrets con los mismos valores de tu `.env`:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. Haz push a `main` (o entra a la pestaña **Actions** del repo y corre el
   workflow manualmente con "Run workflow").

Cuando termine, la app queda disponible en:
`https://inelsonv.github.io/Finance/`

`vite.config.js` ya tiene `base: "/Finance/"` configurado para que las rutas
funcionen correctamente en esa dirección (GitHub Pages sirve el sitio dentro
de una subcarpeta con el nombre del repo).

## Próximos pasos

- Escaneo de facturas para actualizar precios automáticamente (cada producto
  ya guarda `updatedAt`, así que solo falta un flujo que lea la factura y
  llame a `updateProductPrice` por cada producto detectado).
- Autenticación de usuario.
