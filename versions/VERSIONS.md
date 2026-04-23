# 버전 관리 이력 (CCM Pro / Echoes Unto Him)

## [v1.5.5] - 2026-04-23

### 상세 수정 내역 (v1.5.6)

#### 1. src/components/VideoPlayer.tsx (페이드 및 시작 화면 로직)
**원코드:**
```tsx
      // v1.5.2: prop 기반 오디오 페이드 / 시각적 페이드 타입별 분리
      const audioFadeOut = fadeOutDuration > 0 ? fadeOutDuration : 3;
      const isMainOrTiktok = type === 'main' || type === 'tiktok';
      const visualFadeInDur = isMainOrTiktok ? 1.5 : 0; // 메인/틱톡만 페이드인

      if (duration && currentAudioTime >= startTime + duration - audioFadeOut) {
         const fadeOutProgress = (currentAudioTime - (startTime + duration - audioFadeOut)) / audioFadeOut;
         audio.volume = Math.max(0, 1 - fadeOutProgress);
      } else {
         audio.volume = 1;
      }
      ...
      // v1.5.2: 시각적 페이드 - 메인/틱톡은 페이드인, 숏츠는 없음
      let visualOpacity = 0;
      if (visualFadeInDur > 0 && segmentTime < visualFadeInDur) {
        visualOpacity = 1 - (segmentTime / visualFadeInDur);
      }
      if (visualOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, visualOpacity)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
```

**수정코드:**
```tsx
      // v1.5.5: prop 기반 오디오/시각적 페이드 통합
      const audioFadeIn = fadeInDuration || 0;
      const audioFadeOut = fadeOutDuration > 0 ? fadeOutDuration : 3;

      let targetVolume = 1;
      if (segmentTime < audioFadeIn && audioFadeIn > 0) {
        targetVolume = segmentTime / audioFadeIn;
      } else if (duration && currentAudioTime >= startTime + duration - audioFadeOut) {
        const fadeOutProgress = (currentAudioTime - (startTime + duration - audioFadeOut)) / audioFadeOut;
        targetVolume = 1 - fadeOutProgress;
      }
      audio.volume = Math.max(0, Math.min(1, targetVolume));
      ...
      // v1.5.5: 시각적 페이드 - 재생 중이고 페이드가 설정된 경우에만 검은 화면 오버레이 적용
      let visualOpacity = 0;
      if (isPlaying && audioFadeIn > 0 && segmentTime < audioFadeIn) {
        visualOpacity = 1 - (segmentTime / audioFadeIn);
      }
      if (visualOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, visualOpacity)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
```

#### 2. src/components/VideoSettingsPanel.tsx (정렬 및 페이드 UI)
**원코드 (타이틀 설정부):**
```tsx
          <select 
            value={settings.titlePosition}
            onChange={(e) => onChange({ ...settings, titlePosition: e.target.value as TitlePosition })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary outline-none cursor-pointer min-w-[100px]"
          >
            <option value="middle">중앙 (Center)</option>
            <option value="top">상단 (Top)</option>
            <option value="bottom">하단 (Bottom)</option>
            <option value="custom">사용자 (Custom)</option>
          </select>
```

**수정코드 (정렬 및 ID/심미성 추가):**
```tsx
          <select 
            id={`title-position-${type}`}
            aria-label="타이틀 위치 선택"
            value={settings.titlePosition}
            onChange={(e) => onChange({ ...settings, titlePosition: e.target.value as TitlePosition })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary hover:border-white/30 transition-all outline-none cursor-pointer min-w-[100px]"
          >
            <option value="middle">중앙 (Center)</option>
            <option value="top">상단 (Top)</option>
            <option value="bottom">하단 (Bottom)</option>
            <option value="custom">사용자 (Custom)</option>
          </select>

          <select 
            id={`title-align-${type}`}
            aria-label="타이틀 정렬 선택"
            value={settings.titleAlign}
            onChange={(e) => onChange({ ...settings, titleAlign: e.target.value as any })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary hover:border-white/30 transition-all outline-none cursor-pointer min-w-[80px]"
          >
            <option value="center">가운데 정렬</option>
            <option value="left">왼쪽 정렬</option>
            <option value="right">오른쪽 정렬</option>
          </select>
```

---

## [v1.5.5] - 2026-04-23
### GPU 과부하 및 메모리 누수 픽스 (v1.5.5)
- **렌더링 최적화**: `VideoPlayer.tsx` 내부 캔버스 애니메이션 루프(`requestAnimationFrame`)에서 오디오가 정지 상태일 때(이전 렌더링 프레임과 시간이 동일할 때) 무거운 캔버스 그리기(Shadow, 폰트 렌더링, 이미지 Draw)를 생략(`return`)하여 유휴 상태의 GPU 점유율을 대폭 감소시켰습니다.
- **역방향 탐색 호환성 유지**: 영상이 끝났을 때 애니메이션 루프 자체를 소멸시키지 않고 유지하여, 정지된 상태에서도 사용자가 타임라인 바를 역방향으로 조작(`handleSeek`)하면 즉시 화면이 갱신되도록 개선했습니다.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.5`).

### 상세 수정 내역 (v1.5.5)

#### 1. src/components/VideoPlayer.tsx
**원코드:**
```tsx
    let animationFrameId: number;

    const render = () => {
      const currentAudioTime = audio.currentTime;
      const segmentTime = currentAudioTime - (startTime || 0);
      
      if (duration && currentAudioTime >= startTime + duration) {
         audio.pause();
         setIsPlaying(false);
         if (onEnded) onEnded();
         return;
      }
```

**수정코드:**
```tsx
    let animationFrameId: number;
    let lastRenderTime = -1;

    const render = () => {
      const currentAudioTime = audio.currentTime;
      const segmentTime = currentAudioTime - (startTime || 0);
      
      if (duration && currentAudioTime >= startTime + duration) {
         if (isPlaying) {
           audio.pause();
           setIsPlaying(false);
           if (onEnded) onEnded();
         }
         // Do not return here to keep the loop alive for manual seeking
      }
      
      // GPU 최적화: 오디오 시간이 변경되지 않았으면(일시정지 상태) 무거운 그리기 연산 생략
      if (currentAudioTime === lastRenderTime) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }
      lastRenderTime = currentAudioTime;
```

## [v1.5.4] - 2026-04-23
### 사이드바 UI 레이아웃 최적화 (v1.5.4)
- **사이드바 메뉴 컴팩트화**: `SidebarItem.tsx`에 `small` 속성을 추가하여 작은 패딩과 폰트를 사용할 수 있도록 지원.
- **사이드바 스크롤 처리**: `App.tsx` 내의 사이드바 메뉴 네비게이션 영역에 `overflow-y-auto`를 추가하여 화면 세로 높이가 좁아도 하단의 'API 키 설정', '로그인/사용자', '설정' 영역이 가려지지 않고 유지되도록 수정.
- **메뉴 사이즈 축소**: 기존 메뉴 간격 및 패딩을 축소(`w-64 p-6 gap-8` -> `w-60 p-4 gap-4`)하고, "가사 & 프롬프트"부터 "블로그 생성"까지의 탭 항목에 `small={true}`를 적용.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.4`).

### 상세 수정 내역 (v1.5.4)

#### 1. src/components/SidebarItem.tsx
**원코드:**
```tsx
interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
      active 
        ? "bg-primary/10 text-primary border border-primary/20" 
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", active && "text-primary")} />
    <span className="font-medium">{label}</span>
  </button>
);
```

**수정코드:**
```tsx
interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
  small?: boolean;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, small = false }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center rounded-xl transition-all duration-300 group",
      small ? "gap-2 px-3 py-2 text-xs" : "gap-3 px-4 py-3",
      active 
        ? "bg-primary/10 text-primary border border-primary/20" 
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className={cn("transition-transform group-hover:scale-110", small ? "w-4 h-4" : "w-5 h-5", active && "text-primary")} />
    <span className={cn("font-medium", small ? "text-xs" : "")}>{label}</span>
  </button>
);
```

