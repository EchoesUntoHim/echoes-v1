# Version History

## v1.0.29 (2026-04-13)
- 음원 분리 서버 설정 추가: 설정 페이지에서 음원 분리에 사용할 로컬 또는 외부 서버 URL을 직접 입력하고 우선 적용할 수 있도록 기능을 추가했습니다.

## v1.0.28 (2026-04-13)
- 코드 구조 리팩토링: App.tsx의 비대해진 코드를 기능별 컴포넌트(VideoPlayer, VideoRenderPage, ImagePage, LyricsPage 등)로 분리하여 유지보수성을 높였습니다. 특히 비디오 플레이어 로직을 독립적인 컴포넌트로 추출하여 성능과 재사용성을 개선했습니다.

## v1.0.27 (2026-04-13)
- 전체 초기화 기능 개선: 브라우저 iframe 환경에서 차단될 수 있는 window.confirm 대신 커스텀 모달 창을 사용하여 초기화 기능을 안정화했습니다. 또한 설정 페이지에도 초기화 버튼을 추가하여 접근성을 높였습니다.

## v1.0.26 (2026-04-12)
- 블로그 생성 로직 전면 수정: 이미지 처리 시 CORS 문제로 텍스트가 삽입되지 않던 현상을 수정하고, AI가 생성된 모든 이미지를 본문에 강제로 사용하도록 지시문을 강화했으며, 누락된 이미지는 자동으로 본문 하단에 추가되도록 안전장치를 마련했습니다. 또한 블로그 글의 분량을 최소 2500자 이상으로 대폭 늘려 상세하게 작성하도록 프롬프트를 개선했습니다.

## v1.0.25 (2026-04-12)
- 영상 렌더링 오디오 페이드 인 설정 추가: 설정 메뉴에 영상 시작 시 오디오가 서서히 커지는 시간(0~10초)을 설정할 수 있는 기능을 추가했습니다.

## v1.0.24 (2026-04-12)
- 페르소나 및 제목 생성 로직 강화: AI 페르소나를 '전설적인 작사가'로 격상하고, 제목 생성 시 직설적인 번역을 금지하며 예술적이고 감정적인 핵심을 담은 고유한 제목을 생성하도록 지시문을 대폭 강화했습니다.

## v1.0.23 (2026-04-12)
- 가사 줄바꿈 로직 강화: 슬래시(/)로 구분된 가사를 Suno AI용 줄바꿈 형식으로 변환하는 로직을 추가했습니다.

## v1.0.22 (2026-04-12)
- 가사 깨짐 및 제목 고정 문제 수정: 가사 인코딩 문제와 제목 생성 로직을 재점검하여 수정했습니다.

## v1.0.21 (2026-04-12)
- Suno AI 프롬프트 생성 로직 강화: 음악 생성 프롬프트가 더 디테일하고 전문적인 수준으로 생성되도록 프롬프트 지시문을 대폭 강화했습니다. (음악 스타일, 편곡, 보컬 표현, 음향 품질 등을 상세히 포함하도록 지시)

## v1.0.20 (2026-04-12)
- 영어 제목 생성 방식 개선: AI가 생성하는 영어 제목이 직설적인 번역이 아닌, 곡의 감정적 핵심을 강조하는 시적이고 부드러운 제목이 되도록 프롬프트를 수정했습니다.

## v1.0.19 (2026-04-12)
- AI 생성 의도 한국어 강제: AI가 생성하는 '가사 생성 의도' 필드가 항상 한국어로 작성되도록 프롬프트를 수정했습니다.

## v1.0.18 (2026-04-12)
- AI 생성 의도 설명 추가: 가사 생성 시 AI가 해당 가사를 작성한 의도와 의미를 분석하여 제목 바로 위에 표시하도록 했습니다.

## v1.0.17 (2026-04-12)
- 생성 조건 완화: '사용자 직접 입력' 칸에 내용이 있을 경우, '주제(Topic)'를 별도로 입력하지 않아도 가사 및 프롬프트 생성이 가능하도록 로직을 수정했습니다.

## v1.0.16 (2026-04-12)
- 사용자 입력 칸 위치 조정: '가사 및 프롬프트 생성' 제목 바로 위로 입력 칸을 이동하여 시인성을 개선했습니다.

## v1.0.15 (2026-04-12)
- 사용자 직접 입력 칸 추가: 가사 및 프롬프트 생성 탭 최상단에 '사용자 직접 입력' 칸을 추가했습니다.
- 생성 로직 최적화: 해당 칸에 내용이 입력되면 다른 설정값보다 이 내용을 최우선으로 반영하여 가사와 음악 프롬프트를 생성하도록 AI 프롬프트를 강화했습니다.

## v1.0.14 (2026-04-12)
- 데이터 초기화 버튼 이동: 설정 페이지 깊숙이 있던 '데이터 전체 초기화' 버튼을 사이드바 로고 바로 아래로 이동하여 접근성을 대폭 개선했습니다.

