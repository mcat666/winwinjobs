import { auth } from '../firebase'; 
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from 'firebase/auth';

export const signup = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  console.log("USER CREATED:", cred.user.email);

  await sendEmailVerification(cred.user);

  console.log("EMAIL TRIGGERED");
  
  return cred;
};

export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);