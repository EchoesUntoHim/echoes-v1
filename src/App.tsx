import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  RefreshCw,
  Sparkles
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

import { VideoSettingsPanel } from './components/VideoSettingsPanel';
import { VideoPreviewCard } from './components/VideoPreviewCard';
import { MetadataCard } from './components/MetadataCard';
import { StepCard } from './components/StepCard';
import { MeditationTab } from './components/MeditationTab';

import { TimeInput, formatTime, parseTime } from './components/TimeInput';
import {
  DEFAULT_AI_ENGINE,
  DEFAULT_IMAGE_ENGINE,
  RENDER_API_URL,
  AI_ENGINES,
  IMAGE_ENGINES,
  VIDEO_ENGINES,
  TARGETS,
  POP_SUB_GENRES,
  CCM_SUB_GENRES,
  TEMPOS,
  POP_MOODS,
  CCM_MOODS,
  LYRICS_STYLES,
  ART_STYLES,
  CAMERA_VIEWS,
  CAMERA_ANGLE_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  LIGHTING_ATMOSPHERES,
  WEATHERS,
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
import { auth, signInWithGoogle, signInForYouTube, logout, db, handleFirestoreError, OperationType, syncUserProfile } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImageToStorage } from './firebase';
import { uploadToYouTube, uploadToTikTok } from './services/uploadService';

// --- Hooks ---
import { useAuthLogic } from './hooks/useAuthLogic';
import { useHistoryLogic } from './hooks/useHistoryLogic';
import { usePlatformLogic } from './hooks/usePlatformLogic';
import { useLyricsLogic } from './hooks/useLyricsLogic';
import { useContentLogic } from './hooks/useContentLogic';
import { useMediaLogic } from './hooks/useMediaLogic';

// --- Prompt Externalization ---
import lyricsPrompts from './prompts/Lyrics.txt?raw';
import platformPrompts from './prompts/Platform.txt?raw';
import blogPrompts from './prompts/Blog.txt?raw';
import imagePrompts from './prompts/Image.txt?raw';

/**
 * Parses a raw prompt text file, removing comments (#) and extracting a specific section by [SECTION_NAME].
 */
const parsePromptSection = (content: string, sectionName: string): string => {
  const lines = content.split('\n');
  let inSection = false;
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === `[${sectionName}]`) {
      inSection = true;
      continue;
    }
    if (inSection && trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      break;
    }
    if (inSection && !trimmedLine.startsWith('#')) {
      resultLines.push(line);
    }
  }
  return resultLines.join('\n').trim();
};

// --- Components ---

// --- Constants & Data ---
// --- Constants & Data ---
// --- Constants & Data ---
// --- Main App ---

