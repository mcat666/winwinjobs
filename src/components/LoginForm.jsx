export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  role,
  setRole,
  message,
  loading,
  handleLogin,
  handleSignup,
  isSignup,
  setIsSignup,
}) {
  return (
    <div style={{ padding: 20 }}>
      {message && (
        <div
          style={{
            padding: 10,
            marginBottom: 15,
            background: "#e5e7eb",
            borderRadius: 8,
          }}
        >
          {message}
        </div>
      )}

      <h2>{isSignup ? "Sign Up" : "Login"}</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: "block",
          marginBottom: 10,
          padding: 8,
          width: 250,
        }}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          display: "block",
          marginBottom: 10,
          padding: 8,
          width: 250,
        }}
      />

      {isSignup && (
        <div style={{ marginBottom: 10 }}>
          <label>
            <input
              type="radio"
              value="client"
              checked={role === "client"}
              onChange={(e) => setRole(e.target.value)}
            />
            Client
          </label>

          <label style={{ marginLeft: 20 }}>
            <input
              type="radio"
              value="worker"
              checked={role === "worker"}
              onChange={(e) => setRole(e.target.value)}
            />
            Worker
          </label>
        </div>
      )}

      {isSignup ? (
        <button
          onClick={handleSignup}
          disabled={loading}
          style={{
            background: "#16a34a",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            marginRight: 10,
          }}
        >
          {loading ? "Loading..." : "Sign Up"}
        </button>
      ) : (
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: "#111827",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            marginRight: 10,
          }}
        >
          {loading ? "Loading..." : "Login"}
        </button>
      )}

      <p
        onClick={() => setIsSignup(!isSignup)}
        style={{
          cursor: "pointer",
          marginTop: 15,
          color: "#2563eb",
        }}
      >
        {isSignup
          ? "Already have an account? Login"
          : "Need an account? Sign Up"}
      </p>
    </div>
  );
}