import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Config de Firebase del proyecto "Finance". No es información sensible:
// para apps web, estos valores quedan visibles en el navegador de todas
// formas (la seguridad real la dan las reglas de Firestore, no ocultar esto).
// La ponemos directo aquí, sin depender de variables de entorno ni de
// GitHub Actions secrets, para eliminar una fuente de fallos silenciosos.
const firebaseConfig = {
  apiKey: "AIzaSyAPyDC2kc_vgDjhLoA1EkI-Wljw8XQJwMw",
  authDomain: "finance-6e127.firebaseapp.com",
  projectId: "finance-6e127",
  storageBucket: "finance-6e127.firebasestorage.app",
  messagingSenderId: "10299682336",
  appId: "1:10299682336:web:671a87e670b3f038c49645",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ALLOWED_EMAIL = "iventuramena@gmail.com";
export const storage = getStorage(app);