#### 2. src/App.tsx (레이아웃)
**원코드:**
```tsx
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-20 w-64 border-r border-white/5 p-6 flex flex-col gap-8 bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 top-[73px] h-[calc(100vh-73px)]" : "-translate-x-full h-full"
      )}>
// ...
        <nav className="flex-1 flex flex-col gap-2">
// ...
          <div className="mt-4 pt-4 border-t border-white/5">
```

**수정코드:**
```tsx
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-20 w-60 border-r border-white/5 p-4 flex flex-col gap-4 bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 top-[73px] h-[calc(100vh-73px)]" : "-translate-x-full h-full"
      )}>
// ...
        <nav className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
// ...
          <div className="mt-2 pt-2 border-t border-white/5">
```

## [v1.5.3] - 2026-04-23
### 빌드 에러 패치 및 스코프 오류 수정 (v1.5.3)
- **변수 스코프 문제 해결**: `VideoPlayer.tsx`에서 `nextTime` 변수가 블록 스코프(`if` 문 내부)에 선언되어 있어 외부에서 접근 시 발생하는 `nextTime is not defined` 오류를 수정 (`VideoPlayer.tsx`).
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.3`).

### 상세 수정 내역 (v1.5.3)
#### 1. src/components/VideoPlayer.tsx (변수 스코프 문제 해결)
**원코드:**
```tsx
        } else {
          // Fade, Center, Bottom modes
          let currentPair;
          let pairProgress = 0;

          if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
            // ...
            const nextTime = lines[activeIdx + 1]?.time || totalDuration;
```

**수정코드:**
```tsx
        } else {
          // Fade, Center, Bottom modes
          let currentPair;
          let pairProgress = 0;
          let nextTime = totalDuration;

          if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
            // ...
            nextTime = lines[activeIdx + 1]?.time || totalDuration;
```
## [v1.5.2] - 2026-04-23
### 영상 렌더링 수정 및 버그 픽스 (v1.5.2)
- **숏츠 자막 즉시 표시**: 숏츠(fade 모드)에서 1초간 자막이 페이드인 되느라 늦게 나타나던 지연 현상을 수정하여, 영상 시작과 동시에 즉시 노출되도록 보정 (`VideoPlayer.tsx`).
- **배경 시각적 페이드 오버레이 제한**: 화면 전체가 블랙으로 어두워지는 시각적 페이드 효과를 메인 및 틱톡 영상에만(페이드인) 적용하고, 숏츠에서는 완전히 제거 (`VideoPlayer.tsx`).
- **스크롤 페이드 인/아웃 복구**: 자막이 화면 상단/하단 경계에 도달 시 부드럽게 사라지고 나타나는 opacity 조절 로직 복구 (`VideoPlayer.tsx`).
- **영어 자막 교차 노출**: `timedLyrics` 데이터에서 한국어와 영어가 배열에 올바르게 한 줄씩 교차(Interleave) 배치되도록 수정 (`VideoPlayer.tsx`).
- **오디오 설정 연동 및 문법 오류 픽스**: 틱톡 플레이어에 `audioFadeIn/Out` 설정이 연동되도록 수정하는 과정에서 발생했던 `fadeOutDuration` 속성 누락 오류 해결 (`VideoPlayer.tsx`, `VideoTab.tsx`).
- **다운로드 오디오 팝노이즈 해결**: 영상 저장 시 오디오 볼륨을 0에서 1로 빠르게 램프업 시켜 시작 부분의 음튐(팝) 노이즈를 방지하는 기능 적용 완료 (`VideoPlayer.tsx`).
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.2`).

### 상세 수정 내역 (v1.5.2)

#### 1. src/components/VideoPlayer.tsx (Props 누락 및 숏츠 페이드인 보정)
**원코드:**
```tsx
  originalFileName = ""
}: any, ref) => {
// ...
            if (displayMode === 'fade') {
              if (pairProgress < 0.1) opacity = pairProgress / 0.1;
              else if (pairProgress > 0.9) opacity = (1 - pairProgress) / 0.1;
            }
```

**수정코드:**
```tsx
  originalFileName = "",
  fadeInDuration = 0,
  fadeOutDuration = 0
}: any, ref) => {
// ...
            if (displayMode === 'fade') {
              const fadeDur = 0.5;
              const timeSinceStart = currentAudioTime - currentPair.time;
              const timeUntilEnd = nextTime - currentAudioTime;
              // v1.5.2: 숏츠(시작시간) 이전 자막은 페이드인 생략하여 즉시 표시
              if (timeSinceStart < fadeDur && currentPair.time > startTime) {
                opacity = timeSinceStart / fadeDur;
              } else if (timeUntilEnd < fadeDur) {
                opacity = timeUntilEnd / fadeDur;
              }
            }
```

#### 2. src/components/VideoPlayer.tsx (timedLyrics 파싱 오류 수정)
**원코드:**
```tsx
      timedLyrics.forEach(item => {
        if (item.kor) korLines.push(item.kor);
        if (item.eng) engLines.push(item.eng);
        pairs.push({ kor: item.kor || '', eng: item.eng || '' });
      });

      return { 
        flat: [...korLines, ...engLines], 
```

**수정코드:**
```tsx
      timedLyrics.forEach(item => {
        if (item.kor) flat.push(item.kor);
        if (item.eng) flat.push(item.eng);
        pairs.push({ kor: item.kor || '', eng: item.eng || '' });
      });

      return { 
        flat, 
```

