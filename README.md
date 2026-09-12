# RAG Chat (Vite)

가벼운 RAG 챗봇 프론트엔드입니다. 백엔드는 `sparkling-api`의 `/rag` 모듈을 사용합니다.

## 실행

```bash
# 터미널 1 — API
cd ../sparkling-api && npm run dev

# 터미널 2 — 프론트
npm run dev
```

브라우저: http://localhost:5173  
Vite proxy가 `/rag` → `http://localhost:4000` 으로 넘깁니다.

## 흐름

1. 회원가입/로그인 (유저는 `sparkling-api/routes/rag/data/users.json`)
2. 문서 업로드 (파일은 `routes/rag/uploads/`, 메타는 `documents.json`)
3. 채팅 — `POST /rag/chat` SSE 스트림

정식 오픈 시 정적 JSON/파일을 Prisma DB로 교체할 예정입니다.

## 로그인

회원가입 없음. `sparkling-api` `.env`의 `RAG_USERNAME` / `RAG_PASSWORD`로 로그인합니다.

## 백엔드 env (sparkling-api `.env`)

```
RAG_USERNAME=admin
RAG_PASSWORD=...
QDRANT_URL=https://xxxx.aws.cloud.qdrant.io
QDRANT_API_KEY=...
OPENAI_API_KEY=...
# 첨부 S3: 기존 PICKBATTLE_S3_* / PICKBATTLE_CDN_BASE_URL
```

문서 업로드 → S3(`rag/{userId}/...`) → 임베딩 → Qdrant 인덱싱.
