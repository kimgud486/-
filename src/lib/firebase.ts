import { initializeApp } from "firebase/app";
import { getAuth, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "seongsancp-e838b",
  appId: "1:802000966531:web:90d04a75707c6e8afa5cb6",
  apiKey: "AIzaSyATzD5riKDiL52TwQUdYSIwjHtD8AZ_yMA",
  authDomain: "seongsancp-e838b.firebaseapp.com",
  storageBucket: "seongsancp-e838b.firebasestorage.app",
  messagingSenderId: "802000966531",
  measurementId: "G-0PZRGDMVMQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if specified, else default
let db;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  }, "ai-studio-6f3899c6-4891-40d1-b569-afb78466e4b7");
} catch (e) {
  try {
    db = getFirestore(app);
  } catch (err) {
    console.error("Firestore initialization error, using standard getFirestore", err);
    db = getFirestore();
  }
}

const auth = getAuth(app);

export { app, db, auth, signOut, onAuthStateChanged, signInAnonymously };
