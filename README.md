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

La configuración de Firebase (`src/firebase.js`) ya viene con los valores del
proyecto `finance-6e127`. No es información sensible: para apps web, estos
valores quedan visibles en el navegador de todas formas (la seguridad real
la dan las reglas de Firestore, no ocultar esto), así que no dependemos de
variables de entorno ni de GitHub Secrets — un cambio menos que puede fallar.

Si en algún momento quieres apuntar la app a otro proyecto de Firebase,
edita directamente el objeto `firebaseConfig` en `src/firebase.js` con los
valores nuevos (Firebase Console → Configuración del proyecto → General →
Tus apps → el ícono web `</>`).

Para correr la app en local:

```
npm install
npm run dev
```

## Fotos de producto

Los productos pueden tener una foto (al crearlos o agregándola después con
el ícono de cámara en cada fila). Las imágenes se guardan en **Firebase
Storage**, un servicio aparte de Firestore. Para activarlo:

```
firebase deploy --only storage --project=finance-6e127
```

Si es la primera vez que usas Storage en este proyecto, puede pedirte que
lo actives primero desde la consola: ve a
https://console.firebase.google.com/project/finance-6e127/storage y haz
clic en "Comenzar" (el plan Spark incluye Storage sin costo dentro de su
cuota gratuita). Luego repite el comando de arriba.

## Indicador de conexión

Arriba de cada sección verás una pastilla que dice "Sincronizado con
Firebase" (verde) o "Sin conexión con Firebase — guardando solo en este
navegador" (roja). Si ves la roja, los datos que agregues solo quedan en la
memoria de esa pestaña y se pierden al recargar — revisa tu conexión a
internet o si algo (ej. un bloqueador de anuncios) está bloqueando
`firestore.googleapis.com`.

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
2. Haz push a `main` (o entra a la pestaña **Actions** del repo y corre el
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
