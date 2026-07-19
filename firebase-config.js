/*
 * Configuração pública do Firebase para o portal.
 * A firebaseConfig identifica o projeto, mas não concede acesso administrativo.
 * As regras do Firestore são a camada que autoriza ou bloqueia gravações.
 */
window.ESTUDOS_IA_FIREBASE = {
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Preencha após o primeiro login. O UID aparece no Firebase Authentication.
  adminUids: [],

  // Lista opcional usada somente para liberar a interface administrativa.
  // A segurança real continua nas regras do Firestore, preferencialmente por UID.
  adminEmails: []
};
