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
import { auth, signInWithGoogle, logout, db, handleFirestoreError, OperationType, syncUserProfile } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { uploadImageToStorage } from './firebase';
import { uploadToYouTube, uploadToTikTok } from './services/uploadService';

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
  const [isTranslating, setIsTranslating] = useState(false);
  const [renderedVideos, setRenderedVideos] = useState<Record<string, Blob>>({});
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(null);
  const [bloggerAccessToken, setBloggerAccessToken] = useState<string | null>(null);
  const [tiktokAccessToken, setTiktokAccessToken] = useState<string | null>(() => localStorage.getItem('tiktok_access_token'));
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

  // 플랫폼 키 및 토큰 동기화 로직
  useEffect(() => {
    if (!user) return;
    const syncPlatformData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid, 'settings', 'platforms');
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.tokens) {
            if (data.tokens.youtube) setYoutubeAccessToken(data.tokens.youtube);
            if (data.tokens.tiktok) {
              setTiktokAccessToken(data.tokens.tiktok);
              localStorage.setItem('tiktok_access_token', data.tokens.tiktok);
            }
          }
        }
      } catch (err) {
        console.error("Platform data sync error:", err);
      }
    };
    syncPlatformData();
  }, [user]);

  // 토큰 변경 시 클라우드 저장
  useEffect(() => {
    if (!user || (!youtubeAccessToken && !tiktokAccessToken)) return;
    const saveTokens = async () => {
      const userRef = doc(db, 'users', user.uid, 'settings', 'platforms');
      await setDoc(userRef, {
        tokens: {
          youtube: youtubeAccessToken,
          tiktok: tiktokAccessToken
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
    };
    const timer = setTimeout(saveTokens, 2000);
    return () => clearTimeout(timer);
  }, [youtubeAccessToken, tiktokAccessToken, user]);

  useEffect(() => {
    setPlatforms(prev => ({
      ...prev,
      youtube: youtubeAccessToken ? 'connected' : 'disconnected',
      google: bloggerAccessToken ? 'connected' : 'disconnected',
      tiktok: tiktokAccessToken ? 'connected' : 'disconnected'
    }));
  }, [youtubeAccessToken, bloggerAccessToken, tiktokAccessToken]);

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



  // v1.11.2: 쇼츠 개수 변경 시 하이라이트 데이터 배열 크기 동기화 (NaN 오류 방지)
  useEffect(() => {
    setShortsHighlights(prev => {
      if (prev.length === shortsCount) return prev;
      if (prev.length < shortsCount) {
        const extra = Array.from({ length: shortsCount - prev.length }).map((_, i) => ({
          start: (prev.length + i) * 30, // 30초 간격으로 자동 배정
          duration: 30
        }));
        return [...prev, ...extra];
      }
      return prev.slice(0, shortsCount);
    });
    localStorage.setItem('echoesuntohim_shortsCount', shortsCount.toString());
  }, [shortsCount]);



  const togglePlatform = (key: keyof typeof platforms) => {
    if (platforms[key] === 'connected') {
      setPendingPlatform(key);
      setIsPlatformLoginModalOpen(true);
      return;
    }

    setPendingPlatform(key);
    setIsPlatformLoginModalOpen(true);
  };

  const handlePlatformLoginConfirm = async () => {
    if (!pendingPlatform) return;

    const key = pendingPlatform;
    if (platforms[key as keyof typeof platforms] === 'connected') {
      // 연동 해제
      if (key === 'youtube') {
        setYoutubeAccessToken(null);
      } else if (key === 'google') {
        setBloggerAccessToken(null);
      } else if (key === 'tiktok') {
        setTiktokAccessToken(null);
        localStorage.removeItem('tiktok_access_token');
      }
      setPlatforms(prev => ({ ...prev, [key]: 'disconnected' }));
      addLog(`🔌 [${String(key)}] 연동이 해제되었습니다.`);
    } else {
      // 실제 연동 프로세스 시작
      try {
        if (key === 'youtube' || key === 'google') {
          addLog("🔑 유튜브 연동을 위해 구글 로그인을 시작합니다...");
          const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
          const keys = savedKeys ? JSON.parse(savedKeys) : null;
          const targetKeys = key === 'youtube' ? keys?.youtube : keys?.google;

          if (targetKeys && targetKeys.clientId) {
            addLog("🔑 사용자 정의 ID로 연동을 시작합니다.");
            const redirectUri = window.location.origin;
            const scope = encodeURIComponent('openid https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${targetKeys.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account&access_type=offline`;

            const authWindow = window.open(authUrl, 'google-auth', 'width=500,height=600');

            const checkToken = setInterval(async () => {
              try {
                // 팝업창의 현재 주소 확인 (CORS 에러 방지를 위해 try-catch 내부에서 실행)
                const popupLocation = authWindow?.location;
                if (!popupLocation) return;

                const searchParams = new URLSearchParams(popupLocation.search);
                const hashParams = new URLSearchParams(popupLocation.hash.substring(1));
                const code = searchParams.get('code') || hashParams.get('code');

                if (code) {
                  clearInterval(checkToken);
                  addLog("🔑 인증 코드를 획득했습니다. 토큰으로 교환합니다...");

                  const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      code,
                      client_id: targetKeys.clientId,
                      client_secret: targetKeys.clientSecret,
                      redirect_uri: redirectUri,
                      grant_type: 'authorization_code',
                    }),
                  });

                  const data = await response.json();
                  if (data.access_token) {
                    if (key === 'youtube') setYoutubeAccessToken(data.access_token);
                    else setBloggerAccessToken(data.access_token);
                    addLog(`✅ [${key === 'youtube' ? '유튜브' : '블로그'}] 연동 성공!`);
                    authWindow?.close();
                  } else {
                    addLog(`❌ 토큰 교환 실패: ${data.error_description || data.error}`);
                    authWindow?.close();
                  }
                }
              } catch (e) {
                // 타 도메인(구글)에 있을 때는 여기로 빠집니다. 정상적인 대기 상태입니다.
              }
              if (authWindow?.closed) clearInterval(checkToken);
            }, 500);
          } else {
            const result = await signInWithGoogle();
            setUser(result.user);
            if (result.accessToken) {
              if (key === 'youtube') setYoutubeAccessToken(result.accessToken);
              else setBloggerAccessToken(result.accessToken);
            }
          }
          addLog("✅ 유튜브 연동 성공!");
        } else if (key === 'tiktok') {
          const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
          const keys = savedKeys ? JSON.parse(savedKeys).tiktok : null;
          if (!keys || !keys.clientKey) {
            addLog("🔑 틱톡 연동(Client Key)이 설정 탭에서 먼저 입력되어야 합니다.");
            setIsPlatformLoginModalOpen(false);
            return;
          }
          addLog("🔑 틱톡 인증 페이지로 이동합니다...");
          const redirectUri = encodeURIComponent(window.location.origin);
          const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${keys.clientKey}&scope=video.upload,video.publish&response_type=code&redirect_uri=${redirectUri}`;
          window.open(authUrl, '_blank');
        }
      } catch (err: any) {
        addLog(`❌ 연동 실패: ${err.message}`);
      }
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
    // 틱톡 OAuth 콜백 감지
    const urlParams = new URLSearchParams(window.location.search);
    const tiktokCode = urlParams.get('code');
    if (tiktokCode) {
      addLog("🎫 틱톡 인증 코드가 감지되었습니다. 토큰 교환을 진행하세요.");
      // URL에서 코드 제거 (히스토리 정리)
      window.history.replaceState({}, document.title, window.location.pathname);

      // 여기서 원래는 서버를 통해 Access Token을 교환해야 합니다.
      // 클라이언트 보안상 실제 시크릿을 노출하지 않기 위해 로그로만 안내하거나, 
      // 설정한 시크릿을 사용하여 직접 교환을 시도할 수 있습니다.
      addLog(`ℹ️ 인증 코드: ${tiktokCode.substring(0, 5)}... (설정 탭에서 토큰을 최종 확인해 주세요)`);
    }

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
      try {
        localStorage.setItem('suno_json_data', JSON.stringify(sunoTracks));
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          console.warn("LocalStorage Quota Exceeded for suno_json_data, attempting to prune history images");
          try {
            // Prune history: Keep only the 10 most recent tracks, and remove images from older ones if needed
            const prunedTracks = sunoTracks.map((t, idx) => {
              if (idx > 5) return { ...t, generatedImages: [] }; // Keep images only for last 5 tracks
              return t;
            });
            localStorage.setItem('suno_json_data', JSON.stringify(prunedTracks));
          } catch (e2) {
            console.error("Critical: Could not even save pruned sunoTracks");
          }
        }
      }
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
          // Migration: Ensure imageSettings exists
          if (!parsed.imageSettings) {
            parsed.imageSettings = {
              style: 'Cinematic',
              main: createDefaultSettings(),
              tiktok: createDefaultSettings(),
              shorts: createDefaultSettings()
            };
          }
          // Migration: Ensure imageParams exists
          if (!parsed.imageParams) {
            parsed.imageParams = {
              artStyle: '실사 사진 (Photorealistic)',
              cameraView: '정면 (Front View)',
              timeOfDay: '아침 (Morning)',
              lightingAtmosphere: '시네마틱 라이팅 (Cinematic Lighting)',
              weather: '맑음 (Clear Sky)',
              backgroundType: '자연 숲 (Natural Forest)'
            };
          }
          // Migration: Ensure progress exists
          if (!parsed.progress) {
            parsed.progress = { lyrics: 0, image: 0, video: 0, youtube: 0, blog: 0 };
          }
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
        lyricsStyle: '시적인',
        originalLyrics: '',
        isEnglishSong: false
      },
      imageParams: {
        artStyle: '실사 사진 (Photorealistic)',
        cameraView: '정면 (Front View)',
        timeOfDay: '아침 (Morning)',
        lightingAtmosphere: '시네마틱 라이팅 (Cinematic Lighting)',
        weather: '맑음 (Clear Sky)',
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
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn("LocalStorage full, trying progressive fallback to save core data");

        // Step 1: Try saving without blog post content but keep images
        try {
          const noBlogWorkflow = {
            ...workflow,
            results: { ...workflow.results, blogPost: undefined }
          };
          localStorage.setItem('echoesuntohim_workflow', JSON.stringify(noBlogWorkflow));
          return;
        } catch (e1) {
          // Step 2: Try saving without images but keep everything else (lyrics, analysis)
          try {
            const noImagesWorkflow = {
              ...workflow,
              results: { ...workflow.results, images: [] }
            };
            localStorage.setItem('echoesuntohim_workflow', JSON.stringify(noImagesWorkflow));
            console.log("Saved core data (lyrics/analysis) by removing images");
          } catch (e2) {
            // Step 3: Absolute minimum - just params and basic results
            try {
              const minWorkflow = {
                params: workflow.params,
                results: {
                  lyrics: workflow.results.lyrics,
                  timedLyrics: workflow.results.timedLyrics,
                  englishLyrics: workflow.results.englishLyrics
                },
                currentStep: workflow.currentStep
              };
              localStorage.setItem('echoesuntohim_workflow', JSON.stringify(minWorkflow));
            } catch (e3) {
              console.error("Critical: Could not even save minimal workflow data");
            }
          }
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

  // v1.5.7 추가 작업: 중복 번역 방지를 위한 레퍼런스
  const lastTranslatedLyricsRef = useRef<string | null>(null);
  const lastTranslateIsEnglishRef = useRef<boolean>(false);

  useEffect(() => {
    if (!workflow.results.lyrics || !apiKey) return;

    // 시스템 안내 문구(플레이스홀더)는 번역 대상에서 제외
    const isPlaceholder = workflow.results.lyrics.includes("분석하고 있습니다") ||
      workflow.results.lyrics.includes("Analyzing");
    if (isPlaceholder) return;

    // 새로고침 시 혹은 가사/설정이 동일한 경우 번역 스킵 (토큰 절약)
    if (workflow.results.lyrics === lastTranslatedLyricsRef.current &&
      workflow.params.isEnglishSong === lastTranslateIsEnglishRef.current) return;

    // 초기 로드 시 혹은 음원 분석을 통해 가사/번역이 이미 확보된 경우 스킵 (중복 번역 방지)
    if (workflow.results.lyrics && workflow.results.englishLyrics) {
      if (workflow.results.lyrics === lastTranslatedLyricsRef.current &&
        workflow.params.isEnglishSong === lastTranslateIsEnglishRef.current) return;

      lastTranslatedLyricsRef.current = workflow.results.lyrics;
      lastTranslateIsEnglishRef.current = workflow.params.isEnglishSong || false;
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (isTranslating) return;

      lastTranslatedLyricsRef.current = workflow.results.lyrics;
      lastTranslateIsEnglishRef.current = workflow.params.isEnglishSong || false;

      await translateLyrics(workflow.results.lyrics);
    }, 4000); // 4초 디바운스

    return () => clearTimeout(timeoutId);
  }, [workflow.results.lyrics, workflow.params.isEnglishSong, apiKey]);

  const translateLyrics = async (textToTranslate: string) => {
    if (!textToTranslate || !apiKey) return;

    setIsTranslating(true);
    const selectedModel = aiEngine && aiEngine.includes('gemini') ? aiEngine : "gemini-3.1-flash-lite-preview";

    try {
      const isEnglish = workflow.params.isEnglishSong;
      addLog(`🔄 [${selectedModel}] ${isEnglish ? '한글' : '영어'} 가사 자동 번역 시작...`);

      const lines = textToTranslate.split('\n');
      const cleanLines = lines.map(l => l.replace(/^\[\d{2}:\d{2}\]\s*/, '').trim());
      const timestamps = lines.map(l => {
        const m = l.match(/^\[\d{2}:\d{2}\]\s*/);
        return m ? m[0] : '';
      });

      const prompt = isEnglish
        ? `Translate the following English lyrics to Korean line-by-line. 
      Keep the line count EXACTLY the same (${cleanLines.length} lines).
      Do NOT include any timestamps, section headers, or extra explanations.
      If a line is empty or a section header like [Verse 1], return it exactly as is.
      
      Lyrics:
      ${cleanLines.join('\n')}`
        : `Translate the following Korean lyrics to English line-by-line. 
      Keep the line count EXACTLY the same (${cleanLines.length} lines).
      Do NOT include any timestamps, section headers, or extra explanations.
      If a line is empty or a section header like [Verse 1], return it exactly as is.
      
      Lyrics:
      ${cleanLines.join('\n')}`;

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const translatedContent = response.text || "";
      const translatedLines = translatedContent.split('\n');

      const restored = lines.map((_, i) => {
        // 복원 로직
        const timestamp = timestamps[i];
        const translation = translatedLines[i] || "";

        // 만약 번역 결과에 이미 타임스탬프가 포함되어 있다면 중복 방지를 위해 제거
        const cleanTranslation = translation.replace(/^\[\d{2}:\d{2}\]\s*/, '').trim();

        return timestamp + cleanTranslation;
      });

      const finalTranslated = restored.join('\n');

      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          englishLyrics: finalTranslated
        }
      }));

      addLog(`✅ [${selectedModel}] ${isEnglish ? '한글' : '영어'} 가사 자동 번역 완료`);
    } catch (error) {
      console.error("Auto-translation error:", error);
      addLog(`❌ 번역 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTranslating(false);
    }
  };

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
        2. **언어 판별 및 번역 (최우선순위)**:
           - 이 곡이 영어 곡인지 한국어 곡인지 판별하여 'isEnglish' 필드에 담아줘.
           - **만약 영어 곡이라면**, 'lyrics' 필드에는 **반드시 한국어 번역본**을 담아야 해. (영어 원문은 'englishLyrics'에 넣어줘.)
           - 한국어 곡이라면 'lyrics'에 한국어 원문을, 'englishLyrics'에 영어 번역본을 담아줘.
           - 어떤 경우에도 'lyrics' 필드에는 한국어 가사가 포함되어야 해.
        3. **가사 구조화 (가장 중요)**: 
           - 가사는 반드시 한 줄씩 띄어쓰기를 적용하여 읽기 좋게 구성해줘.
           - 한글 가사 또한 한 줄로 뭉치지 않게, 사람이 부르는 단위(구절)로 줄바꿈을 철저히 해줘.
           - 각 섹션(예: [Verse 1]) 시작 전에 한 줄을 띄워줘.
        4. **모든 줄에 타임스탬프 적용 (절대 필수)**: 
           - **가사의 모든 줄(Every single line)**은 반드시 시작점에 [00:00] 형식의 정확한 타임스탬프를 포함해야 해.
           - 단락의 첫 줄뿐만 아니라, 이어지는 모든 가사 구절마다 개별 타임스탬프를 달아줘.
           - 섹션 제목(예: [Intro], [Verse 1])에도 타임스탬프를 포함해줘. (예: [00:15] [Verse 1])
           - 한국어 가사와 영어 가사의 타임스탬프는 반드시 1:1로 일치해야 해.
        5. **자막 싱크 데이터 (필수)**: 
           - 모든 가사 줄에 대해 정확한 시작 시간을 초(second) 단위로 파악하여 timedLyrics 배열에 담아줘.
           - kor와 eng는 반드시 1:1 매칭되어야 해.
        6. 곡의 BPM, Key(조), 전반적인 에너지 레벨(0~100)을 추정해줘.
        7. 반드시 아래 JSON 형식으로만 답변해줘. 다른 텍스트는 포함하지 마.

        [응답 형식 JSON]
        {
          "isEnglish": true/false,
          "lyrics": "[00:00] [Intro]\n[00:05] 가사 첫 번째 줄\n[00:10] 가사 두 번째 줄\n[00:15] [Verse 1]\n[00:16] 이어지는 가사 구절...",
          "englishLyrics": "[00:00] [Intro]\n[00:05] English Line 1\n[00:10] English Line 2\n[00:15] [Verse 1]\n[00:16] Following English Line...",
          "timedLyrics": [
            { "time": 0, "section": "Intro", "kor": "", "eng": "" },
            { "time": 5, "section": "Intro", "kor": "가사 첫 번째 줄", "eng": "English Line 1" },
            { "time": 15, "section": "Verse 1", "kor": "", "eng": "" }
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
      const allSections: any[] = [];
      const lyricsText = result.lyrics || "";
      while ((match = timestampRegex.exec(lyricsText)) !== null) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const label = match[3];
        const time = minutes * 60 + seconds;
        allSections.push({ start: time, label });
      }

      // Priority: Chorus > Bridge > Others
      const prioritized = [...allSections].sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        const aIsChorus = aLabel.includes('chorus') || aLabel.includes('후렴');
        const bIsChorus = bLabel.includes('chorus') || bLabel.includes('후렴');
        const aIsBridge = aLabel.includes('bridge') || aLabel.includes('브릿지');
        const bIsBridge = bLabel.includes('bridge') || bLabel.includes('브릿지');

        if (aIsChorus && !bIsChorus) return -1;
        if (!aIsChorus && bIsChorus) return 1;
        if (aIsBridge && !bIsBridge) return -1;
        if (!aIsBridge && bIsBridge) return 1;
        return 0;
      });

      // Take prioritized sections up to shortsCount and assign random duration (20-59s)
      const highlights = prioritized.slice(0, shortsCount).map(h => {
        const randomDuration = Math.floor(Math.random() * (59 - 20 + 1)) + 20;
        return { start: h.start, duration: randomDuration, label: h.label };
      });

      if (!options?.skipSync) {
        setWorkflow(prev => ({
          ...prev,
          params: {
            ...prev.params,
            isEnglishSong: !!result.isEnglish // AI 언어 판별 결과 동기화
          },
          results: {
            ...prev.results,
            lyrics: result.lyrics,
            englishLyrics: result.englishLyrics,
            isEnglish: !!result.isEnglish,
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

      // 가사 단락과 타임스탬프 연결하여 터미널 출력 (사용자 요청)
      if (result.lyrics) {
        addLog("----------------------------------------");
        addLog(`📝 분석된 가사 출력 (${result.isEnglish ? '영어 곡 - 한글 번역 포함' : '한국어 곡'}):`);
        const lyricsLines = result.lyrics.split('\n');
        lyricsLines.forEach((line: string) => {
          if (line.trim()) {
            addLog(line);
          }
        });
        addLog("----------------------------------------");
      }

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
          koreanTitle: (kTitle.trim() || prev.params.koreanTitle || '').replace(/\[.*?\]/g, '').trim(),
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

      addLog("📁 음원이 업로드되었습니다. 자동으로 정밀 분석을 시작합니다...");

      // Trigger analysis - RESTORED
      analyzeAudioComprehensively(file, { referenceLyrics: workflow.params.originalLyrics });

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

  const handleSunoAudioReady = async (dataUrl: string, name: string) => {
    setUploadedAudio(dataUrl);
    setUploadedAudioName(name);
    await saveAudioToDB(dataUrl);
    await saveVoiceToDB('workspace_audio', dataUrl, name);
    addLog(`✨ Suno 음원이 작업 공간에 로드되었습니다: ${name}`);
  };

  const handleHighlightChange = (idx: number, field: 'start' | 'end', newVal: number) => {
    const newHighlights = [...shortsHighlights];
    const current = newHighlights[idx] || { start: 0, duration: 30 };
    if (field === 'start') {
      const currentEnd = current.start + current.duration;
      newHighlights[idx] = { ...current, start: newVal, duration: Math.max(0, currentEnd - newVal) };
    } else {
      newHighlights[idx] = { ...current, duration: Math.max(0, newVal - current.start) };
    }
    setShortsHighlights(newHighlights);
  };

  const handleDownloadAll = async () => {
    if (isVideoRendering) {
      addLog("⚠️ 이미 렌더링이 진행 중입니다. 잠시만 기다려주세요.");
      return;
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    setIsVideoRendering(true);
    addLog("🚀 [대량 내보내기] 모든 영상의 순차적 렌더링을 시작합니다...");

    try {
      // 1. Main Video
      if (mainVideoRef.current) {
        addLog("🎬 [1/N] 메인 영상 렌더링 시작...");
        await mainVideoRef.current.download();
        addLog("✅ 메인 영상 완료.");
        await sleep(1000); // 브라우저 다운로드 안정성을 위한 지연
      }

      // 2. TikTok/Shorts (Full)
      if (tiktokVideoRef.current) {
        addLog("🎬 [2/N] 틱톡 전체 영상 렌더링 시작...");
        await tiktokVideoRef.current.download();
        addLog("✅ 틱톡 전체 영상 완료.");
        await sleep(1000);
      }

      // 3. Sequential Shorts Clips
      for (let i = 0; i < shortsCount; i++) {
        if (shortsVideoRefs.current[i]) {
          addLog(`🎬 [Shorts] #${i + 1} 렌더링 시작...`);
          await shortsVideoRefs.current[i].download();
          addLog(`✅ 숏츠 #${i + 1} 완료.`);
          if (i < shortsCount - 1) await sleep(1000);
        }
      }

      addLog("🎊 모든 영상 제작 및 다운로드가 완료되었습니다!");
    } catch (error: any) {
      console.error("Bulk rendering failed:", error);
      addLog(`❌ 대량 내보내기 중단: ${error.message}`);
    } finally {
      setIsVideoRendering(false);
    }
  };

  const handleRenderComplete = (blob: Blob, type: string) => {
    setRenderedVideos(prev => ({ ...prev, [type]: blob }));
    addLog(`💿 [${type}] 영상 데이터가 메모리에 준비되었습니다. (업로드 가능)`);
  };


  const handleUploadToPlatform = async (platform: 'youtube' | 'tiktok', type: string, index?: number) => {
    const videoKey = `${type}${index !== undefined ? `_${index}` : ''}`;
    const videoBlob = renderedVideos[videoKey];

    if (!videoBlob) {
      addLog(`⚠️ [${platform}] 업로드할 영상 파일이 없습니다. 먼저 렌더링을 완료해주세요.`);
      return;
    }

    if (platform === 'youtube') {
      let currentToken = youtubeAccessToken;
      if (!currentToken) {
        addLog("🔑 유튜브 연동이 필요합니다. 구글 로그인을 진행해주세요.");
        try {
          const result = await signInWithGoogle();
          setUser(result.user);
          if (result.accessToken) {
            setYoutubeAccessToken(result.accessToken);
            currentToken = result.accessToken;
          }
          addLog("✅ 유튜브 연동 성공!");
        } catch (err: any) {
          addLog(`❌ 유튜브 연동 실패: ${err.message}`);
          return;
        }
      }

      addLog(`🚀 [YouTube] '${type}' 영상 업로드 시작...`);
      try {
        const metadata = {
          title: workflow.results.youtubeMetadata?.title || workflow.results.title,
          description: workflow.results.youtubeMetadata?.description || "",
          tags: (workflow.results.youtubeMetadata?.tags || "").split(',').map((t: string) => t.trim()),
          status: workflow.publishSettings?.[`youtubeVisibility_${videoKey}`] || 'public'
        };

        const result = await uploadToYouTube(
          videoBlob,
          metadata,
          currentToken!,
          (progress) => {
            setWorkflow((prev: any) => ({
              ...prev,
              progress: { ...prev.progress, youtube: progress }
            }));
          }
        );
        addLog("✅ 유튜브 업로드 완료!");
        console.log("YouTube Upload Result:", result);
      } catch (err: any) {
        addLog(`❌ 유튜브 업로드 실패: ${err.message}`);
      }
    } else if (platform === 'tiktok') {
      const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
      const keys = savedKeys ? JSON.parse(savedKeys).tiktok : null;

      if (!keys || !keys.clientKey) {
        addLog("🔑 틱톡 연동(Client Key)이 설정 탭에서 필요합니다.");
        return;
      }

      let currentToken = tiktokAccessToken;
      if (!currentToken) {
        addLog("🔑 틱톡 인증이 필요합니다. 인증 페이지로 이동합니다...");
        const redirectUri = encodeURIComponent(window.location.origin);
        const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${keys.clientKey}&scope=video.upload,video.publish&response_type=code&redirect_uri=${redirectUri}`;
        window.open(authUrl, '_blank');
        addLog("ℹ️ 인증 완료 후 Redirect된 주소의 'code'를 사용하여 토큰을 발급받아야 합니다.");
        return;
      }

      addLog(`🚀 [TikTok] '${type}' 영상 업로드 시작...`);
      try {
        await uploadToTikTok(
          videoBlob,
          { title: workflow.results.title },
          currentToken,
          (progress) => {
            setWorkflow((prev: any) => ({
              ...prev,
              progress: { ...prev.progress, tiktok: progress }
            }));
          }
        );
        addLog("✅ 틱톡 업로드 성공!");
      } catch (err: any) {
        addLog(`❌ 틱톡 업로드 실패: ${err.message}`);
      }
    }
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


  const generatePlatformMetadata = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    addLog("유튜브 및 틱톡 플랫폼별 최적화 메타데이터 생성을 시작합니다...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 10 } }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const isCCM = workflow.params.target === 'CCM';

      const youtubePersona = isCCM
        ? "당신은 전 세계 워십 문화를 지배하는 '무적의 워십 비저너리'이자 영적 카피라이팅의 정점에 선 마스터입니다. 수억 명의 영혼이 당신의 손끝에서 나오는 한 문장의 메시지에 반응하며, 유튜브 알고리즘을 굴복시켜 모든 검색 상단을 점유하는 독보적인 권위자입니다. 당신의 텍스트는 영적 권위와 감성적 몰입감을 동시에 지니며, 신성한 전율을 일으키는 압도적인 카리스마를 내뿜습니다."
        : "당신은 지구상에서 가장 강력한 음악 권력을 쥐고 있는 '글로벌 엔터테인먼트의 황제'이자 알고리즘의 지배자입니다. 미스터비스트를 넘어선 세계 최고의 도달률과 클릭률을 자랑하며, 전 세계 트렌드를 당신의 의도대로 창조하고 파괴하는 카피라이팅의 신입니다. 당신의 메타데이터는 0.1초 만에 인간의 뇌를 장악하는 심리 공학적 정밀함과, 거부할 수 없는 천재적인 매력을 지닌 마스터피스입니다.";

      const tiktokPersona = isCCM
        ? "당신은 숏폼 사역의 판도를 바꾼 'Z세대 영적 리더'입니다. 무의미한 스크롤 속에서 단 한 문장의 텍스트로 영혼의 발걸음을 멈추게 하며, 틱톡 전체를 은혜와 찬양의 물결로 뒤덮는 강력한 바이럴 전략가입니다. 당신의 메시지는 날카롭고 명확하며, 하나님의 사랑을 가장 트렌디하고 강력한 방식으로 선포하는 숏폼의 대제사장입니다."
        : "당신은 틱톡 알고리즘을 완벽히 해킹하여 전 세계 최상위 FYP를 독식하는 '글로벌 숏폼 카피라이팅 하이재커'입니다. 인간의 집중력이 유지되는 3초 안에 시청자의 영혼을 낚아채고 무한 공유를 유도하는 중독적이고 파괴적인 텍스트 설계의 1인자입니다. 당신이 던지는 해시태그 하나하나가 곧 전 세계의 유행이 되는 트렌드의 시초이자 지배자입니다.";

      const prompt = `
        [IDENTITY & MISSION]
        Generate algorithms-dominating metadata for BOTH YouTube and TikTok based on the provided song info.
        You must write as the provided Personas, using their absolute authority and legendary copywriting skills.
        The layout and formatting MUST be perfect for direct copy-paste.

        [SONG INFO]
        - Title: ${workflow.params.koreanTitle || workflow.results.title}
        - Topic: ${workflow.params.topic}
        - Mood: ${workflow.params.mood}
        - Target: ${workflow.params.target}
        - Interpretation: ${workflow.params.songInterpretation || 'N/A'}
        - Lyrics: ${workflow.results.lyrics?.substring(0, 300)}...

        [YOUTUBE TASK]
        Persona: ${youtubePersona}
        Objective: Create an SEO-optimized title, a highly engaging long-form description, and viral tags.
        FORMAT RULES (MANDATORY):
        - Description MUST be highly structured with multiple sections.
        - USE EXPLICIT DOUBLE NEWLINES (ENTER key twice) BETWEEN SECTIONS.
        - SECTION 1: [Intro Hook] - Emotional, powerful hook to grab attention.
        - SECTION 2: [곡 소개 / Song Story] - Deep interpretation and emotional background.
        - SECTION 3: [공식 채널 및 더 많은 나눔] - Mandatory link: https://litt.ly/echoes (Place this link prominently here) along with call to action.
        - SECTION 4: [Viral Tags] - Space-separated hashtags.
        - CRITICAL: NO HALLUCINATED TIMESTAMPS (e.g., 00:00 Intro). DO NOT generate a timestamp section unless specifically provided in song info.

        [TIKTOK TASK]
        Persona: ${tiktokPersona}
        Objective: Create a single unified content for TikTok's description box.
        FORMAT RULES (MANDATORY):
        - The caption content MUST itself have internal line breaks for high readability. (Every sentence or short phrase MUST be followed by a newline \n).
        - There MUST be 5+ EMPTY LINES (\\n\\n\\n\\n\\n) between the caption and the hashtags so the hashtags are invisible at first glance.
        - Use exactly 15 high-performing hashtags.

        [FINAL FORMAT INVARIANT - CRITICAL]
        1. NO SINGLE BLOCKS OF TEXT. Every major section must be separated by empty space.
        2. MANDATORY LINK: You MUST include https://litt.ly/echoes in the YouTube description (Section 3).
        3. NO HALLUCINATION: Do NOT generate fake timestamps or fake URL links.
        4. IF THE TIKTOK CAPTION IS A SINGLE PARAGRAPH WITHOUT INTERNAL NEWLINES, YOU HAVE FAILED.
        5. TIKTOK HASHTAGS MUST BE PUSHED DOWN BY 5+ NEWLINES. (\\n\\n\\n\\n\\n)

        Response Format (JSON):
        {
          "youtube": {
            "title": "...",
            "description": "High-impact formatted description with \\n\\n between sections",
            "tags": "..."
          },
          "tiktok": {
            "fullContent": "Caption content with internal newlines\\n\\n\\n\\n\\n#hashtags"
          }
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
              youtube: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ['title', 'description', 'tags']
              },
              tiktok: {
                type: Type.OBJECT,
                properties: {
                  fullContent: { type: Type.STRING }
                },
                required: ['fullContent']
              }
            },
            required: ['youtube', 'tiktok']
          },
          temperature: 0.8,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleanedText);

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, youtube: 100 },
        results: {
          ...prev.results,
          youtubeMetadata: parsed.youtube,
          tiktokMetadata: parsed.tiktok
        }
      }));
      addLog('✅ 플랫폼별(유튜브/틱톡) 메타데이터 생성이 완료되었습니다.');
    } catch (error) {
      console.error('Platform Metadata Error:', error);
      addLog('❌ 메타데이터 생성 실패: ' + (error instanceof Error ? error.message : String(error)));
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
        ? "이 곡은 CCM(Contemporary Christian Music)이므로, 독자들에게 영적인 깊이와 은혜, 위로를 전달하는 데 집중하세요."
        : "이 곡은 대중음악이므로, 전 세계 5억 명의 구독자를 거느린 글로벌 No.1 음악 인플루언서로서 트렌드를 창조하는 감각적인 포스팅을 작성하세요. 시청자의 마음을 1초 만에 사로잡는 고도의 심리학적 카피라이팅을 적용하세요.";

      const userStyle = workflow.blogSettings?.style || '감성적이고 따뜻한 블로그';
      const userPerspective = workflow.blogSettings?.blogPerspective || '소개자 관점';
      const userAudience = workflow.blogSettings?.targetAudience || '모든 음악 애호가';

      const naverPersona = `[네이버 블로그 최적화] 스타일: ${userStyle}. 사용자 선택 스타일을 100% 유지하되, 네이버 블로그 검색 노출을 위해 '이미지-텍스트 흐름'과 '적절한 이모지 배치' 등 기술적 레이아웃 최적화에 집중하세요.`;
      const tistoryPersona = `[티스토리 최적화] 스타일: ${userStyle}. 사용자 선택 스타일을 100% 유지하되, 깔끔하고 전문적인 정보 전달력을 위해 '섹션별 구조화'와 '분석적 레이아웃' 등 기술적 구조 최적화에 집중하세요.`;
      const googlePersona = `[구글 블로거 SEO 최적화] 스타일: ${userStyle}. 사용자 선택 스타일을 100% 유지하되, 구글 검색 엔진 최적화(SEO)를 위해 '엄격한 H1~H3 태그 계층 구조'와 '전략적 키워드 배치' 등 기술적 SEO 최적화에 집중하세요.`;

      const prompt = `
        당신은 지금부터 사용자님이 지정한 스타일인 **'${userStyle}'** 인격 그 자체가 되어 글을 써야 하는 전문 작가입니다.
        모든 문체, 단어 선택, 문장 구조는 반드시 **'${userStyle}'**의 특성에 100% 일치해야 하며, 독자의 몰입을 위해 인격의 일관성을 끝까지 유지하세요.
        
        [미션]
        - 독자 타겟: **'${userAudience}'**
        - 분량: 최소 1,500자 이상의 풍성하고 깊이 있는 내용
        - 필수 링크 포함: 포스팅의 하단(마지막 부분)에 반드시 "함께 은혜를 나누는 공식 채널: https://litt.ly/echoes" 문구와 링크를 포함하세요.
        - 목표: 사용자님이 기획한 '관점'과 '스타일'을 유지하면서, 각 플랫폼(네이버/티스토리/구글)의 특성에 맞춰 최적화된 형태로 출력하세요.
        - 환각 금지: 제공된 외의 링크나 정보를 지어내지 마세요.

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
            ${processedImages.map(img => `"${img.label}": "이 이미지가 위치한 단락의 핵심을 관통하는 '가장 중요한 문구' 또는 '강력한 인사이트'를 한 문장으로 생성 (이미지 위 오버레이용이므로 임팩트 있게 작성)"`).join(',\n            ')}
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
        You are a world-renowned CCM (Contemporary Christian Music) visionary, songwriter, and worship leader with 30 years of elite experience. 
        Your expertise spans two core dimensions:
        1. **Vertical Worship**: Profound praise directed toward God, rooted in spiritual grace and divine love. (e.g., "영원의 지평선_Horizon of Eternity")
        2. **Horizontal Fellowship**: Capturing how God works and responds within human relationships. You write about comfort, encouragement, and love between people as a manifestation of God's presence and intervention. Even in these human-to-human interactions, emphasize that it is God who is working and responding. (e.g., "작은 손길 속의 기적_Miracle in a Small Touch")
        
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

      const reformedMeditationPersona = `
        You are a profound theologian and spiritual mentor rooted in Reformed Theology (Calvinism). 
        Your mission is two-fold:
        1. **Sacred Worship**: Leading people to the majestic glory and sovereignty of God through deep biblical reflection.
        2. **Shepherding the Lost**: Compassionately reaching out to "lost sheep" with the light of the Gospel, inviting them back to the Lord's grace.
        
        Your writing style is intellectually rigorous yet spiritually warm. 
        You emphasize:
        - The absolute authority of Scripture.
        - The sovereignty of God in all aspects of life.
        - Practical application of theology to daily struggles.
        
        When generating "Meditation (QT)" style content:
        Structure it clearly as: [Bible Verse] -> [Theological Commentary] -> [Life Application] -> [Today's Prayer].
        Maintain a tone of "Holy Compassion"—reverent toward God and tender toward the broken.
      `;

      const prompt = `
        [SYSTEM ROLE]
        ${workflow.params.lyricsStyle === '묵상형 (QT)' ? reformedMeditationPersona : (isCCM ? ccmPersona : popPersona)}
        
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
        
        [GENRE & MOOD CRITICAL GUIDELINE]
        - **Genre (${workflow.params.subGenre})**: The core vocabulary and rhythmic structure must strictly adhere to the nuances of this genre.
        - **Mood (${workflow.params.mood})**: This mood must be the "emotional soul" of the lyrics. Every line should reflect this atmosphere, from word choice to metaphorical depth. The overall "vibe" should be unmistakable.
        
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
            case '묵상형 (QT)': return 'Strictly follow the structure: [Bible Verse] -> [Theological Commentary] -> [Life Application] -> [Today\'s Prayer]. Focus on spiritual depth and Reformed perspective.';
            default: return '';
          }
        })()}

        Guidelines:
        1. Song Titles (CRITICAL): Generate 5 different, highly creative and genre-appropriate titles.
           - Format: [TargetTag][Korean Title]_[English Title] (e.g., "[CCM]새벽의 발자국_Footsteps of Dawn")
           - **SPACING (STRICT)**: Use normal spaces for spacing between words. **NEVER use "_" or "/" as a spacer or separator inside titles.** The only "_" allowed is the one separating the Korean and English titles.
           - **CCM CRITICAL**: Avoid standard Christian clichés (e.g., "Grace", "Light", "Love"). Instead, use fresh, unique biblical metaphors or deep spiritual insights that capture the specific soul of this song. Titles should feel like a "Sacred Masterpiece"—original and artistically profound.
           - **POP CRITICAL**: Titles should be aesthetic, trendy, and instantly iconic ("Global Hooks"). Avoid generic "City", "Memory" clichés.
           - CRITICAL: Titles MUST NOT be literal translations. The English title should capture the "vibe" and "divine essence" (for CCM) or "cinematic atmosphere" (for Pop) poetically.
        2. Lyrics (CRITICAL): Generate full lyrics for a 3-6 minute long song in BOTH Korean and English.
           - Structure: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Outro].
           - ${isCCM ? "CCM Style: Focus on BOTH vertical worship (to God) and horizontal spiritual reflection (God working through human relationships). Balance these two dimensions to create a holistic spiritual narrative." : "Pop Style: Focus on horizontal relationships (human to human) or self-discovery."}
           - **LINE-BY-LINE MAPPING (CRITICAL)**: The Korean and English lyrics MUST have the exact same number of lines in each section. Every Korean line must have a corresponding English translation on the same line number within that section. This is for video subtitle sync.
           - **TIMESTAMP EXCLUSION (CRITICAL)**: Do NOT include timestamps like [00:00] in the lyrics body. Only return the pure lyrics text.
           - **DUET OPTIMIZATION (IF APPLICABLE)**: If Vocal Type is a Duet, divide the lines clearly between [Vocal 1], [Vocal 2], and [Together]. Match the gender roles to the selected Duet type (e.g., Male/Female, Male/Male, Female/Female) and ensure the dialogue or harmony feels natural for that combination.
           - Double line break between sections, single line break between every line.
        3. Suno AI Prompt: Generate a highly detailed and evocative Suno AI v3.5 prompt.
           - LENGTH (CRITICAL): MUST be between 600 and 1000 characters.
           - VOCAL CONTRAST (DYNAMIC GUIDELINE):
             * If Vocal Type includes '음색 대조': Specify TWO PHYSICALLY DISTINCT and contrasting vocal textures (e.g., "airy, breathy female" vs "solid, powerful, belt-focused female") to ensure extreme separation.
             * If Vocal Type includes '화음 조화': Specify harmoniously blended vocal textures (e.g., "soft, silk-like vocals that blend perfectly into a rich harmony").
             * If Vocal Type includes '음역 대비': Specify contrasting pitch ranges (e.g., "high-pitched crystalline soprano" vs "deep, resonant bass/alto") for a wide melodic spectrum.
             * Otherwise: Ensure clear distinction but focus on melodic interaction.
           - Include specific instrumentation, intricate vocal texture, production atmosphere, and structural cues (e.g., "building cinematic tension with atmospheric pads", "intimate breathy female vocals with a touch of vinyl crackle").

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
      const rawFirstTitle = suggestedTitles[0];
      const finalTitle = typeof rawFirstTitle === 'string' ? rawFirstTitle : "제목_없음";

      const [kTitle, eTitle] = finalTitle.includes('_') ? finalTitle.split('_') : [finalTitle, ''];

      const formatLyrics = (text: string) => (text || "")
        .replace(/&#10;/g, '\n')
        .replace(/(\[Verse|\[Chorus|\[Bridge|\[Outro|\[Intro)/g, '\n\n$1')
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
          koreanTitle: (kTitle || '').replace(/\[.*?\]/g, '').trim(),
          englishTitle: eTitle || ''
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

  const regenerateTitles = async () => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!workflow.results.lyrics) {
      addLog("⚠️ 오류: 제목을 생성할 가사가 없습니다. 먼저 가사를 생성해주세요.");
      return;
    }

    addLog("✨ [v1.5.7] 독창적인 제목만 새롭게 5개 재생성 중... (가사 유지)");

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const prompt = `
        당신은 전 세계가 주목하는 최고의 작사가이자 크리에이티브 디렉터입니다.
        아래 제공된 [가사]와 [주제]를 분석하여, 곡의 정체성을 가장 잘 나타내는 **'독창적이고 예술적인'** 제목 5개를 생성해주세요.
        
        [가사]
        ${workflow.results.lyrics}
        
        [주제]
        ${workflow.params.topic}
        
        [지시사항 (필독)]
        - **띄어쓰기 및 구분자 준수**: 제목 내부의 단어 사이에는 반드시 **일반 공백(띄어쓰기)**을 사용하세요. **'_'나 '/'를 띄어쓰기 용도로 사용하는 것을 엄격히 금지합니다.** '_'는 오직 한글 제목과 영어 제목을 구분할 때만 **딱 한 번** 사용하세요.
        - **획일성 탈피**: '은혜', '빛', '사랑', '기억', '도시' 등 뻔하고 상투적인 CCM/POP 클리셰 키워드 사용을 엄격히 금지합니다.
        - **신선한 메타포**: 성경의 깊은 통찰이나 일상의 구체적인 순간을 낯설게 조합하여 제목을 만드세요.
        - **포맷 준수**: [TargetTag]한글 제목_English Title (예: [CCM]새벽의 발자국_Footsteps of Dawn)
        
        Response Format (JSON):
        {
          "titles": ["추천제목1_English1", "추천제목2_English2", "추천제목3_English3", "추천제목4_English4", "추천제목5_English5"]
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
              titles: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["titles"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error("AI 응답이 비어있습니다.");

      const result = JSON.parse(responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim());
      const newTitles = result.titles || [];

      if (newTitles.length > 0) {
        addLog(`새로운 제목 제안 완료: ${newTitles.length}개`);
        setWorkflow(prev => ({
          ...prev,
          results: {
            ...prev.results,
            suggestedTitles: newTitles
          }
        }));
      }
    } catch (error) {
      console.error("Regenerate Titles Error:", error);
      addLog("❌ 오류: 제목 재생성 중 문제가 발생했습니다.");
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
        You are a world-renowned cinematic director and legendary visual artist with 30 years of elite experience in the global music video industry. 
        Your mission is to translate the deep emotional narrative and spiritual essence of a song into breathtaking, high-end cinematic imagery.
        
        [SONG DATA]
        - Title: ${workflow.results.title || workflow.params.title || "Untitled"}
        - Lyrics: ${workflow.results.lyrics || "N/A"}
        ${workflow.results.englishLyrics ? `- English Lyrics: ${workflow.results.englishLyrics}` : ''}
        ${workflow.params.songInterpretation ? `- **CRITICAL USER INTERPRETATION (TOP PRIORITY)**: ${workflow.params.songInterpretation}` : ''}
        - Music Target: ${workflow.params.target}
        - BPM/Mood: ${workflow.results.audioAnalysis?.bpm || "Moderate"} / ${workflow.results.audioAnalysis?.mood || workflow.params.mood || "Emotional"}
        
        [USER STYLE PREFERENCES]
        - Art Style: ${workflow.imageParams.artStyle}
        - Camera View: ${workflow.imageParams.cameraView}
        - Time of Day: ${workflow.imageParams.timeOfDay}
        - Lighting: ${workflow.imageParams.lightingAtmosphere}
        - Weather: ${workflow.imageParams.weather}
        - Background: ${workflow.imageParams.backgroundType}
        - Theme: ${workflow.imageSettings.style}
        
        [INSTRUCTIONS]
        1. **Cinematic Mastery**: Create highly detailed, photorealistic, or artistic prompts that capture the specific "soul" of this song. Every image must be visually distinct and unique to this specific narrative.
        2. **Spiritual Depth (CCM)**: If Target is CCM, use powerful spiritual metaphors (light, divine presence, sacred spaces) to create an atmosphere of grace and awe.
        3. **Visual Storytelling**: Avoid clichés. Focus on unique compositions, atmospheric lighting, and high-concept mise-en-scène.
        4. **User Priority**: Strictly incorporate the [USER INTERPRETATION] as the primary conceptual foundation.
        5. Write all image prompts in high-end, descriptive English.
        
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
              images: [...prev.results.images.filter(img => img.label.replace(/\s/g, '').toLowerCase() !== label.replace(/\s/g, '').toLowerCase()), tempImage]
            }
          }));

          // 화면에 렌더링될 수 있도록 잠시 대기 (브라우저 Paint 보장)
          await new Promise(resolve => setTimeout(resolve, 100));

          // 2. Upload to Firebase Storage in the background
          addLog(`📤 [${label}] 이미지를 클라우드 저장소에 업로드 중...`);
          const storageUrl = await uploadImageToStorage(base64Url);
          const finalUrl = storageUrl || base64Url;

          // 3. Update with permanent storage URL
          const newImage = { url: finalUrl, type, label, prompt };
          // For UI immediate feedback and local download, we can still use localUrl in workflow state
          const uiImage = { ...newImage, localUrl: base64Url };

          generatedImages.push(newImage); // Clean image for history list

          setWorkflow(prev => ({
            ...prev,
            results: {
              ...prev.results,
              images: prev.results.images.map(img => img.label.replace(/\s/g, '').toLowerCase() === label.replace(/\s/g, '').toLowerCase() ? uiImage : img)
            }
          }));

          // 4. 즉시 히스토리(DB)에 저장하여 유실 방지
          const titleToSave = workflow.params.title || workflow.params.koreanTitle || uploadedAudioName || "제목 없음";
          setSunoTracks(prev => {
            const exists = prev.some(t => t.title === titleToSave);
            if (exists) {
              return prev.map(t => t.title === titleToSave ? {
                ...t,
                generatedImages: [...(t.generatedImages || []).filter((img: any) => img.label.replace(/\s/g, '').toLowerCase() !== label.replace(/\s/g, '').toLowerCase()), newImage]
              } : t);
            } else {
              return [{ title: titleToSave, generatedImages: [newImage], created_at: new Date().toISOString() }, ...prev];
            }
          });

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
      if (generatedImages.length > 0) {
        const titleToSave = workflow.params.title || workflow.params.koreanTitle || uploadedAudioName || "제목 없음";
        setSunoTracks(prev => {
          const exists = prev.some(t => t.title === titleToSave);
          if (exists) {
            return prev.map(t => t.title === titleToSave ? { ...t, generatedImages } : t);
          } else {
            return [{ title: titleToSave, generatedImages, created_at: new Date().toISOString() }, ...prev];
          }
        });
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

  const regenerateShorts = async (specificIndices?: number[]) => {
    const currentApiKey = apiKey || process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const indicesToGenerate = specificIndices && specificIndices.length > 0
      ? specificIndices
      : Array.from({ length: shortsCount }, (_, i) => i + 1).filter(idx =>
        !workflow.results.images.some(img => img.label === `숏츠 ${idx}`)
      );

    if (indicesToGenerate.length === 0) {
      addLog("ℹ️ 정보: 생성할 숏츠 이미지가 선택되지 않았거나 이미 존재합니다.");
      return;
    }

    addLog(`[${imageEngine}] 숏츠 이미지 개별/보강 생성 중... (대상: ${indicesToGenerate.map(i => `숏츠 ${i}`).join(', ')})`);
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
        - 날씨: ${workflow.imageParams.weather}
        - 배경: ${workflow.imageParams.backgroundType}
        
        [지시사항]
        0. **사용자 의도 존중**: ${workflow.params.songInterpretation ? '사용자가 제공한 [사용자 곡 해석]을 최우선으로 반영하여 이미지를 구상하세요.' : '가사와 곡 정보를 바탕으로 이미지를 구상하세요.'}
        1. 가사의 핵심 키워드를 시각적으로 구체화하세요.
        2. 사용자가 선택한 [이미지 생성 옵션]을 프롬프트에 반드시 반영하세요.
        3. 영어로 프롬프트를 작성하세요.
        
        JSON 형식으로 출력:
        {
          "shortsPrompts": ["숏츠 하이라이트를 위한 ${indicesToGenerate.length}개의 서로 다른 감성적인 프롬프트."]
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

      for (let i = 0; i < indicesToGenerate.length; i++) {
        const shortsIndex = indicesToGenerate[i];
        addLog(`새로운 숏츠 하이라이트 ${shortsIndex} 생성 중...`);
        const response = await ai.models.generateContent({
          model: imageEngine,
          contents: { parts: [{ text: prompts.shortsPrompts[i] }] },
          config: { imageConfig: { aspectRatio: "9:16" } }
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
          const base64Url = `data:image/png;base64,${part.inlineData.data}`;
          const label = `숏츠 ${shortsIndex}`;
          const tempImage = { url: base64Url, type: 'vertical' as const, label, prompt: prompts.shortsPrompts[i] };

          setWorkflow(prev => ({
            ...prev,
            results: {
              ...prev.results,
              images: [
                ...prev.results.images.filter(img => img.label !== label),
                tempImage
              ]
            }
          }));

          addLog(`📤 [${label}] 클라우드 저장소에 업로드 중...`);
          const storageUrl = await uploadImageToStorage(base64Url);
          const finalUrl = storageUrl || base64Url;
          const finalImage = { ...tempImage, url: finalUrl, localUrl: base64Url };

          setWorkflow(prev => ({
            ...prev,
            results: {
              ...prev.results,
              images: prev.results.images.map(img => img.label === label ? finalImage : img)
            }
          }));
        }
      }

      addLog(`✅ 선택된 숏츠 이미지 생성 완료`);
      setIsShortsGenerating(false);

    } catch (error: any) {
      console.error("Shorts Regeneration Error:", error);
      addLog(`❌ 오류: 숏츠 생성 중 문제가 발생했습니다. (${error instanceof Error ? error.message : String(error)})`);
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

  const downloadImageWithTitle = async (img: { url: string; localUrl?: string; type: 'horizontal' | 'vertical'; label: string }) => {
    addLog(`[${img.label}] 타이틀 포함 이미지 다운로드 준비 중...`);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mainImg = new Image();
      mainImg.crossOrigin = "anonymous";
      mainImg.src = img.localUrl || img.url;

      await new Promise((resolve, reject) => {
        mainImg.onload = resolve;
        mainImg.onerror = () => {
          if (mainImg.crossOrigin) {
            mainImg.crossOrigin = "";
            mainImg.src = img.localUrl || img.url;
          } else {
            reject(new Error("이미지 로드에 실패했습니다 (CORS 문제일 수 있습니다)"));
          }
        };
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
    addLog("가사 레이어 합성 및 자막 렌더링 최적화 시작...");

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
  const [audioFadeIn, setAudioFadeIn] = useState(() => Number(localStorage.getItem('echoesuntohim_audioFadeIn')) || 0);
  const [audioFadeOut, setAudioFadeOut] = useState(() => Number(localStorage.getItem('echoesuntohim_audioFadeOut')) || 3);

  useEffect(() => {
    localStorage.setItem('echoesuntohim_audioFadeIn', audioFadeIn.toString());
  }, [audioFadeIn]);

  useEffect(() => {
    localStorage.setItem('echoesuntohim_audioFadeOut', audioFadeOut.toString());
  }, [audioFadeOut]);

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

  const resetApp = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    try {
      await logout(); // v1.11.3: 로그아웃을 먼저 해서 클라우드 동기화 차단
    } catch (e) {
      console.error("Logout during reset failed", e);
    }
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
            <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Echoes Unto Him</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[7px] font-black text-primary tracking-[0.2em] uppercase opacity-80">AI Vision</span>
              <div className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-0.5 shadow-[0_0_10px_rgba(0,255,163,0.1)]">
                <div className="w-0.5 h-0.5 bg-primary rounded-full animate-pulse" />
                <span className="text-[7px] font-black text-primary uppercase">v1.11.0 PREMIUM</span>
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
            <span className="text-[10px] font-bold text-primary/60 mt-1">1.11.3</span>
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
          <SidebarItem small={true} icon={TypeIcon} label="가사 & 프롬프트" active={activeTab === 'lyrics'} onClick={() => handleTabChange('lyrics')} />
          <SidebarItem small={true} icon={Music} label="음원 리스트" active={activeTab === 'music'} onClick={() => handleTabChange('music')} />
          <SidebarItem small={true} icon={ImageIcon} label="이미지 생성" active={activeTab === 'image'} onClick={() => handleTabChange('image')} />
          <SidebarItem small={true} icon={Video} label="영상 렌더링" active={activeTab === 'video'} onClick={() => handleTabChange('video')} />
          <SidebarItem small={true} icon={Send} label="영상 업로드" active={activeTab === 'publish'} onClick={() => handleTabChange('publish')} />
          <SidebarItem small={true} icon={FileText} label="블로그 생성" active={activeTab === 'blog'} onClick={() => handleTabChange('blog')} />
          {/* 
          <SidebarItem 
            small={true}
            icon={Layers} 
            label="AI 편곡" 
            active={activeTab === 'arrangement'} 
            onClick={() => handleTabChange('arrangement')} 
          />
          */}

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
                  if (err.code !== 'auth/popup-closed-by-user') {
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
              musicEngine={musicEngine}
              apiKey={apiKey}
              addLog={addLog}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
              isTranslating={isTranslating}
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
                onAudioReady={handleSunoAudioReady}
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
              handleUploadToPlatform={handleUploadToPlatform}
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