## [v1.5.1] - 2026-04-22
### 숏츠 보강 생성 로직 정교화 및 안정성 패치
- **숏츠 순차 생성 로직 적용**: 이미 생성된 숏츠가 있을 경우, 1번부터 다시 만드는 것이 아니라 **다음 번호부터** 이어서 생성하도록 개선 (`App.tsx`).
- **5개 제한 유효성 검사 추가**: 전체 숏츠 개수가 5개를 초과할 경우 작업을 중단하고 사용자에게 경고 메시지를 표시하여 리소스 낭비 방지.
- **AI 프롬프트 최적화**: 보강 생성 시 필요한 개수만큼의 프롬프트만 요청하도록 최적화.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.1`).

### 상세 수정 내역 (v1.5.1)

#### 1. src/App.tsx (순차 생성 및 유효성 검사)
**원코드:**
```tsx
    addLog(`[${imageEngine}] 숏츠 이미지 전체 재생성 중... (설정된 개수: ${shortsCount}개)`);
    ...
    for (let i = 0; i < actualShortsCount; i++) {
      addLog(`새로운 숏츠 하이라이트 ${i + 1} 생성 중...`);
```
**수정코드:**
```tsx
    const existingShortsCount = workflow.results.images.filter((img: any) => img.label.startsWith('숏츠')).length;
    const remainingToGenerate = shortsCount - existingShortsCount;
    if (shortsCount > 5) { alert("최대 숏츠 생성 개수(5개)를 초과할 수 없습니다."); return; }
    ...
    for (let i = 0; i < actualShortsCount; i++) {
      const shortsIndex = existingShortsCount + i + 1;
      addLog(`새로운 숏츠 하이라이트 ${shortsIndex} 생성 중...`);
```

#### 2. src/App.tsx, src/components/LandingPage.tsx, package.json (버전 업데이트)
- `package.json`: `"version": "1.5.1"`
- `App.tsx`: UI 버전 표시 `v1.5.1` 및 로그/주석 내 버전 정보 업데이트.
- `LandingPage.tsx`: UI 버전 표시 `v1.5.1`.


## [v1.5.0] - 2026-04-22
### 숏츠 이미지 보강 생성 기능 도입 및 이미지 생성 안정화
- **숏츠 이미지 보강 생성 로직 도입**: 이미지 생성 중 오류가 발생하거나 중간에 멈췄을 때, 메인/틱톡 이미지는 보존하면서 부족한 숏츠 이미지들만 선택적으로 채워 넣는 기능 추가 (`App.tsx`).
- **이미지 생성 UI 세분화**: 숏츠 이미지 설정 영역에 '누락된 숏츠 보강 생성' 및 '숏츠 이미지 전체 초기화 후 생성' 버튼을 배치하여 작업 효율성 증대 (`ImageTab.tsx`).
- **데이터 무결성 강화**: 개별 이미지 생성 시마다 즉시 클라우드 저장소(Firebase) 업로드 및 DB 동기화를 수행하여 데이터 유실 방지 로직 강화.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.5.0`).

### 상세 수정 내역 (v1.5.0)

#### 1. src/App.tsx (숏츠 보강 생성 로직 고도화)
**원코드 (기존 숏츠 삭제 방식):**
```tsx
      // Remove existing shorts images
      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          images: prev.results.images.filter(img => !img.label.startsWith('숏츠'))
        }
      }));
```
**수정코드 (보강 및 개별 업데이트 방식):**
```tsx
      // KEEP existing images, don't remove them. 
      // We will only add or update based on the label match.
      ...
      const tempImage = { url: base64Url, type: 'vertical' as const, label: `숏츠 ${i + 1}`, prompt: prompts.shortsPrompts[i] };
      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          images: [
            ...prev.results.images.filter(img => img.label !== tempImage.label),
            tempImage
          ]
        }
      }));
```

#### 2. src/components/ImageTab.tsx (UI 버튼 세분화)
**원코드:**
```tsx
                <button
                  onClick={regenerateShorts}
                  className="w-full mt-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> 숏츠 이미지만 전체 재생성
                </button>
```
**수정코드:**
```tsx
                <div className="space-y-2 mt-4">
                  <button
                    onClick={regenerateShorts}
                    className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-primary/30"
                  >
                    <RefreshCw className="w-4 h-4" /> 누락된 숏츠 보강 생성
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm('모든 숏츠 이미지를 삭제하고 새로 생성하시겠습니까?')) {
                        setWorkflow(prev => ({
                          ...prev,
                          results: {
                            ...prev.results,
                            images: prev.results.images.filter((img: any) => !img.label.startsWith('숏츠'))
                          }
                        }));
                        await regenerateShorts();
                      }
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    숏츠 이미지 전체 초기화 후 생성
                  </button>
                </div>
```

## [v1.4.29] - 2026-04-22
### 듀엣 보컬 대비 선택제 및 블로그 플랫폼별 기술 최적화 고도화
- **듀엣 보컬 옵션 사용자 중심 재구조화**: 가독성을 위해 '남녀 / 남남 / 여여' 성별 구조를 유지하면서, 각 섹션 내에 '음색 대조', '화음 조화', '음역 대비' 등 총 20여 개의 세분화된 옵션을 전략적으로 배치 (`constants.ts`).
- **가사 생성 로직 최적화**: 사용자가 고른 구체적인 성별 조합과 음색 스타일(`음색 대조`, `화음 조화`, `음역 대비`)을 AI가 정확히 포착하여, 물리적 음색 차이와 화음의 깊이를 극대화하는 동적 프롬프트 생성.
- **블로그 플랫폼 기술 최적화**: 사용자 선택 스타일을 100% 유지하면서, 네이버(이미지 흐름), 티스토리(구조화), 구글(H태그 SEO) 등 플랫폼별 '기술적 레이아웃'만 전문적으로 최적화하도록 로직 강화.
- **이미지 핵심 문구 오버레이 (Text Overlay)**: 이미지 위에 표시되는 텍스트 생성 시, 단순 제목이 아닌 본문의 핵심 인사이트나 강력한 문구를 추출하여 오버레이하도록 지침 강화.
- **CCM 제목 독창성 고도화**: '은혜', '영광', '소망' 등 상투적인 CCM 키워드 클리셰 사용을 엄격히 금지하고, 곡의 서사를 꿰뚫는 신선한 성경적 메타포와 예술적 깊이를 담은 제목을 생성하도록 로직 보강.
- **'제목만 다시 생성' 기능 도입**: 가사 전체를 다시 만들 필요 없이, 기존 가사의 맥락을 유지하며 독창적인 제목 5개를 즉시 재생성할 수 있는 전용 버튼 추가 (`LyricsTab`).
- **제목 띄어쓰기 규정 강화 및 데이터 안정화**: 제목 내부 띄어쓰기에 `_`, `/` 등 기호 사용을 엄격히 금지하고 **일반 공백** 사용을 강제함. `_`는 오직 한글과 영어 제목 사이의 **단일 구분자**로만 사용하도록 로직을 강화하여 데이터 무결성 및 가독성 확보.
- **AI 페르소나 최상위권 업그레이드**: 
    - **이미지 엔진**: 30년 경력의 베테랑 영화감독 및 아트 디렉터 페르소나 주입.
    - **유튜브 메타데이터**: 글로벌 No.1 큐레이터 페르소나에 한국적 정서 및 CCM 수직/수평 차원 심화 지침 추가.
- **버전 상향**: `package.json`, `App.tsx`, `LandingPage.tsx` 전면 적용 (`v1.4.29`).

### 상세 수정 내역 (v1.4.29)

#### 1. src/constants.ts (듀엣 보컬 옵션 확장)
**수정코드:**
```tsx
  Duet: [
    '------ 남녀 듀엣 (음색 대비/조화) ------',
    '음색 대조형: 남녀 감성 듀엣 (공기감 vs 호소력)',
    '화음 조화형: 부드러운 남녀 팝 발라드 듀엣',
    '에너지 대조형: 파워풀 남성 vs 청아한 여성 듀엣',
    '대화하듯 주고받는 남녀 감성 듀엣',
    ...
  ],
```

#### 2. src/App.tsx (블로그 기술 최적화 및 이미지 오버레이)
**원코드 (imageTexts 지침):**
```tsx
"imageTexts": {
  ${processedImages.map(img => `"${img.label}": "이 이미지가 위치한 단락의 '소제목(챕터 제목)' 또는 해당 단락의 가장 핵심적인 문장을 그대로 사용 (본문과 무관한 문구 금지)"`).join(',\n            ')}
}
```
**수정코드 (핵심 문구 추출 강화):**
```tsx
"imageTexts": {
  ${processedImages.map(img => `"${img.label}": "이 이미지가 위치한 단락의 핵심을 관통하는 '가장 중요한 문구' 또는 '강력한 인사이트'를 한 문장으로 생성 (이미지 위 오버레이용이므로 임팩트 있게 작성)"`).join(',\n            ')}
}
```

## [v1.4.28] - 2026-04-22
### 글로벌 최정상급(MrBeast 레벨) 페르소나 및 CCM 영적 차원 고도화
- **유튜브/틱톡 메타데이터 페르소나 업그레이드**: 글로벌 No.1 인플루언서(5억 명) 및 최정상급 워십 비저너리(3억 명) 수준의 권위 있는 페르소나를 주입하여 알고리즘 최적화 및 도달률 극대화.
- **CCM 수직적/수평적 차원 구체화**: 하나님을 향한 경배(Vertical)와 인간관계 속 하나님의 역사(Horizontal)를 동시에 포착하도록 지침 보강.
- **블로그 생성 엔진 동기화**: 업그레이드된 페르소나의 톤앤매너를 블로그 포스팅 생성 엔진에도 일관되게 적용.

### 상세 수정 내역 (v1.4.28)

#### 1. src/App.tsx (메타데이터 및 블로그 페르소나 강화)
**원코드:**
```tsx
      const isCCM = workflow.params.target === 'CCM';
      const persona = isCCM
        ? "당신은 전 세계 기독교 문화 트렌드를 선도하며 수억 명의 영혼에게 영향력을 끼치는 '디지털 사역의 정점'에 선 최정상급 워십 비저너리입니다. 당신의 채널은 유튜브와 틱톡을 합쳐 3억 명 이상의 팔로워를 보유하고 있으며, 당신이 올리는 영상 하나가 전 세계 예배 문화의 새로운 표준이 됩니다. 유튜브의 정교한 알고리즘 설계와 틱톡의 폭발적인 숏폼 트렌드를 완벽하게 지배하며, 시청자의 마음을 1초 만에 사로잡는 영적이고 감성적인 카피라이팅의 독보적인 권위자입니다."
        : "당신은 전 세계 5억 명 이상의 구독자를 보유하며 유튜브와 틱톡을 통틀어 지구상에서 가장 영향력 있는 글로벌 No.1 음악 인플루언서이자 큐레이터입니다. 당신의 메타데이터는 '알고리즘의 신'이라 불릴 만큼 완벽한 키워드 배치와, 전 세계적인 바이럴 열풍을 즉각적으로 일으키는 고도의 심리학적 카피라이팅이 결합된 마스터피스입니다. 미스터비스트(MrBeast)를 넘어서는 압도적인 도달률과 데이터 분석 능력을 갖추었으며, 트렌드를 따라가는 것이 아니라 스스로 트렌드를 창조하고 지배하는 음악 산업의 살아있는 전설입니다.";

      const prompt = `
        ${persona}
        다음 곡 정보를 바탕으로 유튜브 업로드에 최적화된 메타데이터를 생성해주세요.
        
        [곡 정보]
        - 음악 종류: ${workflow.params.target}
        - 한글 제목: ${workflow.params.koreanTitle || workflow.results.title}
        - 주제: ${workflow.params.topic}
        - 분위기: ${workflow.params.mood}
        - 가사 일부: ${workflow.results.lyrics?.substring(0, 200)}...
        ${workflow.params.songInterpretation ? `- **사용자 곡 해석 (최우선 반영)**: ${workflow.params.songInterpretation}` : ''}
...
      const isCCM = workflow.params.target === 'CCM';
      const genreContext = isCCM
        ? "이 곡은 CCM(Contemporary Christian Music)이므로, 독자들에게 영적인 깊이와 은혜, 위로를 전달하는 데 집중하세요. 문체는 경건하면서도 따뜻해야 합니다."
        : "이 곡은 대중음악이므로, 독자들에게 트렌디한 감성과 공감, 음악적 세련미를 전달하는 데 집중하세요. 문체는 감각적이고 세련되어야 합니다.";
```

**수정코드:**
```tsx
      const isCCM = workflow.params.target === 'CCM';
      const persona = isCCM
        ? "당신은 전 세계 기독교 문화 트렌드를 선도하며 수억 명의 영혼에게 영향력을 끼치는 '디지털 사역의 정점'에 선 최정상급 워십 비저너리입니다. 당신의 채널은 유튜브와 틱톡을 합쳐 3억 명 이상의 팔로워를 보유하고 있으며, 당신이 올리는 영상 하나가 전 세계 예배 문화의 새로운 표준이 됩니다. 유튜브의 정교한 알고리즘 설계와 틱톡의 폭발적인 숏폼 트렌드를 완벽하게 지배하며, 시청자의 마음을 1초 만에 사로잡는 영적이고 감성적인 카피라이팅의 독보적인 권위자입니다."
        : "당신은 전 세계 5억 명 이상의 구독자를 보유하며 유튜브와 틱톡을 통틀어 지구상에서 가장 영향력 있는 글로벌 No.1 음악 인플루언서이자 큐레이터입니다. 당신의 메타데이터는 '알고리즘의 신'이라 불릴 만큼 완벽한 키워드 배치와, 전 세계적인 바이럴 열풍을 즉각적으로 일으키는 고도의 심리학적 카피라이팅이 결합된 마스터피스입니다. 미스터비스트(MrBeast)를 넘어서는 압도적인 도달률을 갖추었으며, 트렌드를 따라가는 것이 아니라 스스로 트렌드를 창조하고 지배하는 음악 산업의 살아있는 전설입니다.";

      const prompt = `
        ${persona}
        다음 곡 정보를 바탕으로 유튜브 업로드에 최적화된 메타데이터를 생성해주세요.
        
        [곡 정보]
        - 음악 종류: ${workflow.params.target}
        - 한글 제목: ${workflow.params.koreanTitle || workflow.results.title}
        - 주제: ${workflow.params.topic}
        - 분위기: ${workflow.params.mood}
        - 가사 일부: ${workflow.results.lyrics?.substring(0, 200)}...
        ${workflow.params.songInterpretation ? `- **사용자 곡 해석 (최우선 반영)**: ${workflow.params.songInterpretation}` : ''}
        ${isCCM ? `
        [CCM 특별 지시사항]
        - 수직적 차원 (Vertical): 하나님을 향한 찬양과 경배의 고백을 최우선으로 담아내세요.
        - 수평적 차원 (Horizontal): 사람들 사이의 관계 속에서 하나님이 어떻게 일하시고 응답하시는지 포착하세요. 인간관계의 상호작용 속에서도 결국 일하시고 반응하시는 분은 하나님이심을 강조하는 통찰력 있는 카피를 작성하세요.
        ` : ''}
...
      const isCCM = workflow.params.target === 'CCM';
      const genreContext = isCCM
        ? "이 곡은 CCM(Contemporary Christian Music)이므로, 독자들에게 영적인 깊이와 은혜, 위로를 전달하는 데 집중하세요. 특히 하나님을 향한 수직적 경배와, 사람 사이의 관계 속에서 일하시는 하나님의 수평적 역사를 모두 아우르는 깊이 있는 통찰을 제공해야 합니다."
        : "이 곡은 대중음악이므로, 전 세계 5억 명의 구독자를 거느린 글로벌 No.1 음악 인플루언서로서 트렌드를 창조하는 감각적인 포스팅을 작성하세요. 시청자의 마음을 1초 만에 사로잡는 고도의 심리학적 카피라이팅을 적용하세요.";
```

#### 2. package.json, App.tsx, LandingPage.tsx (버전 업데이트)
- `package.json`: `"version": "1.4.27"` -> `"version": "1.4.28"`
- `App.tsx`: UI 버전 표시 `v1.4.27` -> `v1.4.28` (2개소)
- `LandingPage.tsx`: UI 버전 표시 `v1.4.27` -> `v1.4.28`

## [v1.4.27] - 2026-04-22
### 가사 페르소나 강화 및 가사 스타일 고도화 (v1.4.27)
- **초고영향력 유튜브/틱톡 페르소나 적용**: 통합 팔로워 3억(CCM) ~ 5억(Pop) 규모의 '알고리즘의 신' 및 '워십 비저너리' 페르소나를 메타데이터 생성에 주입.
- **CCM 수평적 찬양(관계 속 하나님의 역사) 보강**: 사람 사이의 관계 속에서도 하나님께서 역사하시고 응답하시는 관점을 가사 생성 페르소나에 강력히 반영.
- **듀엣 보컬 분리 능력 강화**: 수노 프롬프트 생성 시 듀엣 보컬의 음색 대비(Vocal Contrast)를 명시적으로 기술하도록 지침을 추가하여 보컬 분리도를 개선.
- **가사 스타일 가이드라인 주입**: 선택된 가사 스타일(시적, 직설적, 서사적 등)에 따른 구체적인 창작 지침을 프롬프트에 내재화하여 스타일별 개성 강화.
- **제목 직역 금지 규칙**: 영문 제목 생성 시 한글 제목을 직역하지 않고 곡의 분위기를 살린 독창적인 의역(Aesthetic Paraphrasing)을 강제함.
- **수노 프롬프트 제약 최적화**: Suno AI v3.5 프롬프트 길이를 최소 600자에서 최대 1000자로 조정하여 상세한 스타일 묘사 유도.
- **무드 옵션 대폭 확장**: 대중음악(19개) 및 CCM(17개) 무드를 세분화하여 선택의 폭을 넓힘.
- **장르 및 무드 영향력 강화**: 선택된 장르와 무드가 가사 생성의 어휘와 정서적 흐름에 지배적인 영향을 미치도록 프롬프트 지침 추가.
- **버전 유지**: 사용자 지시에 따라 추가 버전업 없이 `v1.4.27` 내에 모든 기록을 통합.

### 상세 수정 내역 (v1.4.27 - 무드 및 장르 강화 추가)

#### 1. src/constants.ts (무드 옵션 확장)
**수정 내용:**
- `POP_MOODS`: '레트로한', '도시적인', '긴장감넘치는', '치유되는', '섹시한', '반항적인', '청량한', '어쿠스틱한', '시크한' 추가.
- `CCM_MOODS`: '가슴벅찬', '깊은묵상의', '성령충만한', '치유와회복의', '담대하게선포하는', '감사하는', '고독한기도의', '애통하는', '기대하는' 추가.

#### 2. src/App.tsx (장르 및 무드 가이드라인 추가)
**수정코드 (추가된 부분):**
```tsx
        [GENRE & MOOD CRITICAL GUIDELINE]
        - **Genre (${workflow.params.subGenre})**: The core vocabulary and rhythmic structure must strictly adhere to the nuances of this genre.
        - **Mood (${workflow.params.mood})**: This mood must be the "emotional soul" of the lyrics. Every line should reflect this atmosphere, from word choice to metaphorical depth. The overall "vibe" should be unmistakable.
```

### 상세 수정 내역 (v1.4.27 - 기존 페르소나 및 스타일 강화)

#### 1. src/App.tsx (가사 생성 프롬프트 및 페르소나 강화)
**원코드:**
```tsx
      const ccmPersona = `
        You are a profound CCM (Contemporary Christian Music) songwriter and worship leader with 30 years of experience. 
        Your lyrics are deeply rooted in spiritual grace, divine love, and biblical metaphors without being preachy or clichè. 
        Your titles should feel like a "sacred poem"—evocative, reverent, and awe-inspiring (e.g., "은혜의 파도_Tides of Grace", "영원의 울림_Eternal Resonance").
        Avoid secular slang; use language that stirs the soul and reflects a heart of worship.
      `;

      const popPersona = `
        You are a top-tier K-Pop and Global Pop lyricist known for trendy, relatable, and cinematic storytelling. 
        Your lyrics capture the nuances of modern relationships, urban loneliness, and youth with poetic sensitivity. 
        Your titles must be "hooky" and "aesthetic"—like a movie title or a viral hit (e.g., "너라는 우주_Your Galaxy", "자정의 소음_Midnight Noise").
        Use metaphors that are fresh, trendy, and emotionally resonant for a wide public audience.
      `;
...
        - Main Instrument: ${workflow.params.instrument}

        Guidelines:
...
        3. Suno AI Prompt: Generate a detailed Suno AI v3.5 prompt (max 2000 chars).
           - Include instrumentation, specific vocal texture, and production style (e.g., "atmospheric synth pads", "intimate acoustic guitar").
```

**수정코드:**
```tsx
      const ccmPersona = `
        You are a world-renowned CCM (Contemporary Christian Music) visionary, songwriter, and worship leader with 30 years of elite experience. 
        Your expertise spans two core dimensions:
        1. **Vertical Worship**: Profound praise directed toward God, rooted in spiritual grace and divine love. (e.g., "영원의 지평선_Horizon of Eternity")
        2. **Horizontal Fellowship**: Capturing how God works and responds within human relationships. You write about comfort, encouragement, and love between people as a manifestation of God's presence and intervention. (e.g., "작은 손길 속의 기적_Miracle in a Small Touch")
        
        Your lyrics blend ancient spiritual wisdom with contemporary poetic sensitivity. 
        Your work is defined by "Heavenly Resonance"—using profound biblical metaphors that feel fresh, timeless, and deeply moving. 
        Titles should feel like "Sacred Artifacts"—awe-inspiring, majestic, and spiritually charged.
        CRITICAL: English titles must NEVER be a literal translation of the Korean title. They must capture the "spiritual vibe" and "divine essence" poetically.
        Avoid all clichés; your mission is to stir the deepest parts of the human spirit toward the Divine presence in all aspects of life.
      `;

      const popPersona = `
        You are a global chart-topping lyricist and cinematic storyteller at the absolute peak of the music industry. 
        Your lyrics are "cultural mirrors"—capturing the complex, multi-layered emotional landscape of modern life with surgical precision and artistic flair. 
        You excel at "Rhythmic Poetry"—where every word is meticulously chosen for its emotional weight and melodic flow. 
        Your titles are "Global Hooks"—aesthetic, trendy, and instantly iconic, blending street-smart reality with high-concept metaphors (e.g., "도시의 유령_Neon Ghost", "심장의 소음_Cardiogram Noise").
        CRITICAL: English titles must NEVER be a literal translation of the Korean title. They must capture the "emotional mood" and "cinematic atmosphere" with high-end aesthetic sense.
        Your goal is to define the "Zeitgeist" of the current generation, blending raw vulnerability with polished, sophisticated expression.
      `;
...
        - Main Instrument: ${workflow.params.instrument}
        
        [LYRICS STYLE GUIDELINE: ${workflow.params.lyricsStyle}]
        ${(() => {
          switch (workflow.params.lyricsStyle) {
            case '시적인': return 'Use rich metaphors, abstract imagery, and sensory language. Focus on atmosphere and emotional depth.';
            case '직설적인': return 'Use plain, honest language. Say exactly what is on the mind without hiding behind metaphors. High emotional transparency.';
            case '서사적인': return 'Tell a clear story with a beginning, middle, and end. Focus on characters, settings, and progression.';
            case '은유적인': return 'Use symbolic objects or situations to represent emotions or concepts. Encourage deep interpretation.';
            case '대화체': return 'Use natural, spoken language as if talking to someone. Include colloquialisms and a sense of intimacy.';
            case '독백체': return 'A deep internal reflection. Focus on the inner voice and personal realization.';
            case '운율이 강조된': return 'Focus on consistent rhyming schemes and syllable counts. Ensure a strong sense of beat and flow.';
            default: return '';
          }
        })()}
...
        3. Suno AI Prompt: Generate a highly detailed and evocative Suno AI v3.5 prompt.
           - LENGTH (CRITICAL): MUST be between 600 and 1000 characters.
           - Include specific instrumentation, intricate vocal texture, production atmosphere, and structural cues (e.g., "building cinematic tension with atmospheric pads", "intimate breathy female vocals with a touch of vinyl crackle").
```

#### 2. package.json, App.tsx, LandingPage.tsx (버전 업데이트)
- `package.json`: `"version": "1.4.28"`
- `App.tsx`: UI 버전 표시 `v1.4.28` (2개소)
- `LandingPage.tsx`: UI 버전 표시 `v1.4.28`

## [v1.4.26] - 2026-04-22
### 가사 자동 번역 시스템 고도화 및 영상 자막 렌더링 최적화
- **자동 번역 시스템 (Debounce)**: 가사 수정 시 4초의 대기 시간 후 API를 통해 영어가사를 자동 생성하는 로직 구현 (API 비용 절감).
- **타임스탬프 동기화**: 한글 가사에 타임스탬프(`[00:00]`)가 있는 경우에만 영어가사에도 적용되도록 지능형 파싱 로직 적용.
- **가사 생성 품질 강화**: AI 가사 생성 시 본문에 타임스탬프를 포함하지 않도록 시스템 프롬프트 엄격화.
- **영상 렌더링 최적화**: 자막 출력 시 타임스탬프 텍스트를 제거하여 깔끔한 시각적 효과 제공 및 분석 데이터 기반 동기화 우선순위 조정.
- **버전 업데이트**: 시스템 전체 버전을 `v1.4.26`으로 상향 조정.

### 상세 수정 내역 (v1.4.26)

#### 1. src/App.tsx (자동 번역 로직 및 버전 업데이트)
**원코드 (번역 로직 부분):**
```tsx
  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // (자동 번역 로직 없음)
```

**수정코드:**
```tsx
  const [isTranslating, setIsTranslating] = useState(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const translateLyrics = async (koreanLyrics: string) => {
    if (!koreanLyrics || !apiKey) return;
    
    try {
      setIsTranslating(true);
      const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
      
      const lines = koreanLyrics.split('\n');
      const timestamps = lines.map(line => {
        const match = line.match(/^\[\d{2}:\d{2}\]/);
        return match ? match[0] : "";
      });
      const cleanLines = lines.map(line => line.replace(/^\[\d{2}:\d{2}\]/, '').trim());

      const prompt = `Translate the following Korean song lyrics into English line by line.
      ONLY return the translated lyrics, one line per Korean line.
      
      Lyrics:
      ${cleanLines.join('\n')}`;

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const translatedLines = response.text?.trim().split('\n') || [];
      const restored = lines.map((_, i) => {
        const timestamp = timestamps[i];
        const cleanTranslation = (translatedLines[i] || "").replace(/^\[\d{2}:\d{2}\]/, '').trim();
        return timestamp + cleanTranslation;
      });

      setWorkflow(prev => ({
        ...prev,
        results: { ...prev.results, englishLyrics: restored.join('\n') }
      }));
      setEnglishVideoLyrics(restored.join('\n'));
      addLog(`✅ [${selectedModel}] 영어가사 자동 번역 완료`);
    } catch (err: any) {
      addLog(`❌ 번역 중 오류: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (workflow.results.lyrics && apiKey) {
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
      translationTimeoutRef.current = setTimeout(() => {
        translateLyrics(workflow.results.lyrics);
      }, 4000);
    }
    return () => { if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current); };
  }, [workflow.results.lyrics, apiKey]);
