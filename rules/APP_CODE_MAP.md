# Echoes Unto Him - 애플리케이션 코드 맵 (v1.15.30)

## 📌 개요
- 프로젝트명: Echoes Unto Him (CCM 자동화 프로젝트)
- 현재 버전: v1.15.30
- 마지막 업데이트: 2026-04-30
- 주요 아키텍처: React (Vite) + Tailwind CSS + Gemini AI + FFmpeg Render Server

## 🗺️ 소스 코드 구조 및 핵심 라인

## [v1.15.30] - 2026-04-30
### 🔧 버그 수정 + 기능 추가 (Patch)
- **자동 번역 중복 방지**: `App.tsx` 음원 분석 후 양국 가사 존재 시 `lastTranslatedLyricsRef` 갱신 → 10초 자동 번역 스킵
- **묵상 이미지 도서관 복구**: `MeditationTab.tsx` Firestore 쿼리에서 `orderBy` 제거 → 복합 인덱스 불필요, 기존 이미지 정상 로드
- **영상 진입 효과 수정**: `VideoPlayer.tsx` 재생 시작 시점(`playStartedTimeRef`) 기반으로 fade/slide 애니메이션 타이밍 보정 → 깜빡임 해소
- **묵상 유령 이미지 찾기**: `MeditationTab.tsx` Storage 스캔 → DB 미매칭 이미지 발견 시 복구 또는 삭제 가능
- **수정 파일**: `App.tsx`, `MeditationTab.tsx`, `VideoPlayer.tsx`

## [v1.15.29] - 2026-04-30
### 🔧 버그 수정 (Patch)
- **Firestore rules 누락 수정**: `firestore.rules`에 `meditation_history`, `generated_images` 컬렉션 보안 규칙 추가.
- **MeditationTab props 연결**: `App.tsx`에서 `addToRenderQueue`, `isRendering` props를 MeditationTab에 전달.
- **수정 파일**: `firestore.rules`, `App.tsx`


### 🔧 긴급 구문 오류 수정
- **묵상 탭 복구**: `MeditationTab.tsx` 하단의 중복된 닫는 태그(`</div>`, `}`)를 제거하여 구문 오류를 해결함.
- **시스템 안정화**: 전체 애플리케이션의 렌더링 기능을 정상화함.

#### [상세 코드 기록 (Rule 5)]
**원코드 (L1111 ~ L1117)**:
```tsx
1111: };
1112:         </div >
1113:       )}
1114:     </motion.div >
1115:   );
1116: };
1117: 
```
**수정코드 (L1111)**:
```tsx
1111: };
```

### 🧠 지능적 해석 및 창의적 제목 생성
- **심층 해석**: `interpretation` 필드에 400자 이상의 내용을 강제함.
- **반복 금지 규칙**: AI가 사용자 입력을 단순히 반복하는 것을 금지하고 전문적인 예술적 분석을 명령함.
- **제목 다양성**: 고유성 확보를 위해 은유 기반의 제목 생성 로직을 통합함.

## [v1.14.1] - 2026-04-28
### 🚀 Prompt & UI Optimization
- **Golden Ratio Sync**: Synchronized `handleGenerateFullPlan` and `handleGenerateAI` prompts for 7-10 character semantic line breaks.
- **Premium Typography (Italic)**: Added `italic` style to the vertical shorts preview in `MeditationTab.tsx`.

## [v1.14.0] - 2026-04-27
### 🎨 Shorts Professional & Render Engine Upgrade
- **Shorts Optimized UI**: 9:16 vertical preview with premium glassmockup.
- **Premium Render Engine**: Typewriter animation and delayed meditation appearance.
- **Christian Image Library**: High-quality portrait images with spiritual themes.
- **Semantic Line Breaks**: Improved AI prompts for balanced visual layout.

## [v1.13.0] - 2026-04-27
### 1. 전역 상태 및 메인 로직 (`src/App.tsx`)
- **[L1]**: `Step` 타입에 'meditation' 추가.
- **[L3338]**: 사이드바 메뉴에 '1분 묵상(Factory)' 및 Sparkles 아이콘 적용.
- **[L3545-L3556]**: `MeditationTab` 렌더링 로직 및 `logs` 프롭스 전달.
- **[L38-L39]**: `lucide-react`에서 `Sparkles`, `Clock`, `Music` 등 필수 아이콘 임포트 완료.

### 2. 핵심 기능: 1분 묵상 Factory (`src/components/MeditationTab.tsx`)
- **[v1.15.29] 묵상 Factory**: [L159-182] (필드 매핑 강화 및 동기화), [L545] (Timestamp 기반 히스토리 저장).
- **[일주일 자동 생산]**: `handleGenerateFullPlan` - 주제별 7일치 콘텐츠 AI 일괄 생성.
- **[배경 이미지 일괄 생성]**: `handleGenerateAllImages` - 요일별 파스텔 배경화면 일괄 생성 및 DB 동기화.
- **[데이터 보존]**: `localStorage` 및 Firestore `meditation_history` 이중 연동.
- **[시스템 로그]**: 하단 터미널(Terminal) 컴포넌트를 통해 분석 및 생성 과정 실시간 모니터링.

### 3. 컴포넌트 UI 및 레이아웃
- `src/components/layout/Sidebar.tsx` [L58]: 사이드바 로고 하단 버전 표시부 (`v1.15.29`).
- `src/constants.ts`: `DEFAULT_AI_ENGINE` (Gemini 1.5 Pro), `DEFAULT_IMAGE_ENGINE` (Imagen 3.0) 정의.
- `src/components/VideoPlayer.tsx`: [v1.15.29] 가사 레이아웃(구조 태그 및 공백 타임스탬프) 로직 포함.
- `src/hooks/useLyricsLogic.ts`: [v1.15.29] 음원 분석 프롬프트 고도화 (간주 구간 처리).

## 📦 백업 내역
- `reports/v1.14.1_detailed_diff.md`: 프롬프트 동기화 및 이탤릭 스타일 적용 상세 비교 보고서.
- `reports/v1.14.1_readiness_plan.md`: v1.14.1 최적화 작업 계획서.
- `reports/v1.14.0_plan.md`: 숏츠 세로형 미리보기 최적화 및 줄바꿈 황금 비율 완결 보고서.
- `reports/v1.13.0_plan.md`: 1분 묵상 Factory 풀-자동화 공장 구현 보고서.
- `rules/APP_CODE_MAP.md`: 프로젝트 설계도 최신본.

---
*본 문서는 v1.14.1 작업 내용을 바탕으로 작성되었으며, 코드 수정 시 반드시 위 라인 번호를 재확인하십시오.*
