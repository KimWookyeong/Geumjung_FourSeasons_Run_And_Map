import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 👉 방금 복사한 config 그대로 넣기
const firebaseConfig = {
  apiKey: "AIzaSyCpvAlYDQbx6WdBRdh-PHOoNyf5IRQIag4",
  authDomain: "fourseasons-runandmap.firebaseapp.com",
  projectId: "fourseasons-runandmap",
  storageBucket: "fourseasons-runandmap.firebasestorage.app",
  messagingSenderId: "738045125812",
  appId: "1:738045125812:web:0a2b3a28819e35d6cae3e1"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 🔥 우리가 실제로 사용하는 기능
export const auth = getAuth(app);
export const db = getFirestore(app);