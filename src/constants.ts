import { TitleEffect, VocalType } from './types';

export const AI_ENGINES = [
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (가사/음원분석용)', type: 'free' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (가사/음원분석용)', type: 'paid' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (가사/음원분석용)', type: 'free' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (가사/음원분석용)', type: 'paid' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (가사/음원분석용)', type: 'free' },
  { value: 'gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (001) (가사/음원분석용)', type: 'free' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (가사/음원분석용)', type: 'free' },
  { value: 'gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite (001) (가사/음원분석용)', type: 'free' },
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
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (검증됨)', type: 'free' },
  { value: 'lyria-3-pro-preview', label: 'Lyria 3 Pro (음악생성용)', type: 'paid' },
  { value: 'lyria-3-clip-preview', label: 'Lyria 3 Clip (음악생성용)', type: 'free' },
  { value: 'google-magenta-free', label: 'Google Magenta (음악생성용)', type: 'free' }
];

export const VIDEO_ENGINES = [
  { value: 'vibeflow-v2.1-free', label: '로컬 렌더링 (Echoes Unto Him)', type: 'free' },
  { value: 'ffmpeg-cloud', label: 'FFmpeg Cloud (서버 렌더링)', type: 'free' }
];

export const TARGETS = ['대중음악', 'CCM'];

export const POP_SUB_GENRES = [
  '발라드', '댄스', '힙합', 'R&B', '인디', '록', '트로트', '포크', '어쿠스틱', '시티팝', '일렉트로닉', '기타'
];

export const CCM_SUB_GENRES = [
  '워십', '모던워십', '전통찬송가', '가스펠', 'CCM팝', '어쿠스틱워십', '합창', '기타'
];

export const POP_MOODS = [
  '신나는', '슬픈', '잔잔한', '몽환적인', '강렬한', '따뜻한', '차가운', '그루비한', '희망찬', '우울한'
];

export const CCM_MOODS = [
  '은혜로운', '경건한', '기쁨의', '위로가되는', '장엄한', '평안한', '감동적인', '열정적인'
];

export const TEMPOS = ['매우 느림', '느림', '보통', '빠름', '매우 빠름'];

export const LYRICS_STYLES = [
  '시적인', '직설적인', '서사적인', '은유적인', '대화체', '독백체', '운율이 강조된'
];

export const VOCAL_OPTIONS: Record<VocalType, string[]> = {
  Male: [
    '부드러운 미성 남성', '허스키한 중저음 남성', '파워풀한 락 보컬 남성', '감미로운 R&B 남성', '맑은 테너', 
    '거친 바리톤', '트렌디한 팝 보컬 남성', '소울풀한 남성', '담백한 포크 보컬 남성', '깊은 울림의 베이스 남성'
  ],
  Female: [
    '청아한 소프라노', '호소력 짙은 알토', '트렌디한 팝 보컬 여성', '몽환적인 인디 보컬', '파워풀한 디바',
    '섹시한 재즈 보컬 여성', '맑고 깨끗한 미성 여성', '허스키한 소울 보컬 여성', '귀여운 아이돌 보컬', '애절한 발라드 보컬 여성'
  ],
  Duet: [
    '남녀 감성 듀엣', '남남 파워 듀엣', '여여 화음 듀엣', '어쿠스틱 남녀 듀엣', 'R&B 남녀 소울 듀엣',
    '뮤지컬 스타일 남녀 듀엣', '재즈풍 남녀 듀엣', '락 스타일 남녀 듀엣', '포크 스타일 남녀 듀엣', '가스펠 스타일 남녀 듀엣'
  ],
  Choir: ['웅장한 가스펠 합창', '소년 소녀 합창단', '클래식 4부 합창', '현대적인 워십 콰이어']
};

export const INSTRUMENTS = [
  '피아노', '어쿠스틱 기타', '일렉트릭 기타', '베이스', '드럼', '신디사이저', '바이올린', '첼로', '플루트', '색소폰', '트럼펫', '오케스트라', '국악기'
];

export const ART_STYLES = [
  '실사 사진 (Photorealistic)',
  '재패니즈 애니메이션 (Anime Style)',
  '디즈니/픽사 스타일 (3D Cartoon)',
  '수채화 (Watercolor Painting)',
  '유화 (Oil Painting)',
  '사이버펑크 일러스트 (Cyberpunk Art)',
  '연필 소묘 (Pencil Sketch)',
  '미니멀리즘 벡터 (Minimalist Vector)'
];

export const CAMERA_VIEWS = [
  '정면 (Front View)',
  '측면 (Side Profile)',
  '반측면 (Three-Quarter View)',
  '하이앵글 (High Angle)',
  '로우앵글 (Low Angle)',
  '버즈아이 (Bird\'s Eye View)',
  '클로즈업 (Close-up)',
  '와이드 샷 (Wide/Full Body Shot)'
];

export const CAMERA_ANGLE_OPTIONS = [
  '아이 레벨 (Eye Level)',
  '하이앵글 (High Angle)',
  '로우앵글 (Low Angle)',
  '버즈아이 (Bird\'s Eye View)',
  '클로즈업 (Close-up)',
  '와이드 샷 (Wide/Full Body Shot)'
];

export const TIME_OF_DAY_OPTIONS = [
  '새벽 (Dawn)',
  '이른 아침 (Early Morning)',
  '아침 (Morning)',
  '정오 (Noon)',
  '오후 (Afternoon)',
  '늦은 오후 (Late Afternoon)',
  '골든 아워 (Golden Hour)',
  '일몰 (Sunset)',
  '황혼 (Twilight)',
  '미명 (Gloom)',
  '초저녁 (Early Evening)',
  '밤 (Night)',
  '한밤중 (Midnight)',
  '푸른 시간 (Blue Hour)',
  '어스름 (Dusk)'
];

export const LIGHTING_ATMOSPHERES = [
  '자연광 (Natural Sunlight)',
  '골든 아워 (Golden Hour)',
  '네온 라이트 (Neon Glow)',
  '스튜디오 조명 (Soft Studio Light)',
  '시네마틱 라이팅 (Cinematic Lighting)',
  '안개 자욱한 (Foggy & Misty)',
  '사이버틱 라이트 (Cyber Light)',
  '역광 (Backlit)'
];

export const COLOR_GRADES = [
  '비비드 컬러 (Vivid & Vibrant)',
  '파스텔 톤 (Soft Pastel)',
  '모노크롬 (Monochrome)',
  '빈티지 필름 (Vintage Film)',
  '차가운 블루 (Cyber Blue)',
  '따뜻한 세피아 (Warm Sepia)',
  '다크 앤 무디 (Dark & Moody)',
  '하이 키 (High Key)'
];

export const COMPOSITIONS = [
  '3분할 법칙 (Rule of Thirds)',
  '중앙 대칭 (Symmetry)',
  '황금비 (Golden Ratio)',
  '리딩 라인 (Leading Lines)',
  '프레임 인 프레임 (Frame in Frame)',
  '미니멀리즘 (Minimalist)',
  '다이내믹 앵글 (Dynamic Angle)',
  '클로즈업 (Extreme Close-up)'
];

export const DEPTH_OF_FIELDS = [
  '얕은 피사체 심도 (Shallow Bokeh)',
  '깊은 피사체 심도 (Deep Focus)',
  '부드러운 블러 (Soft Blur)',
  '선명한 배경 (Sharp Background)',
  '매크로 포커스 (Macro Focus)',
  '틸트 시프트 (Tilt Shift)',
  '시네마틱 포커스 (Cinematic Focus)',
  '꿈결 같은 블러 (Dreamy Blur)'
];

export const WEATHERS = [
  '맑음 (Clear Sky)',
  '흐림 (Cloudy)',
  '비 (Rainy)',
  '눈 (Snowy)',
  '안개 (Foggy)',
  '폭풍우 (Stormy)',
  '번개 (Lightning)',
  '무지개 (Rainbow)'
];

export const SUBJECT_DETAILS = [
  '하이퍼 디테일 (Hyper-detailed)',
  '부드러운 질감 (Soft Texture)',
  '거친 질감 (Gritty Texture)',
  '매끄러운 표면 (Smooth Surface)',
  '복잡한 패턴 (Intricate Patterns)',
  '단순한 형태 (Simple Shapes)',
  '유기적인 곡선 (Organic Curves)',
  '기하학적 구조 (Geometric Structures)'
];

export const BACKGROUND_TYPES = [
  '도시 풍경 (Urban Cityscape)',
  '자연 숲 (Natural Forest)',
  '광활한 바다 (Vast Ocean)',
  '추상적 공간 (Abstract Space)',
  '미니멀 스튜디오 (Minimal Studio)',
  '빈티지 실내 (Vintage Interior)',
  '사이버펑크 거리 (Cyberpunk Street)',
  '평화로운 시골 (Peaceful Countryside)'
];

export const IMAGE_STYLES = [
  { value: 'Cinematic', label: '시네마틱' },
  { value: 'Anime', label: '애니메이션' },
  { value: 'Cyberpunk', label: '사이버펑크' },
  { value: 'Watercolor', label: '수채화' },
  { value: 'Oil Painting', label: '유화' },
  { value: 'Minimalist', label: '미니멀리즘' },
  { value: '3D Render', label: '3D 렌더링' },
  { value: 'Retro', label: '레트로' },
  { value: 'Surrealism', label: '초현실주의' },
  { value: 'Sketch', label: '스케치' },
  { value: 'Vibrant', label: '선명한' },
  { value: 'Dark & Moody', label: '어둡고 분위기 있는' },
  { value: 'Ethereal', label: '몽환적인' },
  { value: 'Pop Art', label: '팝아트' },
  { value: 'Ukiyo-e', label: '우키요에' }
];

export const BLOG_STYLES = [
  '전문가/정보전달형 (신뢰감, 논리적, 객관적)',
  '친근한 이웃형 (공감, 부드러움, 소통형)',
  '감성 에세이형 (서정적, 감각적, 여운)',
  '유머/재치형 (재미, 센스, 가벼운 톤)',
  '리뷰/체험단형 (솔직함, 디테일, 경험 위주)',
  '인터뷰/대화형 (문답형, 생동감, 현장감)',
  '스토리텔링형 (기승전결, 몰입감, 서사적)',
  '현장 밀착형 스토리텔링 (현장감, 신뢰, 파트너십)',
  '팩트폭행/직설적 (단호함, 명쾌함, 사이다)',
  '트렌디/MZ세대형 (유행어, 밈, 톡톡 튀는 톤)',
  '일기/기록형 (솔직함, 개인적, 담백함)',
  '비즈니스/격식형 (정중함, 공식적, 깔끔함)',
  '비판적/분석형 (날카로움, 통찰력, 논쟁적)'
];

export const TITLE_EFFECTS: { value: TitleEffect; label: string }[] = [
  { value: 'none', label: '기본' },
  { value: 'shadow', label: '그림자' },
  { value: 'bold_shadow', label: '강한 그림자' },
  { value: 'glow', label: '네온 광채' },
  { value: 'soft_glow', label: '은은한 광채' },
  { value: 'outline', label: '외곽선' },
  { value: 'glass', label: '글래스모피즘' },
  { value: 'neon', label: '비비드 네온' },
  { value: 'gradient', label: '그라데이션' },
  { value: 'retro', label: '레트로 80s' },
  { value: 'minimal', label: '미니멀' },
  { value: 'cyber', label: '사이버펑크' },
  { value: 'glitch', label: '글리치 효과' },
  { value: 'vintage', label: '빈티지 스타일' },
  { value: 'elegant', label: '엘레강트' }
];

export const KOREAN_FONTS = [
  { value: "'Nanum Pen Script', cursive", label: '나눔손글씨 펜' },
  { value: "'Gaegu', cursive", label: '개구체' },
  { value: "'Poor Story', cursive", label: '푸어스토리' },
  { value: "'Gowun Dodum', sans-serif", label: '고운돋움' },
  { value: 'cursive', label: '필기체 (Cursive)' },
  { value: 'sans-serif', label: '기본 (Sans)' },
  { value: 'serif', label: '명조체 (Serif)' },
  { value: 'monospace', label: '고정폭 (Mono)' },
  { value: "'Gowun Batang', serif", label: '고운바탕' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조' },
  { value: "'Black Han Sans', sans-serif", label: '검은고딕' },
  { value: "'Jua', sans-serif", label: '주아체' },
  { value: "'Do Hyeon', sans-serif", label: '도현체' },
  { value: "'Sunflower', sans-serif", label: '해바라기' }
];

export const ENGLISH_FONTS = [
  { value: "'Dancing Script', cursive", label: 'Dancing Script' },
  { value: "'Pacifico', cursive", label: 'Pacifico' },
  { value: "'Satisfy', cursive", label: 'Satisfy' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Cookie', cursive", label: 'Cookie' },
  { value: "'Allura', cursive", label: 'Allura' },
  { value: "'Alex Brush', cursive", label: 'Alex Brush' },
  { value: "'Pinyon Script', cursive", label: 'Pinyon Script' },
  { value: "'Sacramento', cursive", label: 'Sacramento' },
  { value: "'Herr Von Muellerhoff', cursive", label: 'Herr Von Muellerhoff' },
  { value: "'Rouge Script', cursive", label: 'Rouge Script' },
  { value: "'Monsieur La Doulaise', cursive", label: 'Monsieur La Doulaise' },
  { value: "'Miss Fajardose', cursive", label: 'Miss Fajardose' },
  { value: "'Cedarville Cursive', cursive", label: 'Cedarville Cursive' },
  { value: "'Homemade Apple', cursive", label: 'Homemade Apple' },
  { value: 'cursive', label: '필기체 (Cursive)' },
  { value: 'sans-serif', label: '기본 (Sans)' },
  { value: 'serif', label: '세리프 (Serif)' },
  { value: 'monospace', label: '고정폭 (Mono)' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Playfair Display', serif", label: 'Playfair' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Poppins', sans-serif", label: 'Poppins' }
];