```

#### 2. src/components/LyricsTab.tsx & VideoTab.tsx (Props 통합)
**수정 내용:**
- 로컬 `isTranslating` 상태를 제거하고 `App.tsx`에서 전달받은 `isTranslating` prop을 사용하도록 통일.
- `VideoTab.tsx` 내의 중복된 실시간 번역 `useEffect` 제거.

#### 3. src/components/VideoPlayer.tsx (자막 필터링 강화)
**수정코드 (useMemo 부분):**
```tsx
    const korLines = lyrics.split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);
    const engLines = englishLyrics.split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);
```

## [v1.4.25] - 2026-04-22
### 듀엣 보컬 옵션 고도화 및 가사 생성 프롬프트 개선
- **듀엣 옵션 고도화**: `VOCAL_OPTIONS.Duet` 리스트를 성별 조합(남녀/남남/여여)에 따라 `------` 구분선으로 분리하고, 각 항목에 구체적인 스타일 설명 추가.
- **UI 선택 제약 적용**: 드롭다운 내의 구분선(`---`) 항목은 선택할 수 없도록 `disabled` 속성 적용.
- **프롬프트 가이드라인 강화**: 듀엣 곡 생성 시 성별 조합에 따른 시점 최적화 및 파트 구분(Vocal 1, 2, Together) 지침을 시스템 프롬프트에 내재화.
- **UI 안내 추가**: 가사 탭 내 듀엣 선택 시 하단에 자동 파트 구분 및 최적화 관련 안내 문구 표시.
- **버전 업데이트**: 시스템 전체 버전을 `v1.4.25`로 상향 조정 및 통합.

---

## v1.4.24 (2026-04-22)
- **API 모델 목록 최적화 및 오류 해결**: `src/constants.ts`에서 실제 존재하지 않는 Gemini 모델 ID를 제거하여 API 호출 오류(404/400)를 방지했습니다.
- **UI 버전 동기화**: `package.json`, `App.tsx`, `LandingPage.tsx`의 버전을 `v1.4.24`로 통일하여 시스템 일관성을 확보했습니다.

### 상세 수정 내역 (v1.4.24)

#### 1. src/constants.ts (AI/Image/Music 엔진 목록 정리)
**원코드:**
```tsx
export const AI_ENGINES = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (가사/음원분석용)', type: 'paid' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (가사/음원분석용)', type: 'free' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (가사/음원분석용)', type: 'paid' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (가사/음원분석용)', type: 'paid' },
  { value: 'deep-research-pro-preview-12-2025', label: 'Deep Research Pro (분석/리서치 전용)', type: 'paid' },
  { value: 'gemini-flash-latest', label: 'Gemini Flash Latest (가사/음원분석용)', type: 'free' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest (가사/음원분석용)', type: 'free' },
  { value: 'gemini-pro-latest', label: 'Gemini Pro Latest (가사/음원분석용)', type: 'paid' },
  { value: 'gemma-3-1b-it', label: 'Gemma 3 1B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-4b-it', label: 'Gemma 3 4B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-12b-it', label: 'Gemma 3 12B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-27b-it', label: 'Gemma 3 27B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3n-e2b-it', label: 'Gemma 3N E2B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3n-e4b-it', label: 'Gemma 3N E4B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-4-31b-it', label: 'Gemma 4 31B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemini-2.5-computer-use-preview-10-2025', label: 'Gemini 2.5 Computer Use (자동화용)', type: 'paid' },
  { value: 'gemini-3.1-pro-preview-customtools', label: 'Gemini 3.1 Pro Custom Tools (가사/음원분석용)', type: 'paid' }
];

