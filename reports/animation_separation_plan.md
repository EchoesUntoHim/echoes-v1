# 효과 및 애니메이션 분리 작업 계획서 (_plan.md)

## 1. 목적 (Goal)
사용자의 이전 지시사항("추가")을 오해하여 하나로 묶었던 "타이틀 효과"와 "타이틀 애니메이션"을 각각 독립된 드롭다운 메뉴로 분리하고, 두 가지가 동시에 적용될 수 있도록 시스템을 개편합니다.

## 2. 분석 및 원인 (Analysis)
- **규칙 위반 확인**: 기존의 '그림자', '글로우' 등 시각적 효과와 '플로팅', '타이핑' 등 동작 애니메이션을 하나의 `titleEffect` 타입으로 묶어버림으로써 사용자가 두 가지를 동시에 사용하는 것을 불가능하게 만들었습니다. 
- **버그 확인**: 페이드 인 시간을 0으로 설정 시 `NaN` 발생으로 제목이 안 보이던 문제 확인.

## 3. 수정 계획 (Fix Plan)

### 3.1 데이터 타입 분리 (`src/types.ts`)
- `TitleEffect`: 시각적 스타일 정의 (shadow, glow, neon, outline, gradient 등 10종 이상 복구)
- `TitleAnimation`: 동작 애니메이션 정의 (none, floating, wave, zoom_in, zoom_out, typing 등)
- `TitleSettings`: `titleAnimation` 필드 추가.
- `createDefaultSettings`: 초기값 분리 설정.

### 3.2 상수 업데이트 (`src/constants.ts`)
- `TITLE_EFFECTS`: 순수 시각적 스타일만 포함하도록 수정.
- `TITLE_ANIMATIONS`: 동작 애니메이션만 포함하는 신규 상수 생성.

### 3.3 UI 개선 (`src/components/VideoSettingsPanel.tsx`)
- 타이틀 설정 라인에 '효과'와 '애니메이션' 드롭다운을 나란히 배치.

### 3.4 렌더링 로직 수정 (`src/components/VideoPlayer.tsx`)
- `applyEffect` 함수를 수정하여 선택된 애니메이션(위치, 크기 변환)과 효과(그림자, 스트로크 등)가 **중첩 적용**되도록 구현.
- 페이드 인/아웃 계산 시 `Math.max(0.001, duration)`을 적용하여 `NaN` 방지.
- `showTitleOverlay` 값이 `false`일 경우 렌더링 스킵 로직 추가.

## 4. 기대 결과
- 사용자는 '네온 광채' 효과를 가진 타이틀이 '물결'치며 등장하게 설정할 수 있습니다.
- 0초 페이드 설정 시에도 타이틀이 즉시 정상 노출됩니다.

## 5. 단계별 절차
1. 본 계획서 승인 대기.
2. `types.ts` -> `constants.ts` -> `VideoSettingsPanel.tsx` -> `VideoPlayer.tsx` 순으로 수정 (승인 후).
3. `lint_applet`으로 문법 오류 체크.
4. 수정 상세 내역(`_detailed_diff.md`) 보고.

---
**보고자**: AI 어시스턴트
**날짜**: 2026-04-23