export default function App() {
  // --- 1. Basic State & Refs ---
  const [view, setView] = useState<'landing' | 'app'>(() => (localStorage.getItem('echoesuntohim_view') as any) || 'landing');
  const [activeTab, setActiveTab] = useState<Step>(() => (localStorage.getItem('echoesuntohim_activeTab') as any) || 'lyrics');
  const [logs, setLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_logs');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });
  const [shortsCount, setShortsCount] = useState(() => parseInt(localStorage.getItem('echoesuntohim_shortsCount') || '3'));
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [renderQueue, setRenderQueue] = useState<any[]>([]);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiEngine, setAiEngine] = useState(() => {
    const saved = localStorage.getItem('ai_engine');
    if (saved === 'gemini-1.5-flash' || saved === 'gemini-1.5-pro' || !saved) return DEFAULT_AI_ENGINE;
    return AI_ENGINES.some(eng => eng.value === saved) ? saved! : DEFAULT_AI_ENGINE;
  });
  const [imageEngine, setImageEngine] = useState(() => {
    const saved = localStorage.getItem('image_engine');
    return IMAGE_ENGINES.some(eng => eng.value === saved) ? saved! : DEFAULT_IMAGE_ENGINE;
  });
  const [videoEngine, setVideoEngine] = useState(() => {
    const saved = localStorage.getItem('video_engine');
    return VIDEO_ENGINES.some(eng => eng.value === saved) ? saved! : 'echoesuntohim-v2.1-free';
  });
  const [videoQuality, setVideoQuality] = useState(() => localStorage.getItem('video_quality') || '1080p');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [audioFadeIn, setAudioFadeIn] = useState(() => Number(localStorage.getItem('echoesuntohim_audioFadeIn')) || 0);
  const [audioFadeOut, setAudioFadeOut] = useState(() => Number(localStorage.getItem('echoesuntohim_audioFadeOut')) || 3);
  const [videoLyrics, setVideoLyrics] = useState<string>(() => localStorage.getItem('echoesuntohim_videoLyrics') || "");
  const [englishVideoLyrics, setEnglishVideoLyrics] = useState<string>(() => localStorage.getItem('echoesuntohim_englishVideoLyrics') || "");
  const [isRestoring, setIsRestoring] = useState(true);

  // --- 2. Workflow State ---
  const [workflow, setWorkflow] = useState<WorkflowState>(() => {
    const saved = localStorage.getItem('echoesuntohim_workflow');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.imageSettings) parsed.imageSettings = { style: 'Cinematic', main: createDefaultSettings(), tiktok: createDefaultSettings(), shorts: createDefaultSettings() };
          if (!parsed.imageParams) parsed.imageParams = { artStyle: '실사 사진 (Photorealistic)', cameraView: '정면 (Front View)', timeOfDay: '아침 (Morning)', lightingAtmosphere: '시네마틱 라이팅 (Cinematic Lighting)', weather: '맑음 (Clear Sky)', backgroundType: '자연 숲 (Natural Forest)' };
          if (!parsed.progress) parsed.progress = { lyrics: 0, music: 0, image: 0, video: 0, youtube: 0, blog: 0, prompts: 0, 'audio-separation': 0 };
          return parsed;
        }
      } catch (e) { console.error("Workflow migration error:", e); }
    }
    return {
      params: { title: '', koreanTitle: '', englishTitle: '', topic: '', target: '대중음악', subGenre: '인디팝', mood: '감성적인', tempo: '보통', instrument: '피아노', vocal: VOCAL_OPTIONS.Male[0], lyricsStyle: '시적인', originalLyrics: '', isEnglishSong: false, referenceLink: '' },
      imageParams: { artStyle: '실사 사진 (Photorealistic)', cameraView: '정면 (Front View)', timeOfDay: '아침 (Morning)', lightingAtmosphere: '시네마틱 라이팅 (Cinematic Lighting)', weather: '맑음 (Clear Sky)', backgroundType: '자연 숲 (Natural Forest)' },
      currentStep: 'lyrics',
      imageSettings: { style: 'Cinematic', main: createDefaultSettings(), tiktok: createDefaultSettings(), shorts: createDefaultSettings() },
      blogSettings: { style: '감성 에세이형 (서정적, 감각적, 여운)', youtubeLink: '' },
      progress: { lyrics: 0, music: 0, image: 0, video: 0, youtube: 0, blog: 0, prompts: 0, 'audio-separation': 0 },
      results: { images: [], videos: [] }
    };
  });

  // --- 3. Helper Functions ---
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-499), logEntry]); // 최신 500개 로그만 유지하여 메모리 부하 방지
  }, []);

  const resetSubsequentSteps = (fromStep: Step | string) => {
    addLog(`🔄 [${fromStep}] 단계 이후의 데이터를 초기화합니다...`);
    setWorkflow(prev => {
      const newProgress = { ...prev.progress };
      const newResults = { ...prev.results };
      const steps: Step[] = ['lyrics', 'music', 'image', 'video', 'publish', 'blog'];
      const fromIndex = steps.indexOf(fromStep as Step);
      for (let i = fromIndex + 1; i < steps.length; i++) {
        const step = steps[i];
        newProgress[step as keyof typeof newProgress] = 0;
        if (step === 'music') { newResults.audioFile = undefined; newResults.sunoPrompt = ''; }
        if (step === 'image') { newResults.images = []; clearMediaFromDB('workflow_images'); }
        if (step === 'video') { newResults.videos = []; clearMediaFromDB('workflow_videos'); }
        if (step === 'blog') { newResults.blogPost = undefined; newResults.naverBlogPost = undefined; newResults.googleBlogPost = undefined; newResults.youtubeMetadata = undefined; }
      }
      return { ...prev, progress: newProgress, results: newResults };
    });
  };

  // --- 4. Hooks Integration ---
  const { user, setUser, isAuthLoading } = useAuthLogic(addLog);
  const { sunoTracks, setSunoTracks, isTracksLoaded, deleteTrack } = useHistoryLogic({ user, addLog });
  const {
    platforms, togglePlatform, handlePlatformLoginConfirm, isPlatformLoginModalOpen, setIsPlatformLoginModalOpen,
    pendingPlatform, setPendingPlatform, youtubeAccessToken, setYoutubeAccessToken, bloggerAccessToken,
    setBloggerAccessToken, tiktokAccessToken, setTiktokAccessToken
  } = usePlatformLogic(user, addLog);

  const {
    generateLyrics, translateLyrics, analyzeAudioComprehensively, generatePromptOnly, regenerateTitles,
    fetchAvailableModels, availableModels, isGenerating, isTranslating, instrumentDescription
  } = useLyricsLogic({
    apiKey, aiEngine, setAiEngine, workflow, setWorkflow, addLog, setSunoTracks, setVideoLyrics, setEnglishVideoLyrics, shortsCount, lyricsPrompts, user
  });

  const {
    audioBuffer, setAudioBuffer, uploadedAudio, setUploadedAudio, uploadedAudioName, setUploadedAudioName,
    isVideoRendering, isShortsGenerating, shortsHighlights, setShortsHighlights,
    mainVideoRef, tiktokVideoRef, shortsVideoRefs, handleAudioUpload, handleSingleImageUpload,
    generateImages, regenerateSpecificImage, regenerateShorts, startVideoRender,
    handleDownloadAll, downloadImageWithTitle, downloadBlogImage, renderedVideos, onRenderComplete,
    saveCurrentImagesToCloud, addToRenderQueue
  } = useMediaLogic(
    workflow, setWorkflow, addLog, apiKey, aiEngine, imageEngine, shortsCount, setShortsCount, setSunoTracks, sunoTracks,
    analyzeAudioComprehensively, resetSubsequentSteps, parsePromptSection, imagePrompts, user
  );

  const {
    generatePlatformMetadata, generateBlogPost, handleUploadToPlatform
  } = useContentLogic(workflow, setWorkflow, addLog, apiKey, aiEngine);

  // --- 5. Persistence & Sync ---
  useEffect(() => {
    if (isRestoring) return; // [v1.15.28] 복구 중에는 저장 금지

    const timeoutId = setTimeout(() => {
      const { results, ...rest } = workflow;
      const filteredResults = {
        ...results,
        images: [],
        videos: [],
        audioFile: undefined,
        audioBuffer: undefined
      };
      localStorage.setItem('echoesuntohim_workflow', JSON.stringify({ ...rest, results: filteredResults }));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [workflow, isRestoring]);
  // v1.15.12: 로그 동기화에도 1000ms 디바운싱을 적용하여 대량 로그 발생 시 프리징 방지
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('echoesuntohim_logs', JSON.stringify(logs.slice(-500))); // 최신 500개만 저장하여 성능 유지
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [logs]);
  useEffect(() => { localStorage.setItem('ai_engine', aiEngine); }, [aiEngine]);
  useEffect(() => { localStorage.setItem('image_engine', imageEngine); }, [imageEngine]);
  useEffect(() => { localStorage.setItem('video_engine', videoEngine); }, [videoEngine]);
  useEffect(() => { localStorage.setItem('echoesuntohim_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('echoesuntohim_activeTab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('echoesuntohim_shortsCount', shortsCount.toString()); }, [shortsCount]);

  // v1.11.2: Shorts count sync
  useEffect(() => {
    setShortsHighlights(prev => {
      if (prev.length === shortsCount) return prev;
      if (prev.length < shortsCount) {
        const extra = Array.from({ length: shortsCount - prev.length }).map((_, i) => ({
          start: (prev.length + i) * 30,
          duration: 30
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, shortsCount);
    });
    localStorage.setItem('echoesuntohim_shortsCount', shortsCount.toString());
  }, [shortsCount]);

  // Persistence Effects (DB Restore)
  useEffect(() => {
    const restoreData = async () => {
      setIsRestoring(true);
      addLog("📂 로컬 데이터를 복구하는 중...");

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
        } catch (err) { console.error("Failed to decode saved audio on load", err); }
      }

      // Restore Images & Videos
      const savedImages = await loadMediaFromDB('workflow_images');
      const savedVideos = await loadMediaFromDB('workflow_videos');

      // Restore Workflow (Lyrics, etc)
      const savedWorkflow = localStorage.getItem('echoesuntohim_workflow');
      let restoredWorkflow = null;
      if (savedWorkflow) {
        try {
          restoredWorkflow = JSON.parse(savedWorkflow);
        } catch (e) { console.error("Workflow parse failed", e); }
      }

      setWorkflow(prev => {
        const base = restoredWorkflow || prev;
        return {
          ...base,
          results: {
            ...base.results,
            images: savedImages || base.results.images || [],
            videos: savedVideos || base.results.videos || []
          }
        };
      });

      if (restoredWorkflow?.results?.lyrics) setVideoLyrics(restoredWorkflow.results.lyrics);
      if (restoredWorkflow?.results?.englishLyrics) setEnglishVideoLyrics(restoredWorkflow.results.englishLyrics);

      setIsRestoring(false);
      addLog("✅ 데이터 복구가 완료되었습니다.");
    };
    restoreData();
  }, []);

  // [v1.15.30] Sync analysis results to UI state (Bidirectional)
  useEffect(() => {
    if (workflow.results.lyrics && workflow.results.lyrics !== videoLyrics) {
      setVideoLyrics(workflow.results.lyrics);
      // [v1.15.30] 음원 분석 등으로 양국 가사가 모두 존재하면 자동 번역 스킵
      if (workflow.results.englishLyrics) {
        lastTranslatedLyricsRef.current = workflow.results.lyrics;
      }
    }
    if (workflow.results.englishLyrics && workflow.results.englishLyrics !== englishVideoLyrics) {
      setEnglishVideoLyrics(workflow.results.englishLyrics);
    }
  }, [workflow.results.lyrics, workflow.results.englishLyrics]);

  useEffect(() => {
    if (isRestoring) return; // [v1.15.28]
    if (videoLyrics && videoLyrics !== workflow.results.lyrics) {
      const timeoutId = setTimeout(() => {
        setWorkflow(prev => ({
          ...prev,
          results: { ...prev.results, lyrics: videoLyrics }
        }));
      }, 500); // 0.5초 지연 업데이트
      return () => clearTimeout(timeoutId);
    }
  }, [videoLyrics, isRestoring]);

  useEffect(() => {
    if (isRestoring) return; // [v1.15.28]
    if (englishVideoLyrics && englishVideoLyrics !== workflow.results.englishLyrics) {
      const timeoutId = setTimeout(() => {
        setWorkflow(prev => ({
          ...prev,
          results: { ...prev.results, englishLyrics: englishVideoLyrics }
        }));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [englishVideoLyrics, isRestoring]);

  // [v1.15.29] Persistent Session Cache for Workflow & Media (Optimized for Quota)
  useEffect(() => {
    if (isRestoring) return;

    // 1. Save main workflow state to localStorage (Strip large Base64 media)
    const workflowToCache = {
      ...workflow,
      results: {
        ...workflow.results,
        images: [], // Strip Base64 images (Saved in IndexedDB instead)
        videos: []  // Strip Base64 videos (Saved in IndexedDB instead)
      }
    };

    try {
      localStorage.setItem('echoesuntohim_workflow', JSON.stringify(workflowToCache));
    } catch (e) {
      console.warn("LocalStorage quota exceeded. Purging large cache to recover...");
      localStorage.removeItem('echoesuntohim_workflow');
    }
  }, [workflow, isRestoring]);

  useEffect(() => {
    if (isRestoring) return;
    // 2. Save large media arrays to IndexedDB
    if (workflow.results.images && workflow.results.images.length > 0) {
      saveMediaToDB('workflow_images', workflow.results.images);
    }
  }, [workflow.results.images, isRestoring]);

  useEffect(() => {
    if (isRestoring) return;
    if (workflow.results.videos && workflow.results.videos.length > 0) {
      saveMediaToDB('workflow_videos', workflow.results.videos);
    }
  }, [workflow.results.videos, isRestoring]);

  // [v1.15.29] Render Queue Processor
  useEffect(() => {
    const processQueue = async () => {
      if (isQueueProcessing || renderQueue.length === 0) return;

      setIsQueueProcessing(true);
      const task = renderQueue[0];
      addLog(`🎬 [큐 처리] '${task.label}' 렌더링 시작...`);

      try {
        const response = await fetch(RENDER_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        addLog(`✅ [큐 완료] '${task.label}' 렌더링 요청 성공!`);
        if (task.onComplete) task.onComplete(result);
      } catch (err: any) {
        addLog(`❌ [큐 오류] '${task.label}': ${err.message}`);
      } finally {
        setRenderQueue(prev => prev.slice(1));
        setIsQueueProcessing(false);
      }
    };

    processQueue();
  }, [renderQueue, isQueueProcessing, addLog]);
  // Targets: LyricsTab and VideoTab
  const lastTranslatedLyricsRef = useRef<string | null>(localStorage.getItem('echoesuntohim_lastTranslated'));

  useEffect(() => {
    // 1. 복구 중이거나, 가사 내용이 없거나, API 키가 없거나, 이미 번역 중이면 중단
    if (isRestoring || !videoLyrics || videoLyrics.trim().length < 5 || !apiKey || isTranslating) return;

    // 2. 새로고침 시 이전에 번역했던 내용과 동일하면 중단 (Redundancy Check)
    if (videoLyrics === lastTranslatedLyricsRef.current) return;

    // 3. 10초 디바운싱 로직 (키보드 입력이 멈춘 후 10초 뒤 실행)
    const timeoutId = setTimeout(async () => {
      addLog("⏳ 가사 수정 감지: 10초간 입력이 없어 자동 번역을 시작합니다...");

      try {
        await translateLyrics(videoLyrics);
        lastTranslatedLyricsRef.current = videoLyrics;
        localStorage.setItem('echoesuntohim_lastTranslated', videoLyrics);
      } catch (err) {
        console.error("Auto-translation failed:", err);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [videoLyrics, apiKey, isTranslating]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => addLog("클립보드에 복사되었습니다."))
      .catch(err => addLog("⚠️ 오류: 클립보드 복사에 실패했습니다."));
  };

  const resetApp = async () => {
    const key = localStorage.getItem('gemini_api_key');
    try { await logout(); } catch (e) { }
    localStorage.clear();
    clearAudioFromDB();
    if (key) localStorage.setItem('gemini_api_key', key);
    window.location.reload();
  };

  const handleTabChange = (tab: Step) => {
    if (activeTab !== 'settings' && tab !== 'settings' && tab !== activeTab) {
      const steps: Step[] = ['lyrics', 'music', 'image', 'video', 'publish', 'blog'];
      const currentIndex = steps.indexOf(activeTab as Step);
      const nextIndex = steps.indexOf(tab as Step);
      if (nextIndex > currentIndex) {
        setWorkflow(prev => ({
          ...prev,
          progress: { ...prev.progress, [activeTab as string]: 0 }
        }));
      }
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleOpenKeySelection = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        addLog("✅ API 키 선택 완료");
      } catch (e) { addLog("❌ API 키 선택 오류"); }
    }
  };

  const handleSunoAudioReady = async (dataUrl: string, name: string) => {
    setUploadedAudio(dataUrl);
    setUploadedAudioName(name);
    await saveAudioToDB(dataUrl);
    await saveVoiceToDB('workspace_audio', dataUrl, name);
    addLog(`✨ Suno 음원이 작업 공간에 로드되었습니다: ${name}`);
  };

  const handleHighlightChange = (idx: number, field: 'start' | 'end', newVal: number) => {
    setShortsHighlights(prev => {
      const newHighlights = [...prev];
      const current = newHighlights[idx] || { start: 0, duration: 30 };
      if (field === 'start') {
        const currentEnd = current.start + current.duration;
        newHighlights[idx] = { ...current, start: newVal, duration: Math.max(0, currentEnd - newVal) };
      } else {
        newHighlights[idx] = { ...current, duration: Math.max(0, newVal - current.start) };
      }
      return newHighlights;
    });
  };

  if (view === 'landing') return <LandingPage onStart={() => setView('app')} />;

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
            <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Echoes Unto Him</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[7px] font-black text-primary tracking-[0.2em] uppercase opacity-80">AI Vision</span>
              <div className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-0.5 shadow-[0_0_10px_rgba(0,255,163,0.1)]">
                <div className="w-0.5 h-0.5 bg-primary rounded-full animate-pulse" />
                <span className="text-[7px] font-black text-primary uppercase">v1.15.28 PREMIUM</span>
              </div>
            </div>
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
        "fixed md:static inset-y-0 left-0 z-20 w-60 border-r border-white/5 p-4 flex flex-col gap-4 bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
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
            <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 whitespace-nowrap">
              Echoes Unto Him
            </span>
            <span className="text-[10px] font-bold text-primary/60 mt-1">{`v1.15.28 PREMIUM`}</span>
          </div>
        </div>

        <button
          onClick={() => setIsResetModalOpen(true)}
          className="mx-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          데이터 전체 초기화
        </button>

        <nav className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
          <SidebarItem small={true} icon={TypeIcon} label="가사 생성" active={activeTab === 'lyrics'} onClick={() => handleTabChange('lyrics')} />

          <SidebarItem small={true} icon={ImageIcon} label="이미지 생성" active={activeTab === 'image'} onClick={() => handleTabChange('image')} />
          <SidebarItem small={true} icon={Video} label="영상 렌더링" active={activeTab === 'video'} onClick={() => handleTabChange('video')} />
          <SidebarItem small={true} icon={Send} label="영상 업로드" active={activeTab === 'publish'} onClick={() => handleTabChange('publish')} />
          <SidebarItem small={true} icon={FileText} label="블로그 생성" active={activeTab === 'blog'} onClick={() => handleTabChange('blog')} />
          <SidebarItem small={true} icon={Sparkles} label="1분 묵상(Factory)" active={activeTab === 'meditation'} onClick={() => handleTabChange('meditation')} />


          <div className="mt-2 pt-2 border-t border-white/5">
            <SidebarItem small={true} icon={Key} label="API 키 설정" active={false} onClick={() => { setIsApiKeyModalOpen(true); setIsMobileMenuOpen(false); }} />
          </div>
        </nav>

        <div className="mt-auto space-y-2">
          {user ? (
            <div className="px-2 py-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-2 mb-2">
              <div className="flex items-center gap-3">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName || '사용자'}</p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-lg text-[10px] font-bold border border-white/5"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  const result = await signInWithGoogle();
                  if (result.user) setUser(result.user);
                } catch (err: any) {
                  if (err.code === 'auth/popup-closed-by-user') {
                    addLog(`❌ 로그인 팝업이 강제 종료되었습니다. (저장공간 부족일 수 있습니다. 설정에서 캐시를 비워보세요)`);
                  } else {
                    addLog(`❌ 구글 로그인 실패: ${err.message || 'API 키 혹은 권한 문제'}`);
                  }
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
              regenerateTitles={regenerateTitles}
              copyToClipboard={copyToClipboard}
              handleTabChange={handleTabChange}
              logs={logs}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              apiKey={apiKey}
              addLog={addLog}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
              isTranslating={isTranslating}
              sunoTracks={sunoTracks}
              setSunoTracks={setSunoTracks}
              instrumentDescription={instrumentDescription}
            />
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
              saveCurrentImagesToCloud={saveCurrentImagesToCloud}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
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
              handleVideoAudioUpload={handleAudioUpload}
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
              videoEngine={videoEngine}
              setVideoEngine={setVideoEngine}
              videoQuality={videoQuality}

              logs={logs}
              apiKey={apiKey}
              aiEngine={aiEngine}
              isTranslating={isTranslating}
            />
          )}

          {activeTab === 'publish' && (
            <PublishTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              aiEngine={aiEngine}
              setAiEngine={setAiEngine}
              generatePlatformMetadata={generatePlatformMetadata}
              copyToClipboard={copyToClipboard}
              platforms={platforms}
              togglePlatform={togglePlatform}
              handleUploadToPlatform={async (platform, type, index) => {
                const token = platform === 'youtube' ? youtubeAccessToken : platform === 'tiktok' ? tiktokAccessToken : '';
                const metadata = platform === 'youtube' ? workflow.results.youtubeMetadata : workflow.results.tiktokMetadata;
                const videoKey = type === 'shorts' ? `shorts_${index}` : type;
                const blob = renderedVideos[videoKey];

                if (!blob) {
                  addLog(`⚠️ 오류: 업로드할 영상 파일([${videoKey}])을 찾을 수 없습니다. 먼저 렌더링을 완료해주세요.`);
                  return;
                }
                if (!token) {
                  addLog(`⚠️ 오류: ${platform} 인증 토큰이 없습니다. 설정에서 로그인을 확인해주세요.`);
                  return;
                }

                const file = new File([blob], `${workflow.params.title || 'video'}.mp4`, { type: 'video/mp4' });
                await handleUploadToPlatform(platform, file, metadata, token);
              }}
              setIsResetModalOpen={setIsResetModalOpen}
              onReset={resetApp}
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
              accessToken={bloggerAccessToken}
              onNewWork={() => handleTabChange('lyrics')}
            />
          )}

          {activeTab === 'meditation' && (
            <MeditationTab
              workflow={workflow}
              setWorkflow={setWorkflow}
              addLog={addLog}
              handleTabChange={handleTabChange}
              apiKey={apiKey}
              aiEngine={aiEngine}
              logs={logs}
              sunoTracks={sunoTracks}
              setSunoTracks={setSunoTracks}
              addToRenderQueue={addToRenderQueue}
              isRendering={isVideoRendering}
              user={user}
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
              onReset={() => setIsResetModalOpen(true)}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
              copyToClipboard={copyToClipboard}
              logs={logs}
              tiktokAccessToken={tiktokAccessToken}
              setTiktokAccessToken={setTiktokAccessToken}
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

