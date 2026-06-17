import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0020061709",
  appId: "1:1041639125659:web:07be23086b884b36aa4c3e",
  apiKey: "AIzaSyCGyrFE1DhOeAQBLKWIJnnMcL7dabNcs0I",
  authDomain: "gen-lang-client-0020061709.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-e02002d7-f9c1-4bef-be68-b06d2b07e14f",
  storageBucket: "gen-lang-client-0020061709.firebasestorage.app",
  messagingSenderId: "1041639125659"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export default app;
