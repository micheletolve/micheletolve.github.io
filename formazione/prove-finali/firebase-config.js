// Configurazione Firebase per il sistema quiz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDv8rkQ45w1NVwL11-pVCNtub5Bfl-HcqU",
  authDomain: "quiz-system-ccf87.firebaseapp.com",
  projectId: "quiz-system-ccf87",
  storageBucket: "quiz-system-ccf87.firebasestorage.app",
  messagingSenderId: "369093244190",
  appId: "1:369093244190:web:5c1e7700d6414c6bf4c50f"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore
const db = getFirestore(app);

// Esporta per l'uso in altri file
window.firebaseDb = db;

console.log('Firebase inizializzato correttamente');