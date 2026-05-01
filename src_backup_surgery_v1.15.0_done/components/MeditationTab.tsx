import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Sparkles,
  Type,
  Send,
  ChevronLeft,
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
  Palette,
  Heart,
  Play,
  Pause,
  Volume2,
  Upload
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { WorkflowState, Step } from '../types';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import { Terminal } from './Terminal';
import { DEFAULT_AI_ENGINE, DEFAULT_IMAGE_ENGINE, RENDER_API_URL } from '../constants';
import { auth, db, uploadImageToStorage } from '../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc
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
  imageEngine?: string;
  logs: string[];
}

const WEEKLY_PASTEL_COLORS = [
  "pale pastel rose pink", "pale pastel peach orange", "pale pastel lemon yellow",
  "pale pastel mint green", "pale pastel sky blue", "pale pastel lavender blue", "pale pastel violet purple"
];

const VECTOR_SYMBOLS = [
  "A single solid white silhouette of a peaceful lamb",
  "A single solid white silhouette of praying hands",
  "A single solid white icon of a burning candle",
  "A single solid white silhouette of a flying dove",
  "A single solid white minimalist cross icon",
  "A single solid white silhouette of an olive branch",
  "A single solid white minimalist church building silhouette"
];

const ITEMS_PER_PAGE = 14;

