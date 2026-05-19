import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';

const reviewsRef = collection(db, 'reviews');

export const createReview = async (review) => {
  return await addDoc(reviewsRef, review);
};

export const fetchReviewsForUser = async (userId) => {
  const q = query(
    reviewsRef,
    where('revieweeId', '==', userId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};