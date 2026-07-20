/*
 * Configuração pública do Firebase para o portal.
 * A firebaseConfig identifica o projeto, mas não concede acesso administrativo.
 * As regras do Firestore são a camada que autoriza ou bloqueia gravações.
 */
window.ESTUDOS_IA_FIREBASE = {
  firebaseConfig: {
    apiKey: "AIzaSyBwJ0l8eVDJiuYUf_s_Or9SJXvXcIVfkwY",
    authDomain: "estudo-ia-17f3a.firebaseapp.com",
    projectId: "estudo-ia-17f3a",
    storageBucket: "estudo-ia-17f3a.firebasestorage.app",
    messagingSenderId: "932616978524",
    appId: "1:932616978524:web:a235b6c620de4e1562a699",
    measurementId: "G-NEJL3ZG1XG"
  },

  // Preencha após o primeiro login. O UID aparece no Firebase Authentication.
  adminUids: [],

  // Lista opcional usada somente para liberar a interface administrativa.
  // A segurança real continua nas regras do Firestore, preferencialmente por UID.
  adminEmails: []
};