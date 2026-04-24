# 프로젝트 대대적 리팩토링 및 코드 간소화 계획서

## 1. 목적
- 중복 코드 통합을 통한 유지보수 효율성 극대화.
- 파일별 기능 위치 명확화로 개발 속도 향상.
- '원클릭 통합 자동화'를 위한 탄탄한 코드 기반 마련.

## 2. 통합 대상 (중복 제거 후보)
- **공통 업로드**: `ImageTab`, `VideoTab`, `BlogTab`의 파일 업로드 UI 및 핸들러.
- **카드 및 패널**: `GlassCard`, `MetadataCard`, `SettingsPanel`의 스타일 통일.
- **페이지네이션**: 모든 목록형 데이터에 적용될 공통 페이징 컴포넌트.
- **데이터 관리**: `LocalStorage` 접근 로직 통합 관리.

## 3. 코드 위치 저장소 (Fix Registry)
*이후 모든 수정 위치는 여기에 기록하여 검색 시간을 단축함.*
- **Version/Header**: `App.tsx` (3237-3242)
- **Image History**: `ImageTab.tsx` (550-650)
- **Reset Button**: `BlogTab.tsx` (630-650)
- **Blogger Logic**: `services/uploadService.ts`

## 4. 실행 단계
1. **[구조화]** 공통 UI 컴포넌트 추출 및 `src/components/common` 폴더 생성.
2. **[서비스화]** `App.tsx`의 로직 중 API/저장소 관련 코드를 `src/services`로 이전.
3. **[최적화]** 탭별 중복 UI를 공통 컴포넌트로 교체.

---
**계획을 검토하시고 "승인"해 주시면 1단계(구조화)부터 착수하겠습니다.**
