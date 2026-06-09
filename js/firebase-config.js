// ==========================================
// TEMPEPLAY - FIREBASE CONFIG
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDh12M_e5CbL11OtooEcpw6pJqJxJ0cA9Q",
  authDomain: "tempeanimeplay.firebaseapp.com",
  databaseURL: "https://tempeanimeplay-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tempeanimeplay",
  storageBucket: "tempeanimeplay.firebasestorage.app",
  messagingSenderId: "1086648525854",
  appId: "1:1086648525854:web:3d2e8befa554d11b903a0f"
};

const firebaseScript = document.createElement('script');
firebaseScript.type = 'module';
firebaseScript.textContent = `
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
           createUserWithEmailAndPassword, signInWithEmailAndPassword,
           signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
  import { getDatabase, ref, set, get, update, push, onValue,
           serverTimestamp, query, orderByChild, limitToLast, remove }
    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

  const app = initializeApp(${JSON.stringify(firebaseConfig)});
  window.firebaseApp  = app;
  window.firebaseAuth = getAuth(app);
  window.firebaseDB   = getDatabase(app);
  window.firebaseFns  = {
    onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, updateProfile,
    ref, set, get, update, push, onValue,
    serverTimestamp, query, orderByChild, limitToLast, remove
  };
  window.dispatchEvent(new Event('firebase-ready'));
`;
document.head.appendChild(firebaseScript);
