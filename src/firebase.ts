import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCsop4GB8q8spCoaa5o3iUee-_LoG_Ih7I",
  authDomain: "jund-ak-jaay.firebaseapp.com",
  projectId: "jund-ak-jaay",
  storageBucket: "jund-ak-jaay.firebasestorage.app",
  messagingSenderId: "253743349244",
  appId: "1:253743349244:web:df97777db779ef5d414679",
  measurementId: "G-4WWMHPRED3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
