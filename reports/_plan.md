# 자막 폰트 개별화 및 스타일 다양화(정자체 4종 + 귀여운체 등) 작업 계획서

**일시:** 2026-04-23
**버전:** v1.9.2 (예정)

## 1. 개요
한글과 영어 자막 폰트 설정을 분리하고, 사용자 요청에 맞춰 각 언어별로 **정자체 4종**과 나머지는 **귀여운/감성적인 스타일**의 폰트들로 드롭다운 메뉴를 재구성합니다.

## 2. 세부 작업 내용

### 2.1 데이터 모델 수정 (`src/types.ts`)
- `TitleSettings` 필드 세분화: `lyricsKoreanFont`, `lyricsEnglishFont` 추가.
- 기본값 설정 (한글: 본고딕, 영어: Inter).

### 2.2 상수 정의 (`src/constants.ts`)
- `LYRICS_KOREAN_FONTS` 재구성:
  - **정자체(4종)**: 본고딕(Noto Sans KR), 나눔고딕, 나눔명조, 고운돋움.
  - **귀여운/감성체**: 감자꽃체, 하이멜로디, 개구체, 주아체, 푸어스토리 등.
- `LYRICS_ENGLISH_FONTS` 재구성:
  - **정자체(4종)**: Inter, Roboto, Montserrat, Open Sans.
  - **귀여운/감성체**: Dancing Script, Pacifico, Satisfy, Cookie, Sacramento 등.

### 2.3 폰트 리소스 보강 (`src/index.css`)
- Google Fonts 임포트에 누락된 스타일(Noto Sans KR 900, Open Sans 등) 보완.

### 2.4 UI 컴포넌트 수정 (`src/components/VideoSettingsPanel.tsx`)
- 가사 설정 섹션 내 '한글 폰트' 및 '영어 폰트' 드롭다운 메뉴를 각각 독립적으로 배치.

### 2.5 렌더링 로직 정밀화 (`src/components/VideoPlayer.tsx`)
- 캔버스에서 가사 한 줄씩 그릴 때, 한글 부분과 영어 부분에 각각 설정된 폰트(`lyricsKoreanFont`, `lyricsEnglishFont`)를 즉각 적용.

## 3. 기대 결과
- 가독성이 필요한 정자체와 가사의 무드에 어울리는 귀여운 서체를 동시에 제공하여 사용자 선택 폭 확대.
- 언어별 개별 폰트 적용으로 감각적인 자막 레이아웃 완성.

---
위 계획에 대해 **'승인'**해 주시면 즉시 작업을 진행하겠습니다.
