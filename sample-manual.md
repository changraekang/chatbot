# 스파클링 RAG 테스트 매뉴얼 (샘플)

버전: 1.0 · 용도: Qdrant Free Tier + OpenAI 임베딩 연동 확인용 문서

---

## 1. 서비스 개요

동여맬지도는 한국관광공사 TourAPI 기반 관광지를 **미션**으로 제시하고,
현장에서 **50m 이내 근접 인증**으로 기록을 남기면 나만의 대한민국 지도가 채워지는
게임형 여행 기록 앱입니다.

핵심 순환은 다음과 같습니다.

1. 기록 (Record)
2. 시각화 (Visualize)
3. 탐색 (Explore)
4. 성취 (Achieve)

---

## 2. 로그인과 계정

- 회원가입 없이 서버 `.env`에 등록된 계정으로 로그인합니다.
- 기본 테스트 계정 아이디는 `admin` 입니다. (비밀번호는 환경변수 `RAG_PASSWORD`)
- JWT 토큰이 발급되며, 이후 API 호출에 Bearer 헤더로 사용됩니다.

---

## 3. 문서 업로드와 RAG

첨부 문서는 S3에 저장되고, 텍스트 파일(`.txt`, `.md` 등)은 청크로 나뉜 뒤
OpenAI `text-embedding-3-small` 모델로 임베딩되어 Qdrant Cloud에 인덱싱됩니다.

채팅 시 사용자 질문을 같은 모델로 임베딩한 다음, Qdrant에서 유사 청크를 검색해
LLM(`gpt-4o-mini`) 컨텍스트로 넣습니다. 응답은 HTTP SSE로 스트리밍됩니다.

검색 결과가 없거나 Qdrant/OpenAI 키가 없으면 키워드 폴백 또는 mock 응답을 사용합니다.

---

## 4. 자주 묻는 질문 (FAQ)

### Q. 미션 인증 반경은 얼마인가요?
A. 클라이언트에서 Haversine으로 계산하며, 기본 반경은 **50미터**입니다.
위치 좌표는 서버로 전송하지 않습니다.

### Q. 지원 언어는 무엇인가요?
A. 앱 UI와 TourAPI 호출은 **한국어(ko), 영어(en), 일본어(ja)** 를 지원합니다.
각각 KorService2, EngService2, JpnService2를 사용합니다.

### Q. 지도는 어떻게 채워지나요?
A. 미션 완료나 시·도 첫 방문 기록이 쌓이면 SVG 지도의 해당 지역 색이 진해집니다.
방문 깊이(레벨)에 따라 농도가 달라집니다.

### Q. RAG 챗봇에서 이 문서를 어떻게 쓰나요?
A. Vite 웹앱에서 로그인 후 사이드바의 **업로드**로 이 파일을 올립니다.
인덱싱이 끝나면 「미션 인증 반경은?」처럼 질문하면 문서 내용을 근거로 답합니다.

### Q. Qdrant Free Tier 설정에 필요한 값은?
A. Cluster Endpoint URL(`QDRANT_URL`)과 API Key(`QDRANT_API_KEY`)입니다.
컬렉션 이름은 기본값 `rag_chunks`이며 서버가 없으면 자동 생성합니다.

---

## 5. 운영 체크리스트

- [ ] `OPENAI_API_KEY` 설정
- [ ] `QDRANT_URL`, `QDRANT_API_KEY` 설정
- [ ] sparkling-api 재시작
- [ ] `GET /rag/health` 에서 `qdrant.ok: true`, `llm: openai` 확인
- [ ] 본 매뉴얼 업로드 후 `indexed: true` 확인
- [ ] SSE 채팅으로 FAQ 질문 테스트

---

## 6. 연락 / 메모

이 파일은 실제 서비스 매뉴얼이 아니라 **RAG 파이프라인 스모크 테스트용** 샘플입니다.
고유 키워드: `스파클링청크검증코드-ALPHA-7749`
