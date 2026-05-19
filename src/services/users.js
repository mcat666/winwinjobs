import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const createUserProfile = async (user, role = 'client') => {
  return setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    role,
    createdAt: new Date(),
  });
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};