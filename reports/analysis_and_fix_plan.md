# 타이틀 미출력 및 애니메이션 확인 불가 문제 분석 및 해결 계획 (_plan.md)

## 1. 문제 분석 (Analysis)

### 1.1 타이틀 미출력 원인 (Title Visibility Issue)
- **오버레이 옵션 누락**: `VideoSettingsPanel`에서는 `showTitleOverlay` 체크박스가 있으나, `VideoPlayer`의 렌더링 루프에서는 이 값을 명시적으로 확인하지 않고 `showTitle` 상위 prop만 사용하고 있을 가능성이 있습니다.
- **수학적 오류 (Division by Zero)**: `VideoPlayer.tsx`에서 `titleOpacity` 계산 시 `fadeInDuration`이 0일 경우 0으로 나누기가 발생하여 `NaN` 값이 할당됩니다. `ctx.globalAlpha = NaN` 처리 시 텍스트가 보이지 않게 됩니다.
- **타이핑 효과 오류**: `typing` 효과 적용 시 `fadeIn`이 0이면 `typingProgress` 역시 `NaN`이 되어 텍스트가 출력되지 않습니다.
- **조건문 논리**: `applyEffect`에서 `titleOpacity`가 0 이하로 계산될 경우 텍스트가 렌더링되지 않습니다.

### 1.2 애니메이션 확인 불가 원인 (Animation Finder Issue)
- **UI 레이블의 모호함**: 현재 "타이틀 효과" 드롭다운 하나에 진입 애니메이션과 기존 효과(그림자 등)가 섞여 있어 사용자가 애니메이션 설정을 찾기 어려울 수 있습니다.
- **상수값 불일치**: 이전 작업에서 'gradient', 'outline' 등의 기본 효과를 상수는 제거했으나 코드에는 잔재가 있거나, 그 역의 상황이 발생하여 UI와 실제 동작이 어긋났을 수 있습니다.

## 2. 해결 계획 (Fix Plan)

### 2.1 VideoPlayer.tsx 수정 (수정/승인 필요)
- **Zero-safe 계산**: `fadeIn` 및 `fadeOut` 사용 시 `Math.max(0.001, duration)` 또는 조건문을 사용하여 `NaN` 발생을 방지하겠습니다.
- **오버레이 설정 연동**: `titleSettings.showTitleOverlay` 값을 렌더링 조건문에 추가하겠습니다.
- **누락된 효과 복구**: 사용자 취향에 따라 'gradient', 'outline' 등의 기본 효과 선택지를 다시 확보하겠습니다.

### 2.2 VideoSettingsPanel.tsx 수정 (수정/승인 필요)
- **UI 직관성 개선**: "효과" 드롭다운의 그룹화를 시각화하거나, 레이블을 "애니메이션/효과"로 변경하여 사용자가 쉽게 찾을 수 있도록 개선하겠습니다.

### 2.3 constants.ts 수정 (수정/승인 필요)
- 누락된 기본 효과들을 다시 추가하여 선택의 폭을 넓히겠습니다.

## 3. 작업 순서
1. `rules/EXECUTION_RULES.md`에 의거하여 위 플랜을 리포트로 제출.
2. 사용자의 **"수정"** 또는 **"승인"** 지시 대기.
3. 승인 시 순차적으로 코드 수정 및 `lint_applet` 검증.
4. 최종 버전 업데이트 및 상세 리포트 작성.

---
**보고자**: AI 어시스턴트
**날짜**: 2026-04-23
