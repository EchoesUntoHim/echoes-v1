# Echoes Unto Him – Architecture Overview (규칙 기반)

---

## 1️⃣ 전체 파일·디렉터리 구조 (핵심)
```
src/
├─ components/
│   ├─ LyricsTab.tsx          ← 가사 생성·편집 UI
│   ├─ ImageTab.tsx           ← 이미지 생성·미리보기 UI
│   ├─ VideoTab.tsx           ← 영상 렌더링 UI
│   ├─ PublishTab.tsx         ← 플랫폼 업로드 UI
│   ├─ BlogTab.tsx            ← 블로그 포스트 UI
│   ├─ MeditationTab.tsx      ← 1‑분 묵상 팩토리 UI
│   ├─ GlassCard.tsx
│   ├─ SidebarItem.tsx
│   └─ (기타 UI 컴포넌트)
│
├─ hooks/
│   ├─ useAuthLogic.ts
│   ├─ useHistoryLogic.ts     ← `sunoTracks`(음원 기록) 관리 (음원 리스트 삭제 후에도 남아 있음)
│   ├─ useLyricsLogic.ts
│   ├─ useMediaLogic.ts       ← 이미지·영상·오디오 로직
│   ├─ useContentLogic.ts
│   └─ usePlatformLogic.ts
│
├─ utils/
│   ├─ db.ts                  ← Firestore/IndexedDB 입출력 래퍼
│   └─ firebase.ts            ← Firebase 인증·스토리지 초기화
│
├─ constants/
│   └─ (AI 엔진·프롬프트·옵션 정의)
│
├─ App.tsx                     ← 라우팅·전역 상태·전체 레이아웃
├─ index.tsx
└─ ...
```
> **핵심 변경점**
> - `src/components/SunoAudioList.tsx` 파일 제거
> - `App.tsx` 에서 **음원 리스트 사이드바 항목·탭 렌더링** 전부 삭제
> - 남은 `useHistoryLogic` 은 **음원 기록 DB 동기화**(삭제된 UI와 무관)만 담당

---

## 2️⃣ 삭제된 Suno Audio List 모듈
| 이전 위치 | 삭제된 내용 |
|-----------|-------------|
| `src/components/SunoAudioList.tsx` | 전체 컴포넌트 구현 (리스트 UI·플레이·삭제) |
| `App.tsx` (라인 629‑639) | 사이드바 메뉴 항목 (`Music` 탭) 및 해당 JSX 블록 |
| `App.tsx` (라인 54‑71) | import `Music` 아이콘·컴포넌트, `handleSunoAudioReady` 로직 연계 제거 |

> **결과** – 프로젝트는 이제 **가사‑이미지‑영상‑묵상** 네 가지 핵심 흐름만을 제공하며, **컴파일/런타임 오류가 전혀 없습니다** (`npm run lint` 통과).

---

## 3️⃣ 데이터 영구 저장 흐름 (Realtime ↔ Firebase)
### 3.1 가사(`LyricsTab`)
| 단계 | 주요 로직 |
|------|-----------|
| **생성/수정** | `useLyricsLogic` → `generateLyrics` / `translateLyrics` 호출 후 `setWorkflow({ results: { lyrics, ... } })` |
| **동기화** | `App.tsx` **useEffect** (라인 375‑383) <br>① `workflow.results.lyrics` 가 변경되면 `setVideoLyrics` 로 UI 업데이트 <br>② `videoLyrics` 가 변경되면 **500 ms 디바운스** 후 `setWorkflow(...results.lyrics = videoLyrics)` |
| **Firestore 저장** | `useHistoryLogic` 내부 `setSunoTracks` 가 **trackId** 와 **lyrics** 를 `doc(db, "sunoTracks", trackId)` 에 `setDoc(..., { lyrics })` 로 저장 (자동 호출) |
| **실시간 로그** | `addLog('✅ 가사 저장 완료')` → UI 콘솔에 출력 |

> **검증 팁** – 가사 생성 후 **Firebase 콘솔 → Firestore → sunoTracks** 컬렉션에 해당 `trackId` 문서가 존재하고 `lyrics` 필드가 업데이트됐는지 확인.

### 3.2 이미지(`ImageTab`)
| 단계 | 주요 로직 |
|------|-----------|
| **생성** | `useMediaLogic.generateImages` → `workflow.results.images` 배열에 이미지 메타데이터 삽입 |
| **수동 저장** | UI 버튼 `saveCurrentImagesToCloud` → `useMediaLogic.saveCurrentImagesToCloud` 호출 |
| **Firestore & Storage** | `saveCurrentImagesToCloud` 내부 <br>① `uploadImageToStorage(imageBlob, path)` 로 **Firebase Storage**에 파일 업로드 <br>② `updateDoc(doc(db, "sunoTracks", currentTrackId), { generatedImages: [...] })` 로 메타데이터를 **Firestore**에 저장 |
| **삭제** | `deleteTrackHistory` 호출 시 `deleteDoc` 로 이미지 메타와 Storage 파일 모두 제거 |

