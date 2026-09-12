import { useCallback, useEffect, useRef, useState } from "react";
import { api, streamChat } from "./api";

export default function ChatApp({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [draftAssistant, setDraftAssistant] = useState("");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const loadRooms = useCallback(async () => {
    const data = await api.rooms();
    setRooms(data.rooms);
    return data.rooms;
  }, []);

  const loadDocs = useCallback(async () => {
    const data = await api.documents();
    setDocuments(data.documents);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadRooms();
        await loadDocs();
        if (list.length) {
          setRoomId(list[0].id);
        } else {
          const created = await api.createRoom("새 대화");
          setRooms([created.room]);
          setRoomId(created.room.id);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [loadRooms, loadDocs]);

  useEffect(() => {
    if (!roomId) return;
    api
      .messages(roomId)
      .then((d) => setMessages(d.messages))
      .catch((e) => setError(e.message));
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draftAssistant]);

  async function newRoom() {
    const created = await api.createRoom("새 대화");
    setRooms((prev) => [created.room, ...prev]);
    setRoomId(created.room.id);
    setMessages([]);
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await api.uploadDocument(file);
      await loadDocs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !roomId || pending) return;

    setInput("");
    setPending(true);
    setError("");
    setDraftAssistant("");

    try {
      await streamChat({
        roomId,
        message: text,
        onEvent: (ev) => {
          if (ev.type === "user") {
            setMessages((prev) => [...prev, ev.message]);
          } else if (ev.type === "token") {
            setDraftAssistant((prev) => prev + ev.content);
          } else if (ev.type === "done") {
            setMessages((prev) => [...prev, ev.message]);
            setDraftAssistant("");
          } else if (ev.type === "error") {
            setError(ev.message || "스트림 오류");
          }
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
      setDraftAssistant("");
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="side-head">
          <strong>{user.username}</strong>
          <button type="button" className="ghost" onClick={onLogout}>
            로그아웃
          </button>
        </div>

        <button type="button" className="primary" onClick={newRoom}>
          + 새 대화
        </button>

        <ul className="room-list">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={r.id === roomId ? "active" : ""}
                onClick={() => setRoomId(r.id)}
              >
                {r.title}
              </button>
            </li>
          ))}
        </ul>

        <div className="docs">
          <div className="docs-head">
            <span>첨부 문서</span>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
              업로드
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={onUpload}
            />
          </div>
          <ul>
            {documents.length === 0 && <li className="muted">없음</li>}
            {documents.map((d) => (
              <li key={d.id} title={d.indexError || d.filename}>
                {d.filename}
                <span className="muted">
                  {" "}
                  {d.indexed ? `· ${d.chunkCount}청크` : d.indexError ? "· 미인덱싱" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="chat">
        <header className="chat-head">
          <h1>대화</h1>
          <span className="muted">응답은 SSE로 스트리밍됩니다</span>
        </header>

        <div className="messages">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`bubble ${m.role === "USER" ? "user" : "assistant"}`}
            >
              <div className="role">{m.role === "USER" ? "나" : "봇"}</div>
              <div className="content">{m.content}</div>
            </div>
          ))}
          {draftAssistant && (
            <div className="bubble assistant pending">
              <div className="role">봇</div>
              <div className="content">{draftAssistant}</div>
            </div>
          )}
          {pending && !draftAssistant && (
            <div className="bubble assistant pending">
              <div className="role">봇</div>
              <div className="content muted">생각 중…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error bar">{error}</p>}

        <form className="composer" onSubmit={send}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요"
            disabled={pending}
          />
          <button type="submit" disabled={pending || !input.trim()}>
            {pending ? "응답 중" : "보내기"}
          </button>
        </form>
      </main>
    </div>
  );
}
