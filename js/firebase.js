import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHklaBKNn0_FZ2Gqk32-QAjxhjGq3clAY",
    authDomain: "everyday-supply-co.firebaseapp.com",
    projectId: "everyday-supply-co",
    storageBucket: "everyday-supply-co.appspot.com",
    messagingSenderId: "694326382277",
    appId: "1:694326382277:web:94c510004ba1010268aaac"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);