export const MeditationTab: React.FC<MeditationTabProps> = ({
  workflow,
  setWorkflow,
  addLog,
  handleTabChange,
  apiKey,
  aiEngine,
  imageEngine,
  logs
}) => {
  const [meditations, setMeditations] = useState<MeditationItem[]>(() => {
    const saved = localStorage.getItem('echoesuntohim_meditations');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: 7 }).map((_, i) => ({
      id: crypto.randomUUID(),
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '06:00', verse: '', content: '', keywords: [],
      cardNews: { hook: '', body: '', cta: '' }
    }));
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkTheme, setBulkTheme] = useState('');
  const [imageLibrary, setImageLibrary] = useState<{id: string, url: string}[]>([]);
  const [audioLibrary, setAudioLibrary] = useState<{id: string, url: string, name: string}[]>([]);
  const [libraryPage, setLibraryPage] = useState(0);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'image' | 'audio'>('image');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      const slimMeditations = meditations.map(({ bgImage, ...rest }) => ({
        ...rest,
        bgImage: (bgImage && bgImage.startsWith('http')) ? bgImage : undefined
      }));
      localStorage.setItem('echoesuntohim_meditations', JSON.stringify(slimMeditations));
    } catch (e) { console.warn("Sync failed"); }
  }, [meditations]);

  // Load Libraries from DB
  useEffect(() => {
    if (!auth.currentUser) return;
    const imgQ = query(collection(db, 'users', auth.currentUser.uid, 'meditation_library'), orderBy('createdAt', 'desc'));
    const imgUnsubscribe = onSnapshot(imgQ, (snapshot) => {
      setImageLibrary(snapshot.docs.map(doc => ({ id: doc.id, url: doc.data().url })));
    });

    const audQ = query(collection(db, 'users', auth.currentUser.uid, 'audio_library'), orderBy('createdAt', 'desc'));
    const audUnsubscribe = onSnapshot(audQ, (snapshot) => {
      setAudioLibrary(snapshot.docs.map(doc => ({ id: doc.id, url: doc.data().url, name: doc.data().name || 'Unknown' })));
    });

    return () => { imgUnsubscribe(); audUnsubscribe(); };
  }, []);

  const updateMeditation = (index: number, updates: Partial<MeditationItem>) => {
    setMeditations(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // --- Image Upload ---
  const saveImageToLibrary = async (url: string) => {
    if (!auth.currentUser) return null;
    try {
      const permanentUrl = await uploadImageToStorage(url, 'meditation_library');
      if (permanentUrl) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'meditation_library'), {
          url: permanentUrl, createdAt: serverTimestamp()
        });
        return permanentUrl;
      }
    } catch (e) { console.error(e); }
    return null;
  };

  // --- Audio Upload ---
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setIsAnalyzing(true);
    addLog(`🎵 [${file.name}] 클라우드 업로드 중...`);
    try {
      const permanentUrl = await uploadImageToStorage(file, 'audio_library');
      if (permanentUrl) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'audio_library'), {
          url: permanentUrl,
          name: file.name,
          createdAt: serverTimestamp()
        });
        addLog("✅ 음악이 도서관에 등록되었습니다.");
      }
    } catch (e: any) { addLog(`❌ 업로드 실패: ${e.message}`); }
    finally { setIsAnalyzing(false); }
  };

  const deleteFromLibrary = async (id: string, type: 'image' | 'audio') => {
    if (!auth.currentUser || !confirm('삭제하시겠습니까?')) return;
    const path = type === 'image' ? 'meditation_library' : 'audio_library';
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, path, id));
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

  // --- Generation Logic ---
  const generateV3Prompt = (index: number, verse: string = '') => {
    return `A high-end cinematic sacred photography for Christian meditation, 9:16 portrait orientation. ${verse ? `Theme based on: "${verse}". ` : ''}Heavenly divine light rays descending from above, spiritual atmosphere, holy presence, serene landscape or minimalist sacred space. Soft bokeh, ethereal glow, professional lighting, 8k resolution, photorealistic. NO text, NO watermelons, NO food, NO round fruit objects.`;
  };

  const handleGenerateAllImages = async () => {
    if (!apiKey) return;
    setIsAnalyzing(true);
    addLog("🎨 [Imagen 4.0] 고품질 기독교 영성 이미지 생성 시작...");
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const modelName = imageEngine || 'imagen-3.0-generate-001'; // Default to high-quality
      
      for (let i = 0; i < meditations.length; i++) {
        const item = meditations[i];
        addLog(`🖼️ [Day ${i+1}] 이미지 생성 중...`);
        const response = await genAI.models.generateImages({
          model: modelName,
          prompt: generateV3Prompt(i, item.verse),
          config: { 
            aspectRatio: "9:16", 
            numberOfImages: 1, 
            outputMimeType: "image/png" 
          }
        });
        const image = response.generatedImages[0];
        if (image?.image?.imageBytes) {
          const base64Url = `data:image/png;base64,${image.image.imageBytes}`;
          const permanentUrl = await saveImageToLibrary(base64Url);
          updateMeditation(i, { bgImage: permanentUrl || base64Url });
        }
      }
      addLog("✨ 이미지 생성이 완료되었습니다.");
    } catch (e: any) { addLog(`❌ 오류: ${e.message}`); }
    finally { setIsAnalyzing(false); }
  };

  const handleBulkRender = async () => {
    setIsAnalyzing(true);
    addLog("🎬 렌더링 시작...");
    for (let i = 0; i < meditations.length; i++) {
      const item = meditations[i];
      if (!item.bgImage || !item.verse) continue;
      const audioUrl = item.bgAudio || "https://storage.googleapis.com/echoes-unto-him.appspot.com/assets/peaceful_meditation.mp3";
      try {
        await fetch(RENDER_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assets: { audioUrl, imageUrl: item.bgImage },
            settings: { koreanTitle: item.verse, lyrics: item.content, type: 'shorts', duration: 60 }
          })
        });
      } catch (e: any) { addLog(`❌ [Day ${i + 1}] 실패`); }
    }
    setIsAnalyzing(false);
  };

  // --- Template for other buttons ---
  const handleGenerateFullPlan = async () => {
    if (!apiKey || !bulkTheme) return;
    setIsAnalyzing(true);
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const prompt = `Create 7-day Christian meditation items for theme: ${bulkTheme}. JSON array.`;
      const response = await genAI.models.generateContent({
        model: aiEngine || DEFAULT_AI_ENGINE,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text?.match(/\[[\s\S]*\]/)?.[0] || "[]");
      setMeditations(meditations.map((item, i) => ({ ...item, ...data[i] })));
    } catch (e: any) { addLog(`❌ 에러: ${e.message}`); }
    finally { setIsAnalyzing(false); }
  };

  const totalPages = Math.ceil(imageLibrary.length / ITEMS_PER_PAGE);
  const paginatedImages = imageLibrary.slice(libraryPage * ITEMS_PER_PAGE, (libraryPage + 1) * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8 pb-32">
      <audio ref={audioRef} onEnded={() => setPlayingAudioId(null)} className="hidden" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl"><Volume2 className="text-indigo-400 w-8 h-8" /></div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter">1분 묵상 Factory <span className="text-indigo-400/50 text-sm ml-2">v1.15.0 Music</span></h2>
            <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">Personal Audio Library Integrated</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="text" value={bulkTheme} onChange={(e) => setBulkTheme(e.target.value)} placeholder="주제 (예: 감사)" className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-400" />
          <button onClick={handleGenerateFullPlan} className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"><Sparkles className="w-4 h-4" /> 자동 생산</button>
          <button onClick={handleGenerateAllImages} className="px-4 py-2 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-white/20 transition-all"><ImageIcon className="w-4 h-4" /> 클린 배경 생성</button>
          <button onClick={handleBulkRender} className="px-6 py-2 bg-primary text-background rounded-xl font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Zap className="w-4 h-4" /> 일괄 렌더링</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Day Selector */}
        <div className="lg:col-span-3 space-y-2">
          {meditations.map((item, idx) => (
            <button key={item.id} onClick={() => setActiveIndex(idx)} className={cn("w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden group", activeIndex === idx ? "bg-indigo-500/10 border-indigo-500/40 shadow-xl" : "bg-white/5 border-white/5")}>
              <span className={cn("text-[9px] font-black tracking-widest block mb-1", activeIndex === idx ? "text-indigo-400" : "text-gray-500")}>DAY {idx + 1}</span>
              <p className="text-white font-bold text-sm truncate">{item.verse || "미작성"}</p>
              <div className="mt-2 flex items-center gap-2 text-[8px] font-bold text-gray-500">
                {item.bgImage && <span className="flex items-center gap-1 text-indigo-400"><ImageIcon className="w-2 h-2" /> 배경</span>}
                {item.bgAudio && <span className="flex items-center gap-1 text-emerald-400"><Music className="w-2 h-2" /> {item.audioName?.split('.')[0]}</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Preview & Audio Select */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-[320px] relative aspect-[9/16] bg-black rounded-[3rem] border-[8px] border-white/5 overflow-hidden shadow-2xl">
              {meditations[activeIndex].bgImage ? (
                <>
                  <img src={meditations[activeIndex].bgImage} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/5 flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-white text-lg font-bold leading-relaxed drop-shadow-md" style={{ color: '#333' }}>{meditations[activeIndex].verse || "말씀 미리보기"}</p>
                  </div>
                  {meditations[activeIndex].bgAudio && (
                    <div className="absolute top-6 left-6 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                      <Volume2 className="w-3 h-3 animate-pulse" /> {meditations[activeIndex].audioName}
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/5"><ImageIcon className="w-16 h-16" /><p className="text-xs font-bold uppercase tracking-widest">배경 없음</p></div>
              )}
            </div>
          </div>

          <GlassCard className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase">성경 말씀</label>
              <textarea value={meditations[activeIndex].verse} onChange={(e) => updateMeditation(activeIndex, { verse: e.target.value })} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase">묵상 내용</label>
              <textarea value={meditations[activeIndex].content} onChange={(e) => updateMeditation(activeIndex, { content: e.target.value })} className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Integrated Library (Tabs: Image / Audio) */}
      <div className="pt-10 border-t border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex bg-white/5 p-1 rounded-xl gap-1">
            <button onClick={() => setActiveLibraryTab('image')} className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2", activeLibraryTab === 'image' ? "bg-indigo-500 text-white shadow-lg" : "text-gray-500 hover:text-white")}>
              <ImageIcon className="w-4 h-4" /> 이미지
            </button>
            <button onClick={() => setActiveLibraryTab('audio')} className={cn("px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2", activeLibraryTab === 'audio' ? "bg-emerald-500 text-white shadow-lg" : "text-gray-500 hover:text-white")}>
              <Music className="w-4 h-4" /> 배경음악
            </button>
          </div>

          <div className="flex items-center gap-4">
            {activeLibraryTab === 'image' ? (
              <div className="flex items-center gap-1">
                <button onClick={() => setLibraryPage(p => Math.max(0, p - 1))} disabled={libraryPage === 0} className="p-1 hover:bg-white/10 rounded-lg disabled:opacity-20"><ChevronLeft /></button>
                <button onClick={() => setLibraryPage(p => Math.min(totalPages - 1, p + 1))} disabled={libraryPage >= totalPages - 1} className="p-1 hover:bg-white/10 rounded-lg disabled:opacity-20"><ChevronRight /></button>
              </div>
            ) : (
              <label className="cursor-pointer px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-500/20 transition-all">
                <Upload className="w-4 h-4" /> 내 음악 업로드 (MP3)
                <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
              </label>
            )}
          </div>
        </div>

        {activeLibraryTab === 'image' ? (
          <div className="grid grid-cols-7 md:grid-cols-14 gap-2">
            {paginatedImages.map((img) => (
              <div key={img.id} className="relative group aspect-[9/16] rounded-md overflow-hidden border border-white/5 bg-black/40 hover:scale-105 transition-all">
                <img src={img.url} className="w-full h-full object-cover cursor-pointer" onClick={() => updateMeditation(activeIndex, { bgImage: img.url })} />
                <button onClick={(e) => { e.stopPropagation(); deleteFromLibrary(img.id, 'image'); }} className="absolute top-1 right-1 p-1 bg-black/60 text-red-400 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audioLibrary.map((aud) => (
              <div key={aud.id} className={cn("p-4 rounded-2xl border transition-all flex items-center justify-between group", meditations[activeIndex].bgAudio === aud.url ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-white/5")}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => togglePlayAudio(aud.url, aud.id)} className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all">
                    {playingAudioId === aud.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{aud.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Personal Audio</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateMeditation(activeIndex, { bgAudio: aud.url, audioName: aud.name })} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", meditations[activeIndex].bgAudio === aud.url ? "bg-emerald-500 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20")}>
                    {meditations[activeIndex].bgAudio === aud.url ? "선택됨" : "선택"}
                  </button>
                  <button onClick={() => deleteFromLibrary(aud.id, 'audio')} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {audioLibrary.length === 0 && <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5 opacity-30"><Music className="w-8 h-8 mb-2" /><p className="text-xs font-bold uppercase tracking-widest">음악 도서관이 비어있습니다.</p></div>}
          </div>
        )}
      </div>

      <Terminal logs={logs} />
    </motion.div>
  );
};
