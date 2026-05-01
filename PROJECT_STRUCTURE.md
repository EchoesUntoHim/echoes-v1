# Echoes Unto Him - 프로젝트 구조 및 기능 가이드

이 문서는 프로젝트의 각 폴더와 파일이 수행하는 역할과 기능을 정리한 요약본입니다.

## 📁 주요 폴더 구조

### 1. `src/` (핵심 소스 코드)
*   **`components/`**: UI 구성 요소들을 관리합니다.
    *   `MeditationTab.tsx`: 1분 묵상 Factory의 메인 화면 및 로직.
    *   `LyricsTab.tsx`, `ImageTab.tsx`, `VideoTab.tsx`: 각 단계별 제작 화면.
    *   `Terminal.tsx`: 하단 시스템 로그 출력 컴포넌트.
*   **`hooks/`**: 컴포넌트에서 분리된 핵심 비즈니스 로직(커스텀 훅)입니다.
    *   `useLyricsLogic.ts`: 가사 생성 및 제목 결정 로직.
    *   `useHistoryLogic.ts`: 히스토리 데이터(sunoTracks)의 로컬/클라우드 동기화 및 최적화.
    *   `useMediaLogic.ts`: 이미지 생성 및 영상 렌더링 서버 연동.
    *   `useMeditationHistory.ts`: 묵상 이미지 전용 로컬 히스토리 관리.
*   **`prompts/`**: AI(Gemini, Imagen)에게 전달되는 핵심 지침서(.txt)입니다.
    *   `Lyrics.txt`: 가사 페르소나 및 서술 규칙.
    *   `Image.txt`: 이미지 생성 스타일 가이드.
*   **`services/`**: 유튜브, 틱톡 등 외부 플랫폼 API 연동 서비스.
*   **`utils/`**: 데이터베이스(IndexedDB), 시간 계산 등 공통 유틸리티 함수.

### 2. `rules/` (규칙 및 설계도)
*   `EXECUTION_RULES.md`: 작업 시 반드시 지켜야 할 12가지 실행 규칙.
*   `AI_STRICT_GUIDELINES.md`: AI의 독단적 수정을 방지하는 강제 지침.
*   `APP_CODE_MAP.md`: 프로젝트의 버전 이력 및 핵심 코드 위치 설계도.

### 3. `reports/` (작업 기록)
*   `vX.X.X_plan.md`: 수정 전 작성하는 작업 계획서.
*   `vX.X.X_detailed_diff.md`: 수정 후 코드 변경점을 기록한 상세 보고서.

### 4. `backups/`
*   프로젝트 버전별 전체 백업 압축 파일 보관소.

---

## 📄 핵심 파일 설명

*   **`App.tsx`**: 애플리케이션의 메인 엔트리 포인트. 탭 네비게이션과 전역 상태를 관리합니다.
*   **`firebase.ts`**: Firebase 설정 및 구글 로그인, Firestore 데이터베이스 연동.
*   **`기본구조.txt`**: 프로젝트의 원형 요구사항과 핵심 엔진 정의.
*   **`PROJECT_STRUCTURE.md`**: (본 문서) 전체 프로젝트 기능 가이드.

---
**마지막 업데이트 버전: v1.15.27**
