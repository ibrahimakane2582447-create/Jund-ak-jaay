import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "integrated-metric-vcf5x",
  appId: "1:524474443053:web:0aa46da1adb2af4e5bdfa4",
  apiKey: "AIzaSyAj8qnIoGUPKw8zdyvbWK3rxx9HKPICgZY",
  authDomain: "integrated-metric-vcf5x.firebaseapp.com",
  storageBucket: "integrated-metric-vcf5x.firebasestorage.app",
  messagingSenderId: "524474443053",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-dieundakdiaye-50c72e1d-0ef1-41da-a56f-a4ee4f04c6be");
export const storage = getStorage(app);