## v1.0.13 (2026-04-12)
- 음원 분리 메뉴 개선: 새 창으로 띄우지 않고 앱 내 오른쪽 프레임(iframe)에서 바로 실행되도록 변경
- 사이드바 활성화 상태 연동: 음원 분리 탭 선택 시 사이드바 아이콘이 활성화 상태로 표시되도록 수정

## v1.0.12 (2026-04-12)
- 음원 분리 메뉴 이동: 사이드바의 '블로그 생성' 바로 아래로 메뉴를 이동하여 접근성을 높였습니다.
- 버전 표시 추가: 사이드바 로고 영역에 현재 버전(v1.0.12)을 명시하여 버전 관리를 용이하게 했습니다.
- 로컬 서버 연결 체크: 음원 분리 메뉴 클릭 시 로컬 서버 상태를 확인하고, 연결 실패 시 안내 메시지를 표시하는 로직을 강화했습니다.

## v1.0.11 (2026-04-12)
- Fixed Audio Glitch: Improved synchronization between audio playback and video recording to prevent initial audio "bouncing" or glitches.
- GPU Rendering Optimization: Configured `MediaRecorder` with high-bitrate settings to better utilize hardware (GPU) acceleration for smoother rendering.
- Blog Image Naming: Updated download filenames for blog images to "블로그 1", "블로그 2", etc., for easier organization.
- Added Audio Separation Menu: Integrated a new section linking to a local audio separation server with connection status checking.

## v1.0.10 (2026-04-12)
- Fixed Audio Analysis 429 Error: Switched to `gemini-3.1-flash-lite-preview` for audio analysis to avoid spending cap issues associated with Pro models while maintaining high performance.
- Strictly followed "No 1.x" rule.
- Confirmed "Song Interpretation" field in the "Upload Ready" tab.

## v1.0.9 (2026-04-12)
- Strictly enforced "No 1.x" rule: Removed all Gemini 1.x models from the entire system.
- Updated Audio Analysis: Switched to `gemini-3.1-pro-preview` for audio analysis.
- Added "Song Interpretation" (곡 해석) field to the "Upload Ready" (업로드 준비) tab.
- Ensured user-provided song interpretation is prioritized in all AI generations (Metadata, Blog).

## v1.0.8 (2026-04-12)
- Fixed Audio Analysis: Reverted to `gemini-1.5-pro` for audio analysis as it is the most stable engine for multimodal audio tasks (3.1/2.5 versions currently have limited audio support).
- Updated AI Engine strings: Used valid preview model names (`gemini-2.5-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite-preview`).
- Maintained "No 1.x" rule for general tasks (Lyrics, Metadata, Blog) while using 1.5 Pro only for the specialized audio analysis task.

## v1.0.7 (2026-04-12)
- Strictly enforced Gemini 2.5 and 3.1 models only.
- Validated AI engine selection on startup to prevent usage of old 1.x or 2.0 models.
- Set `gemini-2.5-flash` as the absolute default for all text tasks.
- Hardcoded `gemini-3.1-pro-preview` for audio analysis.
- Improved UI to show full AI engine labels in headers.

## v1.0.6 (2026-04-12)
- Updated AI engines: Removed all Gemini 1.x models.
- Added Gemini 2.5 Flash and Gemini 3.1 Pro/Flash models.
- Set `gemini-2.5-flash` as the default engine for lyrics, metadata, and blog generation.
- Hardcoded `gemini-3.1-pro-preview` for audio analysis as requested.

## v1.0.5 (2026-04-12)
- Hardcoded `gemini-1.5-pro` for audio analysis (optimized for high performance).
- Hardcoded `gemini-1.5-flash` for metadata and blog generation (optimized for stability).
- Restored and fixed the Main Engine selection in the Settings page to use valid models.

## v1.0.4 (2026-04-12)
- Added "Song Interpretation" field in the Upload Ready section.
- Updated AI prompts (YouTube metadata, Blog, Image generation) to prioritize the user's song interpretation over AI analysis.

## v1.0.3 (2026-04-12)
- Cleaned up AI engine list: Removed non-existent models (3.0, 3.1) and fixed incorrect model names.
- Updated default AI engine to `gemini-1.5-flash` for better stability.
- Verified functional models: 1.5 Flash/Pro, 2.0 Flash/Pro Exp, 2.0 Thinking.

## v1.0.2 (2026-04-12)
- Removed lyrics from Shorts video previews (set to empty).
- Added download buttons for Main, TikTok, and Shorts videos.

## v1.0.1 (2026-04-12)
- Fixed lyrics visibility: Lyrics now only appear after the set `lyricsStartTime`.
- Improved scroll synchronization: Lyrics scroll progress is now correctly calculated based on the start time.

## v1.0.0 (2026-04-12)
- Current stable state.
- AI Engines: Gemini 3.0, 3.1 Pro/Flash added. Default: 2.0 Flash.
- Video Rendering: Main (16:9), TikTok (9:16), Shorts (9:16) previews restored.
- Settings: Title (Korean/English) and Lyrics settings restored and connected.
- Shorts: Time editing (start/end) and visual effects (Fade In 1s, Fade Out 3s) implemented.
- UI: Engine selection added to Upload Ready and Blog sections.