export const IMAGE_ENGINES = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (이미지생성용)', type: 'free' },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (이미지생성용)', type: 'paid' },
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (이미지생성용)', type: 'free' },
  { value: 'nano-banana-pro-preview', label: 'Nano Banana Pro (이미지생성용)', type: 'paid' }
];

export const MUSIC_ENGINES = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (검증됨)', type: 'free' },
  { value: 'lyria-3-pro-preview', label: 'Lyria 3 Pro (음악생성용)', type: 'paid' },
  { value: 'lyria-3-clip-preview', label: 'Lyria 3 Clip (음악생성용)', type: 'free' },
  { value: 'google-magenta-free', label: 'Google Magenta (음악생성용)', type: 'free' }
];
```

**수정코드:**
```tsx
export const AI_ENGINES = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (가사/음원분석용)', type: 'paid' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (가사/음원분석용)', type: 'paid' },
  { value: 'gemma-3-1b-it', label: 'Gemma 3 1B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-4b-it', label: 'Gemma 3 4B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-12b-it', label: 'Gemma 3 12B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3-27b-it', label: 'Gemma 3 27B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3n-e2b-it', label: 'Gemma 3N E2B IT (가사/텍스트용)', type: 'free' },
  { value: 'gemma-3n-e4b-it', label: 'Gemma 3N E4B IT (가사/텍스트용)', type: 'free' }
];

