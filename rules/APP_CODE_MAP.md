# Echoes Unto Him - Application Code Map (v1.12.22)

## 📌 개요
- 프로젝트명: Echoes Unto Him (CCM 자동화 프로젝트)
- 현재 버전: v1.12.22
- 마지막 업데이트: 2026-04-27
- 주요 아키텍처: React (Vite) + Tailwind CSS + Gemini AI + FFmpeg Render Server

## 🗺️ 소스 코드 구조 및 핵심 라인 (v1.12.22 기준)

### 1. 전역 상태 및 메인 로직 (`src/App.tsx`)
- **[L73]**: **[긴급 수리] 잘못된 임포트 삭제 (v1.12.22)**: `constants.ts`에 존재하지 않는 `INSTRUMENTS` 임포트 제거 완료.
- v1.12.21 (2024-04-26): [Workflow] trackId 도입 및 실시간 동기화 로직 구현.
- v1.12.22 (2024-04-26): [Fix] 린트 에러 및 유령 임포트 제거.
- v1.12.23 (2024-04-27): [Prompt] 기독교 이미지 페르소나 강화 및 수묵화(Ink Wash) 화풍 추가.메뉴 버전 표기 `v1.12.22`로 동기화 완료.
- **[L2133-L2150]**: 실시간 동기화용 `trackId` 부여 로직 유지.
- **[L3250, L3283]**: 내부 화면 및 모바일 메뉴 버전 표기 `v1.12.22`로 동기화 완료.

### 2. 컴포넌트 UI (`src/components/LyricsTab.tsx`)
- **[L1]**: **[긴급 수리] useEffect 임포트 추가 (v1.12.22)**: 실시간 자동 동기화 기능을 위해 사용된 `useEffect` 훅 임포트 누락 해결.
- **[L150-L175]**: 실시간 자동 동기화(Auto-sync) 로직 유지.

### 3. 상수 및 타입
- `src/constants.ts`: `INSTRUMENT_CATEGORIES` (아카펠라 추가)

## 📦 백업 내역
- `backups/1.12.21.zip`: 실시간 자동 동기화(Auto-sync) 기능 구현.
- `backups/1.12.22.zip`: **긴급 린트 에러(Import 오류) 수정**. 

---
*본 문서는 V1.12.22 작업 내용을 바탕으로 작성되었으며, 코드 수정 시 반드시 위 라인 번호를 재확인하십시오.*
