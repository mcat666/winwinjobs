import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs
} from 'firebase/firestore';

const jobsRef = collection(db, 'jobs');

export const createJob = async (job) => {
  return await addDoc(jobsRef, job);
};

export const fetchJobs = async () => {
  const snap = await getDocs(jobsRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};