export const IMAGE_ENGINES = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (이미지생성용)', type: 'free' }
];

export const MUSIC_ENGINES = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (검증됨)', type: 'free' }
];
```

#### 2. package.json, App.tsx, LandingPage.tsx (버전 업데이트)
**수정 내용:**
- `package.json`: `"version": "1.4.24"`
- `App.tsx`: UI 버전 표시 `v1.4.24` (2개소)
- `LandingPage.tsx`: UI 버전 표시 `v1.4.24`


## v1.4.23 (2026-04-21)
- **자막 부드러운 스크롤(Smooth Scroll) 구현**: 자막이 한 줄씩 점프하지 않고, 오디오 시간에 맞춰 부드럽게 위로 밀려 올라가는 애니메이션을 구현했습니다.
- **가사 출력 로직 완전 보정**: 타임스탬프 도달 전에는 자막이 절대 나타나지 않도록 수정하여 첫 단락 누락 및 이전 가사 노출 문제를 해결했습니다.
- **버전 표시 동기화**: `App.tsx`, `package.json`의 버전을 `v1.4.23`으로 일괄 업데이트하여 시스템 일관성을 확보했습니다.

### 상세 수정 내역 (v1.4.23)

#### 1. VideoPlayer.tsx (부드러운 스크롤 및 타이밍 보정)
**수정 내용:**
- `smoothProgress` 변수를 도입하여 현재 자막과 다음 자막 사이의 시간을 0~1 사이로 보간(Interpolation).
- `activeIdx === -1`일 경우 `currentPair = null`로 처리하여 첫 자막 시작 전 공백 유지.
- 한국어/영어 가사를 교차(Interleave)하여 하나의 리스트로 만든 뒤 스크롤 처리.

## v1.4.22 (2026-04-21)
- **자막 페이드 효과 및 클리핑 수정**: 숏츠/스크롤 모드에서 자막이 경계면에서 서서히 나타나고 사라지는 페이드 효과를 복구하고, 종료 지점(`lyricsScrollEnd`)에서 정확히 클리핑되도록 수정했습니다.
- **첫 단락 누락 및 구간 모드 최적화**: 페이드/중앙/하단 모드에서 첫 번째 자막이 누락되는 현상을 해결하고, 자막 전환 시 부드러운 페이드 처리를 추가했습니다.

### 상세 수정 내역 (v1.4.22)

#### 1. VideoPlayer.tsx (자막 렌더링 로직 복구 및 개선)
**원코드 (v1.4.21):**
```tsx
          // (스크롤 모드)
          const y = startOffset + (index * lineSpacing) - currentYOffset;
          const fadeOutEnd = endPosition;
          const fadeOutStart = endPosition + (canvas.height * 0.15);
          const fadeInStart = canvas.height * 0.9;
          const fadeInEnd = canvas.height * 0.8;

          let opacity = 1; // Always opaque to remove fade effect
          if (y > 0 && y < canvas.height) {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10; ctx.fillText(line, canvas.width / 2, y); ctx.shadowBlur = 0;
          }

          // (비스크롤 모드)
          let activeIdx = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].time <= currentTimeForSync) activeIdx = i; else break;
          }
          currentPair = lines[activeIdx];
          
          let opacity = 1; // Always opaque to remove fade effect as requested
