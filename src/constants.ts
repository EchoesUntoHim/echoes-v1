import { TitleEffect, TitleAnimation, VocalType } from './types';

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

export const VIDEO_ENGINES = [
  { value: 'echoesuntohim-v2.1-free', label: '로컬 렌더링 (Echoes Unto Him)', type: 'free' },
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
  '신나는', '슬픈', '잔잔한', '몽환적인', '강렬한', '따뜻한', '차가운', '그루비한', '희망찬', '우울한',
  '레트로한', '도시적인', '긴장감넘치는', '치유되는', '섹시한', '반항적인', '청량한', '어쿠스틱한', '시크한'
];

export const CCM_MOODS = [
  '은혜로운', '경건한', '기쁨의', '위로가되는', '장엄한', '평안한', '감동적인', '열정적인',
  '가슴벅찬', '깊은묵상의', '성령충만한', '치유와회복의', '담대하게선포하는', '감사하는', '고독한기도의', '애통하는', '기대하는'
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
    '------ [남녀 듀엣] ------',
    '남녀 음색 대조: 공기감 미성 vs 짙은 호소력',
    '남녀 화음 조화: 실크처럼 섞이는 팝 발라드',
    '남녀 음역 대비: 고음 여성 vs 저음 남성 클래식',
    '남녀 에너지 대조: 파워풀 남성 vs 청아한 여성',
    '남녀 조화: 따뜻하게 감싸주는 어쿠스틱 듀엣',
    '대화하듯 주고받는 남녀 감성 듀엣',
    '풍성한 화음의 R&B 남녀 소울 듀엣',
    '뮤지컬처럼 극적인 남녀 듀엣',
    '------ [남남 듀엣] ------',
    '남남 음색 대조: 미성 보컬 vs 파워풀 락 보컬',
    '남남 화음 조화: 깊은 울림의 감성 발라드',
    '남남 음역 대비: 테너 vs 베이스 콰르텟 스타일',
    '남남 에너지 대조: 거친 락 vs 담백한 포크',
    '남남 조화: 진솔한 고백의 포크 듀엣',
    '힘있게 선포하는 남남 파워 듀엣',
    '리듬감 있게 주고받는 힙합 남남 듀엣',
    '------ [여여 듀엣] ------',
    '여여 음색 대조: 몽환적 인디 vs 파워풀 디바',
    '여여 화음 조화: 천사처럼 어우러지는 화음',
    '여여 음역 대비: 고음 소프라노 vs 중음 알토',
    '여여 에너지 대조: 청아한 미성 vs 허스키 호소력',
    '여여 조화: 세련된 선율의 재즈풍 듀엣',
    '맑고 청아하게 울리는 여여 듀엣',
    '폭발적인 가창력의 여여 디바 듀엣',
    '밝고 경쾌한 아이돌 스타일 여여 듀엣'
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
  '미니멀리즘 벡터 (Minimalist Vector)',
  '3D 렌더링 (3D Render)',
  '팝아트 (Pop Art)',
  '초현실주의 (Surrealism)'
];

export const CAMERA_VIEWS = [
  '정면 (Front View)',
  '측면 (Side Profile)',
  '반측면 (Three-Quarter View)',
  '하이앵글 (High Angle)',
  '로우앵글 (Low Angle)',
  '버즈아이 (Bird\'s Eye View)',
  '클로즈업 (Close-up)',
  '와이드 샷 (Wide/Full Body Shot)',
  '드론 뷰 (Drone View)',
  '어안 렌즈 (Fisheye Lens)',
  '오버더숄더 (Over-the-shoulder)'
];

export const CAMERA_ANGLE_OPTIONS = [
  '아이 레벨 (Eye Level)',
  '하이앵글 (High Angle)',
  '로우앵글 (Low Angle)',
  '버즈아이 (Bird\'s Eye View)',
  '클로즈업 (Close-up)',
  '와이드 샷 (Wide/Full Body Shot)',
  '드론 뷰 (Drone View)',
  '어안 렌즈 (Fisheye Lens)',
  '오버더숄더 (Over-the-shoulder)',
  '매크로 샷 (Macro Shot)'
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
  '역광 (Backlit)',
  '극적인 조명 (Dramatic Lighting)',
  '로우 키 조명 (Low Key Lighting)',
  '신비로운 빛 (Mystical Glow)'
];

export const WEATHERS = [
  '맑음 (Clear Sky)',
  '흐림 (Cloudy)',
  '비 (Rainy)',
  '눈 (Snowy)',
  '안개 (Foggy)',
  '폭풍우 (Stormy)',
  '번개 (Lightning)',
  '무지개 (Rainbow)',
  '눈보라 (Blizzard)',
  '바람 부는 날 (Windy)',
  '따사로운 햇살 (Sunny & Warm)'
];

