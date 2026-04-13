import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "여기에_입력",
  authDomain: "여기에_입력",
  projectId: "여기에_입력",
  storageBucket: "여기에_입력",
  messagingSenderId: "여기에_입력",
  appId: "여기에_입력"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);