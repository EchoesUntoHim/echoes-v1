# 이미지 생성 기록 누락 문제 해결 플랜 (v1.5.8)

## 1. 문제 분석
- **현상**: 이미지 생성 페이지에서 이미지 생성 기록(최근 작업 히스토리)이 누락되거나 저장되지 않음.
- **원인 가설**:
    1. **용량 초과 (LocalStorage Quota Exceeded)**: 각 이미지 기록에 base64 데이터가 중복 저장(`url`과 `localUrl`)되어 5MB 제한을 쉽게 초과함. 초과 시 데이터가 유실됨.
    2. **Firestore 한도 초과**: 클라우드 동기화 시에도 base64 데이터가 포함되어 Firestore 문서 크기(1MB)를 초과하여 동기화 실패.
    3. **상태 업데이트 로직**: `generateAndSave` 함수 내에서 `sunoTracks`를 업데이트할 때 stale closure 문제나 제목 매칭 실패 가능성.
    4. **Deduplication 오류**: `ImageTab.tsx`에서 제목(title) 기준 Map 데드풀링 시 동일 제목의 다른 기록이 사라질 수 있음.

## 2. 해결 방안
- **데이터 최적화**:
    - `sunoTracks`에 저장되는 이미지 객체에서 `localUrl` 제거 (이미 `url`에 데이터가 있으므로 중복임).
    - 히스토리 저장 시 base64 이미지의 개수나 품질을 관리하여 용량 확보.
- **Persistence 강화**:
    - `localStorage.setItem('suno_json_data', ...)` 호출 시 `try-catch`를 추가하고, 실패 시 오래된 기록의 이미지를 제거하여 공간을 확보하는 fallback 로직 구현.
- **로직 개선**:
    - `generateAndSave`에서 `titleToSave`를 결정할 때 `workflow.results.title`을 우선적으로 확인.
    - `handleLoadFromHistory` 시 현재 워크플로우와의 연결성 강화.

## 3. 작업 파일
- `src/App.tsx`: `sunoTracks` 저장 최적화 및 LocalStorage 에러 핸들링.
- `package.json`: v1.5.8로 업데이트.
- `versions/VERSIONS.md`: 변경 사항 기록.

## 4. 검증 계획
- 이미지 생성 후 히스토리 목록에 즉시 나타나는지 확인.
- 페이지 새로고침 후에도 히스토리가 유지되는지 확인.
- 여러 번 생성하여 용량이 늘어났을 때도 안정적으로 저장되는지 확인.