```

**수정코드 (v1.4.22):**
```tsx
          // (스크롤 모드 - 페이드 및 클리핑 적용)
          const y = startOffset + (index * lineSpacing) - currentYOffset;
          if (y < endPosition - 20) return;
          const fadeOutEnd = endPosition;
          const fadeOutStart = endPosition + (canvas.height * 0.1);
          const fadeInStart = canvas.height * 0.95;
          const fadeInEnd = canvas.height * 0.85;

          let opacity = 1;
          if (y < fadeOutStart) {
            opacity = Math.max(0, (y - fadeOutEnd) / (fadeOutStart - fadeOutEnd));
          } else if (y > fadeInEnd) {
            opacity = Math.max(0, (fadeInStart - y) / (fadeInStart - fadeInEnd));
          }
          opacity = Math.min(1, opacity);
          // ... (드로잉 로직에 opacity 적용)

          // (비스크롤 모드 - 첫 단락 보정 및 페이드 적용)
          let activeIdx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].time <= currentTimeForSync) activeIdx = i; else break;
          }
          if (activeIdx === -1) activeIdx = 0;
          currentPair = lines[activeIdx];
          
          if (displayMode === 'fade') {
            const fadeDur = 0.5;
            const timeSinceStart = currentTimeForSync - currentPair.time;
            const timeUntilEnd = nextTime - currentTimeForSync;
            if (timeSinceStart < fadeDur && currentPair.time > 0) opacity = timeSinceStart / fadeDur;
            else if (timeUntilEnd < fadeDur) opacity = timeUntilEnd / fadeDur;
          }
```

## v1.4.21 (2026-04-21)
- **참조 에러(prompt undefined) 수정**: 이전 작업 중 누락되었던 `prompt` 변수 정의를 복구하여 번역 엔진으로 데이터가 정상 전달되도록 수정했습니다.
- **번역 로직 최종 안정화**: SDK 호환 메서드(`models.generateContent`)와 복구된 변수를 결합하여 실시간 번역 기능을 정상화했습니다.

### 상세 수정 내역 (v1.4.21)

#### 1. VideoTab.tsx (prompt 변수 복구)
**원코드 (v1.4.20):**
```tsx
        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }] // prompt가 정의되지 않음
        });

        const translated = response.text?.trim();
```

**수정코드 (v1.4.21):**
```tsx
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const translated = response.text?.trim();
```

## v1.4.20 (2026-04-21)
- **SDK 메서드 호환성 오류 수정**: `@google/genai` 라이브러리의 특성에 맞춰 `getGenerativeModel` 대신 `models.generateContent`를 사용하도록 수정했습니다.
- **실시간 번역 로직 안정화**: 영상 렌더링 탭에서 발생하는 "is not a function" 에러를 해결하고 응답 데이터 접근 방식을 최적화했습니다.

### 상세 수정 내역 (v1.4.20)

#### 1. VideoTab.tsx (SDK 호환 메서드 적용)
**원코드 (v1.4.19):**
```tsx
        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
```

**수정코드 (v1.4.20):**
```tsx
        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });

        const translated = response.text?.trim();
```

## v1.4.19 (2026-04-21)
- **GoogleGenAI 생성자 형식 오류 수정**: 브라우저 환경 호환성을 위해 `new GoogleGenAI(apiKey)` 형식을 `new GoogleGenAI({ apiKey })`로 수정하여 API Key 인식 오류를 해결했습니다.
- **번역 안정성 강화**: API Key 유효성 검사 및 상세 로깅(엔진명, 마스킹된 키)을 통해 사용자 피드백을 강화했습니다.

### 상세 수정 내역 (v1.4.19)

#### 1. VideoTab.tsx (생성자 형식 수정 및 검증 로직 적용)
**원코드 (v1.4.17):**
```tsx
    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        if (addLog) addLog(`🔄 영어가사 실시간 번역을 시작합니다...`);
        const genAI = new GoogleGenAI(apiKey);
        // "No 1.x" 규칙 준수: 폴백 모델을 3.1 flash lite로 설정
        const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        // ... (생략)
      } catch (err: any) {
        // ...
      }
    }, 800);
```

**수정코드 (v1.4.19):**
```tsx
    translationTimeoutRef.current = setTimeout(async () => {
      const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
      try {
        setIsTranslating(true);
        
        if (!apiKey || apiKey.trim() === "") {
          if (addLog) addLog(`❌ [${selectedModel}] 번역 중 오류: API Key가 설정되지 않았습니다.`);
          setIsTranslating(false);
          return;
        }

        if (addLog) {
          const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "***";
          addLog(`🔄 [${selectedModel}] 실시간 번역 시작 (Key: ${maskedKey})`);
        }

        const genAI = new GoogleGenAI({ apiKey });
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
          if (addLog) addLog(`✅ [${selectedModel}] 영어가사 실시간 번역 완료`);
        }
      } catch (err: any) {
        console.error("Translation error:", err);
        if (addLog) addLog(`❌ [${selectedModel}] 번역 중 오류: ${err.message || 'API 호출 실패'}`);
      } finally {
        setIsTranslating(false);
      }
    }, 800);
```

## v1.4.18 (2026-04-21)
- **API Key 유효성 검사 강화**: `apiKey.trim()` 체크를 추가하여 빈 키가 SDK로 전달되는 것을 방지했습니다.
- **실시간 번역 로깅 개선**: 에러 발생 시에도 사용 중인 엔진명을 로그에 포함하고, 디버깅을 위해 API Key의 일부를 마스킹하여 출력하도록 개선했습니다.

### 상세 수정 내역 (v1.4.18)

#### 1. VideoTab.tsx (API Key 검증 및 로그 강화)
**원코드 (v1.4.17):**
```tsx
    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        if (addLog) addLog(`🔄 영어가사 실시간 번역을 시작합니다...`);
        const genAI = new GoogleGenAI(apiKey);
        // "No 1.x" 규칙 준수: 폴백 모델을 3.1 flash lite로 설정
        const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
          if (addLog) addLog(`✅ 영어가사 실시간 번역 완료 (${selectedModel})`);
        }
      } catch (err: any) {
        console.error("Translation error:", err);
        if (addLog) addLog(`❌ 번역 중 오류: ${err.message || 'API 호출 실패'}`);
      } finally {
        setIsTranslating(false);
      }
    }, 800);
```

**수정코드 (v1.4.18):**
```tsx
    translationTimeoutRef.current = setTimeout(async () => {
      const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
      try {
        setIsTranslating(true);
        
        if (!apiKey || apiKey.trim() === "") {
          if (addLog) addLog(`❌ [${selectedModel}] 번역 중 오류: API Key가 설정되지 않았습니다.`);
          setIsTranslating(false);
          return;
        }

        if (addLog) {
          const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "***";
          addLog(`🔄 [${selectedModel}] 실시간 번역 시작 (Key: ${maskedKey})`);
        }

        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
          if (addLog) addLog(`✅ [${selectedModel}] 영어가사 실시간 번역 완료`);
        }
      } catch (err: any) {
        console.error("Translation error:", err);
        if (addLog) addLog(`❌ [${selectedModel}] 번역 중 오류: ${err.message || 'API 호출 실패'}`);
      } finally {
        setIsTranslating(false);
      }
    }, 800);
