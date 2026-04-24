export type Step = 'lyrics' | 'music' | 'image' | 'video' | 'publish' | 'blog' | 'arrangement' | 'audio-separation' | 'settings';

export type Target = '대중음악' | 'CCM';
export type Tempo = string;
export type VocalType = 'Male' | 'Female' | 'Duet' | 'Choir';
export type TitlePosition = 'custom' | 'top' | 'middle' | 'bottom';
export type TitleAlign = 'left' | 'center' | 'right';
export type LyricsDisplayMode = 'scroll' | 'fade' | 'center' | 'bottom';
export type TitleEffect = 'none' | 'shadow' | 'bold_shadow' | 'glow' | 'soft_glow' | 'neon' | 'gradient' | 'outline' | 'glass' | 'cyber' | 'glitch' | 'retro' | 'vintage' | 'minimal' | 'elegant';
export type TitleAnimation = 'none' | 'floating' | 'wave' | 'zoom_in' | 'zoom_out' | 'typing' | 'slide_up' | 'blurry' | 'dramatic_zoom';

export interface MusicParams {
  title: string;
  koreanTitle: string;
  englishTitle: string;
  topic: string;
  target: Target;
  subGenre: string;
  mood: string;
  tempo: Tempo;
  instrument: string;
  vocal: string;
  lyricsStyle: string;
  originalLyrics?: string;
  isEnglishSong?: boolean;
  songInterpretation?: string;
  userInput?: string;
  musicType?: Target; // Compatibility
  blogStyle?: string; // Compatibility
  keyChange?: string;
  vocalSwap?: string;
  useEnglish?: boolean;
  genderKey?: 'male' | 'female' | 'original';
}

export type ImageType = 'main' | 'tiktok' | 'shorts';

export interface TitleSettings {
  titlePosition: TitlePosition;
  titleAlign: TitleAlign;
  titleEffect: TitleEffect;
  titleAnimation: TitleAnimation;
  koreanTitleSize: number;
  englishTitleSize: number;
  titleSpacing: number;
  koreanTitleStyle: string;
  englishTitleStyle: string;
  koreanFont: string;
  englishFont: string;
  titleXOffset: number;
  titleYOffset: number;
  koreanColor: string;
  englishColor: string;
  lyricsFont: string;
  lyricsColor: string;
  lyricsKoreanFont: string;
  lyricsEnglishFont: string;
  lyricsStartTime?: number;
  lyricsScrollEnd?: number;
  lyricsFontSize?: number;
  lyricsDisplayMode?: LyricsDisplayMode;
  showTitleOverlay?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  videoMotion?: string;
  videoFilter?: string;
  videoOverlay?: string;
  videoOverlayIntensity?: number;
  showVisualizer?: boolean;
  particleSystem?: string;
  lyricsEffect?: string;
}

export interface BlogSettings {
  style: string;
  youtubeLink: string;
  targets?: { naver: boolean; tistory: boolean; google: boolean; };
  imageTexts?: Record<string, string>;
  targetAudience?: string;
  blogPerspective?: string;
  youtubeFooterText?: string;
  notes?: string;
}

export const createDefaultSettings = (): TitleSettings => ({
  titlePosition: 'middle',
  titleAlign: 'center',
  titleEffect: 'bold_shadow',
  titleAnimation: 'none',
  koreanTitleSize: 100,
  englishTitleSize: 100,
  titleSpacing: 0.8,
  koreanTitleStyle: '',
  englishTitleStyle: '',
  koreanFont: 'sans-serif',
  englishFont: 'sans-serif',
  titleXOffset: 0,
  titleYOffset: 0,
  koreanColor: '#ffffff',
  englishColor: '#ffffff',
  lyricsFont: 'sans-serif',
  lyricsColor: '#ffffff',
  lyricsKoreanFont: 'sans-serif',
  lyricsEnglishFont: 'sans-serif',
  lyricsStartTime: 0,
  lyricsScrollEnd: 50,
  lyricsFontSize: 4,
  lyricsDisplayMode: 'fade',
  showTitleOverlay: true,
  fadeInDuration: 1.5,
  fadeOutDuration: 3,
  videoMotion: 'none',
  videoFilter: 'none',
  videoOverlay: 'none',
  videoOverlayIntensity: 0.5,
  showVisualizer: false,
  particleSystem: 'none',
  lyricsEffect: 'none'
});

export interface ImageParams {
  artStyle: string;
  cameraView: string;
  timeOfDay: string;
  lightingAtmosphere: string;
  weather: string;
  backgroundType: string;
  qualityEngine?: string;
}

export interface ApiKeys {
  gemini: string;
  openai: string;
  anthropic: string;
  stability: string;
}

export interface AiEngines {
  lyrics: string;
  image: string;
  blog: string;
}

export interface PlatformConnections {
  youtube: 'connected' | 'disconnected';
  tiktok: 'connected' | 'disconnected';
  naver: 'connected' | 'disconnected';
  tistory: 'connected' | 'disconnected';
}

export interface WorkflowState {
  params: MusicParams;
  imageParams: ImageParams;
  currentStep: Step;
  imageSettings: {
    style: string;
    main: TitleSettings;
    tiktok: TitleSettings;
    shorts: TitleSettings;
  };
  videoSettings?: any; // Added for compatibility
  blogSettings: BlogSettings;
  progress: {
    lyrics: number;
    image: number;
    video: number;
    youtube: number;
    blog: number;
    prompts: number;
    separation?: number; // Added for compatibility
  };
  results: {
    title?: string;
    koreanTitle?: string;
    englishTitle?: string;
    suggestedTitles?: string[];
    lyrics?: string;
    englishLyrics?: string;
    timedLyrics?: { time: number; kor: string; eng: string; section?: string }[];
    shortsHighlights?: { start: number; duration: number; label?: string }[];
    lyricsArray?: { start: number; end: number; text: string }[]; // Added for compatibility
    interpretation?: string;
    sunoPrompt?: string;
    audioFile?: any;
    audioAnalysis?: { bpm: number; key: string; energy: number; mood: string };
    prompts: { text: string; label: string }[];
    images: { url: string; type: 'horizontal' | 'vertical' | string; label: string; prompt?: string }[];
    videos: { url: string; type: 'main' | 'tiktok' | 'shorts'; duration?: number }[];
    videoUrl?: string; // Added for compatibility
    description?: string; // Added for compatibility
    tags?: string; // Added for compatibility
    trackId?: string; // Added for compatibility
    intent?: string;
    metadata?: {
      title: string;
      description: string;
      tags: string;
    };
    blogPost?: {
      title: string;
      content: string;
      tags: string;
      rawContent?: string;
    };
    naverBlogPost?: {
      title: string;
      content: string;
      tags: string;
      rawContent?: string;
    };
    tistoryBlogPost?: {
      title: string;
      content: string;
      tags: string;
      rawContent?: string;
    };
    googleBlogPost?: {
      title: string;
      content: string;
      tags: string;
      rawContent?: string;
    };
    youtubeMetadata?: {
      title: string;
      description: string;
      tags: string;
    };
    tiktokMetadata?: {
      fullContent: string;
    };
    blogTitle?: string; // Added for compatibility
  };
  publishSettings?: Record<string, string>;
}
