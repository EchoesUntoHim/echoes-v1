import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Sparkles,
  Type,
  Send,
  ChevronRight,
  BookOpen,
  Plus,
  Trash2,
  Layout,
  Copy,
  CheckCircle2,
  Youtube,
  Instagram,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Terminal as TerminalIcon,
  Clock,
  Music,
  Image as ImageIcon,
  Zap,
  Download,
  History,
  Database,
  Heart,
  Play,
  Pause,
  Volume2,
  Upload,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { WorkflowState, Step } from '../types';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { Terminal } from './Terminal';
import { DEFAULT_AI_ENGINE, DEFAULT_IMAGE_ENGINE, RENDER_API_URL } from '../constants';
import { auth, db, storage, uploadImageToStorage } from '../firebase';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  where
} from 'firebase/firestore';

interface MeditationItem {
  id: string;
  date: string;
  time: string;
  verse: string;
  content: string;
  keywords: string[];
  cardNews: {
    hook: string;
    body: string;
    cta: string;
  };
  bgImage?: string;
  bgAudio?: string;
  audioName?: string;
}

interface MeditationTabProps {
  workflow: WorkflowState;
  setWorkflow: (wf: WorkflowState) => void;
  addLog: (msg: string) => void;
  handleTabChange: (tab: Step) => void;
  apiKey: string;
  aiEngine: string;
  logs: string[];
  sunoTracks?: any[];
  setSunoTracks?: any;
  addToRenderQueue?: (task: { label: string, payload: any, onComplete?: () => void }) => void;
  isRendering?: boolean;
  user: User | null;
}

