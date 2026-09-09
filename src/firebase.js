import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBCaZieV-AOkDzolJtuTVyxA42rUuhGQK0",
  authDomain: "vase-d-honneur-2ad.firebaseapp.com",
  // ⚠️ À remplacer par ton URL de Realtime Database une fois qu'elle est créée
  // (Firebase Console > Realtime Database > Créer une base de données).
  // Elle ressemble à : "https://vase-d-honneur-2ad-default-rtdb.europe-west1.firebasedatabase.app"
  databaseURL: "https://vase-d-honneur-2ad-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "vase-d-honneur-2ad",
  storageBucket: "vase-d-honneur-2ad.firebasestorage.app",
  messagingSenderId: "1061838462457",
  appId: "1:1061838462457:web:5638afa4c12ff239caf128",
  measurementId: "G-0W8V99FSSF"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
export const googleProvider = new GoogleAuthProvider()
