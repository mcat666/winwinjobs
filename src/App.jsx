import {
  createReview,
  fetchReviewsForUser
} from './services/reviews';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from './firebase';
import { signup, login, logout } from './services/auth';
import { createUserProfile, getUserProfile } from './services/users';
import { createJob, fetchJobs } from './services/jobs';

import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);

  const clientJobs = jobs.filter(
    (job) => job.clientId === user?.uid
  );

  const workerJobs = jobs.filter(
    (job) => job.workerId === user?.uid
  );

  const openJobs = jobs.filter(
    (job) => job.status === 'open'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newJob, setNewJob] = useState({
    title: '',
    category: '',
    description: '',
    hours: '',
    location: '',
    pay: '',
  });
  const [role, setRole] = useState('client');

  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);

  const [reviews, setReviews] = useState([]);

  // ---------------- AUTH ----------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        return;
      }

      let profile = null;

      try {
        profile = await getUserProfile(u.uid);
      } catch (e) {
        console.log('Profile load failed', e);
      }

      setUser({
        ...u,
        role: profile?.role || 'client',
      });
    });

    return () => unsub();
  }, []);

  // ---------------- LOAD JOBS ----------------
  useEffect(() => {

    const loadData = async () => {

      // Load jobs
      const allJobs = await fetchJobs();
      setJobs(allJobs);

      // Load reviews for current user
      const workerReviews =
        await fetchReviewsForUser(user.uid);

      setReviews(workerReviews);
    };

    if (user) {
      loadData();
    }

  }, [user]);

  // ---------------- CREATE JOB ----------------
  const handleCreateJob = async () => {
    try {
      console.log("POST JOB CLICKED");

      // Validation FIRST
      if (!newJob.title) {
        alert("Enter a job title");
        return;
      }

      // Create Firestore job object
      const createdJob = {
        title: newJob.title,
        category: newJob.category || '',
        description: newJob.description || '',
        hours: newJob.hours || '',
        location: newJob.location || '',
        pay: Number(newJob.pay || 0),

        status: 'open',
        clientId: user.uid,
        workerId: null,
        createdAt: new Date(),
      };

      console.log("CREATING JOB:", createdJob);

      await createJob(createdJob);

      console.log("JOB CREATED");

      const updated = await fetchJobs();

      console.log("UPDATED JOBS:", updated);

      setJobs(updated);

      setNewJob({
        title: '',
        category: '',
        description: '',
        hours: '',
        location: '',
        pay: '',
      });

    } catch (err) {
      console.error("JOB ERROR:", err);
      alert(err.message);
    }
  };

  const acceptJob = async (jobId) => {
    try {
      console.log("ACCEPT JOB:", jobId);

      const jobRef = doc(db, "jobs", jobId);

      await updateDoc(jobRef, {
        status: "assigned",
        workerId: user.uid,
      });

      console.log("JOB ASSIGNED");

      // refresh jobs from Firestore
      const updated = await fetchJobs();
      setJobs(updated);

    } catch (err) {
      console.error("ACCEPT ERROR:", err);
      alert(err.message);
    }
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);

      await updateDoc(jobRef, {
        status,
      });

      const updated = await fetchJobs();

      setJobs(updated);

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const submitReview = async (job) => {
    try {
      await createReview({
        jobId: job.id,
        reviewerId: user.uid,
        revieweeId: job.workerId,

        rating,
        comment: reviewText,

        createdAt: new Date(),
      });

      alert('Review submitted');

      setReviewText('');
      setRating(5);

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // ---------------- LOGIN SCREEN ----------------
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            display: 'block',
            marginBottom: 10,
            padding: 8,
            width: 250
          }}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            display: 'block',
            marginBottom: 10,
            padding: 8,
            width: 250
          }}
        />

        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="radio"
              value="client"
              checked={role === 'client'}
              onChange={(e) => setRole(e.target.value)}
            />
            Client
          </label>

          <label style={{ marginLeft: 20 }}>
            <input
              type="radio"
              value="worker"
              checked={role === 'worker'}
              onChange={(e) => setRole(e.target.value)}
            />
            Worker
          </label>
        </div>

        <button
          onClick={async () => {
            try {
              console.log("SIGNUP CLICKED", email, password);

              const cred = await signup(email, password);

              console.log("USER CREATED:", cred.user.uid);

              await createUserProfile(cred.user, role);

            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          }}
          style={{
            padding: '8px 12px',
            background: 'black',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            marginRight: 10
          }}
        >
          Sign Up
        </button>

        <button
          onClick={async () => {
            try {
              console.log("LOGIN CLICKED", email, password);

              const cred = await login(email, password);

              console.log("LOGIN SUCCESS:", cred.user.uid);

            } catch (err) {
              console.error(err);
              alert(err.message);
            }
          }}
          style={{
            padding: '8px 12px',
            background: 'green',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </div>
    );
  }
  // ---------------- MAIN APP ----------------
  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>Instant Local Help</h1>

      <p>
        Logged in as: <b>{user.email}</b> ({user.role})
      </p>



      <button
        onClick={() => {
          console.log("logout clicked");
          logout();
        }}
        style={{
          padding: '8px 12px',
          background: 'red',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>

      <hr />

      {/* JOB CREATION */}
      {user.role === 'client' && (
        <>
          <h2>Post a Job</h2>

          <input
            type="text"
            placeholder="Job title"
            value={newJob.title}
            onChange={(e) =>
              setNewJob({ ...newJob, title: e.target.value })
            }
            style={{ padding: 8, marginBottom: 10, width: 300 }}
          />

          <br />

          <input
            type="text"
            placeholder="Category"
            value={newJob.category}
            onChange={(e) =>
              setNewJob({ ...newJob, category: e.target.value })
            }
            style={{ padding: 8, marginBottom: 10, width: 300 }}
          />

          <br />

          <input
            type="text"
            placeholder="Location"
            value={newJob.location}
            onChange={(e) =>
              setNewJob({ ...newJob, location: e.target.value })
            }
            style={{ padding: 8, marginBottom: 10, width: 300 }}
          />

          <br />

          <input
            type="number"
            placeholder="Hours"
            value={newJob.hours}
            onChange={(e) =>
              setNewJob({ ...newJob, hours: e.target.value })
            }
            style={{ padding: 8, marginBottom: 10, width: 300 }}
          />

          <br />

          <input
            type="number"
            placeholder="Pay (£)"
            value={newJob.pay}
            onChange={(e) =>
              setNewJob({
                ...newJob,
                pay: e.target.value
              })
            }
            style={{
              padding: 8,
              marginBottom: 10,
              width: 300
            }}
          />

          <br />
          <textarea
            placeholder="Description"
            value={newJob.description}
            onChange={(e) =>
              setNewJob({ ...newJob, description: e.target.value })
            }
            style={{
              padding: 8,
              marginBottom: 10,
              width: 300,
              height: 100
            }}
          />

          <br />

          <button
            onClick={handleCreateJob}
            style={{
              padding: '8px 12px',
              background: 'black',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Post Job
          </button>

          <hr />
        </>
      )}

      {/* CLIENT DASHBOARD */}
      {user.role === 'client' && (
        <>
          <h2>My Posted Jobs</h2>

          {clientJobs.length === 0 && (
            <p>No jobs posted yet</p>
          )}

          {clientJobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: '1px solid #ddd',
                padding: 15,
                marginBottom: 10,
                borderRadius: 8
              }}
            >
              <h3>{job.title}</h3>

              <p>Status: {job.status}</p>

              <p>Location: {job.location}</p>

              <p>Pay: £{job.pay}</p>

              {job.status === 'completed' && (
                <button
                  onClick={() =>
                    updateJobStatus(job.id, 'confirmed')
                  }
                  style={{
                    padding: '6px 10px',
                    background: 'green',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Completion
                </button>
              )}

              {job.status === 'confirmed' && (
                <div style={{ marginTop: 15 }}>
                  <h4>Leave Review Score 1-5</h4>

                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) =>
                      setRating(Number(e.target.value))
                    }
                    style={{
                      padding: 6,
                      marginBottom: 10,
                      width: 80
                    }}
                  />

                  <br />

                  <textarea
                    placeholder="Write review..."
                    value={reviewText}
                    onChange={(e) =>
                      setReviewText(e.target.value)
                    }
                    style={{
                      width: 300,
                      height: 80,
                      padding: 8,
                      marginBottom: 10
                    }}
                  />

                  <br />

                  <button
                    onClick={() => submitReview(job)}
                    style={{
                      padding: '6px 10px',
                      background: 'black',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Submit Review
                  </button>
                </div>
              )}
              {job.workerId && (
                <p>Worker Assigned ✅</p>
              )}
            </div>
          ))}
        </>
      )}

      {/* WORKER DASHBOARD */}
      {user.role === 'worker' && (
        <>
          <h2>Available Jobs</h2>

          {openJobs.length === 0 && (
            <p>No open jobs right now</p>
          )}

          {openJobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: '1px solid #ddd',
                padding: 15,
                marginBottom: 10,
                borderRadius: 8
              }}
            >
              <h3>{job.title}</h3>

              <p>{job.description}</p>

              <p>Location: {job.location}</p>

              <p>Pay: £{job.pay}</p>

              <button
                onClick={() => acceptJob(job.id)}
                style={{
                  padding: '6px 10px',
                  background: 'green',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Accept Job
              </button>
            </div>
          ))}

          <hr />

          <h2>My Accepted Jobs</h2>

          {workerJobs.length === 0 && (
            <p>No accepted jobs yet</p>
          )}

          {workerJobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: '1px solid #ddd',
                padding: 15,
                marginBottom: 10,
                borderRadius: 8,
                background: '#f9f9f9'
              }}
            >
              <h3>{job.title}</h3>

              <p>Status: {job.status}</p>

              <p>Location: {job.location}</p>

              {job.status === 'assigned' && (
                <button
                  onClick={() =>
                    updateJobStatus(job.id, 'in_progress')
                  }
                  style={{
                    padding: '6px 10px',
                    background: 'orange',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    marginRight: 10
                  }}
                >
                  Start Job
                </button>
              )}

              {job.status === 'in_progress' && (
                <button
                  onClick={() =>
                    updateJobStatus(job.id, 'completed')
                  }
                  style={{
                    padding: '6px 10px',
                    background: 'blue',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Mark Complete
                </button>
              )}
            </div>
          ))}

          <h2>My Reviews</h2>

          {reviews.length === 0 && (
            <p>No reviews yet</p>
          )}

          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                border: '1px solid #ddd',
                padding: 15,
                marginBottom: 10,
                borderRadius: 8
              }}
            >
              <p>
                Rating: ⭐ {review.rating}/5
              </p>

              <p>{review.comment}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}