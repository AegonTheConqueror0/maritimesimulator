import { initializeApp } from 'firebase/app';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0020061709",
  appId: "1:1041639125659:web:07be23086b884b36aa4c3e",
  apiKey: "AIzaSyCGyrFE1DhOeAQBLKWIJnnMcL7dabNcs0I",
  authDomain: "gen-lang-client-0020061709.firebaseapp.com",
  storageBucket: "gen-lang-client-0020061709.appspot.com",
  messagingSenderId: "1041639125659"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with better browser compatibility
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true
});

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: multiple tabs open.', err);
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported by this browser.', err);
    } else {
      console.warn('Firestore persistence error:', err);
    }
  });
}

export default app;
