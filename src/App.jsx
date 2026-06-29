import LoginForm from "./components/LoginForm";

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from './firebase';
import { signup, login, logout } from './services/auth';

import { getUserProfile } from './services/users';
import { createJob, fetchJobs } from './services/jobs';
import { createReview, fetchReviewsForUser } from './services/reviews';

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

  const [reviewDrafts, setReviewDrafts] = useState({});

  const [reviews, setReviews] = useState([]);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // ---------------- AUTH ----------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        return;
      }

      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setUser(null);
          return;
        }

        const profile = snap.data();

        setUser({
          ...u,
          role: profile.role,
        });

      } catch (err) {
        console.error(err);
        setUser(null);
      }
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

  const handleSignup = async () => {
    try {
      setLoading(true);
      setMessage("Creating account...");

      const cred = await signup(email, password);

      const user = cred.user;

      // 1. create profile FIRST
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: new Date(),
        emailVerified: false
      });

      // 2. force refresh user state (important for Firebase email system)
      await user.reload();

      // 3. send verification email (CRITICAL STEP)
      await sendEmailVerification(user);

      setMessage("Verification email sent. Please check your inbox.");

      // 4. logout AFTER everything is done
      await logout();

    } catch (err) {


      switch (err.code) {

        case 'auth/invalid-email':
          setMessage('Please enter a valid email address.');
          break;

        case 'auth/email-already-in-use':
          setMessage('An account already exists with this email.');
          break;

        case 'auth/invalid-credential':
          setMessage('Incorrect email or password.');
          break;

        case 'auth/user-not-found':
          setMessage('No account found for this email.');
          break;

        case 'auth/wrong-password':
          setMessage('Incorrect password.');
          break;

        case 'auth/weak-password':
          setMessage('Password must be at least 6 characters.');
          break;

        default:
          setMessage('Something went wrong. Please try again.');
      }

    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {

      setLoading(true);
      setMessage("Logging in...");

      const cred = await login(email, password);

      if (!cred.user.emailVerified) {
        setMessage("Please verify your email first.");

        await logout();

        return;
      }

      setMessage("Login successful");

    } catch (err) {

      switch (err.code) {

        case 'auth/invalid-email':
          setMessage('Please enter a valid email address.');
          break;

        case 'auth/email-already-in-use':
          setMessage('An account already exists with this email.');
          break;

        case 'auth/invalid-credential':
          setMessage('Incorrect email or password.');
          break;

        case 'auth/user-not-found':
          setMessage('No account found for this email.');
          break;

        case 'auth/wrong-password':
          setMessage('Incorrect password.');
          break;

        case 'auth/weak-password':
          setMessage('Password must be at least 6 characters.');
          break;

        default:
          setMessage('Something went wrong. Please try again.');
      }

    } finally {

      setLoading(false);

    }
  };

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
        status: "pending_approval",
        workerId: user.uid,
      });

      console.log("JOB PENDING APPROVAL");

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

        rating: reviewDrafts[job.id]?.rating || 5,
        comment: reviewDrafts[job.id]?.comment || '',

        createdAt: new Date(),
      });

      alert('Review submitted');

      setReviewDrafts({
        ...reviewDrafts,
        [job.id]: {
          rating: 5,
          comment: ''
        }
      });


    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const getWorkerStats = (workerId) => {
    const workerReviews = reviews.filter(
      (r) => r.revieweeId === workerId
    );

    if (workerReviews.length === 0) {
      return {
        average: 0,
        count: 0,
      };
    }

    const sum = workerReviews.reduce(
      (acc, r) => acc + r.rating,
      0
    );

    return {
      average: sum / workerReviews.length,
      count: workerReviews.length,
    };
  };

  // ---------------- Login Form ----------------
  if (!user) {
    return (
      <LoginForm
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        role={role}
        setRole={setRole}
        message={message}
        loading={loading}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
        isSignup={isSignup}
        setIsSignup={setIsSignup}
      />
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

          <h2>Pending Worker Requests</h2>

          {jobs
            .filter(job => job.status === "pending_approval" && job.clientId === user.uid)
            .map(job => {
              const stats = getWorkerStats(job.workerId);

              return (
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

                  <p>Worker ID: {job.workerId}</p>

                  <p>
                    ⭐ {stats.average.toFixed(1)} ({stats.count} reviews)
                  </p>

                  <button
                    onClick={async () => {
                      const jobRef = doc(db, "jobs", job.id);

                      await updateDoc(jobRef, {
                        status: "assigned"
                      });

                      const updated = await fetchJobs();
                      setJobs(updated);
                    }}
                    style={{
                      padding: '6px 10px',
                      background: 'green',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Approve Worker
                  </button>
                </div>
              );
            })}
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
                    value={reviewDrafts[job.id]?.rating || 5}
                    onChange={(e) =>
                      setReviewDrafts({
                        ...reviewDrafts,
                        [job.id]: {
                          ...reviewDrafts[job.id],
                          rating: Number(e.target.value)
                        }
                      })
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
                    value={reviewDrafts[job.id]?.comment || ''}
                    onChange={(e) =>
                      setReviewDrafts({
                        ...reviewDrafts,
                        [job.id]: {
                          ...reviewDrafts[job.id],
                          comment: e.target.value
                        }
                      })
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
              {job.workerId && (() => {
                const stats = getWorkerStats(job.workerId);

                return (
                  <div>
                    <p>Worker Assigned ✅</p>

                    <p>
                      ⭐ {stats.average.toFixed(1)} ({stats.count} reviews)
                    </p>
                  </div>
                );
              })()}
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

              {(job.status === 'assigned' || job.status === "pending_approval") && (
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

          {(() => {
            const myStats = getWorkerStats(user.uid);

            return (
              <>
                {/* STATS */}
                {myStats.count === 0 ? (
                  <p>No reviews yet</p>
                ) : (
                  <p>
                    ⭐ Average Rating: {myStats.average.toFixed(1)} <br />
                    💬 Total Reviews: {myStats.count}
                  </p>
                )}

                {/* REVIEW LIST */}
                {reviews
                  .filter((r) => r.revieweeId === user.uid)
                  .map((review) => (
                    <div
                      key={review.id}
                      style={{
                        border: '1px solid #ddd',
                        padding: 15,
                        marginBottom: 10,
                        borderRadius: 8
                      }}
                    >
                      <p>Rating: ⭐ {review.rating}/5</p>
                      <p>{review.comment}</p>
                    </div>
                  ))}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}