import { useCallback, useEffect, useRef, useState } from "react";
import { api, streamChat } from "./api";
import Markdown from "./Markdown";

function initials(name) {
  const s = String(name || "?").trim();
  return (s.slice(0, 2) || "?").toUpperCase();
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function MessageRow({ name, avatarClass, time, children, pending }) {
  return (
    <div className={`msg-row${pending ? " pending" : ""}`}>
      <div className={`avatar ${avatarClass}`}>{initials(name)}</div>
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-name">{name}</span>
          {time && <span className="msg-time">{time}</span>}
        </div>
        <div className="msg-text">{children}</div>
      </div>
    </div>
  );
}

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
  const textareaRef = useRef(null);

  const activeRoom = rooms.find((r) => r.id === roomId);

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
          const created = await api.createRoom("일반");
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
    const created = await api.createRoom("새 채널");
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

  async function onDeleteDoc(id) {
    if (!window.confirm("이 파일을 삭제할까요? (S3·검색 인덱스 포함)")) return;
    try {
      await api.deleteDocument(id);
      await loadDocs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(e) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || !roomId || pending) return;

    setInput("");
    setPending(true);
    setError("");
    setDraftAssistant("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

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

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <div className="slack-layout">
      <aside className="slack-sidebar">
        <div className="workspace">
          <div className="workspace-name">RAG 웍스페이스</div>
          <div className="workspace-user">{user.username}</div>
        </div>

        <div className="side-section">
          <div className="side-label">
            <span>채널</span>
            <button type="button" className="icon-btn" onClick={newRoom} title="새 채널">
              +
            </button>
          </div>
          <ul className="channel-list">
            {rooms.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={r.id === roomId ? "active" : ""}
                  onClick={() => setRoomId(r.id)}
                >
                  <span className="hash">#</span>
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="side-section docs-section">
          <div className="side-label">
            <span>파일</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => fileRef.current?.click()}
              title="업로드"
            >
              ↑
            </button>
            <input ref={fileRef} type="file" hidden onChange={onUpload} />
          </div>
          <ul className="file-list">
            {documents.length === 0 && <li className="empty">첨부 없음</li>}
            {documents.map((d) => (
              <li key={d.id} title={d.indexError || d.filename}>
                <span className="file-icon">📄</span>
                <span className="file-name">{d.filename}</span>
                <span className="file-meta">
                  {d.indexed ? `${d.chunkCount}청크` : "미인덱싱"}
                </span>
                <button
                  type="button"
                  className="file-del"
                  title="삭제"
                  onClick={() => onDeleteDoc(d.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button type="button" className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </aside>

      <main className="slack-main">
        <header className="channel-header">
          <h1>
            <span className="hash">#</span>
            {activeRoom?.title || "채널"}
          </h1>
          <span className="channel-sub">RAG · SSE 스트림</span>
        </header>

        <div className="msg-list">
          {messages.length === 0 && !pending && (
            <div className="channel-empty">
              <h2>
                <span className="hash">#</span>
                {activeRoom?.title || "채널"}
              </h2>
              <p>이 채널의 대화가 시작됩니다. 문서를 업로드한 뒤 질문해 보세요.</p>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === "USER";
            return (
              <MessageRow
                key={m.id}
                name={isUser ? user.username : "RAG Bot"}
                avatarClass={isUser ? "user" : "bot"}
                time={formatTime(m.createdAt)}
              >
                {isUser ? (
                  <div className="plain">{m.content}</div>
                ) : (
                  <Markdown>{m.content}</Markdown>
                )}
              </MessageRow>
            );
          })}

          {draftAssistant && (
            <MessageRow name="RAG Bot" avatarClass="bot" pending>
              <Markdown>{draftAssistant}</Markdown>
            </MessageRow>
          )}
          {pending && !draftAssistant && (
            <MessageRow name="RAG Bot" avatarClass="bot" pending>
              <span className="typing">작성 중…</span>
            </MessageRow>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="toast-error">{error}</div>}

        <div className="composer-wrap">
          <form className="slack-composer" onSubmit={send}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={onKeyDown}
              placeholder={
                activeRoom
                  ? `#${activeRoom.title}에 메시지 보내기`
                  : "메시지를 입력하세요"
              }
              disabled={pending}
              rows={1}
            />
            <div className="composer-bar">
              <button
                type="button"
                className="ghost-sm"
                onClick={() => fileRef.current?.click()}
              >
                파일
              </button>
              <button type="submit" disabled={pending || !input.trim()}>
                보내기
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