export const MeditationTab: React.FC<MeditationTabProps> = ({
  workflow,
  setWorkflow,
  addLog,
  handleTabChange,
  apiKey,
  aiEngine,
  logs,
  sunoTracks,
  setSunoTracks,
  addToRenderQueue,
  isRendering,
  user
}) => {
  const [meditations, setMeditations] = useState<MeditationItem[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_meditations');
    if (saved) return JSON.parse(saved);

    return Array.from({ length: 7 }).map((_, i) => ({
      id: 'med-' + Math.random().toString(36).substring(2, 15),
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '06:00',
      verse: '',
      content: '',
      keywords: [],
      cardNews: { hook: '', body: '', cta: '' }
    }));
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkTheme, setBulkTheme] = useState('');

  // Library State (Cloud-centric)
  const [libImages, setLibImages] = useState<any[]>([]);
  const [histImages, setHistImages] = useState<any[]>([]);
  const [imageLibrary, setImageLibrary] = useState<any[]>([]);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const [libraryPage, setLibraryPage] = useState(0);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'image' | 'audio'>('image');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const ITEMS_PER_PAGE = 14;

  // [v1.15.30] 유령 이미지 찾기 상태
  const [orphanedImages, setOrphanedImages] = useState<{ name: string, url: string }[]>([]);
  const [isScanningOrphans, setIsScanningOrphans] = useState(false);

  // Sync to localStorage (Slimmed)
  React.useEffect(() => {
    try {
      localStorage.setItem('echoesuntohim_meditations', JSON.stringify(meditations));
    } catch (e) {
      console.warn("Local storage sync failed", e);
    }
  }, [meditations]);

  // [v1.15.30] Storage 직결 이미지 도서관 (DB 경유 불필요, 병렬 로딩)
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  
  const loadImagesFromStorage = async () => {
    if (!user) return;
    setIsLoadingLibrary(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/meditation_library`);
      const res = await listAll(storageRef);
      
      if (res.items.length === 0) {
        setImageLibrary([]);
        setIsLoadingLibrary(false);
        return;
      }

      // 병렬 URL 획득 (순차 대비 10배 빠름)
      const images = await Promise.all(
        res.items.map(async (item) => {
          const url = await getDownloadURL(item);
          return { id: item.name, url, name: item.name };
        })
      );
      
      // 최신순 정렬 (파일명 타임스탬프: img_1776605297395_...)
      images.sort((a, b) => {
        const tsA = parseInt(a.name.match(/img_(\d+)/)?.[1] || '0');
        const tsB = parseInt(b.name.match(/img_(\d+)/)?.[1] || '0');
        return tsB - tsA;
      });
      
      setImageLibrary(images);
      addLog(`📚 이미지 도서관: Storage에서 ${images.length}장 로드 완료`);
    } catch (err) {
      console.error('Storage image load error:', err);
      addLog('❌ 이미지 도서관 로드 실패');
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadImagesFromStorage();
  }, [user]);

  // Firebase Audio Library Sync (오디오는 DB 유지)
  useEffect(() => {
    if (!user) return;

    const audQ = query(collection(db, 'users', user.uid, 'audio_library'), orderBy('createdAt', 'desc'));
    const audUnsubscribe = onSnapshot(audQ, (snapshot) => {
      setAudioLibrary(snapshot.docs.map(doc => ({
        id: doc.id,
        url: doc.data().url,
        name: doc.data().name || 'Unknown',
        createdAt: doc.data().createdAt
      })));
    });

    // 미백업 데이터 DB 이전
    const syncPendingToDB = async () => {
      try {
        const pendingData = localStorage.getItem('meditation_history');
        if (!pendingData) return;

        const entries = JSON.parse(pendingData);
        if (Array.isArray(entries) && entries.length > 0) {
          addLog(`📤 미백업 데이터 ${entries.length}개를 클라우드 DB로 전송 중...`);

          for (const entry of entries) {
            await addDoc(collection(db, 'meditation_history'), {
              ...entry,
              userId: user.uid,
              created_at: entry.date || new Date().toISOString(),
              status: 'synced'
            }).catch(() => { });
          }

          addLog("✅ 모든 데이터가 클라우드 DB에 안전하게 통합되었습니다.");
          localStorage.removeItem('meditation_history');
        }
      } catch (e) {
        console.warn("Sync failed", e);
      }
    };

    syncPendingToDB();

    return () => {
      audUnsubscribe();
    };
  }, [user]);

  // [v1.15.30] 묵상용 유령 이미지 스캔
  const scanMeditationOrphans = async () => {
    if (!user) return;
    setIsScanningOrphans(true);
    setOrphanedImages([]);
    addLog("👻 묵상 이미지 스토리지에서 유령 이미지를 탐색합니다...");
    try {
      // DB에 있는 이미지 URL에서 파일명 추출
      const dbImageNames = new Set<string>();
      imageLibrary.forEach(img => {
        if (img.url) {
          const match = img.url.match(/\/(meditation_library|meditation|images)%2F(.*?)\?/);
          if (match && match[2]) dbImageNames.add(decodeURIComponent(match[2]));
        }
      });

      // Storage 스캔 (실제 폴더: meditation_library)
      const storageRef = ref(storage, `users/${user.uid}/meditation_library`);
      const res = await listAll(storageRef);
      const orphans: { name: string, url: string }[] = [];

      for (const item of res.items) {
        if (!dbImageNames.has(item.name)) {
          const url = await getDownloadURL(item);
          orphans.push({ name: item.name, url });
        }
      }

      setOrphanedImages(orphans);
      if (orphans.length > 0) {
        addLog(`⚠️ DB에 없는 유령 이미지 ${orphans.length}개를 스토리지에서 발견했습니다.`);
      } else {
        addLog(`✅ 스토리지에 유령 이미지가 없습니다. 깨끗합니다!`);
      }
    } catch (err) {
      console.error(err);
      addLog("❌ 유령 이미지 탐색 중 오류가 발생했습니다.");
    } finally {
      setIsScanningOrphans(false);
    }
  };

  const recoverOrphanToLibrary = async (name: string, url: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'meditation_history'), {
        userId: user.uid,
        type: 'meditation',
        title: `복구된 이미지 (${name})`,
        imageUrl: url,
        prompt: '스토리지 복구',
        created_at: serverTimestamp()
      });
      setOrphanedImages(prev => prev.filter(img => img.name !== name));
      addLog(`✅ 유령 이미지 복구 완료: ${name}`);
    } catch (err) {
      addLog(`❌ 복구 실패: ${name}`);
    }
  };

  // [v1.15.30] 전체 복구
  const recoverAllOrphans = async () => {
    if (!user || orphanedImages.length === 0) return;
    if (!confirm(`유령 이미지 ${orphanedImages.length}개를 전부 DB에 복구하시겠습니까?`)) return;
    
    addLog(`📦 유령 이미지 ${orphanedImages.length}개 전체 복구 시작...`);
    let successCount = 0;
    
    for (const img of orphanedImages) {
      try {
        await addDoc(collection(db, 'meditation_history'), {
          userId: user.uid,
          type: 'meditation',
          title: `복구된 이미지 (${img.name})`,
          imageUrl: img.url,
          prompt: '스토리지 일괄 복구',
          created_at: serverTimestamp()
        });
        successCount++;
      } catch (err) {
        console.warn(`Failed to recover: ${img.name}`);
      }
    }
    
    setOrphanedImages([]);
    addLog(`✅ 유령 이미지 ${successCount}/${orphanedImages.length}개 전체 복구 완료!`);
  };

  const deleteOrphanImage = async (name: string) => {
    if (!user) return;
    if (!confirm(`스토리지에서 이 이미지를 영구 삭제하시겠습니까?`)) return;
    try {
      const itemRef = ref(storage, `users/${user.uid}/meditation_library/${name}`);
      await deleteObject(itemRef);
      setOrphanedImages(prev => prev.filter(img => img.name !== name));
      addLog(`🗑️ 유령 이미지 삭제 완료: ${name}`);
    } catch (err) {
      addLog(`❌ 삭제 실패`);
    }
  };

  const updateMeditation = (index: number, updates: Partial<MeditationItem>) => {
    setMeditations(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };


  const handleLoadFromHistory = (track: any) => {
    if (!track) return;

    // 현재 선택된 인덱스의 묵상 카드 업데이트
    const updates: Partial<MeditationItem> = {
      verse: track.prompt || track.verse || meditations[activeIndex].verse,
      content: track.content || meditations[activeIndex].content,
      keywords: track.keywords || meditations[activeIndex].keywords || [],
      bgImage: track.generatedImages?.[0]?.url || track.imageUrl || track.bgImage || meditations[activeIndex].bgImage,
    };

    updateMeditation(activeIndex, updates);
    addLog(`✨ 히스토리에서 [${track.title}] 데이터를 불러왔습니다.`);

    // 화면 상단 편집 영역으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFromHistory = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    if (!db) return;
    if (!confirm(`[${track.title || '무제'}] 히스토리를 정말 삭제하시겠습니까?`)) return;

    try {
      addLog(`🗑️ 히스토리 삭제 중...`);
      // meditation_history 컬렉션에서 삭제
      await deleteDoc(doc(db, 'meditation_history', track.id)).catch(() => { });

      if (setSunoTracks) {
        setSunoTracks((prev: any[]) => prev.filter(t => t.id !== track.id));
      }
      addLog(`✅ 삭제 완료.`);
    } catch (err: any) {
      addLog(`❌ 삭제 실패: ${err.message}`);
    }
  };

  const handleGenerateAI = async (index: number) => {
    const item = meditations[index];
    if (!item.content && !item.verse) {
      addLog("⚠️ 내용이나 말씀을 먼저 입력해주세요.");
      return;
    }

    if (!apiKey) {
      addLog("⚠️ API 키가 설정되지 않았습니다. 설정 탭에서 Gemini API 키를 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    addLog(`✨ [Day ${index + 1}] AI 수익화 분석 엔진 가동...`);

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const selectedModel = aiEngine || DEFAULT_AI_ENGINE;

      const prompt = `
        당신은 '혁신AI'의 성공 공식을 마스터한 CCM 수익화 전문가이자 감성 에세이스트입니다. 
        성경 말씀과 묵상을 바탕으로 사람들의 마음을 훔치고 행동을 끌어내는 콘텐츠를 설계하세요.

        [분석 가이드라인]
        1. **페르소나**: 따뜻하고 공감 능력이 뛰어난 위로 전문가.
        2. **구조**:
           - **Hook**: 시청자의 고민이나 상황을 한 문장으로 찔러주는 문구
           - **Body**: 에세이처럼 서정적인 묵상 요약 (3문장 이내)
           - **CTA**: 구체적 행동 유도 (예: "오늘의 말씀을 저장하세요")
        3. **키워드**: 조회수를 부르는 황금 키워드 7개.

        [데이터]
        성경 구절: ${item.verse}
        묵상 내용: ${item.content}

        [응답 형식 JSON]
        {
          "keywords": ["#키워드1", ...],
          "cardNews": {
            "hook": "후킹 문구",
            "body": "본문",
            "cta": "행동 유도"
          },
          "formattedVerse": "줄바꿈(\\n)이 포함된 성경 구절"
        }
        반드시 JSON 형식으로만 응답하세요. 
        [줄바꿈 및 데이터 보존 가이드라인]:
        1. **성경 장절(예: 시편 23:1)은 어떤 일이 있어도 절대로 생략하지 말고 반드시 마지막 줄에 포함하세요.**
        2. 띄어쓰기를 제외하고 7~10글자 근처에서 의미 단위로 줄바꿈(\n)하세요. (황금 비율 줄바꿈)
        3. 단어는 절대 중간에 분리하지 마세요. (예를 들어 한 줄이 11글자가 넘어간다면 그 이전 단어에서 줄바꿈하세요).
        4. 원본 말씀의 내용을 하나도 빠짐없이 포함하세요.
      `;

      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        updateMeditation(index, {
          keywords: data.keywords,
          cardNews: data.cardNews,
          verse: data.formattedVerse || item.verse
        });
        addLog(`✅ [Day ${index + 1}] 분석 및 줄바꿈 최적화 완료!`);
      }
    } catch (e: any) {
      addLog(`❌ 분석 오류: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateFullPlan = async () => {
    if (!apiKey || !bulkTheme) return;
    setIsAnalyzing(true);
    addLog(`🚀 [주제: ${bulkTheme}] 일주일 치 콘텐츠 일괄 생산 시작...`);

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const selectedModel = aiEngine || DEFAULT_AI_ENGINE;

      const fullPrompt = `
        당신은 '혁신AI'의 성공 공식을 마스터한 CCM 수익화 전문가이자 감성 에세이스트입니다. 
        주제 '${bulkTheme}'에 맞춰 일주일(7일) 분량의 고전환 묵상 콘텐츠를 생성하세요.

        [분석 가이드라인]
        1. **페르소나**: 따뜻하고 공감 능력이 뛰어난 위로 전문가.
        2. **Verse (말씀)**: 숏츠 세로 화면에 최적화된 줄바꿈(\\n)을 반드시 포함할 것.
           - **황금 비율 룰**: 띄어쓰기 제외 7~10글자 근처에서 의미 단위로 줄바꿈.
           - 단어는 절대 중간에 분리하지 말 것 (11자 초과 시 이전 단어에서 끊기).
           - 성경 장절은 반드시 마지막 줄에 포함.
        3. **Content (묵상)**: 감성적인 3줄 묵상.
        4. **CardNews Hook**: 궁금함을 유발하는 후킹 문구.

        JSON 배열 형식으로 응답하세요. (Array of 7 items)
      `;

      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const newMeditations = meditations.map((item, idx) => ({
          ...item,
          verse: data[idx]?.verse || item.verse,
          content: data[idx]?.content || item.content,
          keywords: data[idx]?.keywords || item.keywords,
          cardNews: data[idx]?.cardNews || item.cardNews
        }));
        setMeditations(newMeditations);
        addLog(`✅ 일주일 치 콘텐츠 생산 완료!`);
      }
    } catch (e: any) {
      addLog(`❌ 일괄 생산 오류: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBulkDateSet = () => {
    const start = new Date();
    const newMeditations = meditations.map((item, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return { ...item, date: d.toISOString().split('T')[0] };
    });
    setMeditations(newMeditations);
    addLog("📅 날짜가 오늘부터 7일간 정렬되었습니다.");
  };

  const saveImageToLibrary = async (url: string) => {
    if (!auth.currentUser) return null;
    try {
      const permanentUrl = await uploadImageToStorage(url, 'meditation_library');
      if (permanentUrl) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'meditation_library'), {
          url: permanentUrl,
          createdAt: serverTimestamp()
        });
        return permanentUrl;
      }
    } catch (e) {
      console.error("Library save failed", e);
    }
    return null;
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setIsAnalyzing(true);
    addLog(`🎵 [${file.name}] 오디오 라이브러리 업로드 중...`);
    try {
      const permanentUrl = await uploadImageToStorage(file as any, 'audio_library');
      if (permanentUrl) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'audio_library'), {
          url: permanentUrl,
          name: file.name,
          createdAt: serverTimestamp()
        });
        addLog("✅ 음악이 도서관에 등록되었습니다.");
      }
    } catch (e: any) {
      addLog(`❌ 업로드 실패: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // [v1.15.30] 체크박스 선택 상태
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageItems = imageLibrary.slice(libraryPage * ITEMS_PER_PAGE, (libraryPage + 1) * ITEMS_PER_PAGE);
    if (selectedImages.size === pageItems.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(pageItems.map(img => img.id)));
    }
  };

  // Storage 직접 삭제 (단일)
  const deleteFromLibrary = async (id: string, type: 'image' | 'audio') => {
    if (!auth.currentUser) return;
    if (type === 'audio') {
      // 오디오는 DB 유지
      if (!confirm('도서관에서 삭제하시겠습니까?')) return;
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'audio_library', id));
        addLog(`🗑️ 오디오 삭제 완료.`);
      } catch (e: any) {
        addLog(`❌ 삭제 실패: ${e.message}`);
      }
    } else {
      // 이미지: Storage 직접 삭제
      if (!confirm('이미지를 영구 삭제하시겠습니까?')) return;
      try {
        const itemRef = ref(storage, `users/${auth.currentUser.uid}/meditation_library/${id}`);
        await deleteObject(itemRef);
        setImageLibrary(prev => prev.filter(img => img.id !== id));
        addLog(`🗑️ 이미지 삭제 완료: ${id}`);
      } catch (e: any) {
        addLog(`❌ 삭제 실패: ${e.message}`);
      }
    }
  };

  // [v1.15.30] 선택된 이미지 일괄 삭제
  const deleteSelectedImages = async () => {
    if (!auth.currentUser || selectedImages.size === 0) return;
    if (!confirm(`선택한 ${selectedImages.size}개 이미지를 영구 삭제하시겠습니까?\n(삭제 후 복구 불가)`)) return;
    
    addLog(`🗑️ ${selectedImages.size}개 이미지 일괄 삭제 시작...`);
    let successCount = 0;

    for (const id of selectedImages) {
      try {
        const itemRef = ref(storage, `users/${auth.currentUser.uid}/meditation_library/${id}`);
        await deleteObject(itemRef);
        successCount++;
      } catch (e) {
        console.warn(`Delete failed: ${id}`);
      }
    }

    setImageLibrary(prev => prev.filter(img => !selectedImages.has(img.id)));
    setSelectedImages(new Set());
    setIsSelectMode(false);
    setLibraryPage(0); // 삭제 후 1페이지로 이동
    addLog(`✅ ${successCount}개 이미지 삭제 완료!`);
  };

  const togglePlayAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudioId(id);
      }
    }
  };

  // 요일별 파스텔 색상 (고정) - 원본 순서 유지
  const DAY_COLORS = [
    { day: '일요일', color: 'soft lavender purple, pastel violet' },
    { day: '월요일', color: 'soft periwinkle blue, pastel lavender blue' },
    { day: '화요일', color: 'soft teal, pastel mint green-blue' },
    { day: '수요일', color: 'soft sage green, pastel mint green' },
    { day: '목요일', color: 'soft lemon yellow, pastel warm yellow' },
    { day: '금요일', color: 'soft tangerine orange, pastel warm orange' },
    { day: '토요일', color: 'soft coral pink, pastel salmon pink' },
  ];

  const SYMBOL_POSITIONS = ['bottom-left', 'bottom-center', 'bottom-right', 'center', 'top-left', 'top-right'];
  const getRandomPosition = () => SYMBOL_POSITIONS[Math.floor(Math.random() * SYMBOL_POSITIONS.length)];

  // AI에게 창의적 자유를 부여하는 묵상 프롬프트 생성 (제한 삭제)
  const buildMeditationPrompt = (index: number, verse?: string) => {
    const dayInfo = DAY_COLORS[index % 7];
    const position = getRandomPosition();

    // 심볼을 고정하지 않고, AI가 구절(Verse)이나 주제를 바탕으로 기독교적인 상징물을 그리도록 유도
    const prompt = `A premium, artistic vertical background (9:16) for a Christian meditation app. 
      [STYLE]: Minimalist, serene, and spiritually uplifting. 
      [BACKGROUND]: Smooth, clean pastel ${dayInfo.color} tones with a soft paper texture.
      [SUBJECT]: Create a beautiful, creative Christian-themed symbol, object, or scene inspired by the spiritual essence of the verse: "${verse || 'Grace and Peace'}". 
      Examples could be an artistic cross, a gentle lamb, a sacred light, botanical elements like lilies or olive branches, or a serene landscape, but do not limit to these. 
      [COMPOSITION]: Place the main subject elegantly around the ${position} area. 
      [AESTHETIC]: High-quality artistic illustration (e.g., watercolor, soft oil, or clean minimalist vector), very clean and uncluttered. 
      STRICTLY NO TEXT, LETTERS, OR WORDS on the image. High-end stationery/bookmark vibe.`;

    return { prompt, position, dayInfo };
  };

  const handleGenerateAllImages = async () => {
    if (!apiKey) {
      addLog("⚠️ API 키가 설정되지 않았습니다.");
      return;
    }

    setIsAnalyzing(true);
    addLog(`🎨 [이미지 공장] 엔진: ${DEFAULT_IMAGE_ENGINE} | 요일별 파스텔 색상 + 기독교 심볼 이미지 생성 시작...`);

    const genAI = new GoogleGenAI({ apiKey });
    const modelName = DEFAULT_IMAGE_ENGINE;

    try {
      for (let i = 0; i < meditations.length; i++) {
        try {
          const item = meditations[i];
          const dayInfo = DAY_COLORS[i % 7];
          addLog(`🖼️ [Day ${i + 1} - ${dayInfo.day}] ${dayInfo.color} 색상 이미지 생성 중...`);

          const { prompt, position } = buildMeditationPrompt(i, item.verse);

          const response = await genAI.models.generateImages({
            model: modelName,
            prompt: prompt,
            config: {
              aspectRatio: "9:16",
              numberOfImages: 1,
              outputMimeType: "image/png"
            }
          });

          const image = response.generatedImages[0];
          if (image?.image?.imageBytes) {
            const base64Url = `data:image/png;base64,${image.image.imageBytes}`;

            // [v1.15.36] UI 즉시 업데이트 (Base64 우선 적용)
            updateMeditation(i, { bgImage: base64Url });
            addLog(`📸 [Day ${i + 1}] 이미지 생성 완료! 화면에 즉시 적용합니다.`);

            // [v1.15.42] 즉각적인 DB 저장 (백그라운드 지연 제거)
            try {
              const permanentUrl = await saveImageToLibrary(base64Url);
              if (user) {
                const historyData = {
                  userId: user.uid,
                  type: 'meditation',
                  title: `묵상 배경 (${dayInfo.day})`,
                  imageUrl: permanentUrl || base64Url,
                  prompt: prompt,
                  position: position,
                  day: dayInfo.day,
                  color: dayInfo.color,
                  engine: modelName,
                  created_at: serverTimestamp(), // [v1.15.29] 문자열 대신 Timestamp 사용
                  createdAt: serverTimestamp()   // [v1.15.29] 필드명 동기화
                };
                const docRef = await addDoc(collection(db, 'meditation_history'), historyData);

                // 도서관 상태 즉시 업데이트 (SunoTracks 연동)
                if (setSunoTracks) {
                  setSunoTracks(prev => [{ ...historyData, id: docRef.id }, ...prev]);
                }

                // 최종 영구 URL 적용
                updateMeditation(i, { bgImage: permanentUrl || base64Url });
                addLog(`✅ [Day ${i + 1}] DB 저장 완료.`);
              }
            } catch (err) {
              console.error("Immediate save failed", err);
              addLog(`⚠️ [Day ${i + 1}] DB 저장 중 오류가 발생했으나 작업은 계속됩니다.`);
            }
          } else {
            addLog(`⚠️ [Day ${i + 1}] 이미지 데이터가 비어 있습니다.`);
          }
        } catch (e: any) {
          addLog(`❌ [Day ${i + 1}] 이미지 생성 실패: ${e.message}`);
          // 루프는 계속 진행됨
        }
      }
      addLog("✅ 7일간의 요일별 파스텔 배경 생성 작업이 완료되었습니다!");
    } catch (e: any) {
      addLog(`❌ [엔진: ${DEFAULT_IMAGE_ENGINE}] 이미지 생성 오류: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSingleImage = async (index: number) => {
    if (!apiKey) return;
    setIsAnalyzing(true);
    const dayInfo = DAY_COLORS[index % 7];
    addLog(`🖼️ [Day ${index + 1} - ${dayInfo.day}] 단일 이미지 생성 중...`);
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const item = meditations[index];
      const { prompt, position } = buildMeditationPrompt(index, item.verse);

      const response = await genAI.models.generateImages({
        model: DEFAULT_IMAGE_ENGINE,
        prompt: prompt,
        config: { aspectRatio: "9:16", numberOfImages: 1, outputMimeType: "image/png" }
      });

      const image = response.generatedImages[0];
      if (image?.image?.imageBytes) {
        const base64Url = `data:image/png;base64,${image.image.imageBytes}`;

        // [v1.15.36] UI 즉시 업데이트 (Base64 우선 적용)
        updateMeditation(index, { bgImage: base64Url });
        addLog(`📸 [Day ${index + 1}] 이미지가 교체되었습니다. 화면에 즉시 적용합니다.`);

        // 백그라운드 저장 프로세스
        (async () => {
          try {
            const permanentUrl = await saveImageToLibrary(base64Url);
            const user = auth.currentUser;
            if (user) {
              const historyData = {
                userId: user.uid,
                type: 'meditation',
                title: `묵상 배경 (${dayInfo.day})`,
                imageUrl: permanentUrl || base64Url,
                prompt: prompt,
                position: position,
                day: dayInfo.day,
                color: dayInfo.color,
                engine: DEFAULT_IMAGE_ENGINE,
                created_at: new Date().toISOString()
              };
              const docRef = await addDoc(collection(db, 'meditation_history'), historyData);
              if (setSunoTracks) {
                setSunoTracks(prev => [{ ...historyData, id: docRef.id }, ...prev]);
              }
              // 영구 URL로 교체
              updateMeditation(index, { bgImage: permanentUrl || base64Url });
            }
          } catch (err) {
            console.error("Single meditation background save failed", err);
          }
        })();
      }
    } catch (e: any) {
      addLog(`❌ [엔진: ${DEFAULT_IMAGE_ENGINE}] 생성 오류: ${e.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBulkRender = async () => {
    if (!apiKey || !addToRenderQueue) return;
    setIsAnalyzing(true);
    addLog("🎬 대량 렌더링을 대기열에 등록합니다...");

    for (let i = 0; i < meditations.length; i++) {
      const item = meditations[i];
      if (!item.bgImage) {
        addLog(`⚠️ [Day ${i + 1}] 이미지가 없어 건너뜁니다.`);
        continue;
      }
      if (!item.verse || !item.content) {
        addLog(`⚠️ [Day ${i + 1}] 말씀 또는 묵상 내용이 없어 건너뜁니다.`);
        continue;
      }

      const typingDuration = Math.min(15, Math.max(3, item.verse.length * 0.15));
      const payload = {
        assets: {
          audioUrl: item.bgAudio || "https://storage.googleapis.com/echoes-unto-him.appspot.com/assets/peaceful_meditation.mp3",
          imageUrl: item.bgImage
        },
        settings: {
          koreanTitle: item.verse,
          lyrics: item.content,
          type: 'shorts',
          duration: 60,
          titleSettings: {
            animation: 'typing',
            titlePosition: 'middle',
            titleFade: typingDuration,
            lyricsDisplayMode: 'center',
            lyricsStartTime: typingDuration + 1,
            showVisualizer: true,
            particleSystem: 'dust'
          }
        }
      };

      addToRenderQueue({
        label: `[Day ${i + 1}] ${item.verse}`,
        payload,
        onComplete: () => {
          addLog(`✅ [Day ${i + 1}] 렌더링 완료!`);
        }
      });
    }

    addLog("📥 7일간의 모든 렌더링 작업이 대기열에 추가되었습니다.");
    setIsAnalyzing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Sparkles className="text-primary w-8 h-8" />
            1분 묵상 Factory
          </h2>
          <p className="text-gray-400 mt-1 text-sm italic">"일주일 치 묵상을 한 번에!"</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={bulkTheme}
            onChange={(e) => setBulkTheme(e.target.value)}
            placeholder="주제 입력 (예: 감사)"
            className="w-40 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500 transition-all"
          />
          <button onClick={handleGenerateFullPlan} className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> 자동 생산</button>
          <button onClick={handleBulkDateSet} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> 날짜 설정</button>
          <button onClick={handleGenerateAllImages} className="px-4 py-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-xl font-bold text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 배경 생성</button>
          <button
            onClick={handleBulkRender}
            disabled={isRendering || meditations.every(m => !m.bgImage)}
            className={cn(
              "px-6 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg transition-all",
              isRendering
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-primary text-background hover:scale-105 active:scale-95"
            )}
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                대량 렌더링
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {meditations.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group",
                activeIndex === idx ? "bg-primary/10 border-primary/40 shadow-xl" : "bg-white/5 border-white/5"
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn("text-[9px] font-black tracking-widest", activeIndex === idx ? "text-primary" : "text-gray-500")}>DAY {idx + 1}</span>
                <div className="flex gap-1">
                  {item.bgImage && <ImageIcon className="w-3 h-3 text-pink-400" />}
                  {item.keywords.length > 0 && <CheckCircle className="w-3 h-3 text-primary" />}
                </div>
              </div>
              <p className="text-white font-bold text-sm">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}</p>
              <p className="text-[10px] text-gray-500 truncate mt-1 italic">{item.verse || "준비 전"}</p>
              {activeIndex === idx && <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Vertical Shorts Preview Mockup */}
              <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-[320px] space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> 숏츠 9:16 미리보기
                  </label>
                  <div className="relative aspect-[9/16] w-full bg-black rounded-[3rem] border-[8px] border-white/5 overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] group ring-1 ring-white/10">
                    {meditations[activeIndex].bgImage ? (
                      <>
                        <img src={meditations[activeIndex].bgImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Preview" />
                        {/* Deep Cinematic Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />

                        {/* Typewriter Preview Overlay - Clean & Simple */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                          <motion.p
                            key={meditations[activeIndex].verse}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="text-white text-xl md:text-2xl font-bold italic tracking-tight leading-[1.6] whitespace-pre-wrap break-keep"
                            style={{
                              textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
                              fontFamily: "'Outfit', sans-serif"
                            }}
                          >
                            {meditations[activeIndex].verse || "말씀을 입력하세요"}
                          </motion.p>
                        </div>

                        {meditations[activeIndex].bgAudio && (
                          <div className="absolute top-8 left-8 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3 text-[10px] text-emerald-400 font-black shadow-2xl">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            {meditations[activeIndex].audioName || "배경음악 재생 중"}
                          </div>
                        )}

                        <button
                          onClick={() => handleGenerateSingleImage(activeIndex)}
                          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full text-white opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10">
                        <ImageIcon className="w-16 h-16" />
                        <button onClick={() => handleGenerateSingleImage(activeIndex)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-white border border-white/10 transition-all">배경 생성</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Card */}
              <GlassCard className="p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">게시 일자</label>
                      <input type="date" value={meditations[activeIndex].date} onChange={(e) => updateMeditation(activeIndex, { date: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary transition-all color-scheme-dark" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">게시 시간</label>
                      <input type="time" value={meditations[activeIndex].time} onChange={(e) => updateMeditation(activeIndex, { time: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-primary transition-all color-scheme-dark" />
                    </div>
                  </div>
                  <button onClick={() => handleGenerateAI(activeIndex)} className="px-6 py-3 bg-primary text-background rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg hover:scale-105 transition-all"><Sparkles className="w-4 h-4" /> AI 분석 및 최적화</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2"><BookOpen className="w-3 h-3" /> 말씀 (Verse)</label>
                    <textarea value={meditations[activeIndex].verse} onChange={(e) => updateMeditation(activeIndex, { verse: e.target.value })} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-primary outline-none transition-all resize-none leading-relaxed" placeholder="성경 말씀과 장절을 입력하세요..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase flex items-center gap-2"><Type className="w-3 h-3" /> 묵상 (Content)</label>
                    <textarea value={meditations[activeIndex].content} onChange={(e) => updateMeditation(activeIndex, { content: e.target.value })} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-primary outline-none transition-all resize-none leading-relaxed" placeholder="짧고 깊은 묵상 내용을 입력하세요..." />
                  </div>
                </div>
              </GlassCard>

              {/* Minimalist AI Results */}
              {meditations[activeIndex].keywords.length > 0 && (
                <div className="pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-3">
                    <h3 className="text-amber-500/60 font-black text-[10px] tracking-[0.3em] uppercase flex items-center gap-2">
                      <Youtube className="w-3 h-3" /> Keywords
                    </h3>
                    <div className="text-gray-400 text-sm leading-relaxed flex flex-wrap gap-x-4 gap-y-1">
                      {meditations[activeIndex].keywords.map((kw, i) => (
                        <span key={i} className="hover:text-amber-500/80 transition-colors cursor-default">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-indigo-400/60 font-black text-[10px] tracking-[0.3em] uppercase flex items-center gap-2">
                      <Instagram className="w-3 h-3" /> SNS Concept
                    </h3>
                    <div className="space-y-2 border-l border-white/10 pl-4">
                      <p className="text-white text-sm font-bold leading-snug italic">
                        "{meditations[activeIndex].cardNews.hook}"
                      </p>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {meditations[activeIndex].cardNews.body}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Integrated Library (도서관) */}
      <div className="pt-12 border-t border-white/10 space-y-8">
        <audio ref={audioRef} onEnded={() => setPlayingAudioId(null)} className="hidden" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-white/5 p-1 rounded-2xl gap-1 ring-1 ring-white/10">
            <button
              onClick={() => setActiveLibraryTab('image')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                activeLibraryTab === 'image' ? "bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" : "text-gray-500 hover:text-white"
              )}
            >
              <ImageIcon className="w-4 h-4" /> 이미지 도서관
            </button>
            <button
              onClick={() => setActiveLibraryTab('audio')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                activeLibraryTab === 'audio' ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "text-gray-500 hover:text-white"
              )}
            >
              <Music className="w-4 h-4" /> 배경음악 도서관
            </button>
          </div>

          <div className="flex items-center gap-4">
            {activeLibraryTab === 'image' ? (
              <div className="flex items-center gap-2">
                {/* 선택 모드 토글 */}
                <button
                  onClick={() => { setIsSelectMode(!isSelectMode); setSelectedImages(new Set()); }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all border",
                    isSelectMode ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                  )}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {isSelectMode ? '선택 취소' : '선택 모드'}
                </button>
                {isSelectMode && (
                  <>
                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-2 bg-white/5 text-gray-300 border border-white/10 rounded-xl text-[10px] font-black hover:bg-white/10 transition-all"
                    >
                      {selectedImages.size === imageLibrary.slice(libraryPage * ITEMS_PER_PAGE, (libraryPage + 1) * ITEMS_PER_PAGE).length ? '전체 해제' : '전체 선택'}
                    </button>
                    <button
                      onClick={deleteSelectedImages}
                      disabled={selectedImages.size === 0}
                      className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black flex items-center gap-1.5 hover:bg-red-500/40 transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-3 h-3" />
                      {selectedImages.size}개 삭제
                    </button>
                  </>
                )}
                <button
                  onClick={scanMeditationOrphans}
                  disabled={isScanningOrphans}
                  className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-amber-500/20 transition-all"
                >
                  <AlertCircle className="w-3 h-3" />
                  {isScanningOrphans ? '스캔 중...' : '유령 찾기'}
                </button>
                <span className="text-[10px] font-bold text-gray-500 uppercase mr-2">Page {libraryPage + 1}</span>
                <button onClick={() => setLibraryPage(p => Math.max(0, p - 1))} disabled={libraryPage === 0} className="p-2 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all border border-white/5">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setLibraryPage(p => p + 1)} disabled={imageLibrary.length <= (libraryPage + 1) * ITEMS_PER_PAGE} className="p-2 hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all border border-white/5">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-emerald-500/20 transition-all group">
                <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                내 음악 업로드 (MP3)
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </label>
            )}
          </div>
        </div>

        {activeLibraryTab === 'image' ? (
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-14 gap-3">
            {imageLibrary.slice(libraryPage * ITEMS_PER_PAGE, (libraryPage + 1) * ITEMS_PER_PAGE).map((img) => (
              <motion.div
                key={img.id}
                layoutId={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative group aspect-[9/16] rounded-xl overflow-hidden border transition-all cursor-pointer",
                  selectedImages.has(img.id) ? "border-red-500 ring-2 ring-red-500/30 scale-105 z-10" :
                  meditations[activeIndex].bgImage === img.url ? "border-primary ring-2 ring-primary/20 scale-105 z-10" : "border-white/5 bg-black/40 hover:border-white/20"
                )}
                onClick={() => isSelectMode ? toggleImageSelection(img.id) : updateMeditation(activeIndex, { bgImage: img.url })}
              >
                <img src={img.url} className="w-full h-full object-cover" alt="Library Item" />
                {/* 체크박스 (선택 모드) */}
                {isSelectMode && (
                  <div className={cn(
                    "absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all z-20",
                    selectedImages.has(img.id) ? "bg-red-500 border-red-500" : "bg-black/40 border-white/30 backdrop-blur-sm"
                  )}>
                    {selectedImages.has(img.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                )}
                {!isSelectMode && (
                  <>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFromLibrary(img.id, 'image'); }}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all backdrop-blur-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </motion.div>
            ))}
            {imageLibrary.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-white/5 opacity-30">
                <ImageIcon className="w-12 h-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">이미지 도서관이 비어있습니다.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audioLibrary.map((aud) => (
              <motion.div
                key={aud.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-5 rounded-3xl border transition-all flex items-center justify-between group relative overflow-hidden",
                  meditations[activeIndex].bgAudio === aud.url ? "bg-emerald-500/10 border-emerald-500/40 shadow-xl" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-4 overflow-hidden relative z-10">
                  <button
                    onClick={() => togglePlayAudio(aud.url, aud.id)}
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      playingAudioId === aud.id ? "bg-emerald-500 text-white scale-95" : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                    )}
                  >
                    {playingAudioId === aud.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="overflow-hidden">
                    <p className="text-sm font-black text-white truncate">{aud.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Personal Audio</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  <button
                    onClick={() => updateMeditation(activeIndex, { bgAudio: aud.url, audioName: aud.name })}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                      meditations[activeIndex].bgAudio === aud.url ? "bg-emerald-500 text-white shadow-lg" : "bg-white/10 text-gray-400 hover:bg-white/20"
                    )}
                  >
                    {meditations[activeIndex].bgAudio === aud.url ? "선택됨" : "선택"}
                  </button>
                  <button
                    onClick={() => deleteFromLibrary(aud.id, 'audio')}
                    className="p-2.5 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {meditations[activeIndex].bgAudio === aud.url && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                )}
              </motion.div>
            ))}
            {audioLibrary.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-white/5 opacity-30">
                <Music className="w-12 h-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">음악 도서관이 비어있습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* [v1.15.30] 유령 이미지 결과 */}
      {orphanedImages.length > 0 && (
        <div className="pt-6 border-t border-amber-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                묵상 유령 이미지 ({orphanedImages.length}개)
              </span>
            </div>
            <button
              onClick={recoverAllOrphans}
              className="px-5 py-2 bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-primary/40 transition-all"
            >
              <Database className="w-3.5 h-3.5" />
              전체 DB 복구 ({orphanedImages.length}개)
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-3">
            {orphanedImages.map((img) => (
              <div key={img.name} className="relative group aspect-[9/16] rounded-xl overflow-hidden border border-amber-500/20 bg-black/40">
                <img src={img.url} className="w-full h-full object-cover" alt="Orphan" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => recoverOrphanToLibrary(img.name, img.url)}
                    className="px-3 py-1 bg-primary/80 text-background text-[9px] font-black rounded-lg hover:bg-primary transition-all"
                  >
                    복구
                  </button>
                  <button
                    onClick={() => deleteOrphanImage(img.name)}
                    className="px-3 py-1 bg-red-500/80 text-white text-[9px] font-black rounded-lg hover:bg-red-500 transition-all"
                  >
                    삭제
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-0.5">
                  <p className="text-[7px] text-amber-400 truncate">{img.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="pt-8 border-t border-white/5">
        <Terminal logs={logs} />
      </div>

      {/* History List (v1.12.1: Slimmed) */}
      {(sunoTracks || []).some(t => t && t.title && t.title.includes('묵상 배경') && t.generatedImages && t.generatedImages.length > 0) && (
        <div className="space-y-4 mt-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-2 pb-3 border-b border-white/5">
              <Database className="w-3 h-3 text-primary/50" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">묵상 이미지 생성 히스토리 (Slim List)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {(() => {
                const uniqueTracks = Array.from(new Map((sunoTracks || [])
                  .filter(t => t && t.title && t.title.includes('묵상 배경') && t.generatedImages && t.generatedImages.length > 0)
                  .map(t => [t.id, t])
                ).values());

                const paginatedTracks = uniqueTracks.slice(0, 20);

                return (
                  <>
                    {paginatedTracks.map((track: any, idx: number) => {
                      const imageMeta = track.generatedImages?.[0];
                      return (
                        <div
                          key={track.id || idx}
                          onClick={() => handleLoadFromHistory(track)}
                          className="group cursor-pointer flex items-center justify-between bg-black/20 hover:bg-white/5 border-l-2 border-transparent hover:border-primary transition-all pr-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 py-1.5 pl-3">
                            <span className="text-[9px] font-bold text-primary/40 group-hover:text-primary transition-colors w-3">{idx + 1}</span>
                            <div className="flex flex-col min-w-0">
                              <p className="text-[11px] font-bold text-white/90 truncate tracking-tight">
                                {track.title || '무제'}
                              </p>
                              {imageMeta?.color && (
                                <span className="text-[8px] text-gray-500 font-medium truncate uppercase tracking-tighter">
                                  {imageMeta.color} • {imageMeta.symbol || 'Meditation'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 h-full">
                            <span className="text-[8px] text-gray-600 font-medium">
                              {new Date(track.created_at || track.createdAt || Date.now()).toLocaleDateString().replace(/\. /g, '.')}
                            </span>
                            <button
                              onClick={(e) => deleteFromHistory(e, track)}
                              className="opacity-0 group-hover:opacity-100 h-[32px] aspect-square flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-all border-l border-white/5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

