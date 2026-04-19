import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Music,
  Image as ImageIcon,
  Video,
  Send,
  LayoutDashboard,
  CreditCard,
  Settings,
  ChevronRight,
  Play,
  Pause,
  BarChart3,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Terminal as TerminalIcon,
  Download,
  Upload,
  Share2,
  Globe,
  Copy,
  Layers,
  Clock,
  Mic2,
  Key,
  ExternalLink,
  Info,
  Type as TypeIcon,
  Maximize,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './components/GlassCard';
import { ProgressBar } from './components/ProgressBar';
import { Terminal } from './components/Terminal';
import { VideoPlayer } from './components/VideoPlayer';
import { CanvasPreview } from './components/CanvasPreview';
import { SidebarItem } from './components/SidebarItem';
import { LandingPage } from './components/LandingPage';
import { SettingsPage } from './components/SettingsPage';
import { LyricsTab } from './components/LyricsTab';
import { ImageTab } from './components/ImageTab';
import { VideoTab } from './components/VideoTab';
import { PublishTab } from './components/PublishTab';
import { BlogTab } from './components/BlogTab';
import { SunoAudioList } from './components/SunoAudioList';
import { ArrangementWorkspace } from './components/ArrangementWorkspace';
import { VideoSettingsPanel } from './components/VideoSettingsPanel';
import { VideoPreviewCard } from './components/VideoPreviewCard';
import { MetadataCard } from './components/MetadataCard';
import { StepCard } from './components/StepCard';
import { TimeInput, formatTime, parseTime } from './components/TimeInput';
import {
  AI_ENGINES,
  IMAGE_ENGINES,
  MUSIC_ENGINES,
  VIDEO_ENGINES,
  TARGETS,
  POP_SUB_GENRES,
  CCM_SUB_GENRES,
  TEMPOS,
  POP_MOODS,
  CCM_MOODS,
  LYRICS_STYLES,
  INSTRUMENTS,
  ART_STYLES,
  CAMERA_VIEWS,
  CAMERA_ANGLE_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  LIGHTING_ATMOSPHERES,
  COLOR_GRADES,
  COMPOSITIONS,
  DEPTH_OF_FIELDS,
  WEATHERS,
  SUBJECT_DETAILS,
  BACKGROUND_TYPES,
  IMAGE_STYLES,
  BLOG_STYLES,
  TITLE_EFFECTS,
  KOREAN_FONTS,
  ENGLISH_FONTS,
  VOCAL_OPTIONS
} from './constants';
import { cn } from './lib/utils';
import { WorkflowState, Step, Target, Tempo, VocalType, MusicParams, TitlePosition, TitleEffect, ImageType, TitleSettings, createDefaultSettings } from './types';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import {
  saveAudioToDB,
  loadAudioFromDB,
  clearAudioFromDB,
  saveVoiceToDB,
  loadVoiceFromDB,
  saveMediaToDB,
  loadMediaFromDB,
  clearMediaFromDB
} from './utils/db';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType, syncUserProfile } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImageToStorage } from './firebase';

// --- Constants & Data ---


// --- Components ---

// --- Constants & Data ---
// --- Constants & Data ---
// --- Constants & Data ---
// --- Main App ---

