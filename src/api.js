const TOKEN_KEY = "rag_token";
const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ||
  "https://api.sparkling-rae.com";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, token, formData } = {}) {
  const headers = {};
  const auth = token ?? getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/rag${path}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(data?.error || `요청 실패 (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password } }),
  me: () => request("/auth/me"),
  rooms: () => request("/rooms"),
  createRoom: (title) =>
    request("/rooms", { method: "POST", body: { title } }),
  messages: (roomId) => request(`/rooms/${roomId}/messages`),
  documents: () => request("/documents"),
  uploadDocument: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/documents", { method: "POST", formData: fd });
  },
  deleteDocument: (id) =>
    request(`/documents/${id}`, { method: "DELETE" }),
};

/** POST /rag/chat → SSE 이벤트 콜백 */
export async function streamChat({ roomId, message, onEvent, signal }) {
  const res = await fetch(`${API_BASE}/rag/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ roomId, message }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `채팅 실패 (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      try {
        onEvent(JSON.parse(json));
      } catch {
        /* ignore */
      }
    }
  }
}