export const BACKGROUND_TYPES = [
  '도시 풍경 (Urban Cityscape)',
  '자연 숲 (Natural Forest)',
  '광활한 바다 (Vast Ocean)',
  '추상적 공간 (Abstract Space)',
  '미니멀 스튜디오 (Minimal Studio)',
  '빈티지 실내 (Vintage Interior)',
  '사이버펑크 거리 (Cyberpunk Street)',
  '평화로운 시골 (Peaceful Countryside)',
  '우주 공간 (Deep Space)',
  '화려한 무대 (Stage Light)',
  '고풍스러운 도서관 (Ancient Library)'
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
  { value: 'none', label: '효과 없음' },
  { value: 'shadow', label: '효과: 그림자' },
  { value: 'bold_shadow', label: '효과: 강한 그림자' },
  { value: 'glow', label: '효과: 네온 광채' },
  { value: 'soft_glow', label: '효과: 은은한 광채' },
  { value: 'neon', label: '효과: 비비드 네온' },
  { value: 'outline', label: '효과: 테두리(외곽선)' },
  { value: 'gradient', label: '효과: 그라데이션' },
  { value: 'glass', label: '효과: 글래스모피즘' },
  { value: 'cyber', label: '효과: 사이버펑크' },
  { value: 'glitch', label: '효과: 글리치' },
  { value: 'retro', label: '효과: 레트로' },
  { value: 'vintage', label: '효과: 빈티지' },
  { value: 'minimal', label: '효과: 미니멀' },
  { value: 'elegant', label: '효과: 엘레강트' }
];

export const TITLE_ANIMATIONS: { value: TitleAnimation; label: string }[] = [
  { value: 'none', label: '애니메이션 없음' },
  { value: 'floating', label: '동작: 둥둥 떠다니기' },
  { value: 'wave', label: '동작: 물결 일렁임' },
  { value: 'zoom_in', label: '진입: 부드러운 확대' },
  { value: 'zoom_out', label: '진입: 부드러운 축소' },
  { value: 'slide_up', label: '진입: 슬라이드 업' },
  { value: 'blurry', label: '진입: 안개(블러) 해제' },
  { value: 'typing', label: '진입: 타이핑 효과' },
  { value: 'dramatic_zoom', label: '진입: 드라마틱 줌' }
];

export const KOREAN_FONTS = [
  { value: "'Nanum Pen Script', cursive", label: '나눔 펜 (Handwriting)' },
  { value: "'Nanum Brush Script', cursive", label: '나눔 붓 (Brush)' },
  { value: "'Gamja Flower', cursive", label: '감자꽃 (Emotional)' },
  { value: "'Hi Melody', cursive", label: '하이멜로디 (Cute)' },
  { value: "'Gaegu', cursive", label: '개구체 (Hand)' },
  { value: "'Poor Story', cursive", label: '푸어스토리 (Narrative)' },
  { value: "'Gowun Batang', serif", label: '고운바탕 (Elegant Serif)' },
  { value: "'Gowun Dodum', sans-serif", label: '고운돋움 (Elegant Sans)' },
  { value: "'Sunflower', sans-serif", label: '해바라기 (Modern Script)' },
  { value: "'Dokdo', cursive", label: '독도체 (Unique)' },
  { value: "'East Sea Dokdo', cursive", label: '동해독도 (Rough)' },
  { value: "'Jua', sans-serif", label: '주아체 (Bouncy)' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조 (Classic Serif)' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕 (Gothic 1)' },
  { value: "'Do Hyeon', sans-serif", label: '도현체 (Gothic 2)' }
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

export const LYRICS_KOREAN_FONTS = [
  { value: 'sans-serif', label: '--- 정자체 (Regular) ---' },
  { value: "'Noto Sans KR', sans-serif", label: '본고딕 (Noto Sans)' },
  { value: "'Nanum Gothic', sans-serif", label: '나눔고딕 (Nanum Gothic)' },
  { value: "'Nanum Myeongjo', serif", label: '나눔명조 (Nanum Myeongjo)' },
  { value: "'Gowun Dodum', sans-serif", label: '고운돋움 (Gowun Dodum)' },
  { value: 'sans-serif', label: '--- 귀여운/감성 (Cute) ---' },
  { value: "'Gamja Flower', cursive", label: '감자꽃 (Gamja Flower)' },
  { value: "'Hi Melody', cursive", label: '하이멜로디 (Hi Melody)' },
  { value: "'Gaegu', cursive", label: '개구체 (Gaegu)' },
  { value: "'Jua', sans-serif", label: '주아체 (Jua)' },
  { value: "'Poor Story', cursive", label: '푸어스토리 (Poor Story)' },
  { value: "'Nanum Pen Script', cursive", label: '나눔펜 (Nanum Pen)' }
];

export const LYRICS_ENGLISH_FONTS = [
  { value: 'sans-serif', label: '--- 정자체 (Regular) ---' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
  { value: 'sans-serif', label: '--- 감성/필기 (Cute/Script) ---' },
  { value: "'Dancing Script', cursive", label: 'Dancing Script' },
  { value: "'Pacifico', cursive", label: 'Pacifico' },
  { value: "'Satisfy', cursive", label: 'Satisfy' },
  { value: "'Great Vibes', cursive", label: 'Great Vibes' },
  { value: "'Cookie', cursive", label: 'Cookie' },
  { value: "'Sacramento', cursive", label: 'Sacramento' }
];