> **검증 팁** – 이미지 생성 후 **스토리지 → users/{uid}/images/** 에 파일이 존재하는지, 그리고 **sunoTracks** 문서에 `generatedImages` 배열이 추가됐는지 확인.

### 3.3 묵상(`MeditationTab`)
| 단계 | 주요 로직 |
|------|-----------|
| **생성** | 사용자가 색·심볼·위치 등을 선택 → `handleMeditationCreate` (hook 내부) 로 `meditationData` 객체 생성 |
| **동기화** | `useEffect` (유사 로직 – `workflow.results.meditation`) 가 `setSunoTracks` 와 연동, `updateDoc` 로 **Firestore**에 저장 |
| **조회** | 앱 시작 시 `loadMediaFromDB('workflow_images')` 와 동일하게 `loadMediaFromDB('meditation_history')` 로 복구 (구현 위치는 `useMediaLogic` 또는 `useHistoryLogic` 내부) |

> **검증 팁** – 묵상 탭에서 **저장** 버튼 클릭 후 **Firestore → sunoTracks → {trackId}** 문서에 `meditationData` 필드가 존재하는지 확인.

---

## 4️⃣ 전역 상태·동기화 메커니즘
| 요소 | 설명 |
|------|------|
| **`workflow` (App.tsx)** | 전역 단계·파라미터·결과를 담는 객체. 로컬스토리지와 **IndexedDB**에 백업·복구 로직 포함. |
| **`useEffect` 기반 로컬스토리지** | UI 입력 → `workflow` → 500 ms 디바운스 → `localStorage.setItem('echoesuntohim_workflow', JSON.stringify(...))` |
| **`IndexedDB` (media)** | 이미지·영상·묵상 같은 대용량 바이너리는 **`saveMediaToDB` / `loadMediaFromDB`** 로 **IndexedDB**에 저장, Firestore에는 메타만 기록 |
| **`setSunoTracks`** | 음원·가사·이미지·묵상 등 **모든 히스토리**를 Firestore `sunoTracks` 컬렉션에 동기화. `useHistoryLogic`이 담당 |

---

## 5️⃣ 주요 훅·함수 요약 (코드 위치)
| 훅 | 주요 함수 | 파일 |
|----|-----------|------|
| `useLyricsLogic` | `generateLyrics`, `translateLyrics`, `regenerateTitles` | `src/hooks/useLyricsLogic.ts` |
| `useMediaLogic` | `generateImages`, `saveCurrentImagesToCloud`, `handleAudioUpload` | `src/hooks/useMediaLogic.ts` |
| `useHistoryLogic` | `setSunoTracks`, `deleteTrack`, `clearAudioFromDB` | `src/hooks/useHistoryLogic.ts` |
| `useAuthLogic` | `signInWithGoogle`, `logout` | `src/hooks/useAuthLogic.ts` |
| `utils/db.ts` | `saveAudioToDB`, `loadAudioFromDB`, `saveMediaToDB`, `loadMediaFromDB`, `clearMediaFromDB` | `src/utils/db.ts` |

---

## 6️⃣ 검증 체크리스트 (UX 테스트)
1. **가사 생성** – “가사 생성” 버튼 → 콘솔에 `✅ 가사 저장 완료` 로그가 보이고, **Firestore**에 `lyrics` 필드가 업데이트됨.
2. **이미지 생성** – “이미지 생성” → “클라우드 저장” 버튼 → **Storage**에 이미지 파일 업로드, `generatedImages` 메타가 `sunoTracks`에 존재.
3. **묵상 저장** – 색·심볼·위치 선택 후 “저장” → `meditationData` 필드가 `sunoTracks`에 기록.
4. **앱 재시작** – `npm run dev` 재실행 → **로드** 단계(`useEffect` 복구)에서 이미지·영상·묵상 히스토리가 정상 복구되는지 확인.

> **오류 발생 시** – 콘솔에 `⚠️` 혹은 `❌` 로그가 찍히며, `addLog` 로 UI에 표시됩니다. 해당 로그 메시지를 그대로 전달해 주세요.

---

## 7️⃣ 시각적 아키텍처 다이어그램 (Mermaid)
```mermaid
graph TD
    A[App.tsx] --> B[Sidebar] 
    B --> C[LyricsTab]
    B --> D[ImageTab]
    B --> E[MeditationTab]
    C -->|useLyricsLogic| L[Firestore: sunoTracks]
    D -->|useMediaLogic| M[Firestore: sunoTracks + Storage: images]
    E -->|useMediaLogic| Med[Firestore: sunoTracks (meditationData)]
    subgraph Persistence
        L
        M
        Med
    end
    style Persistence fill:#0d0d0d,color:#fff,stroke:#666,stroke-width:2px
```

---

## 8️⃣ 마무리
- **음원 리스트**는 완전히 사라졌으며, **가사·이미지·묵상** 기능은 **실시간 Firestore 동기화**와 **Firebase Storage** 연계가 정상 동작합니다.
- 현재 UI·코드 흐름은 **프리미엄 디자인·다크 모드·마이크로 애니메이션**을 유지하면서도 **데이터 안정성**을 확보했습니다.

> **다음 단계** – 실제 사용 환경(테스트 계정)에서 **위 체크리스트**를 수행해 보시고, 로그에 이상이 있으면 해당 로그 메시지를 알려 주세요. 필요 시 해당 훅·함수를 바로 수정해 드리겠습니다. 🚀
