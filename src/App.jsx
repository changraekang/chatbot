import { useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api";
import ChatApp from "./ChatApp";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setBooting(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const data = await api.login(username.trim(), password);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setError(err.message || "실패");
    } finally {
      setPending(false);
    }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  if (booting) {
    return (
      <div className="shell">
        <p className="muted">불러오는 중…</p>
      </div>
    );
  }

  if (user) {
    return <ChatApp user={user} onLogout={logout} />;
  }

  return (
    <div className="shell auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h1>RAG Chat</h1>
        <p className="muted">env 계정 로그인 · S3 첨부 · Qdrant RAG</p>

        <label>
          아이디
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={pending}>
          {pending ? "처리 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
