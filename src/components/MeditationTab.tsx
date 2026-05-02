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
  ChevronRight as ChevronRightIcon,
  Video,
  ExternalLink,
  Maximize2,
  X
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
  where,
  getDocs,
  setDoc,
  getDoc
} from 'firebase/firestore';

interface MeditationItem {
  id: string;
  date: string;
  time: string;
  verse: string;
  content: string;
  interpretation?: string; // [v1.15.31] 35~50초 상단 노출용 개혁주의 해석
  keywords: string[];
  cardNews: {
    hook: string;
    body: string;
    cta: string;
  };
  bgImage?: string;
  bgAudio?: string;
  audioName?: string;
  videoUrl?: string; // [v1.15.35] 렌더링 완료된 영상 URL
}

interface MeditationTabProps {
  workflow: WorkflowState;
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowState>>;
  addLog: (msg: string) => void;
  handleTabChange: (tab: Step) => void;
  apiKey: string;
  aiEngine: string;
  logs: string[];
  sunoTracks?: any[];
  setSunoTracks?: any;
  addToRenderQueue?: (task: { label: string, payload: any, onComplete?: (result: any) => void }) => void;
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
  // [v1.15.31] 유연한 스케줄링: 시작일 + 기간 선택
  const [scheduleStartDate, setScheduleStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [schedulePeriod, setSchedulePeriod] = useState<7 | 14 | 28>(7);

  const [meditations, setMeditations] = useState<MeditationItem[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_meditations');
    if (saved) return JSON.parse(saved);

    return Array.from({ length: 7 }).map((_, i) => ({
      id: 'med-' + Math.random().toString(36).substring(2, 15),
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '04:50', // [v1.15.31] 04:50 AM 자동 예약
      verse: '',
      content: '',
      interpretation: '',
      keywords: [],
      cardNews: { hook: '', body: '', cta: '' }
    }));
  });

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkTheme, setBulkTheme] = useState('');

  // Library State (Cloud-centric)
  const [libImages, setLibImages] = useState<any[]>([]);
  const [histImages, setHistImages] = useState<any[]>([]);
  const [imageLibrary, setImageLibrary] = useState<any[]>([]);
  const [audioLibrary, setAudioLibrary] = useState<any[]>([]);
  const [themeLibrary, setThemeLibrary] = useState<any[]>([]);
  const [libraryPage, setLibraryPage] = useState(0);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'image' | 'audio' | 'theme'>('image');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const ITEMS_PER_PAGE = 14;

  // [v1.15.34] 유령 이미지 찾기 상태
  const [orphanedImages, setOrphanedImages] = useState<{ name: string, url: string }[]>([]);
  const [isScanningOrphans, setIsScanningOrphans] = useState(false);
  const [isScanningAudioOrphans, setIsScanningAudioOrphans] = useState(false); // [v1.15.32] 오디오 유령 스캔 상태

  // Sync to localStorage (Slimmed)
  React.useEffect(() => {
    try {
      localStorage.setItem('echoesuntohim_meditations', JSON.stringify(meditations));
    } catch (e) {
      console.warn("Local storage sync failed", e);
    }
  }, [meditations]);

  // [v1.15.45] 클라우드 동기화 자동화: 모든 상태 변경 시 백그라운드 저장
  React.useEffect(() => {
    if (!user || meditations.length === 0) return;

    const timeoutId = setTimeout(() => {
      saveMeditationPlanToCloud(meditations);
    }, 2000); // 2초 디바운스 적용하여 과도한 DB 쓰기 방지

    return () => clearTimeout(timeoutId);
  }, [meditations, bulkTheme]);

  // [v1.15.34] Storage 직결 이미지 도서관 (DB 경유 불필요, 병렬 로딩)
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

    const audQ = query(collection(db, 'users', user.uid, 'audio_library'));
    const audUnsubscribe = onSnapshot(audQ, (snapshot) => {
      setAudioLibrary(snapshot.docs.map(doc => ({
        id: doc.id,
        url: doc.data().url,
        name: doc.data().name || 'Unknown',
        createdAt: doc.data().createdAt
      })));
    }, (error) => {
      console.error("Audio Library onSnapshot error:", error);
      addLog(`❌ 도서관 목록 불러오기 실패: ${error.message}`);
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

    // [v1.15.43] 클라우드 작업 초안 불러오기
    const loadCloudPlan = async () => {
      if (!user || !db) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.meditationPlan && Array.isArray(data.meditationPlan.meditations)) {
            setMeditations(data.meditationPlan.meditations);
            if (data.meditationPlan.bulkTheme) setBulkTheme(data.meditationPlan.bulkTheme);
            addLog("☁️ 클라우드 DB에서 최신 작업 초안을 성공적으로 불러왔습니다.");
          }
        }
      } catch (err: any) {
        console.warn("Cloud load failed, using local storage instead.", err);
      }
    };

    // Firebase Theme Library Sync (meditation_history 연동 + 로그 강화)
    const historyQ = query(collection(db, 'meditation_history'), where('userId', '==', user.uid));
    const themeUnsubscribe = onSnapshot(historyQ, (snapshot) => {
      if (snapshot.empty) {
        addLog("ℹ️ 주제 도서관: 불러올 기록이 없습니다.");
        setThemeLibrary([]);
        return;
      }

      const historyItems = snapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() :
          data.created_at ? new Date(data.created_at).toLocaleDateString() : '';

        return {
          id: doc.id,
          title: `${data.bulkTheme || data.title || '무제'} (${date})`,
          meditations: data.meditations || [],
          // 개별 항목일 경우를 대비해 원본 데이터 보존
          raw: data,
          createdAt: data.createdAt || data.created_at
        };
      });

      setThemeLibrary(historyItems.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      }));

      addLog(`📚 주제 도서관: ${historyItems.length}개의 기록을 불러왔습니다.`);
    }, (error) => {
      console.error("Theme Library onSnapshot error:", error);
      addLog(`❌ 주제 도서관 로드 실패: ${error.message}`);
    });

    syncPendingToDB();
    loadCloudPlan();

    return () => {
      audUnsubscribe();
      themeUnsubscribe();
    };
  }, [user, db]);

  // [v1.15.34] 묵상용 유령 이미지 스캔
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

  // [v1.15.32] 묵상용 유령 오디오 스캔 및 자동 동기화 (중복 제거 기능 포함)
  const scanAudioOrphans = async () => {
    if (!user) return;
    setIsScanningAudioOrphans(true);
    addLog(`🧹 오디오 도서관을 청소하고 유령 파일을 탐색합니다...`);

    try {
      // 1. 현재 DB에 있는 목록 가져오기
      const snap = await getDocs(collection(db, 'users', user.uid, 'audio_library'));
      const dbAudios = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 2. 중복 제거 작업 (이름이 같은 것이 여러 개면 삭제)
      const seenNames = new Set<string>();
      let deleteCount = 0;

      for (const aud of dbAudios) {
        if (seenNames.has(aud.name)) {
          await deleteDoc(doc(db, 'users', user.uid, 'audio_library', aud.id));
          deleteCount++;
        } else {
          seenNames.add(aud.name);
        }
      }

      if (deleteCount > 0) {
        addLog(`♻️ 중복된 오디오 데이터 ${deleteCount}개를 정리했습니다.`);
      }

      // 3. Storage 스캔하여 누락된 파일(유령) 찾기
      const storageRef = ref(storage, `users/${user.uid}/audio_library`);
      const res = await listAll(storageRef);
      const orphans: { name: string, url: string }[] = [];

      for (const item of res.items) {
        // 이미 DB에 존재하는 이름(seenNames)이면 스킵
        if (!seenNames.has(item.name)) {
          const url = await getDownloadURL(item);
          orphans.push({ name: item.name, url });
        }
      }

      if (orphans.length > 0) {
        addLog(`⚠️ 누락된 파일 ${orphans.length}개를 발견하여 복구합니다.`);
        let successCount = 0;
        for (const orphan of orphans) {
          try {
            await addDoc(collection(db, 'users', user.uid, 'audio_library'), {
              url: orphan.url,
              name: orphan.name,
              createdAt: serverTimestamp()
            });
            successCount++;
          } catch (e) {
            console.error("Audio recover failed:", e);
          }
        }
        addLog(`✅ 유령 오디오 ${successCount}개 복구 완료!`);
      } else {
        addLog(`✨ 도서관이 완벽하게 정리되었습니다.`);
      }
    } catch (err: any) {
      addLog(`❌ 도서관 정리 실패: ${err.message}`);
    } finally {
      setIsScanningAudioOrphans(false);
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

  // [v1.15.34] 전체 복구
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

  // [v1.15.43] 클라우드 동기화: 분석/생성 시 실시간 DB 저장
  const saveMeditationPlanToCloud = async (currentMeditations: MeditationItem[]) => {
    if (!user || !db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        meditationPlan: {
          meditations: currentMeditations,
          bulkTheme,
          updatedAt: serverTimestamp(),
          lastUpdatedBy: 'MeditationFactory'
        }
      }, { merge: true });
      addLog("☁️ 클라우드 DB에 작업 초안이 안전하게 동기화되었습니다.");
    } catch (err: any) {
      console.error("Cloud sync failed:", err);
      addLog(`⚠️ 클라우드 동기화 실패: ${err.message}`);
    }
  };

  // [v1.15.44] 일주일치 일괄 AI 분석 및 최적화 (Bulk Analysis)
  const handleBulkGenerateAI = async () => {
    if (!apiKey) {
      addLog("⚠️ API 키가 설정되지 않았습니다.");
      return;
    }

    setIsAnalyzing(true);
    addLog(`✨ [전체 일괄 분석] 7일치 콘텐츠 최적화 엔진 가동...`);

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const selectedModel = aiEngine || DEFAULT_AI_ENGINE;

      const prompt = `
        당신은 '혁신AI'의 성공 공식을 마스터한 CCM 수익화 전문가입니다. 
        제시된 7일간의 묵상 계획을 분석하여, 각 항목마다 고전환 황금 키워드와 숏츠 최적화 줄바꿈을 적용하세요.

        [분석 데이터]
        ${meditations.map((m, i) => `Day ${i + 1}: ${m.verse} / ${m.content}`).join('\n')}

        [수행 작업]
        1. 모든 항목에 대해 조회수를 부르는 황금 키워드 7개 생성.
        2. 말씀(Verse)을 7~10글자 단위로 의미가 끊기지 않게 줄바꿈(\\n) 처리.
        3. 개혁주의 관점의 심도 있는 짧은 해석(Interpretation) 추가.
        4. 궁금함을 유발하는 후킹 문구(CardNews) 생성.

        [응답 형식 JSON 배열]
        [
          {
            "keywords": ["#키워드1", ...],
            "cardNews": { "hook": "...", "body": "...", "cta": "..." },
            "verse": "줄바꿈이 포함된 말씀",
            "interpretation": "해석"
          },
          ... (총 7개)
        ]
        반드시 JSON 배열 형식으로만 응답하세요.
      `;

      const result = await (genAI as any).models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = result.text || (result.response && typeof result.response.text === 'function' ? result.response.text() : "");
      const jsonMatch = text.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const updatedMeditations = meditations.map((item, idx) => {
          const itemData = data[idx] || {};
          return {
            ...item,
            keywords: Array.isArray(itemData.keywords) ? itemData.keywords : item.keywords || [],
            cardNews: itemData.cardNews || item.cardNews,
            verse: itemData.verse || item.verse,
            interpretation: itemData.interpretation || item.interpretation
          };
        });

        setMeditations(updatedMeditations);

        await saveMeditationPlanToCloud(updatedMeditations);
        addLog(`✅ 7일치 일괄 분석 및 클라우드 저장 완료!`);
      }
    } catch (e: any) {
      console.error("Full Analysis Error:", e);
      addLog(`❌ 일괄 분석 오류: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadFromHistory = (track: any) => {
    if (!track) return;

    // 현재 선택된 인덱스의 묵상 카드 업데이트
    const updates: Partial<MeditationItem> = {
      verse: track.prompt || track.verse || (activeIndex !== -1 ? meditations[activeIndex]?.verse : ''),
      content: track.content || (activeIndex !== -1 ? meditations[activeIndex]?.content : ''),
      keywords: track.keywords || meditations[activeIndex].keywords || [],
      bgImage: track.generatedImages?.[0]?.url || track.imageUrl || track.bgImage || (activeIndex !== -1 ? meditations[activeIndex]?.bgImage : undefined),
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
          "formattedVerse": "줄바꿈(\\n)이 포함된 성경 구절",
          "interpretation": "개혁주의 관점의 심도 있는 해석 (1~2줄)"
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
        const updatedItem = {
          keywords: data.keywords,
          cardNews: data.cardNews,
          verse: data.formattedVerse || item.verse,
          interpretation: data.interpretation || ''
        };
        updateMeditation(index, updatedItem);

        // [v1.15.43] AI 분석 즉시 클라우드 저장
        const nextMeditations = [...meditations];
        nextMeditations[index] = { ...nextMeditations[index], ...updatedItem };
        await saveMeditationPlanToCloud(nextMeditations);

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
        4. **Interpretation (해석)**: 개혁주의 신학 기반의 심도 있는 짧은 해석 (1~2줄). (영상 35~50초 구간 노출용)
        5. **CardNews Hook**: 궁금함을 유발하는 후킹 문구.

        JSON 배열 형식으로 응답하세요. (Array of items)
        각 객체는 { verse, content, interpretation, keywords, cardNews } 를 포함해야 합니다.
      `;

      const result = await (genAI as any).models.generateContent({
        model: selectedModel,
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const text = result.text || (result.response && typeof result.response.text === 'function' ? result.response.text() : "");
      const jsonMatch = text.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const newMeditations = meditations.map((item, idx) => {
          const itemData = data[idx] || {};
          return {
            ...item,
            verse: itemData.verse || item.verse,
            content: itemData.content || item.content,
            interpretation: itemData.interpretation || item.interpretation,
            keywords: Array.isArray(itemData.keywords) ? itemData.keywords : (item.keywords || []),
            cardNews: itemData.cardNews || item.cardNews
          };
        });
        setMeditations(newMeditations);

        // [v1.15.43] 일괄 생산 즉시 클라우드 저장
        await saveMeditationPlanToCloud(newMeditations);

        addLog(`✅ 일주일 치 콘텐츠 생산 완료!`);
      }
    } catch (e: any) {
      console.error("Full Production Error:", e);
      addLog(`❌ 일괄 생산 오류: ${e.message || JSON.stringify(e)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // [v1.15.31] 유연한 날짜 설정: 선택한 시작일 + 기간(1주/2주/한달)에 따라 슬롯 동적 생성
  const handleBulkDateSet = () => {
    const start = new Date(scheduleStartDate);
    const dayCount = schedulePeriod;
    const newMeditations = Array.from({ length: dayCount }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const existing = meditations[idx];
      return existing
        ? { ...existing, date: d.toISOString().split('T')[0] }
        : {
          id: 'med-' + Math.random().toString(36).substring(2, 15),
          date: d.toISOString().split('T')[0],
          time: '04:50', // [v1.15.31] 04:50 AM 자동 예약
          verse: '',
          content: '',
          interpretation: '',
          keywords: [],
          cardNews: { hook: '', body: '', cta: '' }
        };
    });
    setMeditations(newMeditations);
    setActiveIndex(0);
    addLog(`📅 ${scheduleStartDate}부터 ${dayCount}일간 슬롯이 생성되었습니다.`);
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

  // [v1.15.31] 오디오 다중 업로드 + 자동 번호 부여 (1분묵상_01, 1분묵상_02...)
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !auth.currentUser) return;
    setIsAnalyzing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 자동 번호 부여: 파일명이 '1분묵상'을 포함하면 기존 개수 기반 시퀀스 번호 생성
      let finalName = file.name;
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      if (rawName.includes('1분묵상') || rawName === '1분묵상') {
        const existingCount = audioLibrary.filter((a: any) => (a.name || '').includes('1분묵상')).length;
        const seqNum = String(existingCount + 1 + i).padStart(2, '0');
        const ext = file.name.split('.').pop() || 'mp3';
        finalName = `1분묵상_${seqNum}.${ext}`;
      }

      addLog(`🎵 [${finalName}] 오디오 라이브러리 업로드 중...`);
      try {
        const permanentUrl = await uploadImageToStorage(file as any, 'audio_library', finalName);
        if (permanentUrl) {
          await addDoc(collection(db, 'users', auth.currentUser.uid, 'audio_library'), {
            url: permanentUrl,
            name: finalName,
            createdAt: serverTimestamp()
          });
          addLog(`✅ [${finalName}] 음악이 도서관에 등록되었습니다.`);
        }
      } catch (err: any) {
        addLog(`❌ 업로드 실패 (${finalName}): ${err.message}`);
      }
    }

    // 같은 파일을 다시 업로드할 수 있도록 input 초기화
    e.target.value = '';
    setIsAnalyzing(false);
  };

  // [v1.15.34] 체크박스 선택 상태
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
  const deleteFromLibrary = async (id: string, type: 'image' | 'audio' | 'theme') => {
    if (!auth.currentUser) return;
    if (type === 'audio') {
      // 오디오는 DB 유지
      if (!confirm('도서관에서 삭제하시겠습니까?')) return;
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'audio_library', id));
        addLog(`🗑️ 오디오 삭제 완료.`);
      } catch (e: any) {
        console.error("Delete Error:", e);
        addLog(`❌ 삭제 실패: ${e.message || JSON.stringify(e)}`);
      }
    } else if (type === 'theme') {
      if (!confirm('분석된 주제를 삭제하시겠습니까?')) return;
      try {
        await deleteDoc(doc(db, 'meditation_history', id));
        addLog(`🗑️ 주제 삭제 완료.`);
      } catch (e: any) {
        console.error("Delete Error:", e);
        addLog(`❌ 삭제 실패: ${e.message || JSON.stringify(e)}`);
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
        console.error("Image Delete Error:", e);
        addLog(`❌ 이미지 삭제 실패: ${e.message || JSON.stringify(e)}`);
      }
    }
  };

  // [v1.15.34] 선택된 이미지 일괄 삭제
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
        audioRef.current.play().catch(e => {
          console.error("오디오 재생 오류:", e);
          addLog(`❌ 오디오 재생 실패: 네트워크 또는 파일 형식 문제일 수 있습니다.`);
          setPlayingAudioId(null);
        });
        setPlayingAudioId(id);
      }
    }
  };

  const renameAudiosChronologically = async () => {
    if (!user) return;
    setIsScanningAudioOrphans(true);
    addLog(`🔄 오디오 이름을 시간 순서대로 일괄 변경합니다...`);
    try {
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'audio_library'), orderBy('createdAt', 'asc')));
      let count = 1;
      for (const docSnap of snap.docs) {
        const newName = `1분 묵상 ${String(count).padStart(3, '0')}.mp3`;
        if (docSnap.data().name !== newName) {
          await setDoc(doc(db, 'users', user.uid, 'audio_library', docSnap.id), { name: newName }, { merge: true });
        }
        count++;
      }
      addLog(`✅ 총 ${count - 1}개의 오디오 이름이 통일되었습니다.`);
    } catch (e: any) {
      addLog(`❌ 이름 변경 실패: ${e.message}`);
    } finally {
      setIsScanningAudioOrphans(false);
    }
  };

  // [v1.15.34] 일주일 단위 무지개 연한 파스텔톤 고정 적용
  const DAY_COLORS = [
    { day: '일요일', color: 'soft pastel violet' },
    { day: '월요일', color: 'soft pastel red' },
    { day: '화요일', color: 'soft pastel orange' },
    { day: '수요일', color: 'soft pastel yellow' },
    { day: '목요일', color: 'soft pastel green' },
    { day: '금요일', color: 'soft pastel blue' },
    { day: '토요일', color: 'soft pastel indigo' },
  ];

  const SYMBOL_POSITIONS = ['bottom-left', 'bottom-center', 'bottom-right', 'center', 'top-left', 'top-right'];
  const getRandomPosition = () => SYMBOL_POSITIONS[Math.floor(Math.random() * SYMBOL_POSITIONS.length)];

  const buildMeditationPrompt = (index: number, verse?: string, dateString?: string) => {
    const dayOfWeek = dateString ? new Date(dateString).getDay() : (index % 7);
    const dayInfo = DAY_COLORS[dayOfWeek];
    const position = getRandomPosition();

    const prompt = `A premium, artistic vertical background (9:16) for a Christian meditation app. 
      [STYLE]: Minimalist, serene, and spiritually uplifting. 
      [BACKGROUND]: Smooth, clean pastel ${dayInfo.color} tones with a soft paper texture.
      [SUBJECT]: Create a beautiful, creative Christian-themed symbol, object, or scene inspired by the spiritual essence of the verse: "${verse || 'Grace and Peace'}". 
      Examples could be an artistic cross, a gentle lamb, a sacred light, botanical elements like lilies or olive branches, or a serene landscape, but do not limit to these. 
      [COMPOSITION]: Place the main subject elegantly around the ${position} area. 
      [AESTHETIC]: High-quality artistic illustration (e.g., watercolor, soft oil, or clean minimalist vector), very clean and uncluttered. 
      [ABSOLUTE PROHIBITION]: STRICTLY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS, NO WATERMARKS, NO SIGNATURES, NO LOGOS anywhere on the image. The image must be 100% text-free. This is the most critical rule.
      High-end stationery/bookmark vibe.`;

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

          const { prompt, position } = buildMeditationPrompt(i, item.verse, item.date);

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

            updateMeditation(i, { bgImage: base64Url });
            addLog(`📸 [Day ${i + 1}] 이미지 생성 완료! 화면에 즉시 적용합니다.`);

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
                  created_at: serverTimestamp(),
                  createdAt: serverTimestamp()
                };
                const docRef = await addDoc(collection(db, 'meditation_history'), historyData);

                if (setSunoTracks) {
                  setSunoTracks(prev => [{ ...historyData, id: docRef.id }, ...prev]);
                }

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

        updateMeditation(index, { bgImage: base64Url });
        addLog(`📸 [Day ${index + 1}] 이미지가 교체되었습니다. 화면에 즉시 적용합니다.`);

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

      // 🚀 핵심 변경: 도서관의 음악을 요일별로 자동 매칭 (도서관 곡 수보다 일차가 많아도 자동으로 처음으로 돌아가서 매칭됨)
      let audioUrl = item.bgAudio;
      
      if (!audioUrl) {
        if (audioLibrary && audioLibrary.length > 0) {
          // 도서관에 음악이 있다면 순서대로 가져옴 (예: 10곡일 때 1~7일차는 1~7번 곡 적용)
          audioUrl = audioLibrary[i % audioLibrary.length].url;
        } else {
          // 도서관마저 텅 비어있다면 1일차 음악이나 기본 제공 음악 사용
          audioUrl = meditations[0]?.bgAudio || "https://storage.googleapis.com/echoes-unto-him.appspot.com/assets/peaceful_meditation.mp3";
        }
      }

      const audioStartTime = 0;
      console.log(`🎬 [Day ${i + 1}] Requesting with Audio:`, audioUrl);

      const typingDuration = Math.min(15, Math.max(3, item.verse.length * 0.15));
      const payload = {
        assets: {
          audioUrl: audioUrl,
          audioStartTime: audioStartTime,
          imageUrl: item.bgImage
        },
        settings: {
          koreanTitle: item.verse,
          lyrics: item.content,
          timedLyrics: [{ start: 0, end: 60, text: `${item.verse}\n\n${item.content}` }],
          type: 'shorts',
          duration: 60,
          titleSettings: {
            animation: 'typing',
            titlePosition: 'middle',
            titleFade: typingDuration,
            lyricsDisplayMode: 'center',
            lyricsStartTime: typingDuration + 1,
            showVisualizer: true,
            particleSystem: 'dust',
            interpretation: item.interpretation,
            timeline: {
              verseEnd: 35,
              interpretationStart: 35,
              interpretationEnd: 50,
              verseResume: 50
            }
          }
        },
        metadata: {
          description: `${item.cardNews?.hook || ''}\n\n${item.cardNews?.body || ''}\n\n${item.cardNews?.cta || ''}`,
          tags: item.keywords,
          scheduledTime: `${item.date}T${item.time}:00`
        }
      };

      addToRenderQueue({
        label: `[Day ${i + 1}] ${item.verse}`,
        payload,
        onComplete: (res: any) => {
          console.log(`🎬 [Day ${i + 1}] Render Result:`, res);
          if (res.videoUrl) {
            const videoUrl = res.videoUrl;
            updateMeditation(i, { videoUrl: videoUrl });

            if (setWorkflow) {
              setWorkflow(prev => ({
                ...prev,
                results: {
                  ...prev.results,
                  videos: [
                    ...(prev.results.videos || []),
                    {
                      id: `med-video-${Date.now()}-${i}`,
                      url: videoUrl,
                      type: 'shorts',
                      label: `[Day ${i + 1}] ${item.verse.slice(0, 20)}...`,
                      metadata: {
                        verse: item.verse,
                        content: item.content,
                        keywords: item.keywords,
                        source: 'meditation-factory'
                      }
                    }
                  ]
                }
              }));
            }

            addLog(`✅ [Day ${i + 1}] 렌더링 완료! 비디오가 라이브러리에 등록되었습니다.`);

            // 자동 다운로드 트리거 주석 처리 (앱 이탈 방지용)
            // const a = document.createElement('a');
            // a.href = videoUrl;
            // a.download = `Meditation_Day_${i + 1}.mp4`;
            // a.click();
          }
        }
      });
    }

    addLog("📥 7일간의 모든 렌더링 작업이 대기열에 추가되었습니다.");
    setIsAnalyzing(false);
  };

  const handleSingleRender = async (index: number) => {
    if (!apiKey || !addToRenderQueue) return;
    const item = meditations[index];
    console.log(`🎬 [Day ${index + 1}] Debug Item Data:`, item);
    if (!item.bgImage || !item.verse || !item.content) {
      addLog(`⚠️ [Day ${index + 1}] 필수 데이터가 부족합니다.`);
      return;
    }

    // 🚀 여기도 대량 렌더링과 똑같이 자동 매칭 로직 적용
    let audioUrl = item.bgAudio;
    
    if (!audioUrl) {
      if (audioLibrary && audioLibrary.length > 0) {
        audioUrl = audioLibrary[index % audioLibrary.length].url;
      } else {
        audioUrl = meditations[0]?.bgAudio || "https://storage.googleapis.com/echoes-unto-him.appspot.com/assets/peaceful_meditation.mp3";
      }
    }
    
    const typingDuration = Math.min(15, Math.max(3, item.verse.length * 0.15));

    const payload = {
      assets: { audioUrl, audioStartTime: 0, imageUrl: item.bgImage },
      settings: {
        koreanTitle: item.verse,
        lyrics: item.content,
        timedLyrics: [{ start: 0, end: 60, text: `${item.verse}\n\n${item.content}` }],
        type: 'shorts',
        duration: 60,
        titleSettings: {
          animation: 'typing', titlePosition: 'middle', titleFade: typingDuration,
          lyricsDisplayMode: 'center', lyricsStartTime: typingDuration + 1,
          showVisualizer: true, particleSystem: 'dust',
          interpretation: item.interpretation,
          timeline: { verseEnd: 35, interpretationStart: 35, interpretationEnd: 50, verseResume: 50 }
        }
      },
      metadata: {
        description: `${item.cardNews?.hook || ''}\n\n${item.cardNews?.body || ''}\n\n${item.cardNews?.cta || ''}`,
        tags: item.keywords,
        scheduledTime: `${item.date}T${item.time}:00`
      }
    };
    console.log("🚀 [Render] Individual Payload:", payload);
    addLog(`🎬 [Day ${index + 1}] 렌더링 준비 중...`);

    try {
      addToRenderQueue({
        label: `[Day ${index + 1}] ${item.verse}`,
        payload,
        onComplete: (res: any) => {
          console.log(`🎬 [Day ${index + 1}] Render Result:`, res);
          if (res.videoUrl) {
            const videoUrl = res.videoUrl + (res.videoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
            updateMeditation(index, { videoUrl: videoUrl });

            if (setWorkflow) {
              setWorkflow(prev => ({
                ...prev,
                results: {
                  ...prev.results,
                  videos: [
                    ...(prev.results.videos || []),
                    {
                      id: `med-video-${Date.now()}`,
                      url: videoUrl,
                      type: 'shorts',
                      label: `[Day ${index + 1}] ${item.verse.slice(0, 20)}...`,
                      metadata: {
                        verse: item.verse,
                        content: item.content,
                        keywords: item.keywords,
                        source: 'meditation-factory'
                      }
                    }
                  ]
                }
              }));
            }

            addLog(`✅ [Day ${index + 1}] 렌더링 완료! 비디오가 라이브러리에 등록되었습니다.`);

            // 자동 다운로드 트리거 주석 처리 (앱 이탈 방지용)
            // const a = document.createElement('a');
            // a.href = videoUrl;
            // a.download = `Meditation_Day_${index + 1}.mp4`;
            // a.click();
          }
        }
      });
      addLog(`📥 [Day ${index + 1}] 렌더링 대기열에 추가되었습니다.`);
    } catch (err: any) {
      console.error("Queue Add Error:", err);
      addLog(`❌ [Queue] 대기열 추가 실패: ${err.message}`);
    }
  };

  const currentMeditation = activeIndex >= 0 && activeIndex < meditations.length ? meditations[activeIndex] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Sparkles className="text-primary w-8 h-8" />
            1분 묵상 Factory
          </h2>
          <p className="text-gray-400 mt-1 text-sm italic">"일주일 치 묵상을 한 번에!"</p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          <div className="flex items-center justify-end gap-2 w-full">
            <input
              type="text"
              value={bulkTheme}
              onChange={(e) => setBulkTheme(e.target.value)}
              placeholder="주제 입력 (예: 감사)"
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 transition-all"
            />
            <button onClick={handleGenerateFullPlan} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"><Sparkles className="w-3.5 h-3.5" /> 자동 생산</button>
            <button
              onClick={handleBulkGenerateAI}
              className="px-4 py-1.5 bg-primary text-background rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg hover:scale-105 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI 분석 및 최적화
            </button>
            <button onClick={handleGenerateAllImages} className="px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"><ImageIcon className="w-3.5 h-3.5" /> 배경 생성</button>
          </div>

          <div className="flex items-center justify-end gap-2 w-full">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
              <input
                type="date"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
                className="bg-transparent text-xs text-gray-300 outline-none px-2 py-1"
              />
              <select
                value={schedulePeriod}
                onChange={(e) => setSchedulePeriod(Number(e.target.value) as 7 | 14 | 28)}
                className="bg-black/50 text-xs text-gray-300 outline-none px-2 py-1 rounded border border-white/10 appearance-none cursor-pointer"
              >
                <option value={7}>1주일 (7일)</option>
                <option value={14}>2주일 (14일)</option>
                <option value={28}>한 달 (28일)</option>
              </select>
              <button onClick={handleBulkDateSet} className="px-3 py-1 hover:bg-white/10 rounded font-bold text-xs flex items-center gap-1 transition-colors"><Calendar className="w-3.5 h-3.5" /> 적용</button>
            </div>

            <button
              onClick={handleBulkRender}
              disabled={isRendering || meditations.every(m => !m.bgImage)}
              className={cn(
                "px-5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg transition-all",
                isRendering
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-background hover:scale-105 active:scale-95"
              )}
            >
              {isRendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {isRendering ? "처리 중..." : "대량 렌더링"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        <div className="lg:col-span-6 flex flex-col gap-2 h-fit">
          {meditations.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "w-full px-4 py-3 rounded-xl border transition-all text-left relative overflow-hidden group flex flex-col",
                activeIndex === idx ? "bg-primary/5 border-primary/40 shadow-xl" : "bg-white/5 border-white/5"
              )}
            >
              {activeIndex === idx && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

              <div
                className="flex items-center justify-between cursor-pointer pl-2"
                onClick={() => setActiveIndex(activeIndex === idx ? -1 : idx)}
              >
                <div className="flex items-center gap-4">
                  <span className={cn("text-[10px] font-black tracking-widest", activeIndex === idx ? "text-primary" : "text-gray-500")}>DAY {idx + 1}</span>
                  <span className="text-white font-bold text-sm truncate max-w-[200px]">{new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 items-center mr-2">
                    {item.bgImage && <ImageIcon className="w-3.5 h-3.5 text-pink-400" />}
                    {item.keywords.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerateAI(idx); }}
                      className="p-1.5 hover:bg-primary/20 text-primary/60 hover:text-primary rounded-md transition-all"
                      title="AI 분석"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSingleRender(idx); }}
                      className="p-1.5 hover:bg-indigo-500/20 text-indigo-400/60 hover:text-indigo-400 rounded-md transition-all"
                      title="개별 렌더링"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {activeIndex === idx && (
                <div className="mt-4 pt-4 border-t border-white/10 pl-2 pr-1 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">게시 일자</label>
                        <input type="date" value={item.date} onChange={(e) => updateMeditation(idx, { date: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-primary transition-all color-scheme-dark" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">게시 시간</label>
                        <input type="time" value={item.time} onChange={(e) => updateMeditation(idx, { time: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-primary transition-all color-scheme-dark" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">말씀 (Verse)</label>
                      <textarea value={item.verse} onChange={(e) => updateMeditation(idx, { verse: e.target.value })} className="w-full h-16 bg-black/40 border border-white/10 rounded-lg p-2 text-xs focus:border-primary outline-none transition-all resize-none leading-relaxed" placeholder="성경 말씀과 장절" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">묵상 (Content)</label>
                      <textarea value={item.content} onChange={(e) => updateMeditation(idx, { content: e.target.value })} className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2 text-xs focus:border-primary outline-none transition-all resize-none leading-relaxed" placeholder="짧고 깊은 묵상 내용" />
                    </div>
                  </div>

                  {Array.isArray(item.keywords) && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 text-white/70 border border-white/5 rounded-md text-[9px] font-bold">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layout className="w-3 h-3" /> 숏츠 레이아웃 디자인 (Static)
                  </label>
                  <div className="relative aspect-[9/16] w-full bg-black rounded-[3rem] border-[8px] border-white/5 overflow-hidden shadow-2xl group ring-1 ring-white/10">
                    {activeIndex !== -1 && meditations[activeIndex] && meditations[activeIndex].bgImage ? (
                      <>
                        <img src={meditations[activeIndex].bgImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Preview" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/90" />
                        <div className="absolute inset-0 flex flex-col pt-[15%] text-center">
                          <div className="h-[45%] w-full flex items-center justify-center p-4">
                            <motion.p
                              key={meditations[activeIndex]?.verse}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-white text-xl font-bold italic tracking-tight leading-[1.6] whitespace-pre-wrap break-keep"
                              style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)', fontFamily: "'Outfit', sans-serif" }}
                            >
                              {meditations[activeIndex]?.verse || "말씀을 입력하세요"}
                            </motion.p>
                          </div>
                          <div className="h-[40%] w-full flex flex-col items-center justify-center p-4 border-t border-dashed border-white/10">
                            <p className="text-white/80 text-xs font-medium leading-[1.6] whitespace-pre-wrap break-keep text-center">
                              {meditations[activeIndex]?.content || "묵상 내용을 입력하세요"}
                            </p>
                          </div>
                          <div className="absolute bottom-0 h-[10%] w-full flex items-center justify-center border-t border-dashed border-white/10 bg-black/40">
                            <span className="text-[8px] font-black text-white/30 tracking-widest uppercase">Safety Margin</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10 p-8 text-center bg-[#111]">
                        <ImageIcon className="w-16 h-16 opacity-20" />
                        <p className="text-white/40 text-sm font-bold">항목을 선택해주세요</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center justify-between">
                    <span className="flex items-center gap-2"><Video className="w-3 h-3" /> 최종 렌더링 영상 결과 (Live)</span>
                    {activeIndex !== -1 && meditations[activeIndex]?.videoUrl && (
                      <button
                        onClick={() => setShowFullPreview(true)}
                        className="flex items-center gap-2 px-3 py-1 bg-primary text-background rounded-full font-black text-[10px] hover:scale-105 transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                      >
                        <Maximize2 className="w-3 h-3" /> 전체화면 보기
                      </button>
                    )}
                  </label>
                  <div className="relative aspect-[9/16] w-full bg-black rounded-[3rem] border-[8px] border-white/5 overflow-hidden shadow-2xl group ring-1 ring-white/10">
                    {activeIndex !== -1 && meditations[activeIndex]?.videoUrl ? (
                      <video
                        key={meditations[activeIndex].videoUrl}
                        src={meditations[activeIndex].videoUrl}
                        className="w-full h-full object-cover"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedData={() => console.log("🎥 Video Loaded:", meditations[activeIndex].videoUrl)}
                        onError={(e) => {
                          console.error("🎥 Video Error:", e);
                          addLog("❌ 미리보기 영상을 불러올 수 없습니다. 경로를 확인해주세요.");
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/10 p-8 text-center bg-[#111]">
                        <div className={cn(
                          "w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-white/5",
                          isRendering && "animate-spin border-primary/30 border-t-primary"
                        )}>
                          {isRendering ? <RefreshCw className="w-8 h-8 text-primary/40" /> : <Play className="w-8 h-8 opacity-20" />}
                        </div>
                        <div className="space-y-1">
                          <p className="text-white/40 text-sm font-bold">
                            {isRendering ? "영상을 생성하는 중입니다..." : "렌더링 전입니다"}
                          </p>
                          <p className="text-[10px] text-white/20">
                            {isRendering ? "잠시만 기다려주시면 영상이 자동 로드됩니다" : "렌더링 버튼을 누르면 영상이 로드됩니다"}
                          </p>
                        </div>
                        {activeIndex !== -1 && !isRendering && (
                          <button
                            onClick={() => handleSingleRender(activeIndex)}
                            className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-white transition-all"
                          >
                            현재 항목 렌더링 시작
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                activeLibraryTab === 'audio' ? "bg-white text-background shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "text-gray-500 hover:text-white"
              )}
            >
              <Music className="w-4 h-4" /> 배경음악 도서관
            </button>
            <button
              onClick={() => setActiveLibraryTab('theme')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                activeLibraryTab === 'theme' ? "bg-amber-500 text-background shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "text-gray-500 hover:text-white"
              )}
            >
              <Sparkles className="w-4 h-4" /> 주제 도서관
            </button>
          </div>

          <div className="flex items-center gap-4">
            {activeLibraryTab === 'image' ? (
              <div className="flex items-center gap-2">
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
            ) : activeLibraryTab === 'audio' ? (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-5 py-2.5 bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-white/20 transition-all group">
                  <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  내 음악 업로드 (MP3)
                  <input type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioUpload} />
                </label>
                <button
                  onClick={renameAudiosChronologically}
                  className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  이름 순서대로 통일
                </button>
                <button
                  onClick={scanAudioOrphans}
                  disabled={isScanningAudioOrphans}
                  className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <Database className="w-3 h-3" />
                  {isScanningAudioOrphans ? '동기화 중...' : '유령 동기화'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest mr-4">분석된 주제 보관함</span>
              </div>
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
                    activeIndex !== -1 && meditations[activeIndex]?.bgImage === img.url ? "border-primary ring-2 ring-primary/20 scale-105 z-10" : "border-white/5 bg-black/40 hover:border-white/20"
                )}
                onClick={() => isSelectMode ? toggleImageSelection(img.id) : updateMeditation(activeIndex, { bgImage: img.url })}
              >
                <img src={img.url} className="w-full h-full object-cover" alt="Library Item" />
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
        ) : activeLibraryTab === 'audio' ? (
          <div className="grid grid-cols-7 gap-2">
            {[...audioLibrary]
              .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true }))
              .map((aud, idx) => {
                const seqDisplay = String(idx + 1).padStart(3, '0');
                const isActive = activeIndex !== -1 && meditations[activeIndex]?.bgAudio === aud.url;

                return (
                  <motion.div
                    key={aud.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "group cursor-pointer flex items-center justify-between bg-black/20 hover:bg-white/5 border-l-2 transition-all relative overflow-hidden h-[36px]",
                      isActive ? "border-primary bg-white/5" : "border-transparent hover:border-primary/50"
                    )}
                    onClick={() => activeIndex !== -1 && updateMeditation(activeIndex, { bgAudio: aud.url, audioName: aud.name })}
                  >
                    <div className="flex items-center justify-start flex-1 min-w-0 py-1.5 px-2">
                      <p className={cn(
                        "text-[10px] font-bold truncate tracking-tight transition-colors",
                        isActive ? "text-primary" : "text-white/90 group-hover:text-white"
                      )}>
                        1분 묵상 {seqDisplay}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFromLibrary(aud.id, 'audio');
                      }}
                      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-full aspect-square flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-all border-l border-white/5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            {audioLibrary.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-white/5 opacity-30">
                <Music className="w-12 h-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">음악 도서관이 비어있습니다.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {themeLibrary.map((theme) => {
              const isActive = bulkTheme === theme.title;
              return (
                <motion.div
                  key={theme.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "group cursor-pointer flex items-center justify-between bg-black/20 hover:bg-white/5 border-l-2 transition-all relative overflow-hidden h-[36px]",
                    isActive ? "border-amber-500 bg-white/5" : "border-transparent hover:border-amber-500/50"
                  )}
                  onClick={() => {
                    if (theme.meditations && theme.meditations.length > 0) {
                      setBulkTheme(theme.title.split(' (')[0]);
                      setMeditations(theme.meditations);
                      addLog(`📂 주제 [${theme.title}] 전체 플랜을 불러왔습니다.`);
                    } else if (theme.raw) {
                      handleLoadFromHistory(theme.raw);
                    }
                  }}
                >
                  <div className="flex items-center justify-start flex-1 min-w-0 py-1.5 px-2">
                    <p className={cn(
                      "text-[10px] font-bold truncate tracking-tight transition-colors",
                      isActive ? "text-amber-500" : "text-white/90 group-hover:text-white"
                    )}>
                      {theme.title}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFromLibrary(theme.id, 'theme');
                    }}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 h-full aspect-square flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-all border-l border-white/5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
            {themeLibrary.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-white/5 opacity-30">
                <Sparkles className="w-12 h-12 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">주제 도서관이 비어있습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* [v1.15.34] 유령 이미지 결과 */}
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

      {/* History List */}
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
      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {showFullPreview && activeIndex !== -1 && meditations[activeIndex]?.videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative aspect-[9/16] h-full max-h-[90vh] bg-black rounded-[2rem] border-8 border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={meditations[activeIndex].videoUrl}
                className="w-full h-full object-contain"
                controls
                loop
                playsInline
                ref={(el) => {
                  if (el) {
                    el.volume = 0.5; // 소리를 중간으로 켜기
                    el.play().catch(e => console.log("자동 재생이 브라우저에 의해 차단되었습니다.", e));
                  }
                }}
              />
              <button
                onClick={() => setShowFullPreview(false)}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10 group z-50"
              >
                <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};