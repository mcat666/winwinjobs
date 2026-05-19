import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDVHErKB2Xz1gZWyrFUY2iYBiJqKHB_OHQ",
  authDomain: "winwinjobs-4a699.firebaseapp.com",
  projectId: "winwinjobs-4a699",
  storageBucket: "winwinjobs-4a699.firebasestorage.app",
  messagingSenderId: "6969509545",
  appId: "1:6969509545:web:133532b49c469c33ad0bb8",
  measurementId: "G-ZQ4NQ7CJG3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);