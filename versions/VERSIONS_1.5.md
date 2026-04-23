# 버전 관리 이력 (CCM Pro / Echoes Unto Him)

## [v1.5.6] - 2026-04-23

### 영상 렌더링 시스템 고도화 및 오디오 설정 개별화
- **오디오 페이드 설정 개별화**: 전역 설정(audioFadeIn/Out)을 삭제하고, 각 영상 타입(메인, 틱톡, 숏츠)별 `TitleSettings`에 `fadeInDuration`과 `fadeOutDuration` 필드를 추가하여 개별 제어가 가능하도록 개선하였습니다.
- **타이틀 정렬 기능 복구**: 유실되었던 타이틀 정렬(Center, Left, Right) UI를 `VideoSettingsPanel`에 추가하고, `VideoPlayer`에서 이를 정상적으로 반영하도록 수정하였습니다.
- **렌더링 시작 화면 개선**: 메인 및 틱톡 영상 시작 시 노출되던 검은색 시각적 페이드인을 제거하여 썸네일이 즉시 노출되도록 개선하였습니다. (사용자 요청 사항 반영)
- **영어 가사 자동 번역 최적화**: 새로고침 시 이미 번역된 영어 가사가 있을 경우 API 호출을 생략하고 캐시된 데이터를 사용하도록 수정하여 토큰 낭비를 방지하였습니다.
- **UI 레이아웃 최적화**: `VideoSettingsPanel`의 설정 항목들이 좁은 화면에서 겹치지 않도록 그룹화 및 자동 줄바꿈(Flex-wrap)을 적용하여 가독성을 개선하였습니다.
- **UI 최적화**: 설정 페이지에서 불필요해진 전역 오디오 페이드 설정을 제거하고, 영상 렌더링 탭의 개별 설정 패널로 UI를 통합하였습니다.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 버전 정보를 `v1.5.6`으로 업데이트하였습니다.

### 상세 수정 내역 (v1.5.6)

#### 1. src/App.tsx (영어 가사 번역 캐시 로직)
**원코드:**
```tsx
  useEffect(() => {
    if (!workflow.results.lyrics || !apiKey) return;
    
    const timeoutId = setTimeout(async () => {
      if (isTranslating) return;
      await translateLyrics(workflow.results.lyrics);
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [workflow.results.lyrics, apiKey]);
```

**수정코드:**
```tsx
  const lastTranslatedLyricsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!workflow.results.lyrics || !apiKey) return;
    if (workflow.results.lyrics === lastTranslatedLyricsRef.current) return;
    if (!lastTranslatedLyricsRef.current && workflow.results.englishLyrics) {
      lastTranslatedLyricsRef.current = workflow.results.lyrics;
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (isTranslating) return;
      await translateLyrics(workflow.results.lyrics);
      lastTranslatedLyricsRef.current = workflow.results.lyrics;
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [workflow.results.lyrics, apiKey, workflow.results.englishLyrics]);
```

#### 2. src/components/VideoSettingsPanel.tsx (UI 레이아웃 개선)
**원코드:**
```tsx
      <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
        ...
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select ... />
          <select ... />
          <select ... />
          <div className="...">...</div>
          <div className="...">...</div>
          <input type="checkbox" ... />
          <div className="...">F-In</div>
          <div className="...">Out</div>
        </div>
      </div>
```

**수정코드:**
```tsx
      <div className="flex flex-col md:flex-row md:items-center gap-3 p-1">
        ...
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
             {/* Position, Align, Effect Selects */}
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
             {/* Korean/English Fonts */}
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-black/20 p-1 rounded-lg border border-white/5">
             {/* Show Overlay, F-In, Out Inputs */}
          </div>
        </div>
      </div>
```

---

## [v1.5.5] - 2026-04-23
### GPU 과부하 및 메모리 누수 픽스 (v1.5.5)
... (이하 생략)