```

## v1.4.17 (2026-04-21)
- **가사 실시간 번역 사용자 경험 개선**: 디바운스 시간을 1500ms에서 **800ms**로 단축하고, 시각적 피드백(상태 표시, 터미널 로그)을 추가하여 반응성을 높였습니다.
- **UI 버전 표시 동기화**: 로고 옆 버전 표시를 **v1.4.17**로 업데이트하여 시스템 버전과 일치시켰습니다.

### 상세 수정 내역 (v1.4.17)

#### 1. VideoTab.tsx (번역 로직 최적화 및 로깅 추가)
**원코드 (v1.4.16):**
```tsx
  React.useEffect(() => {
    if (!videoLyrics || !apiKey) return;
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        const genAI = new GoogleGenAI(apiKey);
        // "No 1.x" 규칙 준수: 폴백 모델을 3.1 flash lite로 설정
        const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
        }
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    }, 1500);

    return () => { if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current); };
  }, [videoLyrics, apiKey, aiEngine]);
```

**수정코드 (v1.4.17):**
```tsx
  React.useEffect(() => {
    if (!videoLyrics || !apiKey) return;
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        if (addLog) addLog(`🔄 영어가사 실시간 번역을 시작합니다...`);
        const genAI = new GoogleGenAI(apiKey);
        // "No 1.x" 규칙 준수: 폴백 모델을 3.1 flash lite로 설정
        const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
          if (addLog) addLog(`✅ 영어가사 실시간 번역 완료 (${selectedModel})`);
        }
      } catch (err: any) {
        console.error("Translation error:", err);
        if (addLog) addLog(`❌ 번역 중 오류: ${err.message || 'API 호출 실패'}`);
      } finally {
        setIsTranslating(false);
      }
    }, 800);

    return () => { if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current); };
  }, [videoLyrics, apiKey, aiEngine]);
```

#### 2. VideoTab.tsx (UI "번역 중" 상태 표시 추가)
**원코드 (v1.4.16):**
```tsx
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1"><TypeIcon className="w-3 h-3" /> 3. 가사 입력</h3>
                </div>
```

**수정코드 (v1.4.17):**
```tsx
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" /> 3. 가사 입력
                    {isTranslating && (
                      <span className="ml-2 text-[10px] text-primary animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-2 h-2 animate-spin" /> 실시간 번역 중...
                      </span>
                    )}
                  </h3>
                </div>
```

#### 3. App.tsx (로고 옆 버전 표시 업데이트)
**원코드 (v1.5.2):**
```tsx
<span className="text-[8px] text-primary/50 font-bold mt-0.5 tracking-widest uppercase">v1.5.2</span>
<span className="text-[10px] text-primary/50 font-bold mt-1 tracking-widest uppercase">v1.5.2</span>
```

**수정코드 (v1.4.28):**
```tsx
<span className="text-[8px] text-primary/50 font-bold mt-0.5 tracking-widest uppercase">v1.4.28</span>
<span className="text-[10px] text-primary/50 font-bold mt-1 tracking-widest uppercase">v1.4.28</span>
```

## v1.4.16 (2026-04-21)
- **가사 실시간 번역 로직 개선**: `useEffect` 종속성 배열에 `apiKey`와 `aiEngine`을 추가하여 반응성 확보.
- **가사 매칭 로직 고도화**: 타임스탬프 기반 매칭(`[00:00]`) 도입으로 줄 수 불일치 문제 해결.

### 상세 수정 내역 (v1.4.16)

#### 1. VideoTab.tsx (종속성 및 모델 수정)
**원코드 (v1.4.15):**
```tsx
  React.useEffect(() => {
    if (!videoLyrics || !apiKey) return;
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        const genAI = new GoogleGenAI(apiKey);
        const selectedModel = aiEngine?.includes('gemini') ? aiEngine : "gemini-2.0-flash";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        Keep timestamps like [00:00] at the start if present.
        ONLY return the translated lyrics.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) setEnglishVideoLyrics(translated);
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    }, 1500);

    return () => { if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current); };
  }, [videoLyrics]);
```

**수정코드 (v1.4.16):**
```tsx
  React.useEffect(() => {
    if (!videoLyrics || !apiKey) return;
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    translationTimeoutRef.current = setTimeout(async () => {
      try {
        setIsTranslating(true);
        const genAI = new GoogleGenAI(apiKey);
        // "No 1.x" 규칙 준수: 폴백 모델을 3.1 flash lite로 설정
        const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";
        const model = genAI.getGenerativeModel({ model: selectedModel });
        
        const prompt = `Translate the following Korean song lyrics into English line by line. 
        IMPORTANT: Keep EXACTLY the same timestamps like [00:00] at the start of each line.
        ONLY return the translated lyrics without any extra text.
        
        Lyrics:
        ${videoLyrics}`;

        const result = await model.generateContent(prompt);
        const translated = result.response.text().trim();
        if (translated) {
          setEnglishVideoLyrics(translated);
          console.log(`[VideoTab] Translation updated using ${selectedModel}`);
        }
      } catch (err) {
        console.error("Translation error:", err);
      } finally {
        setIsTranslating(false);
      }
    }, 1500);

    return () => { if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current); };
  }, [videoLyrics, apiKey, aiEngine]);
```

#### 2. VideoPlayer.tsx (타임스탬프 기반 파싱 로직)
**원코드 (v1.4.15):**
```tsx
    if (hasRawTimestamps) {
      const timedLines: {time: number, kor: string, eng: string}[] = [];
      const korLines: string[] = [];
      const engLines: string[] = [];
      const pairs: { kor: string; eng: string }[] = [];

      const lines = lyrics.split('\n');
      const engLinesRaw = (englishLyrics || '').split('\n');

      lines.forEach((line, idx) => {
        const match = line.match(timeRegex);
        if (match) {
          const time = parseInt(match[1]) * 60 + parseInt(match[2]);
          const kor = line.replace(timeRegex, '').trim();
          const engLine = engLinesRaw[idx] || '';
          const eng = engLine.replace(timeRegex, '').trim();
          
          timedLines.push({ time, kor, eng });
          korLines.push(kor);
          engLines.push(eng);
          pairs.push({ kor, eng });
        }
      });

      if (timedLines.length > 0) {
        return { flat: [...korLines, ...engLines], pairs, timedLines };
      }
    }
```

**수정코드 (v1.4.16):**
```tsx
    if (hasRawTimestamps) {
      const korMap: Record<number, string> = {};
      const engMap: Record<number, string> = {};
      const timestamps = new Set<number>();

      lyrics.split('\n').forEach(line => {
        const match = line.match(timeRegex);
        if (match) {
          const time = parseInt(match[1]) * 60 + parseInt(match[2]);
          const kor = line.replace(timeRegex, '').trim();
          korMap[time] = kor;
          timestamps.add(time);
        }
      });

      (englishLyrics || '').split('\n').forEach(line => {
        const match = line.match(timeRegex);
        if (match) {
          const time = parseInt(match[1]) * 60 + parseInt(match[2]);
          const eng = line.replace(timeRegex, '').trim();
          engMap[time] = eng;
          timestamps.add(time);
        }
      });

      const sortedTimes = Array.from(timestamps).sort((a, b) => a - b);
      const timedLines: {time: number, kor: string, eng: string}[] = [];
      const korLines: string[] = [];
      const engLines: string[] = [];
      const pairs: { kor: string; eng: string }[] = [];

      sortedTimes.forEach(time => {
        const kor = korMap[time] || '';
        const eng = engMap[time] || '';
        timedLines.push({ time, kor, eng });
        if (kor) korLines.push(kor);
        if (eng) engLines.push(eng);
        pairs.push({ kor, eng });
      });

      if (timedLines.length > 0) {
        return { flat: [...korLines, ...engLines], pairs, timedLines };
      }
    }
```

---

## v1.0.29 (2026-04-13)
- 음원 분리 서버 설정 추가: 설정 페이지에서 음원 분리에 사용할 로컬 또는 외부 서버 URL을 직접 입력하고 우선 적용할 수 있도록 기능을 추가했습니다.