export default function App() {
  // --- Data Migration for Rebranding (Vibeflow -> EchoesUntoHim) (Synchronous) ---
  const migrationKeys = ['view', 'activeTab', 'logs', 'shortsCount', 'audioName', 'videoLyrics', 'englishVideoLyrics', 'shortsHighlights', 'platforms', 'workflow'];
  migrationKeys.forEach(key => {
    const oldKey = `vibeflow_${key}`;
    const newKey = `echoesuntohim_${key}`;
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'app'>(() => (localStorage.getItem('echoesuntohim_view') as any) || 'landing');
  const [activeTab, setActiveTab] = useState<Step>(() => (localStorage.getItem('echoesuntohim_activeTab') as any) || 'lyrics');
  const [logs, setLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_logs');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [shortsCount, setShortsCount] = useState(() => parseInt(localStorage.getItem('echoesuntohim_shortsCount') || '3'));
  const mainVideoRef = useRef<any>(null);
  const tiktokVideoRef = useRef<any>(null);
  const shortsVideoRefs = useRef<any[]>([]);
  const [editingImageType, setEditingImageType] = useState<ImageType>('main');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(() => localStorage.getItem('echoesuntohim_audioName'));
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [videoLyrics, setVideoLyrics] = useState<string>(() => localStorage.getItem('echoesuntohim_videoLyrics') || "");
  const [englishVideoLyrics, setEnglishVideoLyrics] = useState<string>(() => localStorage.getItem('echoesuntohim_englishVideoLyrics') || "");
  const [shortsHighlights, setShortsHighlights] = useState<{ start: number, duration: number }[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_shortsHighlights');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  const [isVideoRendering, setIsVideoRendering] = useState(false);
  // Removed lyriaAudio and isLyriaGenerating as they are now in MusicGenerator component

  // Removed generateMusicWithLyria as it's now in MusicGenerator component

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isShortsGenerating, setIsShortsGenerating] = useState(false);
  const [isPlatformLoginModalOpen, setIsPlatformLoginModalOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<keyof typeof platforms | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiEngine, setAiEngine] = useState(() => {
    const saved = localStorage.getItem('ai_engine');
    // Force update to 3.1 flash lite if legacy models are detected or if no valid model is saved
    if (saved === 'gemini-1.5-flash' || saved === 'gemini-1.5-pro' || !saved) {
      return 'gemini-3.1-flash-lite-preview';
    }
    const isValid = AI_ENGINES.some(eng => eng.value === saved);
    return isValid ? saved! : 'gemini-3.1-flash-lite-preview';
  });
  const [musicEngine, setMusicEngine] = useState(() => localStorage.getItem('music_engine') || 'lyria-3-pro-preview');
  const [imageEngine, setImageEngine] = useState(() => localStorage.getItem('image_engine') || 'gemini-3.1-flash-image-preview');
  const [videoEngine, setVideoEngine] = useState(() => {
    const saved = localStorage.getItem('video_engine');
    const isValid = VIDEO_ENGINES.some(eng => eng.value === saved);
    return isValid ? saved! : 'echoesuntohim-v2.1-free';
  });
  const [videoQuality, setVideoQuality] = useState(() => localStorage.getItem('video_quality') || '1080p');
  const [voiceReference, setVoiceReference] = useState<string | null>(null);
  const [voiceRefName, setVoiceRefName] = useState<string>('');
  const [audioFadeIn, setAudioFadeIn] = useState(() => parseInt(localStorage.getItem('audio_fade_in') || '0'));
  const [audioFadeOut, setAudioFadeOut] = useState(() => parseInt(localStorage.getItem('audio_fade_out') || '0'));
  const [platforms, setPlatforms] = useState(() => {
    const saved = localStorage.getItem('echoesuntohim_platforms');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed === 'object' ? parsed : {
        youtube: 'disconnected',
        tiktok: 'disconnected',
        naver: 'disconnected',
        tistory: 'disconnected',
        google: 'disconnected'
      };
    } catch (e) {
      return {
        youtube: 'disconnected',
        tiktok: 'disconnected',
        naver: 'disconnected',
        tistory: 'disconnected',
        google: 'disconnected'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('ai_engine', aiEngine);
  }, [aiEngine]);

  useEffect(() => {
    localStorage.setItem('music_engine', musicEngine);
  }, [musicEngine]);

  useEffect(() => {
    localStorage.setItem('image_engine', imageEngine);
  }, [imageEngine]);

  useEffect(() => {
    localStorage.setItem('video_engine', videoEngine);
  }, [videoEngine]);

  useEffect(() => {
    localStorage.setItem('audio_fade_in', audioFadeIn.toString());
  }, [audioFadeIn]);

  useEffect(() => {
    localStorage.setItem('audio_fade_out', audioFadeOut.toString());
  }, [audioFadeOut]);

  const togglePlatform = (key: keyof typeof platforms) => {
    if (platforms[key] === 'connected') {
      setPendingPlatform(key);
      setIsPlatformLoginModalOpen(true);
      return;
    }

    setPendingPlatform(key);
    setIsPlatformLoginModalOpen(true);
  };

  const handlePlatformLoginConfirm = () => {
    if (!pendingPlatform) return;

    const key = pendingPlatform;
    if (platforms[key as keyof typeof platforms] === 'connected') {
      setPlatforms(prev => ({ ...prev, [key]: 'disconnected' }));
      addLog(`[${String(key)}] 연동이 해제되었습니다.`);
    } else {
      addLog(`[${String(key)}] 실제 연동 프로세스를 시작해야 합니다. (TODO: 백엔드/Firebase OAuth 구현 필요)`);
      // TODO: 실제 OAuth 인증 성공 시 상태를 'connected'로 변경하도록 구현해야 합니다.
    }
    setIsPlatformLoginModalOpen(false);
    setPendingPlatform(null);
  };

  // Lifted Suno Tracks State for global access (History, etc.)
  const [sunoTracks, setSunoTracks] = useState<any[]>([]);
  const [isTracksLoaded, setIsTracksLoaded] = useState(false);
  const loadedUidRef = useRef<string | null>(null);

  // Initial load of Suno tracks from Cloud or LocalStorage
  useEffect(() => {
    const currentUid = user ? user.uid : 'guest';
    if (loadedUidRef.current === currentUid) return;

    // Reset loaded state when user context changes to prevent overwriting cloud data
    setIsTracksLoaded(false);

    const loadTracks = async () => {
      try {
        // Load from LocalStorage first for instant UI
        const localSaved = localStorage.getItem('suno_json_data');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSunoTracks(parsed);
              addLog(`⚡ 로컬 캐시에서 ${parsed.length}곡을 즉시 불러왔습니다.`);
            }
          } catch (e) { }
        }

        if (user) {
          addLog("☁️ 클라우드에서 최신 목록을 가져오는 중...");
          const userRef = doc(db, 'users', user.uid, 'settings', 'sunoTracks');
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const cloudTracks = userDoc.data().tracks || [];
            // Merge or replace? For now, if cloud has data, it's the source of truth
            if (cloudTracks.length > 0) {
              setSunoTracks(cloudTracks);
              addLog(`✅ 클라우드 동기화 완료: ${cloudTracks.length}곡`);
            }
          }
        }
      } catch (error) {
        console.error("Cloud load error:", error);
        addLog("⚠️ 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        loadedUidRef.current = currentUid;
        setIsTracksLoaded(true);
      }
    };
    loadTracks();
  }, [user]);

  // Sync to Cloud whenever tracks change (after initial load)
  useEffect(() => {
    // ALWAYS save to LocalStorage as a local backup/cache
    if (sunoTracks.length > 0) {
      localStorage.setItem('suno_json_data', JSON.stringify(sunoTracks));
    }

    // CRITICAL: Block sync until loading for the current user is complete
    if (!isTracksLoaded) return;

    if (user) {
      const syncToCloud = async () => {
        try {
          const userRef = doc(db, 'users', user.uid, 'settings', 'sunoTracks');
          await setDoc(userRef, {
            tracks: sunoTracks,
            updatedAt: serverTimestamp()
          }, { merge: true });
          // addLog("☁️ 클라우드 데이터 백업 완료"); // Too noisy
        } catch (error) {
          console.error("Cloud sync error:", error);
          // addLog("❌ 클라우드 백업 실패");
        }
      };
      // 500ms debounce for better responsiveness
      const timer = setTimeout(syncToCloud, 500);
      return () => clearTimeout(timer);
    }
  }, [sunoTracks, user, isTracksLoaded]);

  const [workflow, setWorkflow] = useState<WorkflowState>(() => {
    const saved = localStorage.getItem('echoesuntohim_workflow');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.progress) {
            Object.keys(parsed.progress).forEach(key => {
              if (parsed.progress[key] > 0 && parsed.progress[key] < 100) {
                parsed.progress[key] = 0;
              }
            });
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved workflow", e);
      }
    }
    return {
      params: {
        title: '',
        koreanTitle: '',
        englishTitle: '',
        topic: '',
        target: '대중음악',
        subGenre: '인디팝',
        mood: '감성적인',
        tempo: '보통',
        instrument: '피아노',
        vocal: VOCAL_OPTIONS.Male[0],
        lyricsStyle: '시적인'
      },
      imageParams: {
        artStyle: '실사 사진 (Photorealistic)',
        cameraView: '정면 (Front View)',
        timeOfDay: '아침 (Morning)',
        lightingAtmosphere: '시네마틱 라이팅 (Cinematic Lighting)',
        colorGrade: '다크 앤 무디 (Dark & Moody)',
        composition: '3분할 법칙 (Rule of Thirds)',
        depthOfField: '얕은 피사체 심도 (Shallow Bokeh)',
        weather: '맑음 (Clear Sky)',
        subjectDetail: '하이퍼 디테일 (Hyper-detailed)',
        backgroundType: '자연 숲 (Natural Forest)'
      },
      currentStep: 'lyrics',
      imageSettings: {
        style: 'Cinematic',
        main: createDefaultSettings(),
        tiktok: createDefaultSettings(),
        shorts: createDefaultSettings()
      },
      blogSettings: {
        style: '감성 에세이형 (서정적, 감각적, 여운)',
        youtubeLink: ''
      },
      progress: { lyrics: 0, image: 0, video: 0, youtube: 0, blog: 0 },
      results: {
        images: [],
        videos: []
      }
    };
  });

  // Persistence Effects
  useEffect(() => {
    const restoreData = async () => {
      // Restore Audio
      const audioData = await loadAudioFromDB();
      if (audioData) {
        setUploadedAudio(audioData);
        try {
          const res = await fetch(audioData);
          const arrayBuffer = await res.arrayBuffer();
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = await audioContext.decodeAudioData(arrayBuffer);
          setAudioBuffer(buffer);
        } catch (err) {
          console.error("Failed to decode saved audio on load", err);
        }
      }

      // Restore Images & Videos from IndexedDB (Cross-refresh persistence)
      const savedImages = await loadMediaFromDB('workflow_images');
      const savedVideos = await loadMediaFromDB('workflow_videos');

      if (savedImages || savedVideos) {
        setWorkflow(prev => ({
          ...prev,
          results: {
            ...prev.results,
            images: savedImages || prev.results.images,
            videos: savedVideos || prev.results.videos
          }
        }));
      }
    };
    restoreData();
  }, []);

  // Media Persistence Sync
  useEffect(() => {
    if (workflow.results.images && workflow.results.images.length > 0) {
      saveMediaToDB('workflow_images', workflow.results.images);
    }
  }, [workflow.results.images]);

  useEffect(() => {
    if (workflow.results.videos && workflow.results.videos.length > 0) {
      saveMediaToDB('workflow_videos', workflow.results.videos);
    }
  }, [workflow.results.videos]);

  useEffect(() => { localStorage.setItem('echoesuntohim_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('echoesuntohim_activeTab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('echoesuntohim_logs', JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem('echoesuntohim_shortsCount', shortsCount.toString()); }, [shortsCount]);
  useEffect(() => { localStorage.setItem('echoesuntohim_audioName', uploadedAudioName || ''); }, [uploadedAudioName]);
  useEffect(() => { localStorage.setItem('echoesuntohim_videoLyrics', videoLyrics); }, [videoLyrics]);
  useEffect(() => { localStorage.setItem('echoesuntohim_englishVideoLyrics', englishVideoLyrics); }, [englishVideoLyrics]);
  useEffect(() => { localStorage.setItem('echoesuntohim_shortsHighlights', JSON.stringify(shortsHighlights)); }, [shortsHighlights]);
  useEffect(() => { localStorage.setItem('echoesuntohim_platforms', JSON.stringify(platforms)); }, [platforms]);

  useEffect(() => {
    try {
      localStorage.setItem('echoesuntohim_workflow', JSON.stringify(workflow));
    } catch (e) {
      // If localStorage is full, try to save without images as a fallback
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn("LocalStorage full, saving workflow without images");
        try {
          const strippedWorkflow = {
            ...workflow,
            results: {
              ...workflow.results,
              images: [],
              blogPost: workflow.results.blogPost ? {
                ...workflow.results.blogPost,
                content: '블로그 본문이 너무 길어 임시 저장되지 않았습니다. (이미지 포함)'
              } : undefined
            }
          };
          localStorage.setItem('echoesuntohim_workflow', JSON.stringify(strippedWorkflow));
        } catch (fallbackError) {
          console.error("Fallback save also failed", fallbackError);
        }
      }
    }
  }, [workflow]);

  // Override some defaults for specific platforms if needed (only on first mount if not loaded)
  useEffect(() => {
    const saved = localStorage.getItem('echoesuntohim_workflow');
    if (!saved) {
      setWorkflow(prev => ({
        ...prev,
        imageSettings: {
          ...prev.imageSettings,
          main: { ...prev.imageSettings.main, titlePosition: 'custom' },
          tiktok: { ...prev.imageSettings.tiktok, titlePosition: 'custom' },
          shorts: { ...prev.imageSettings.shorts, titlePosition: 'custom' }
        }
      }));
    }
  }, []);

  useEffect(() => {
    // Sync analysis results to UI state when workflow changes.
    // We remove the !videoLyrics check to ensure new analysis results overwrite old persisted ones.
    if (workflow.results.lyrics) {
      setVideoLyrics(workflow.results.lyrics);
    }
    if (workflow.results.englishLyrics) {
      setEnglishVideoLyrics(workflow.results.englishLyrics);
    }
  }, [workflow.results.lyrics, workflow.results.englishLyrics]);

  // Dynamically update blog content when image texts change
  useEffect(() => {
    // @ts-ignore
    const rawContent = workflow.results.blogPost?.rawContent;
    if (!rawContent) return;

    const updateBlogImages = async () => {
      let finalContent = rawContent;

      const finalProcessedImages = await Promise.all(workflow.results.images.map(async (img) => {
        const text = workflow.blogSettings?.imageTexts?.[img.label] || workflow.results.title || '제목 없음';
        const processedUrl = await processImageForBlog(img.url, text);
        return { ...img, blogUrl: processedUrl };
      }));

      for (const img of finalProcessedImages) {
        const placeholder = `{{IMAGE:${img.label}}}`;
        const imgTag = `<img src="${img.blogUrl}" alt="${img.label}" style="max-width: 100%; border-radius: 12px; margin: 25px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">`;
        if (typeof finalContent === 'string') {
          if (finalContent.includes(placeholder)) {
            finalContent = finalContent.split(placeholder).join(imgTag);
          } else {
            finalContent += `\n<div style="text-align: center; margin-top: 30px;">${imgTag}</div>\n`;
          }
        }
      }

      setWorkflow(prev => {
        if (!prev.results.blogPost) return prev;
        return {
          ...prev,
          results: {
            ...prev.results,
            blogPost: {
              ...prev.results.blogPost,
              content: finalContent
            }
          }
        };
      });
    };

    const timeoutId = setTimeout(updateBlogImages, 500);
    return () => clearTimeout(timeoutId);
  }, [workflow.blogSettings?.imageTexts, workflow.results.images]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg].slice(-20));

  const analyzeAudioComprehensively = async (file: File, options?: { skipSync?: boolean, referenceLyrics?: string }) => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      if (!options?.skipSync) setIsApiKeyModalOpen(true);
      return;
    }

    addLog(`🔍 [${aiEngine}] 엔진을 사용하여 음원 분석을 시작합니다...`);
    if (options?.referenceLyrics) {
      addLog(`📝 원본 가사 정보가 있습니다. 싱크 정확도를 높입니다.`);
    }
    addLog("ℹ️ 가사 추출, 구조 분석, BPM/Key 파악을 위해 1~2분 정도 소요됩니다.");

    if (!options?.skipSync) {
      setWorkflow(prev => ({
        ...prev,
        results: { ...prev.results, lyrics: "음원 파일을 분석하고 있습니다...", englishLyrics: "Analyzing audio track..." },
        progress: { ...prev.progress, audioAnalysis: 10 }
      }));
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: currentApiKey });

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
        reader.readAsDataURL(file);
      });
      const audioBase64 = await base64Promise;

      let safeMimeType = file.type || 'audio/wav';
      safeMimeType = safeMimeType.split(';')[0]; // codecs 파라미터 등 제거

      if (safeMimeType.includes('s16le') || safeMimeType.includes('wav')) {
        safeMimeType = 'audio/wav';
      } else if (safeMimeType.includes('mpeg') || safeMimeType.includes('mp3')) {
        safeMimeType = 'audio/mpeg';
      }

      const prompt = `
        이 오디오 파일을 분석하여 전체 가사를 한국어와 영어로 추출해줘. 
        ${options?.referenceLyrics ? `\n[참고 가사 (원본)]: \n${options.referenceLyrics}\n\n위 가사 내용을 바탕으로 오디오의 실제 소리를 듣고 정확한 타임스탬프를 매겨줘. 가사 텍스트는 원본 가사를 최대한 존중해서 작성해줘.` : ''}
        
        [지시사항]
        1. 곡의 구조(Intro, Verse, Chorus, Bridge, Outro 등)를 정확히 파악하여 타임스탬프와 함께 정리해줘.
        2. **가사 구조화 (가장 중요)**: 
           - 가사는 반드시 한 줄씩 띄어쓰기를 적용하여 읽기 좋게 구성해줘.
           - 한글 가사 또한 한 줄로 뭉치지 않게, 사람이 부르는 단위(구절)로 줄바꿈을 철저히 해줘.
           - 각 섹션(예: [Verse 1]) 시작 전에 한 줄을 띄워줘.
        3. **모든 줄에 타임스탬프 적용 (필수)**: 
           - 각 가사 줄의 시작점에 반드시 [00:00] 과 같은 형식으로 해당 가사가 시작되는 정확한 타임스탬프를 달아줘.
           - 섹션 제목(예: [Intro], [Verse 1])에도 타임스탬프를 포함해줘. (예: [00:15] [Verse 1])
           - 한국어 가사와 영어 가사의 타임스탬프는 반드시 1:1로 일치해야 해.
        4. **자막 싱크 데이터 (필수)**: 
           - 모든 가사 줄에 대해 정확한 시작 시간을 초(second) 단위로 파악하여 timedLyrics 배열에 담아줘.
           - kor와 eng는 반드시 1:1 매칭되어야 해.
        5. 곡의 BPM, Key(조), 전반적인 에너지 레벨(0~100)을 추정해줘.
        6. 반드시 아래 JSON 형식으로만 답변해줘. 다른 텍스트는 포함하지 마.

        [응답 형식 JSON]
        {
          "lyrics": "[00:00] [Intro]\\n가사 첫 번째 줄\\n가사 두 번째 줄...",
          "englishLyrics": "[00:00] [Intro]\\nEnglish Line 1\\nEnglish Line 2...",
          "timedLyrics": [
            { "time": 0, "section": "Intro", "kor": "", "eng": "" },
            { "time": 15, "section": "Verse 1", "kor": "문밖의 소란을 내려놓고", "eng": "Leaving the noise outside" },
            { "time": 17, "section": "Verse 1", "kor": "정결한 마음으로 주 앞에 섭니다", "eng": "With a pure heart, I stand before You" }
          ],
          "bpm": 120,
          "key": "C Major",
          "energy": 80
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, audioAnalysis: 30 } }));

      const response = await genAI.models.generateContent({
        model: aiEngine || 'gemini-3.1-flash-lite-preview',
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: safeMimeType,
                  data: audioBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, audioAnalysis: 80 } }));

      // Get the extracted string output
      const responseText = response.text || "";

      // Robust JSON extraction: Find the first '{' and last '}'
      let cleanedText = responseText;
      const startIdx = responseText.indexOf('{');
      const endIdx = responseText.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1) {
        cleanedText = responseText.substring(startIdx, endIdx + 1);
      } else {
        cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
      }

      const result = JSON.parse(cleanedText);

      // Parse timestamps for highlights
      const timestampRegex = /\[(\d{2}):(\d{2})\]\s*\[(.*?)\]/g;
      let match;
      const highlights: any[] = [];
      const lyricsText = result.lyrics || "";
      while ((match = timestampRegex.exec(lyricsText)) !== null) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const label = match[3];
        const time = minutes * 60 + seconds;
        highlights.push({ start: time, duration: 30, label }); // Default 30s
      }

      if (!options?.skipSync) {
        setWorkflow(prev => ({
          ...prev,
          results: {
            ...prev.results,
            lyrics: result.lyrics,
            englishLyrics: result.englishLyrics,
            timedLyrics: result.timedLyrics || [],
            shortsHighlights: highlights.length > 0 ? highlights : prev.results.shortsHighlights,
            audioAnalysis: {
              bpm: result.bpm,
              key: result.key,
              energy: result.energy,
              mood: result.mood || "Energetic"
            }
          },
          progress: { ...prev.progress, audioAnalysis: 100 }
        }));

        // Direct state update for better sync
        if (result.lyrics) setVideoLyrics(result.lyrics);
        if (result.englishLyrics) setEnglishVideoLyrics(result.englishLyrics);

        // Update the track in sunoTracks history to persist the analysis
        setSunoTracks(prev => prev.map(t => {
          // Match by title (which was set just before analysis in SunoAudioList)
          if (t.title === workflow.params.title || t.id === workflow.results.trackId) {
            return {
              ...t,
              lyrics: result.lyrics,
              englishLyrics: result.englishLyrics,
              audioAnalysis: {
                bpm: result.bpm,
                key: result.key,
                energy: result.energy,
                mood: result.mood || "Energetic"
              }
            };
          }
          return t;
        }));
      }

      addLog(`✅ 음원 분석 완료: 가사 및 곡 구조(${result.key}, ${result.bpm}BPM)를 성공적으로 추출했습니다.`);

      // Update highlights if analysis provided them (legacy check kept for safety)
      if (highlights.length > 0) {
        setShortsHighlights(highlights.map(h => ({ start: h.start, duration: h.duration })));
      }

      return result;

    } catch (error: any) {
      console.error("Audio Analysis Error:", error);
      addLog(`❌ 음원 분석 실패: ${error.message || String(error)}`);
      if (!options?.skipSync) {
        setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, audioAnalysis: 0 } }));
      }
    }
  };

  const handleGlobalAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addLog(`📁 음원 파일 업로드: ${file.name}`);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const dataUrl = await base64Promise;
      setUploadedAudio(dataUrl);
      setUploadedAudioName(file.name);
      await saveAudioToDB(dataUrl);
      await saveVoiceToDB('workspace_audio', dataUrl, file.name);

      // Extract title from filename and detect target
      let rawTitle = file.name.replace(/\.[^/.]+$/, "");
      let target: '대중음악' | 'CCM' = workflow.params.target || '대중음악';

      if (rawTitle.includes('[CCM]')) target = 'CCM';
      else if (rawTitle.includes('[대중음악]')) target = '대중음악';

      const cleanTitle = rawTitle.replace(/\[.*?\]/g, '').trim();
      const [kTitle, eTitle] = cleanTitle.includes('_') ? cleanTitle.split('_') : [cleanTitle, ''];

      setWorkflow(prev => ({
        ...prev,
        params: {
          ...prev.params,
          target: target,
          title: cleanTitle,
          koreanTitle: kTitle.trim() || prev.params.koreanTitle,
          englishTitle: eTitle.trim() || prev.params.englishTitle
        },
        results: {
          ...prev.results,
          audioFile: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          title: cleanTitle
        }
      }));

      // Trigger analysis
      analyzeAudioComprehensively(file);

      // Also decode for buffer (visualization)
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);

    } catch (err: any) {
      console.error("Audio upload error:", err);
      addLog(`❌ 파일 업로드 중 오류 발생: ${err.message || String(err)}`);
    }
  };

  const handleAudioUpload = handleGlobalAudioUpload;
  const handleVideoAudioUpload = handleGlobalAudioUpload;

  const handleHighlightChange = (idx: number, field: 'start' | 'end', newVal: number) => {
    const newHighlights = [...shortsHighlights];
    const current = newHighlights[idx];
    if (field === 'start') {
      const currentEnd = current.start + current.duration;
      newHighlights[idx] = { ...current, start: newVal, duration: Math.max(0, currentEnd - newVal) };
    } else {
      newHighlights[idx] = { ...current, duration: Math.max(0, newVal - current.start) };
    }
    setShortsHighlights(newHighlights);
  };

  const handleDownloadAll = async () => {
    setIsVideoRendering(true);
    addLog("📥 모든 영상 다운로드를 시작합니다 (순차적으로 진행됩니다)...");

    if (mainVideoRef.current) {
      addLog("메인 영상 다운로드 중...");
      mainVideoRef.current.download();
      // Wait a bit to avoid browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (tiktokVideoRef.current) {
      addLog("틱톡 영상 다운로드 중...");
      tiktokVideoRef.current.download();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    for (let i = 0; i < shortsCount; i++) {
      if (shortsVideoRefs.current[i]) {
        addLog(`숏츠 #${i + 1} 다운로드 중...`);
        shortsVideoRefs.current[i].download();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    addLog("✅ 모든 영상 다운로드 요청이 완료되었습니다.");
    setIsVideoRendering(false);
  };

  const resetSubsequentSteps = (fromStep: Step) => {
    addLog(`🔄 [${fromStep}] 단계 이후의 데이터를 초기화합니다...`);
    setWorkflow(prev => {
      const newProgress = { ...prev.progress };
      const newResults = { ...prev.results };

      const steps: Step[] = ['lyrics', 'music', 'image', 'video', 'publish', 'blog'];
      const fromIndex = steps.indexOf(fromStep);

      for (let i = fromIndex + 1; i < steps.length; i++) {
        const step = steps[i];
        newProgress[step as keyof typeof newProgress] = 0;

        if (step === 'music') {
          newResults.audioFile = undefined;
          newResults.sunoPrompt = '';
        }
        if (step === 'image') {
          newResults.images = [];
          clearMediaFromDB('workflow_images');
        }
        if (step === 'video') {
          newResults.videos = [];
          clearMediaFromDB('workflow_videos');
        }
        if (step === 'blog') {
          newResults.blogPost = undefined;
          newResults.naverBlogPost = undefined;
          newResults.googleBlogPost = undefined;
          newResults.youtubeMetadata = undefined;
        }
      }

      return { ...prev, progress: newProgress, results: newResults };
    });
  };

  const startVideoRender = () => {
    resetSubsequentSteps('video');
    setIsVideoRendering(true);
    addLog("실제 영상 렌더링 서버와 통신해야 합니다. (TODO: 백엔드 렌더링 API 연동 필요)");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, video: 0 } }));

    // TODO: 백엔드의 렌더링 진행 상황 API를 폴링하여 프로그레스 및 결과를 업데이트해야 합니다.
    // 현재는 더미 시뮬레이션을 제거하였으므로 자동으로 완료되지 않습니다.
  };

  const [availableModels, setAvailableModels] = useState<{ value: string, label: string, type?: string }[]>(AI_ENGINES);

  const fetchAvailableModels = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      addLog("⚠️ API 키가 없습니다. 키를 먼저 설정해주세요.");
      return;
    }
    try {
      addLog("사용 가능한 모델 목록을 불러오는 중...");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentApiKey}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          throw new Error(`Permission Denied (403): API 키의 권한이 없거나 Generative Language API가 활성화되지 않았습니다. (상세: ${JSON.stringify(errorData)})`);
        }
        if (res.status === 400) {
          throw new Error(`Bad Request (400): 잘못된 API 키이거나 요청 형식이 올바르지 않습니다. (상세: ${JSON.stringify(errorData)})`);
        }
        throw new Error(`모델 목록을 불러오는데 실패했습니다. (상태 코드: ${res.status})`);
      }
      const data = await res.json();
      const models = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => {
          const val = m.name.replace('models/', '');
          const known = AI_ENGINES.find(e => e.value === val);
          let label = known ? known.label : (m.displayName || val);

          // Append purpose if not already in label
          if (!label.includes('용)')) {
            if (val.includes('image')) label += ' (이미지생성용)';
            else if (val.includes('audio') || val.includes('music')) label += ' (음악생성용)';
            else label += ' (가사/텍스트용)';
          }

          return {
            value: val,
            label: label,
            type: known ? known.type : (val.includes('pro') || val.includes('research') ? 'paid' : 'free')
          };
        });
      setAvailableModels(models);

      if (!models.some((m: any) => m.value === aiEngine) && models.length > 0) {
        const defaultModel = models.find((m: any) => m.value === 'gemini-3.1-flash-lite-preview') || models[0];
        setAiEngine(defaultModel.value);
        localStorage.setItem('ai_engine', defaultModel.value);
      }

      addLog(`✅ 총 ${models.length}개의 사용 가능한 모델을 불러왔습니다.`);
    } catch (error: any) {
      console.error(error);
      addLog(`❌ 모델 목록 불러오기 실패: ${error.message || 'API 키를 확인해주세요.'}`);
    }
  };


  const generateYoutubeMetadata = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    addLog("유튜브 업로드용 메타데이터(제목, 설명, 태그) 생성을 시작합니다...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 10 } }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const isCCM = workflow.params.target === 'CCM';
      const persona = isCCM
        ? "당신은 기독교 문화 콘텐츠 전문가이자 은혜로운 예배 영상을 전문으로 하는 최정상급 유튜버입니다."
        : "당신은 100만 명의 구독자를 보유한 최정상급 음악 유튜버이자 K-Pop/Pop 트렌드 전문가입니다.";

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
        
        Response Format (JSON):
        {
          "title": "클릭을 유발하는 강력한 제목",
          "description": "다음 구조와 줄바꿈(\\n\\n)을 엄격히 준수하세요:\\n\\n[첫 인사 및 곡 제목 소개 (🌿 이모지 포함)]\\n\\n[곡에 대한 은혜롭고 감성적인 설명 2-3줄]\\n\\n[시청자를 위한 기도와 축복의 메시지 (🙏 이모지 포함)]\\n\\n[🔔 구독과 좋아요 안내 문구 (💖 이모지 포함)]\\n\\n[관련 해시태그 10개]\\n\\n※ 각 섹션 사이에는 반드시 두 번의 줄바꿈(\\n\\n)을 넣으세요. 바로 복사해서 붙여넣기 좋게 생성해야 합니다.",
          "tags": "은혜로운찬양, 가사있는찬양, 인기CCM, ${workflow.params.mood}, ${workflow.params.topic} 등 노출이 잘 되는 키워드 15개를 쉼표로 구분"
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 50 } }));

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: { type: Type.STRING }
            },
            required: ['title', 'description', 'tags']
          },
          temperature: 0.8,
          maxOutputTokens: 2048,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      let parsed;
      try {
        const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Youtube JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, youtube: 100 },
        results: {
          ...prev.results,
          youtubeMetadata: parsed
        }
      }));
      addLog('✅ 유튜브 메타데이터 생성이 완료되었습니다.');
    } catch (error) {
      console.error('Youtube Metadata Error:', error);
      addLog('❌ 유튜브 메타데이터 생성 실패: ' + (error.message || String(error)));
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 0 } }));
    }
  };

  const generateBlogPost = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const targets = workflow.blogSettings?.targets || { naver: true, tistory: false, google: false };
    const activeTargets = Object.entries(targets).filter(([_, isActive]) => isActive).map(([key]) => key);

    if (activeTargets.length === 0) {
      addLog('❌ 선택된 블로그 플랫폼이 없습니다.');
      return;
    }

    addLog(`블로그 포스팅 생성을 시작합니다... (${activeTargets.join(', ')})`);
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 10 } }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;
      const processedImages = workflow.results.images.filter(img => img.url);

      const isCCM = workflow.params.target === 'CCM';
      const genreContext = isCCM
        ? "이 곡은 CCM(Contemporary Christian Music)이므로, 독자들에게 영적인 깊이와 은혜, 위로를 전달하는 데 집중하세요. 문체는 경건하면서도 따뜻해야 합니다."
        : "이 곡은 대중음악이므로, 독자들에게 트렌디한 감성과 공감, 음악적 세련미를 전달하는 데 집중하세요. 문체는 감각적이고 세련되어야 합니다.";

      const userStyle = workflow.blogSettings?.style || '감성적이고 따뜻한 블로그';
      const userPerspective = workflow.blogSettings?.blogPerspective || '소개자 관점';
      const userAudience = workflow.blogSettings?.targetAudience || '모든 음악 애호가';

      const naverPersona = `[네이버 블로그] 화자: ${userPerspective}, 스타일: ${userStyle}. 네이버 검색 노출을 위해 키워드 전략을 세우고 다정한 문체와 이모지를 활용해 풍성하게 작성하세요.`;
      const tistoryPersona = `[티스토리] 화자: ${userPerspective}, 스타일: ${userStyle}. 깔끔하고 전문적인 레이아웃으로 정보 전달력을 높여 분석적으로 작성하세요.`;
      const googlePersona = `[구글 블로거] 화자: ${userPerspective}, 스타일: ${userStyle}. 구글 SEO에 최적화된 구조(H1~H3)와 객관적인 글로벌 문체로 작성하세요.`;

      const prompt = `
        [SYSTEM ROLE]
        당신은 체류 시간을 극대화하는 블로그 콘텐츠 전문가이자 HTML 디자이너입니다.
        아래 정보와 각 플랫폼별 가이드에 맞춰 시각적으로 화려하고 매력적인 HTML 포스팅을 생성하세요.

        [곡 정보]
        - 제목: ${workflow.params.koreanTitle || workflow.results.title}
        - 주제: ${workflow.params.topic}
        - 분위기: ${workflow.params.mood}
        - 가사: ${workflow.results.lyrics}
        ${workflow.results.englishLyrics ? `- 영어 가사: ${workflow.results.englishLyrics}` : ''}
        - 타겟 고객: ${workflow.blogSettings?.targetAudience || '모든 음악 애호가'}
        
        [유튜브 정보]
        - 링크: ${workflow.blogSettings?.youtubeLink || '없음'}
        
        [HTML 스타일 가이드]
        1. 챕터 헤더: <h2 style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px; border-radius: 12px; margin: 32px 0 16px;">🎵 제목</h2>
        2. 인용구: <blockquote style="border-left: 5px solid #00FFA3; background: #0B0E14; padding: 20px; border-radius: 8px;">내용</blockquote>
        
        [요청 플랫폼]
        ${targets.naver ? naverPersona : ''}
        ${targets.tistory ? tistoryPersona : ''}
        ${targets.google ? googlePersona : ''}

        [이미지 배치]
        ${processedImages.map(img => `- 라벨: ${img.label}`).join('\n') || '이미지 없음'}
        본문 적절한 위치에 {{IMAGE:라벨명}} 형식으로 반드시 모든 이미지를 포함하세요.

        Response Format (JSON):
        {
          ${targets.naver ? '"naver": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          ${targets.tistory ? '"tistory": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          ${targets.google ? '"google": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          "imageTexts": {
            ${processedImages.map(img => `"${img.label}": "이 이미지가 위치한 단락의 '소제목(챕터 제목)' 또는 해당 단락의 가장 핵심적인 문장을 그대로 사용 (본문과 무관한 문구 금지)"`).join(',\n            ')}
          }
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 50 } }));

      // Build JSON Schema dynamically based on targets
      const propertiesSchema: any = {
        imageTexts: { type: 'OBJECT', additionalProperties: { type: 'STRING' } }
      };

      const requiredFields = ['imageTexts'];

      const blogSchema = {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          content: { type: 'STRING' },
          tags: { type: 'STRING' }
        },
        required: ['title', 'content', 'tags']
      };

      if (targets.naver) { propertiesSchema.naver = blogSchema; requiredFields.push('naver'); }
      if (targets.tistory) { propertiesSchema.tistory = blogSchema; requiredFields.push('tistory'); }
      if (targets.google) { propertiesSchema.google = blogSchema; requiredFields.push('google'); }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: propertiesSchema,
            required: requiredFields
          },
          temperature: 0.8,
          maxOutputTokens: 8192,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      let parsed;
      try {
        const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Blog JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      let currentImageTexts = { ...(workflow.blogSettings?.imageTexts || {}) };
      if (parsed.imageTexts) {
        currentImageTexts = { ...parsed.imageTexts, ...currentImageTexts };
        setWorkflow(prev => ({
          ...prev,
          blogSettings: {
            ...prev.blogSettings,
            imageTexts: currentImageTexts
          }
        }));
      }

      const processContent = async (rawContent) => {
        if (!rawContent) return '';
        let finalContent = rawContent;

        for (const img of workflow.results.images) {
          const placeholder = `{{IMAGE:${img.label}}}`;
          const textToUse = currentImageTexts[img.label] || workflow.results.title || '은혜로운 찬양';

          const imgTag = `
              <div style="position: relative; width: 100%; max-width: 600px; aspect-ratio: 16/9; margin: 40px auto; border-radius: 18px; overflow: hidden; box-shadow: 0 15px 45px rgba(0,0,0,0.4); background: #000; border: 1px solid rgba(255,255,255,0.15);">
                <img src="${img.url}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)); display: flex; align-items: center; justify-content: center; padding: 25px; text-align: center;">
                  <span style="color: white; font-size: 26px; font-weight: 900; text-shadow: 2px 2px 10px rgba(0,0,0,1); line-height: 1.4; font-family: 'Noto Sans KR', sans-serif;">${textToUse}</span>
                </div>
              </div>`;

          if (typeof finalContent === 'string') {
            if (finalContent.includes(placeholder)) {
              finalContent = finalContent.split(placeholder).join(imgTag);
            } else {
              finalContent += `\n${imgTag}\n`;
            }
          }
        }
        return finalContent;
      };

      const resultsToUpdate: any = {};

      if (targets.naver && parsed.naver) {
        resultsToUpdate.naverBlogPost = {
          title: parsed.naver.title,
          content: await processContent(parsed.naver.content),
          rawContent: parsed.naver.content,
          tags: parsed.naver.tags
        };
      }

      if (targets.tistory && parsed.tistory) {
        resultsToUpdate.tistoryBlogPost = {
          title: parsed.tistory.title,
          content: await processContent(parsed.tistory.content),
          rawContent: parsed.tistory.content,
          tags: parsed.tistory.tags
        };
      }

      if (targets.google && parsed.google) {
        resultsToUpdate.googleBlogPost = {
          title: parsed.google.title,
          content: await processContent(parsed.google.content),
          rawContent: parsed.google.content,
          tags: parsed.google.tags
        };
      }

      // Fallback for general blogPost reference
      if (targets.naver && parsed.naver) resultsToUpdate.blogPost = resultsToUpdate.naverBlogPost;
      else if (targets.tistory && parsed.tistory) resultsToUpdate.blogPost = resultsToUpdate.tistoryBlogPost;
      else if (targets.google && parsed.google) resultsToUpdate.blogPost = resultsToUpdate.googleBlogPost;

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, blog: 100 },
        results: {
          ...prev.results,
          ...resultsToUpdate
        }
      }));

      if (user) {
        try {
          if (targets.naver && parsed.naver) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'naver', title: parsed.naver.title, content: resultsToUpdate.naverBlogPost.content, tags: parsed.naver.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          if (targets.tistory && parsed.tistory) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'tistory', title: parsed.tistory.title, content: resultsToUpdate.tistoryBlogPost.content, tags: parsed.tistory.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          if (targets.google && parsed.google) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'google', title: parsed.google.title, content: resultsToUpdate.googleBlogPost.content, tags: parsed.google.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          addLog('✅ 블로그 포스팅이 저장되었습니다.');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'blogPosts');
        }
      }

      addLog('✅ 블로그 포스팅 생성이 완료되었습니다.');
    } catch (error) {
      console.error('Blog Generation Error:', error);
      addLog('❌ 블로그 포스팅 생성 실패: ' + (error.message || String(error)));
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 0 } }));
    }
  };

  const generateLyrics = async () => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!workflow.params.topic && !workflow.params.userInput) {
      addLog("⚠️ 오류: 주제(Topic) 또는 사용자 입력 내용을 작성해주세요.");
      return;
    }

    addLog(`[${workflow.params.target} - ${workflow.params.subGenre}] 가사 및 프롬프트 생성 시작...`);
    if (workflow.params.userInput) {
      addLog(`사용자 입력 내용 감지: "${workflow.params.userInput.substring(0, 50)}..." 내용을 최우선으로 반영합니다.`);
    }
    addLog(`사용 엔진 - 텍스트: ${aiEngine} | 음악: ${musicEngine}`);
    addLog(`주제: ${workflow.params.topic || '사용자 입력 기반'} | 스타일: ${workflow.params.lyricsStyle} | 템포: ${workflow.params.tempo}`);
    addLog(`설정: 3~6분 분량의 대곡 구성 (Verse-Chorus-Bridge 확장)`);

    resetSubsequentSteps('lyrics');
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, lyrics: 10 } }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const isCCM = workflow.params.target === 'CCM';

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

      const prompt = `
        [SYSTEM ROLE]
        ${isCCM ? ccmPersona : popPersona}
        
        [TASK]
        Generate a song title and lyrics based on the following parameters:
        ${workflow.params.userInput ? `[CRITICAL USER INPUT: ${workflow.params.userInput}] - PRIORITIZE THIS CONTENT OVER ALL OTHER PARAMETERS.` : ''}
        - Topic: ${workflow.params.topic}
        - Target Audience: ${workflow.params.target}
        - Sub-Genre: ${workflow.params.subGenre}
        - Mood: ${workflow.params.mood}
        - Tempo: ${workflow.params.tempo}
        - Lyrics Style: ${workflow.params.lyricsStyle}
        - Vocal Type: ${workflow.params.vocal}
        - Main Instrument: ${workflow.params.instrument}

        Guidelines:
        1. Song Titles (CRITICAL): Generate 5 different, highly creative and genre-appropriate titles.
           - Format: [TargetTag][Korean Title]_[English Title] (e.g., "[CCM]제목_Title")
           - TargetTag MUST be "[CCM]" if Target Audience is CCM, or "[대중음악]" if Target Audience is 대중음악.
           - If CCM: Focus on keywords like 'Grace', 'Light', 'Path', 'Eternal', 'Voice', 'Stillness'. The titles should feel warm and sacred.
           - If Pop: Focus on keywords like 'Memory', 'City', 'Echo', 'Colors', 'Blue', 'Distance'. The titles should feel trendy and cinematic.
           - CRITICAL: Titles MUST NOT be literal translations. The English title should capture the "vibe" and "emotion" of the Korean title poetically.
        2. Lyrics (CRITICAL): Generate full lyrics for a 3-6 minute long song in BOTH Korean and English.
           - Structure: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Outro].
           - ${isCCM ? "CCM Style: Focus on vertical worship (to God) or deep spiritual reflection." : "Pop Style: Focus on horizontal relationships (human to human) or self-discovery."}
           - **LINE-BY-LINE MAPPING (CRITICAL)**: The Korean and English lyrics MUST have the exact same number of lines in each section. Every Korean line must have a corresponding English translation on the same line number within that section. This is for video subtitle sync.
           - Double line break between sections, single line break between every line.
        3. Suno AI Prompt: Generate a detailed Suno AI v3.5 prompt (max 2000 chars).
           - Include instrumentation, specific vocal texture, and production style (e.g., "atmospheric synth pads", "intimate acoustic guitar").

        Response Format (JSON):
        {
          "titles": ["KoreanTitle1_EnglishTitle1", "KoreanTitle2_EnglishTitle2", "KoreanTitle3_EnglishTitle3", "KoreanTitle4_EnglishTitle4", "KoreanTitle5_EnglishTitle5"],
          "lyrics": "Full Korean lyrics text with section headers",
          "englishLyrics": "Full English lyrics text with section headers",
          "sunoPrompt": "Detailed Suno AI prompt",
          "intent": "Explanation of the lyrics' intent and meaning (MUST be written in Korean)"
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, lyrics: 30 } }));

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              lyrics: { type: Type.STRING },
              englishLyrics: { type: Type.STRING },
              sunoPrompt: { type: Type.STRING },
              intent: { type: Type.STRING }
            },
            required: ["titles", "lyrics", "englishLyrics", "sunoPrompt", "intent"]
          }
        }
      });

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, lyrics: 80 } }));

      const responseText = response.text;
      if (!responseText) {
        throw new Error("AI가 유효한 가사를 생성하지 못했습니다.");
      }

      // Strip markdown code block if present
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleanedText);

      // Always use the first suggested title as the new default
      const suggestedTitles = result.titles || ["제목_없음"];
      const finalTitle = suggestedTitles[0];

      const [kTitle, eTitle] = finalTitle.includes('_') ? finalTitle.split('_') : [finalTitle, ''];

      // Ensure lyrics have proper line breaks if AI missed them
      const formatLyrics = (text: string) => (text || "")
        .replace(/&#10;/g, '\n')
        // 섹션 헤더([Verse], [Chorus] 등) 앞에 빈 줄을 추가하여 구조를 명확히 함
        .replace(/(\[Verse|\[Chorus|\[Bridge|\[Outro|\[Intro)/g, '\n\n$1')
        // 너무 많은 연속된 빈 줄은 최대 2개로 제한
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const formattedLyrics = formatLyrics(result.lyrics);
      const formattedEnglishLyrics = formatLyrics(result.englishLyrics);

      addLog(`가사 생성 완료: [${workflow.params.lyricsStyle}] 스타일의 풍성한 서사`);
      addLog(`제목: ${finalTitle}`);
      addLog("Suno AI v3.5 전용 고해상도 프롬프트 생성 완료");

      setWorkflow(prev => ({
        ...prev,
        params: {
          ...prev.params,
          title: finalTitle,
          koreanTitle: kTitle || prev.params.koreanTitle,
          englishTitle: eTitle || prev.params.englishTitle
        },
        progress: { ...prev.progress, lyrics: 100 },
        results: {
          ...prev.results,
          title: finalTitle,
          suggestedTitles,
          lyrics: formattedLyrics,
          englishLyrics: formattedEnglishLyrics,
          sunoPrompt: result.sunoPrompt,
          intent: result.intent
        }
      }));

    } catch (error) {
      console.error("Gemini API Error:", error);
      addLog(`❌ 오류: 가사 생성 중 문제가 발생했습니다. (${error instanceof Error ? error.message : String(error)})`);
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, lyrics: 0 } }));
    }
  };

  const generatePromptOnly = async () => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!workflow.results.lyrics) {
      addLog("⚠️ 오류: 먼저 가사를 생성해주세요.");
      return;
    }

    addLog(`[${musicEngine}] 음악 생성 프롬프트만 재생성 중... (가사 유지)`);
    if (workflow.params.userInput) {
      addLog(`사용자 입력 내용 감지: "${workflow.params.userInput.substring(0, 50)}..." 내용을 반영합니다.`);
    }
    addLog(`보컬: ${workflow.params.vocal} | 악기: ${workflow.params.instrument}`);

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const prompt = `
        You are a professional music producer.
        Based on the following existing lyrics and updated parameters, generate ONLY a detailed prompt for a music generation AI (like Suno AI v3.5 or Udio).
        
        ${workflow.params.userInput ? `[CRITICAL USER INPUT: ${workflow.params.userInput}] - PRIORITIZE THIS CONTENT.` : ''}
        - Topic: ${workflow.params.topic}
        - Target Audience: ${workflow.params.target}
        - Sub-Genre: ${workflow.params.subGenre}
        - Mood: ${workflow.params.mood}
        - Tempo: ${workflow.params.tempo}
        - Vocal Type: ${workflow.params.vocal}
        - Main Instrument: ${workflow.params.instrument}
        
        [Existing Lyrics]
        ${workflow.results.lyrics}
        ${workflow.results.englishLyrics ? `\n[Existing English Lyrics]\n${workflow.results.englishLyrics}` : ''}

        Guidelines:
        Generate a detailed prompt (max 1000 characters) that describes the musical style, arrangement, and emotional delivery based on the parameters above. Do not output the lyrics again.
        ${workflow.params.userInput ? `Ensure the style reflects the [CRITICAL USER INPUT].` : ''}

        Response Format (JSON):
        {
          "sunoPrompt": "Detailed music generation prompt"
        }
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sunoPrompt: { type: Type.STRING }
            },
            required: ["sunoPrompt"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("AI가 유효한 프롬프트를 생성하지 못했습니다.");
      }

      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleanedText);

      addLog(`✅ 프롬프트 재생성 완료`);

      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          sunoPrompt: result.sunoPrompt
        }
      }));

    } catch (error) {
      console.error("Gemini API Error:", error);
      addLog(`❌ 오류: 프롬프트 재생성 중 문제가 발생했습니다. (${error instanceof Error ? error.message : String(error)})`);
    }
  };

  const generateImages = async () => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!workflow.results.audioFile && !workflow.results.lyrics) {
      addLog("⚠️ 오류: 가사를 먼저 생성하거나 수노(Suno) 음원 파일을 업로드해주세요.");
      return;
    }

    addLog("Gemini AI를 통한 가사 및 분위기 분석 기반 이미지 프롬프트 생성 중...");
    addLog(`사용 엔진 - 이미지 프롬프트 생성: ${aiEngine}`);
    resetSubsequentSteps('image');
    setWorkflow(prev => ({
      ...prev,
      progress: { ...prev.progress, image: 10 }
    }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      // 1. Generate optimized prompts for each platform
      const promptGen = `
        당신은 30년차 전문 화가이자 카메라 감독입니다. 곡의 느낌과 분위기를 완벽하게 파악하여 최고의 시각적 작품을 만들어냅니다. 특히 CCM과 대중음악의 미묘한 감성 차이를 누구보다 잘 이해하고 있습니다.
        아래의 가사와 곡 정보를 분석하여, 곡의 감정과 서사를 가장 잘 표현할 수 있는 이미지 생성 프롬프트를 작성하세요.
        
        [곡 제목]
        ${workflow.results.title || workflow.params.title || "제목 없음"}

        [가사 내용]
        ${workflow.results.lyrics || "가사 없음"}
        ${workflow.results.englishLyrics ? `\n[영어 가사]\n${workflow.results.englishLyrics}` : ''}
        
        ${workflow.params.songInterpretation ? `[사용자 곡 해석 (최우선 반영)]\n${workflow.params.songInterpretation}\n` : ''}

        [음악 데이터]
        음악 종류: ${workflow.params.target}
        BPM: ${workflow.results.audioAnalysis?.bpm || "보통"}
        분위기: ${workflow.results.audioAnalysis?.mood || workflow.params.mood || "감성적인"}
        에너지: ${workflow.results.audioAnalysis?.energy || "0.5"}
        
        [사용자 선택 이미지 생성 옵션]
        - 화풍 및 장르: ${workflow.imageParams.artStyle}
        - 구도 및 시점: ${workflow.imageParams.cameraView}
        - 시간대: ${workflow.imageParams.timeOfDay}
        - 조명 및 대기: ${workflow.imageParams.lightingAtmosphere}
        - 색감 및 톤: ${workflow.imageParams.colorGrade}
        - 구도 구성: ${workflow.imageParams.composition}
        - 피사체 심도: ${workflow.imageParams.depthOfField}
        - 날씨 및 환경: ${workflow.imageParams.weather}
        - 세부 묘사: ${workflow.imageParams.subjectDetail}
        - 배경 유형: ${workflow.imageParams.backgroundType}
        - 스타일 테마: ${workflow.imageSettings.style}
        
        [지시사항]
        1. 가사의 핵심 키워드(놀이터, 그네, 비눗방울, 별, 꽃 등)를 시각적으로 구체화하세요.
        2. 곡의 분위기(따뜻함, 위로, 그리움 등)가 조명과 색감에 반영되도록 하세요. 
        3. **중요**: ${workflow.params.songInterpretation ? `사용자가 제공한 [사용자 곡 해석]을 최우선으로 반영하여 이미지를 구상하세요. AI의 해석보다 사용자의 의도가 우선입니다.` : `음악 종류가 'CCM'일 경우, 기독교적인 상징(빛, 십자가, 기도하는 모습, 평화로운 자연, 교회, 은혜로운 분위기 등)을 적극적으로 활용하여 경건하고 영적인 느낌이 강하게 나도록 프롬프트를 구성하세요. 대중음악일 경우 트렌디하고 감각적인 미장센에 집중하세요.`}
        4. 인물보다는 상징적인 사물이나 풍경 위주로 묘사하여 감성을 극대화하세요.
        5. 사용자가 선택한 [이미지 생성 옵션]을 프롬프트에 반드시 반영하여 해당 스타일과 질감, 조명, 구도가 명확히 드러나도록 하세요.
        6. 영어로 프롬프트를 작성하세요.
        
        JSON 형식으로 출력:
        {
          "mainPrompt": "메인 가로 영상(16:9)을 위한 웅장하고 서사적인 프롬프트",
          "tiktokPrompt": "틱톡 세로 영상(9:16)을 위한 감각적이고 트렌디한 프롬프트",
          "shortsPrompts": ["숏츠 하이라이트를 위한 ${shortsCount}개의 서로 다른 감성적인 프롬프트. 만약 ${shortsCount}가 0이면 빈 배열 []을 반환하세요."]
        }
      `;

      const promptResponse = await ai.models.generateContent({
        model: aiEngine,
        contents: promptGen,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainPrompt: { type: Type.STRING },
              tiktokPrompt: { type: Type.STRING },
              shortsPrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["mainPrompt", "tiktokPrompt", "shortsPrompts"]
          }
        }
      });

      const responseText = promptResponse.text;
      if (!responseText) {
        throw new Error("AI가 유효한 프롬프트를 생성하지 못했습니다.");
      }

      let prompts;
      try {
        const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        prompts = JSON.parse(cleanedText);
      } catch (e) {
        console.error("JSON Parse Error:", responseText);
        throw new Error("AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.");
      }

      if (!prompts.mainPrompt || !prompts.tiktokPrompt) {
        throw new Error("필수 프롬프트가 누락되었습니다.");
      }

      addLog(`✅ 이미지 프롬프트 최적화 완료 (추가 숏츠: ${shortsCount}개)`);
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 30 } }));

      // 2. Generate images (AI Fixed / Optimized Size)
      const generateSingleImage = async (textPrompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9", index: number) => {
        const response = await ai.models.generateContent({
          model: imageEngine,
          contents: { parts: [{ text: textPrompt }] },
          config: {
            imageConfig: {
              aspectRatio
            }
          }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }

        // Check for safety filter
        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error("안전 필터에 의해 이미지 생성이 차단되었습니다. 프롬프트를 수정하거나 다시 시도해주세요.");
        }

        console.error("Image Generation Response:", JSON.stringify(response));
        throw new Error("이미지 데이터 생성 실패");
      };

      addLog("🎨 AI 고효율 이미지 엔진 가동 중 (최적화 모드)...");

      // Don't clear all images if we are just adding/updating
      // But for a full fresh generation, we might want to keep what we have until new ones arrive
      const generatedImages: any[] = [];

      const generateAndSave = async (prompt: string, aspectRatio: "16:9" | "9:16", index: number, label: string, type: 'horizontal' | 'vertical', typeKey: 'main' | 'tiktok' | 'shorts') => {
        try {
          const base64Url = await generateSingleImage(prompt, aspectRatio, index);

          // 1. Update UI immediately with base64 data for instant feedback
          const tempImage = { url: base64Url, type, label, prompt };
          setWorkflow(prev => ({
            ...prev,
            imageSettings: {
              ...prev.imageSettings,
              [typeKey]: prev.imageSettings[typeKey] || createDefaultSettings()
            },
            results: {
              ...prev.results,
              images: [...prev.results.images.filter(img => img.label !== label), tempImage]
            }
          }));

          // 2. Upload to Firebase Storage in the background
          addLog(`📤 [${label}] 이미지를 클라우드 저장소에 업로드 중...`);
          const storageUrl = await uploadImageToStorage(base64Url);
          const finalUrl = storageUrl || base64Url;

          // 3. Update with permanent storage URL
          const newImage = { url: finalUrl, type, label, prompt };
          generatedImages.push(newImage);

          setWorkflow(prev => ({
            ...prev,
            results: {
              ...prev.results,
              images: prev.results.images.map(img => img.label === label ? newImage : img)
            }
          }));
          return true;
        } catch (e) {
          addLog(`❌ [${label}] 이미지 생성 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
          return false;
        }
      };

      // Generate Main Image
      addLog("메인 이미지 생성 중...");
      await generateAndSave(prompts.mainPrompt, "16:9", 0, '메인', 'horizontal', 'main');
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 50 } }));

      // Generate TikTok Image
      addLog("틱톡용 세로 이미지 생성 중...");
      await generateAndSave(prompts.tiktokPrompt, "9:16", 1, '틱톡', 'vertical', 'tiktok');
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 70 } }));

      // Generate Shorts Images (Strictly respect shortsCount)
      if (shortsCount > 0 && prompts.shortsPrompts && Array.isArray(prompts.shortsPrompts)) {
        setIsShortsGenerating(true);
        const actualShortsCount = Math.min(prompts.shortsPrompts.length, shortsCount);
        for (let i = 0; i < actualShortsCount; i++) {
          addLog(`숏츠 하이라이트 ${i + 1} 생성 중...`);
          await generateAndSave(prompts.shortsPrompts[i], "9:16", i + 2, `숏츠 ${i + 1}`, 'vertical', 'shorts');
          const currentProgress = 70 + ((i + 1) / actualShortsCount) * 30;
          setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: Math.min(currentProgress, 100) } }));
        }
        setIsShortsGenerating(false);
      }

      // After all images are generated, save them to the track history in sunoTracks
      if (generatedImages.length > 0 && workflow.params.title) {
        setSunoTracks(prev => prev.map(t => {
          if (t.title === workflow.params.title) {
            return { ...t, generatedImages };
          }
          return t;
        }));
      }

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, image: 100 }
      }));

      addLog("✨ 이미지 생성 프로세스 완료! 곡의 가사와 완벽하게 매칭되는 비주얼이 준비되었습니다.");

    } catch (error: any) {
      console.error("Image Generation Error:", error);

      let errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

      // Handle Quota Exceeded (429)
      const isQuotaError =
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error.status === 'RESOURCE_EXHAUSTED' ||
        (error.error && error.error.status === 'RESOURCE_EXHAUSTED') ||
        (typeof error === 'string' && error.includes('RESOURCE_EXHAUSTED'));

      if (isQuotaError) {
        addLog("❌ 할당량 초과: 무료 API 할당량이 모두 소진되었습니다. 잠시 후 다시 시도해주세요.");
      } else {
        addLog(`❌ 오류: ${errorMessage}`);
      }

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 0 } }));
    }
  };

  const regenerateSpecificImage = async (indexToRegenerate: number, imageType: 'main' | 'tiktok' | 'shorts') => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const targetImage = workflow.results.images[indexToRegenerate];
    if (!targetImage || !targetImage.prompt) {
      addLog("⚠️ 오류: 재생성할 이미지의 프롬프트 정보를 찾을 수 없습니다.");
      return;
    }

    addLog(`[${imageEngine}] ${targetImage.label} 이미지 개별 재생성 중...`);

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const aspectRatio = targetImage.type === 'horizontal' ? "16:9" : "9:16";

      const response = await ai.models.generateContent({
        model: imageEngine,
        contents: { parts: [{ text: targetImage.prompt }] },
        config: {
          imageConfig: {
            aspectRatio
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) {
        const base64Url = `data:image/png;base64,${part.inlineData.data}`;

        // 1. Update UI immediately for instant feedback
        setWorkflow(prev => {
          const newImages = [...prev.results.images];
          newImages[indexToRegenerate] = { ...newImages[indexToRegenerate], url: base64Url };
          return {
            ...prev,
            results: { ...prev.results, images: newImages }
          };
        });

        addLog(`📤 클라우드 저장소에 업로드 중...`);
        const storageUrl = await uploadImageToStorage(base64Url);
        const finalUrl = storageUrl || base64Url;

        // 2. Update with permanent URL
        setWorkflow(prev => {
          const newImages = [...prev.results.images];
          newImages[indexToRegenerate] = { ...newImages[indexToRegenerate], url: finalUrl };
          return {
            ...prev,
            results: { ...prev.results, images: newImages }
          };
        });
        addLog(`✅ ${targetImage.label} 이미지 재생성 및 클라우드 저장 완료`);
      } else {
        throw new Error("이미지 데이터 생성 실패");
      }
    } catch (error: any) {
      console.error("Image Regeneration Error:", error);
      addLog(`❌ 오류: 이미지 재생성 중 문제가 발생했습니다. (${error instanceof Error ? error.message : String(error)})`);
    }
  };

  const regenerateShorts = async () => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    if (shortsCount === 0) {
      addLog("⚠️ 오류: 숏츠 개수가 0개로 설정되어 있습니다.");
      return;
    }

    addLog(`[${imageEngine}] 숏츠 이미지 전체 재생성 중... (설정된 개수: ${shortsCount}개)`);
    setIsShortsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      const promptGen = `
        당신은 전문적인 비주얼 디렉터입니다. 아래의 가사와 곡 정보를 분석하여, 
        곡의 감정과 서사를 가장 잘 표현할 수 있는 이미지 생성 프롬프트를 작성하세요.
        
        [곡 제목]
        ${workflow.results.title || workflow.params.title || "제목 없음"}

        [가사 내용]
        ${workflow.results.lyrics || "가사 없음"}
        ${workflow.results.englishLyrics ? `\n[영어 가사]\n${workflow.results.englishLyrics}` : ''}
        
        ${workflow.params.songInterpretation ? `[사용자 곡 해석 (최우선 반영)]\n${workflow.params.songInterpretation}\n` : ''}

        [음악 데이터]
        BPM: ${workflow.results.audioAnalysis?.bpm || "보통"}
        분위기: ${workflow.results.audioAnalysis?.mood || workflow.params.mood || "감성적인"}
        
        [사용자 선택 이미지 생성 옵션]
        - 화풍 및 장르: ${workflow.imageParams.artStyle}
        - 구도 및 시점: ${workflow.imageParams.cameraView}
        - 시간대: ${workflow.imageParams.timeOfDay}
        - 조명 및 대기: ${workflow.imageParams.lightingAtmosphere}
        - 색감 및 톤: ${workflow.imageParams.colorGrade}
        - 퀄리티 및 엔진: ${workflow.imageParams.qualityEngine}
        
        [지시사항]
        0. **사용자 의도 존중**: ${workflow.params.songInterpretation ? '사용자가 제공한 [사용자 곡 해석]을 최우선으로 반영하여 이미지를 구상하세요.' : '가사와 곡 정보를 바탕으로 이미지를 구상하세요.'}
        1. 가사의 핵심 키워드를 시각적으로 구체화하세요.
        2. 사용자가 선택한 [이미지 생성 옵션]을 프롬프트에 반드시 반영하세요.
        3. 영어로 프롬프트를 작성하세요.
        
        JSON 형식으로 출력:
        {
          "shortsPrompts": ["숏츠 하이라이트를 위한 ${shortsCount}개의 서로 다른 감성적인 프롬프트."]
        }
      `;

      const promptResponse = await ai.models.generateContent({
        model: aiEngine,
        contents: promptGen,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortsPrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["shortsPrompts"]
          }
        }
      });

      const responseText = promptResponse.text;
      if (!responseText) throw new Error("AI가 유효한 프롬프트를 생성하지 못했습니다.");

      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const prompts = JSON.parse(cleanedText);

      if (!prompts.shortsPrompts || !Array.isArray(prompts.shortsPrompts)) {
        throw new Error("숏츠 프롬프트가 누락되었습니다.");
      }

      // Remove existing shorts images
      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          images: prev.results.images.filter(img => !img.label.startsWith('숏츠'))
        }
      }));

      const actualShortsCount = Math.min(prompts.shortsPrompts.length, shortsCount);
      for (let i = 0; i < actualShortsCount; i++) {
        addLog(`새로운 숏츠 하이라이트 ${i + 1} 생성 중...`);
        const response = await ai.models.generateContent({
          model: imageEngine,
          contents: { parts: [{ text: prompts.shortsPrompts[i] }] },
          config: { imageConfig: { aspectRatio: "9:16" } }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          setWorkflow(prev => ({
            ...prev,
            results: {
              ...prev.results,
              images: [...prev.results.images, { url, type: 'vertical', label: `숏츠 ${i + 1}`, prompt: prompts.shortsPrompts[i] }]
            }
          }));
        }
      }

      addLog(`✅ 숏츠 이미지 재생성 완료`);
      setIsShortsGenerating(false);

    } catch (error: any) {
      console.error("Shorts Regeneration Error:", error);
      addLog(`❌ 오류: 숏츠 재생성 중 문제가 발생했습니다. (${error instanceof Error ? error.message : String(error)})`);
      setIsShortsGenerating(false);
    }
  };

  const handleOpenKeySelection = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        addLog("✅ API 키 선택이 완료되었습니다. 다시 시도해주세요.");
      } catch (e) {
        addLog("❌ API 키 선택 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSingleImageUpload = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLog(`[${type}] 이미지 업로드 중: ${file.name}`);

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const label = type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `숏츠 ${type.split('_')[1] || ''}`;
      const imgType = type === 'main' ? 'horizontal' : 'vertical';

      setWorkflow(prev => {
        const existingImages = [...prev.results.images];
        const index = existingImages.findIndex(img => img.label === label);

        const newImg = { url, type: imgType, label, prompt: '사용자 직접 업로드' };

        return {
          ...prev,
          imageSettings: {
            ...prev.imageSettings,
            [type]: prev.imageSettings[type] || createDefaultSettings()
          },
          results: {
            ...prev.results,
            images: index > -1
              ? existingImages.map((img, i) => i === index ? newImg : img)
              : [...existingImages, newImg]
          }
        };
      });
      addLog(`✅ [${label}] 이미지가 성공적으로 업로드되었습니다.`);
    };
    reader.readAsDataURL(file);
  };

  const regenerateImage = async (index: number) => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    const img = workflow.results.images[index];
    if (!img || !img.prompt) return;

    addLog(`[${img.label}] 이미지 개별 재생성 중...`);

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

      const aspectRatio = img.type === 'horizontal' ? "16:9" : "9:16";

      let newUrl = "";
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: img.prompt }] },
        config: {
          imageConfig: {
            aspectRatio
          }
        }
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) {
        newUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else {
        console.error("Regenerate Image Response:", JSON.stringify(response));
        throw new Error("이미지 데이터 생성 실패");
      }

      setWorkflow(prev => {
        const updatedImages = [...prev.results.images];
        updatedImages[index] = { ...updatedImages[index], url: newUrl };
        return {
          ...prev,
          results: { ...prev.results, images: updatedImages }
        };
      });

      addLog(`✅ [${img.label}] 이미지 재생성 완료`);

    } catch (error: any) {
      console.error("Regenerate Error:", error);

      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      const isQuotaError =
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error.status === 'RESOURCE_EXHAUSTED' ||
        (error.error && error.error.status === 'RESOURCE_EXHAUSTED') ||
        (typeof error === 'string' && error.includes('RESOURCE_EXHAUSTED'));

      if (isQuotaError) {
        addLog(`❌ [${img.label}] 할당량 초과: 무료 API 할당량이 소진되었습니다. 잠시 후 다시 시도해주세요.`);
      } else {
        addLog(`❌ [${img.label}] 재생성 실패: ${errorMessage}`);
      }
    }
  };

  const downloadImageWithTitle = async (img: { url: string; type: 'horizontal' | 'vertical'; label: string }) => {
    addLog(`[${img.label}] 타이틀 포함 이미지 다운로드 준비 중...`);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mainImg = new Image();
      mainImg.crossOrigin = "anonymous";
      mainImg.src = img.url;

      await new Promise((resolve, reject) => {
        mainImg.onload = resolve;
        mainImg.onerror = reject;
      });

      canvas.width = mainImg.width;
      canvas.height = mainImg.height;
      ctx.drawImage(mainImg, 0, 0);

      const korTitle = workflow.params.koreanTitle || "제목 없음";
      const engTitle = workflow.params.englishTitle || "";

      const typeKey = img.label.includes('메인') ? 'main' : img.label.includes('틱톡') ? 'tiktok' : 'shorts';
      const settings = workflow.imageSettings[typeKey];
      if (!settings) {
        console.error("Settings not found for type:", typeKey);
        return;
      }

      // Calculate positions
      const xOffset = settings.titleXOffset || 0;
      const yOffset = settings.titleYOffset || 0;
      const spacing = settings.titleSpacing !== undefined ? settings.titleSpacing : 0.8;

      let x = canvas.width / 2 + (xOffset * (canvas.width / 100));
      let y = canvas.height / 2 + (yOffset * (canvas.height / 100));

      if (settings.titlePosition === 'top') y = canvas.height * 0.2 + (yOffset * (canvas.height / 100));
      if (settings.titlePosition === 'bottom') y = canvas.height * 0.8 + (yOffset * (canvas.height / 100));

      // Effects setup
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const applyEffect = (text: string, tx: number, ty: number, size: number, color: string) => {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (settings.titleEffect === 'shadow') {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
        } else if (settings.titleEffect === 'bold_shadow') {
          ctx.shadowColor = 'rgba(0,0,0,1)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 6;
          ctx.shadowOffsetY = 6;
        } else if (settings.titleEffect === 'glow') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 40;
        } else if (settings.titleEffect === 'soft_glow') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
        } else if (settings.titleEffect === 'neon') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 50;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeText(text, tx, ty);
        } else if (settings.titleEffect === 'cyber') {
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 30;
          ctx.fillStyle = '#00ffff';
          ctx.fillText(text, tx - 2, ty - 2);
          ctx.shadowColor = '#00ffff';
          ctx.fillStyle = color;
        } else if (settings.titleEffect === 'glitch') {
          ctx.fillStyle = '#ff0000';
          ctx.fillText(text, tx - 4, ty);
          ctx.fillStyle = '#0000ff';
          ctx.fillText(text, tx + 4, ty);
          ctx.fillStyle = color;
        } else if (settings.titleEffect === 'gradient') {
          const grad = ctx.createLinearGradient(tx - size, ty, tx + size, ty);
          grad.addColorStop(0, color);
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(1, color);
          ctx.fillStyle = grad;
        } else if (settings.titleEffect === 'outline') {
          ctx.strokeStyle = 'black';
          ctx.lineWidth = size * 0.1;
          ctx.strokeText(text, tx, ty);
        }

        ctx.fillStyle = color;
        ctx.fillText(text, tx, ty);
        ctx.restore();
      };

      // Draw Korean Title
      const korSize = (settings.koreanTitleSize / 100) * canvas.width * 0.08;
      ctx.font = `900 ${korSize}px ${settings.koreanFont || 'sans-serif'}`;
      applyEffect(korTitle, x, y, korSize, settings.koreanColor);

      // Draw English Title
      if (engTitle) {
        const engSize = (settings.englishTitleSize / 100) * canvas.width * 0.05;
        ctx.font = `700 ${engSize}px ${settings.englishFont || 'sans-serif'}`;
        // Draw English title below Korean title with consistent spacing
        applyEffect(engTitle, x, y + korSize * spacing, engSize, settings.englishColor);
      }

      const baseName = uploadedAudioName ? uploadedAudioName.replace(/\.[^/.]+$/, "") : (workflow.params.title || "제목 없음");
      const fileName = `${baseName} ${img.label}.png`;
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Mobile fallback: open in new tab if direct click fails or is blocked
        window.open(dataUrl, '_blank');
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      addLog(`✅ [${img.label}] 다운로드 완료`);
    } catch (e) {
      console.error("Download Error:", e);
      addLog(`❌ [${img.label}] 다운로드 중 오류 발생`);
    }
  };
  const generateVideos = () => {
    addLog("Echoes Unto Him 고성능 렌더링 엔진 가동 중...");
    addLog("가사 레이어 합성 및 페이드 애니메이션 최적화 시작...");

    addLog("실제 렌더링 서버 연동 대기중... (TODO: 실제 백엔드 렌더링 파이프라인 호출)");

    // TODO: 실제 서버에 렌더링 작업을 요청하고 결과를 받아와야 합니다.
    // (더미 타이머 및 하드코딩된 결과물 삭제 완료)
  };

  const processImageForBlog = async (imgUrl: string, text: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imgUrl); return; }

      const img = new Image();
      if (!imgUrl.startsWith('data:')) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        const safeText = typeof text === 'string' ? text : String(text || '');
        const lines = safeText.split('\n');
        const lineHeight = 80;
        const startY = (canvas.height / 2) - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
        });
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(imgUrl);
            }
          }, 'image/png');
        } catch (e) {
          console.error("Canvas toBlob failed (likely tainted)", e);
          resolve(imgUrl);
        }
      };
      img.onerror = () => resolve(imgUrl);
      img.src = imgUrl;
    });
  };

  const downloadBlogImage = (imgUrl: string, text: string, label: string = "") => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720; // 16:9
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Draw image with object-fit: cover
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Add dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Handle multiline text
      const lines = text.split('\n');
      const lineHeight = 80;
      const startY = (canvas.height / 2) - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, i) => {
        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(line, canvas.width / 2, startY + (i * lineHeight));
      });

      // Download
      // Rename logic: "블로그 1", "블로그 2" style
      const blogIndex = label.includes('main') ? '1' : label.includes('tiktok') ? '2' : label.split('_')[1] || '3';
      const fileName = `블로그 ${blogIndex}.png`;
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(dataUrl, '_blank');
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      addLog(`블로그용 이미지(${label || '원본'})가 다운로드되었습니다.`);
    };
    img.src = imgUrl;
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => addLog("클립보드에 복사되었습니다."))
      .catch(err => {
        console.error("Clipboard Error:", err);
        addLog("⚠️ 오류: 클립보드 복사에 실패했습니다.");
      });
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        addLog(`👤 로그인 완료: ${currentUser.displayName || currentUser.email}`);
        syncUserProfile(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  const resetApp = () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    localStorage.clear();
    clearAudioFromDB();
    if (apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    }
    window.location.reload();
  };

  const handleTabChange = (tab: Step) => {
    // When moving forward, reset the progress of the previous step as requested
    // "다음단계로 넘어가면 이전단계른 초기화하고"
    if (activeTab !== 'settings' && activeTab !== 'audio-separation' && tab !== 'settings' && tab !== 'audio-separation') {
      const steps: Step[] = ['lyrics', 'image', 'video', 'publish', 'blog'];
      const currentIndex = steps.indexOf(activeTab as Step);
      const nextIndex = steps.indexOf(tab as Step);

      if (nextIndex > currentIndex) {
        setWorkflow(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            [activeTab as string]: 0 // Reset previous step's progress
          }
        }));
      }
    }

    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('app')} />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background z-30">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setView('landing')}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow-primary group-hover:scale-110 transition-transform">
            <Zap className="text-background w-5 h-5" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tighter group-hover:text-primary transition-colors leading-none">Echoes Unto Him</span>
            <span className="text-[8px] text-primary/50 font-bold mt-0.5 tracking-widest uppercase">v1.4.10</span>
          </div>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white/5 rounded-lg">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-20 w-64 border-r border-white/5 p-6 flex flex-col gap-8 bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 top-[73px] h-[calc(100vh-73px)]" : "-translate-x-full h-full"
      )}>
        <div
          className="hidden md:flex items-center gap-2 px-2 cursor-pointer group"
          onClick={() => setView('landing')}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow-primary group-hover:scale-110 transition-transform">
            <Zap className="text-background w-5 h-5" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tighter group-hover:text-primary transition-colors leading-none">Echoes Unto Him</span>
            <span className="text-[10px] text-primary/50 font-bold mt-1 tracking-widest uppercase">v1.4.10</span>
          </div>
        </div>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="mx-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          데이터 전체 초기화
        </button>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem icon={TypeIcon} label="가사 & 프롬프트" active={activeTab === 'lyrics'} onClick={() => handleTabChange('lyrics')} />
          <SidebarItem icon={Music} label="음원 리스트" active={activeTab === 'music'} onClick={() => handleTabChange('music')} />
          <SidebarItem icon={ImageIcon} label="이미지 생성" active={activeTab === 'image'} onClick={() => handleTabChange('image')} />
          <SidebarItem icon={Video} label="영상 렌더링" active={activeTab === 'video'} onClick={() => handleTabChange('video')} />
          <SidebarItem icon={Send} label="영상 업로드" active={activeTab === 'publish'} onClick={() => handleTabChange('publish')} />
          <SidebarItem icon={FileText} label="블로그 생성" active={activeTab === 'blog'} onClick={() => handleTabChange('blog')} />
          {/* 
2487:           <SidebarItem 
2488:             icon={Layers} 
2489:             label="AI 편곡" 
2490:             active={activeTab === 'arrangement'} 
2491:             onClick={() => handleTabChange('arrangement')} 
2492:           />
          */}

          <div className="mt-4 pt-4 border-t border-white/5">
            <SidebarItem icon={Key} label="API 키 설정" active={false} onClick={() => { setIsApiKeyModalOpen(true); setIsMobileMenuOpen(false); }} />
          </div>
        </nav>

        <div className="mt-auto space-y-2">
          {user ? (
            <div className="px-2 py-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 mb-2">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.displayName || '사용자'}</p>
                <button onClick={() => logout()} className="text-[10px] text-gray-400 hover:text-primary transition-colors">로그아웃</button>
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  addLog(`❌ 구글 로그인 실패: ${err.message || 'API 키 혹은 권한 문제'}`);
                  console.error("Firebase Login Error:", err);
                }
              }}
              className="w-full px-4 py-3 bg-primary text-background rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:neon-glow-primary transition-all mb-2"
            >
              <Users className="w-4 h-4" /> 구글 로그인
            </button>
          )}
          <SidebarItem icon={Settings} label="설정" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
        <AnimatePresence mode="wait">
          {activeTab === 'lyrics' && (
            <LyricsTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              generateLyrics={generateLyrics}
              generatePromptOnly={generatePromptOnly}
              copyToClipboard={copyToClipboard}
              handleTabChange={handleTabChange}
              logs={logs}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              musicEngine={musicEngine}
              apiKey={apiKey}
              addLog={addLog}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
            />
          )}

          {activeTab === 'music' && (
            <motion.div
              key="music"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <SunoAudioList
                workflow={workflow}
                setWorkflow={setWorkflow}
                addLog={addLog}
                logs={logs}
                apiKey={apiKey}
                aiEngine={aiEngine}
                analyzeAudioComprehensively={analyzeAudioComprehensively}
                user={user}
                tracks={sunoTracks}
                setTracks={setSunoTracks}
              />
              <div className="flex justify-center mt-8">
                <button onClick={() => handleTabChange('image')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                  다음 단계: 이미지 생성 <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'image' && (
            <ImageTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              shortsCount={shortsCount}
              setShortsCount={setShortsCount}
              handleAudioUpload={handleAudioUpload}
              handleSingleImageUpload={handleSingleImageUpload}
              generateImages={generateImages}
              regenerateShorts={regenerateShorts}
              regenerateSpecificImage={regenerateSpecificImage}
              downloadImageWithTitle={downloadImageWithTitle}
              addLog={addLog}
              handleTabChange={handleTabChange}
              setIsApiKeyModalOpen={setIsApiKeyModalOpen}
              isShortsGenerating={isShortsGenerating}
              createDefaultSettings={createDefaultSettings}
              logs={logs}
              imageEngine={imageEngine}
              setImageEngine={setImageEngine}
              sunoTracks={sunoTracks}
              setSunoTracks={setSunoTracks}
            />
          )}

          {activeTab === 'video' && (
            <VideoTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              shortsCount={shortsCount}
              setShortsCount={setShortsCount}
              uploadedAudio={uploadedAudio}
              uploadedAudioName={uploadedAudioName}
              handleVideoAudioUpload={handleVideoAudioUpload}
              handleSingleImageUpload={handleSingleImageUpload}
              videoLyrics={videoLyrics}
              setVideoLyrics={setVideoLyrics}
              englishVideoLyrics={englishVideoLyrics}
              setEnglishVideoLyrics={setEnglishVideoLyrics}
              timedLyrics={workflow.results.timedLyrics}
              isVideoRendering={isVideoRendering}
              startVideoRender={startVideoRender}
              handleDownloadAll={handleDownloadAll}
              mainVideoRef={mainVideoRef}
              tiktokVideoRef={tiktokVideoRef}
              shortsVideoRefs={shortsVideoRefs}
              shortsHighlights={shortsHighlights}
              handleHighlightChange={handleHighlightChange}
              addLog={addLog}
              handleTabChange={handleTabChange}
              musicEngine={musicEngine}
              videoEngine={videoEngine}
              setVideoEngine={setVideoEngine}
              videoQuality={videoQuality}
              logs={logs}
            />
          )}

          {activeTab === 'publish' && (
            <PublishTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              generateYoutubeMetadata={generateYoutubeMetadata}
              copyToClipboard={copyToClipboard}
              platforms={platforms}
              togglePlatform={togglePlatform}
              setIsResetModalOpen={setIsResetModalOpen}
              handleTabChange={handleTabChange}
              logs={logs}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
              shortsCount={shortsCount}
            />
          )}

          {activeTab === 'blog' && (
            <BlogTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              generateBlogPost={generateBlogPost}
              copyToClipboard={copyToClipboard}
              platforms={platforms}
              togglePlatform={togglePlatform}
              handleAudioUpload={handleAudioUpload}
              handleSingleImageUpload={handleSingleImageUpload}
              downloadBlogImage={downloadBlogImage}
              uploadedAudio={uploadedAudio}
              uploadedAudioName={uploadedAudioName}
              shortsCount={shortsCount}
              logs={logs}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
            />
          )}

          {activeTab === 'arrangement' && (
            <ArrangementWorkspace
              workflow={workflow}
              setWorkflow={setWorkflow}
              addLog={addLog}
              voiceReference={voiceReference}
              setVoiceReference={setVoiceReference}
              voiceRefName={voiceRefName}
              setVoiceRefName={setVoiceRefName}
              apiKey={apiKey}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              musicEngine={musicEngine}
              setMusicEngine={setMusicEngine}
              handleGlobalAudioUpload={handleAudioUpload}
              analyzeAudioComprehensively={analyzeAudioComprehensively}
              logs={logs}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              onOpenKeySelection={handleOpenKeySelection}
              platforms={platforms}
              togglePlatform={togglePlatform}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              apiKey={apiKey}
              setApiKey={setApiKey}
              musicEngine={musicEngine}
              setMusicEngine={setMusicEngine}
              imageEngine={imageEngine}
              setImageEngine={setImageEngine}
              videoEngine={videoEngine}
              setVideoEngine={setVideoEngine}
              videoQuality={videoQuality}
              setVideoQuality={setVideoQuality}
              audioFadeIn={audioFadeIn}
              setAudioFadeIn={setAudioFadeIn}
              audioFadeOut={audioFadeOut}
              setAudioFadeOut={setAudioFadeOut}
              onReset={resetApp}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
              copyToClipboard={copyToClipboard}
              logs={logs}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <motion.div
            key="reset-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1F26] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">데이터 전체 초기화</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    모든 작업 내용과 설정이 초기화됩니다.<br />
                    (API 키는 안전하게 유지됩니다.)<br />
                    정말로 계속하시겠습니까?
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                >
                  취소
                </button>
                <button
                  onClick={resetApp}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  초기화 실행
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Key Modal */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <motion.div
            key="api-key-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0F16] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">API 키 설정</h2>
                  <p className="text-sm text-gray-400">Gemini API 키를 입력해주세요.</p>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                />
                <p className="text-[10px] text-gray-500 leading-relaxed px-1">
                  설정에서 사용할 키를 변경할 수 있으며, 할당량이 재설정되면 무료 생성으로 자동 전환됩니다.
                </p>
                <button
                  onClick={() => {
                    localStorage.setItem('gemini_api_key', apiKey);
                    setIsApiKeyModalOpen(false);
                    addLog("✅ API 키가 저장되었습니다.");
                  }}
                  className="w-full bg-primary text-background py-3 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  저장 및 계속하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Login Modal */}
      <AnimatePresence>
        {isPlatformLoginModalOpen && pendingPlatform && (
          <motion.div
            key="platform-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#1A1F26] border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {platforms[pendingPlatform] === 'connected' ? '연동 해제' : '플랫폼 연동'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {pendingPlatform === 'youtube' ? 'YouTube Data API v3' : pendingPlatform === 'tiktok' ? 'TikTok Content Posting API' : 'Instagram Graph API'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-gray-300 leading-relaxed">
                  {platforms[pendingPlatform] === 'connected'
                    ? `${pendingPlatform === 'youtube' ? '유튜브' : pendingPlatform === 'tiktok' ? '틱톡' : '인스타그램'} 계정 연동을 해제하시겠습니까?`
                    : `${pendingPlatform === 'youtube' ? '유튜브' : pendingPlatform === 'tiktok' ? '틱톡' : '인스타그램'} 계정으로 로그인하여 EchoesUntoHim에 영상 업로드 및 게시 권한을 허용하시겠습니까?`}
                </p>
                {platforms[pendingPlatform] === 'disconnected' && (
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-gray-400">
                    * 연동 시 EchoesUntoHim에서 제작한 영상을 해당 플랫폼에 직접 업로드할 수 있는 권한을 요청합니다.                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setIsPlatformLoginModalOpen(false); setPendingPlatform(null); }}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handlePlatformLoginConfirm}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-primary text-background hover:neon-glow-primary transition-all"
                >
                  {platforms[pendingPlatform] === 'connected' ? '연동 해제' : '로그인 및 허용'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---


