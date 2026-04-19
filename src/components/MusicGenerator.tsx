import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, Play, Pause, Download, RefreshCw, Mic, Trash2, 
  ListMusic, Zap, Tag, Sparkles, Activity, ChevronDown, 
  ChevronUp, Info, Sliders, X, Copy, Check, Settings
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Terminal } from './Terminal';
import { GoogleGenAI, Modality } from "@google/genai";
import { cn } from '../lib/utils';
import { 
  TARGETS, 
  POP_SUB_GENRES, 
  CCM_SUB_GENRES, 
  POP_MOODS, 
  CCM_MOODS, 
  TEMPOS, 
  VOCAL_OPTIONS,
  MUSIC_ENGINES
} from '../constants';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface GeneratedTrack {
  id: string;
  title: string;
  url: string;
  lyrics: string;
  prompt: string;
  vocal: string;
  genre: string;
  mood: string;
  tempo: string;
  target: string;
  timestamp: number;
}

interface MusicGeneratorProps {
  apiKey: string;
  addLog: (msg: string) => void;
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  musicEngine: string;
  setMusicEngine: (engine: string) => void;
  voiceReference: string | null;
  setVoiceReference: (ref: string | null) => void;
  voiceRefName: string;
  setVoiceRefName: (name: string) => void;
  logs: string[];
  availableModels?: {value: string, label: string, type?: string}[];
  fetchAvailableModels?: () => void;
  resetSubsequentSteps: (fromStep: any) => void;
}

export const MusicGenerator = ({ 
  apiKey, 
  addLog, 
  workflow, 
  setWorkflow,
  musicEngine,
  setMusicEngine,
  voiceReference,
  setVoiceReference,
  voiceRefName,
  setVoiceRefName,
  logs,
  availableModels,
  fetchAvailableModels,
  resetSubsequentSteps
}: MusicGeneratorProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [lyricsMode, setLyricsMode] = useState<'manual' | 'auto'>('manual');
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>(() => {
    const saved = localStorage.getItem('vibeflow_generated_tracks');
    return saved ? JSON.parse(saved) : [];
  });
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [musicParams, setMusicParams] = useState({
    title: workflow.results.title || '',
    lyrics: workflow.results.lyrics || '',
    prompt: workflow.results.sunoPrompt || '',
    target: workflow.params.target || '대중음악',
    genre: workflow.params.subGenre || '발라드',
    mood: workflow.params.mood || '신나는',
    tempo: workflow.params.tempo || '보통',
    vocal: workflow.params.vocal || 'Male',
    excludeStyles: '',
    englishLyrics: workflow.results.englishLyrics || '',
    weirdness: 50,
    styleInfluence: 50
  });

  // Sync with workflow results
  useEffect(() => {
    if (workflow.results.lyrics || workflow.results.englishLyrics || workflow.results.title || workflow.results.sunoPrompt) {
      setMusicParams(prev => ({
        ...prev,
        title: workflow.results.title || prev.title,
        lyrics: workflow.results.lyrics || prev.lyrics,
        englishLyrics: workflow.results.englishLyrics || prev.englishLyrics,
        prompt: workflow.results.sunoPrompt || prev.prompt
      }));
    }
  }, [workflow.results.lyrics, workflow.results.englishLyrics, workflow.results.title, workflow.results.sunoPrompt]);

  // Sync Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Tracks from Firestore or LocalStorage
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'tracks'),
        where('uid', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tracks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GeneratedTrack[];
        setGeneratedTracks(tracks);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tracks');
      });

      return () => unsubscribe();
    } else {
      const saved = localStorage.getItem('vibeflow_generated_tracks');
      if (saved) {
        setGeneratedTracks(JSON.parse(saved));
      }
    }
  }, [user]);

  // Update sub-genre when target changes
  useEffect(() => {
    const defaultSub = musicParams.target === '대중음악' ? POP_SUB_GENRES[0] : CCM_SUB_GENRES[0];
    const defaultMood = musicParams.target === '대중음악' ? POP_MOODS[0] : CCM_MOODS[0];
    setMusicParams(prev => ({ ...prev, genre: defaultSub, mood: defaultMood }));
  }, [musicParams.target]);

  const saveTracks = async (trackInfo: Omit<GeneratedTrack, 'id' | 'url'>, blobUrl: string, blob: Blob) => {
    let finalUrl = blobUrl;
    if (user) {
      addLog("☁️ 클라우드 안전 백업 시도 중... (5초 내 완료되지 않으면 로컬 저장합니다)");
      try {
        const { uploadAudioToStorageSafe } = await import('../firebase');
        
        // 5초 타임아웃 설정
        const backupPromise = uploadAudioToStorageSafe(blob, 'generated');
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        
        const cloudUrl = await Promise.race([backupPromise, timeoutPromise]);
        
        if (cloudUrl) {
          finalUrl = cloudUrl;
          addLog("✅ 클라우드 저장 성공!");
        } else {
          addLog("⚠️ 백업 시간이 너무 길어 로컬 모드로 전환합니다. (재생에는 지장 없습니다)");
        }
      } catch (e) {
        addLog("⚠️ 백업 중 오류가 발생하여 로컬로 저장합니다.");
      }
    }

    const newTrack = { 
      ...trackInfo, 
      url: finalUrl,
      id: Math.random().toString(36).substr(2, 9) 
    };

    // 낙관적 업데이트: DB 저장이 완료되기 전에 화면에 먼저 표시합니다.
    const updatedTracks = [newTrack as GeneratedTrack, ...generatedTracks];
    setGeneratedTracks(updatedTracks);
    localStorage.setItem('vibeflow_generated_tracks', JSON.stringify(updatedTracks));

    if (user) {
      try {
        // DB 저장은 백그라운드에서 진행 (await를 빼거나 에러 처리만 수행)
        addDoc(collection(db, 'tracks'), {
          uid: user.uid,
          title: (newTrack as any).title || 'Untitled',
          url: (newTrack as any).url,
          author: (newTrack as any).author || 'AI Producer',
          genre: (newTrack as any).genre || '',
          mood: (newTrack as any).mood || '',
          prompt: (newTrack as any).prompt || '',
          createdAt: serverTimestamp()
        }).catch(error => {
          console.error("Firestore background save failed:", error);
        });
      } catch (error) {
        console.warn("Firestore save setup failed:", error);
      }
    }
    
    return finalUrl;
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoiceRefName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVoiceReference(reader.result as string);
        addLog(`🎙️ 목소리 레퍼런스 업로드 완료: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateMusic = async () => {
    if (!apiKey) {
      addLog("⚠️ API 키가 필요합니다.");
      return;
    }

    setIsGenerating(true);
    resetSubsequentSteps('music');
    const engineLabel = MUSIC_ENGINES.find(e => e.value === musicEngine)?.label || musicEngine;
    addLog(`🎵 ${engineLabel} 엔진으로 음악 생성을 시작합니다...`);

    try {
      const currentKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      const parts: any[] = [
        { text: `
          [SONG TITLE]
          ${musicParams.title}

          [TARGET]
          ${musicParams.target}

          [GENRE]
          ${musicParams.genre}

          [MOOD]
          ${musicParams.mood}

          [TEMPO]
          ${musicParams.tempo}

          [MUSICAL STYLE & PROMPT]
          ${musicParams.prompt}
          ${musicParams.excludeStyles ? `[EXCLUDE STYLES]: ${musicParams.excludeStyles}` : ''}
          [WEIRDNESS]: ${musicParams.weirdness}%
          [STYLE INFLUENCE]: ${musicParams.styleInfluence}%

          [VOCAL STYLE]
          ${musicParams.vocal}

          [LYRICS TO SING]
          ${musicParams.lyrics || 'AI가 프롬프트에 맞춰 가사를 생성하여 노래합니다.'}
          ${musicParams.englishLyrics ? `[ENGLISH LYRICS]: ${musicParams.englishLyrics}` : ''}
          ${lyricsMode === 'auto' ? '(Note: If lyrics are provided above, use them as the primary lyrics for the song.)' : ''}
        `}
      ];

      if (voiceReference) {
        const [header, data] = voiceReference.split(',');
        let mimeType = header.match(/:(.*?);/)?.[1] || "audio/wav";
        
        const isLyria = musicEngine?.toLowerCase().includes('lyria');

        if (isLyria && mimeType.includes('wav')) {
          addLog("❌ Lyria 엔진은 WAV 형식의 음성을 지원하지 않습니다. MP3 또는 M4A 형식으로 업로드해주세요.");
          setIsGenerating(false);
          return;
        }

        if (mimeType.includes('s16le') || mimeType.includes('wav')) {
          mimeType = 'audio/wav';
        } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
          mimeType = 'audio/mp3';
        }
        // ----------------------------------------------------

        parts.push({
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        });
        addLog("🎙️ 업로드된 목소리 레퍼런스를 반영하여 생성합니다.");
      }

      const contents = [{ role: "user", parts }];

      const isLyria = musicEngine?.toLowerCase().includes('lyria');
      
      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";

      if (isLyria) {
        addLog("📻 Lyria 스트리밍 생성을 시작합니다...");
        const responseStream = await ai.models.generateContentStream({
          model: musicEngine,
          contents: contents,
          config: {
            responseModalities: ["AUDIO"],
            temperature: 0.7
          } as any
        } as any);

        for await (const chunk of responseStream) {
          const parts = (chunk as any).candidates?.[0]?.content?.parts;
          if (!parts) continue;
          
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
            if (part.text && !lyrics) {
              lyrics = part.text;
              addLog(`📝 [AI Lyrics]: ${lyrics.substring(0, 50)}...`);
            }
          }
        }
      } else {
        const response = await ai.models.generateContent({
          model: musicEngine,
          contents: contents,
          config: {
            temperature: 0.7
          }
        } as any);

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
               addLog(`📝 [AI 응답]: ${part.text}`);
            }
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
          }
        }
      }

      if (audioBase64) {
        addLog("📦 생성된 음원 데이터를 변환 중...");
        
        try {
          // AGENTS.md: 브라우저 네이티브 fetch 엔진을 사용하여 헤더 복구 및 Blob 생성
          const dataUrl = `data:${mimeType};base64,${audioBase64}`;
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          const newTrackData = {
            title: musicParams.title || 'Untitled Track',
            lyrics: musicParams.lyrics,
            prompt: musicParams.prompt,
            vocal: musicParams.vocal,
            genre: musicParams.genre,
            mood: musicParams.mood,
            tempo: musicParams.tempo,
            target: musicParams.target,
            timestamp: Date.now()
          };

          const finalSavedUrl = await saveTracks(newTrackData, url, blob);
          addLog(`✅ 음악 생성 완료: ${newTrackData.title}`);
          
          setWorkflow((prev: any) => ({
            ...prev,
            results: {
              ...prev.results,
              audioUrl: finalSavedUrl,
              lyrics: musicParams.lyrics,
              englishLyrics: musicParams.englishLyrics
            }
          }));
        } catch (convertError) {
          console.error("Audio conversion error:", convertError);
          addLog("❌ 오디오 데이터 변환 중 오류가 발생했습니다.");
        }
      }
    } catch (error) {
      console.error(error);
      addLog("❌ 음악 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = (track: GeneratedTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
        setPlayingTrackId(track.id);
      }
    }
  };

  const deleteTrack = async (id: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'tracks', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tracks/${id}`);
      }
    } else {
      const updated = generatedTracks.filter(t => t.id !== id);
      setGeneratedTracks(updated);
      localStorage.setItem('vibeflow_generated_tracks', JSON.stringify(updated));
    }

    if (playingTrackId === id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Controls (Suno Style) */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard className="border-primary/20 bg-primary/5 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Create</h2>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
                  <Settings className="w-3 h-3 text-gray-400" />
                  <select
                    value={musicEngine}
                    onChange={(e) => {
                      setMusicEngine(e.target.value);
                      localStorage.setItem('music_engine', e.target.value);
                    }}
                    className="bg-transparent text-[10px] text-white outline-none cursor-pointer font-bold max-w-[120px]"
                  >
                    {MUSIC_ENGINES.map(eng => (
                      <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                        {eng.label} ({eng.type === 'paid' ? '유료' : '무료'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Lyrics Mode Toggle */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setLyricsMode('manual')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    lyricsMode === 'manual' ? "bg-primary text-background" : "text-gray-400 hover:text-white"
                  )}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setLyricsMode('auto')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    lyricsMode === 'auto' ? "bg-primary text-background" : "text-gray-400 hover:text-white"
                  )}
                >
                  Auto
                </button>
              </div>

              {lyricsMode === 'auto' && (
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-[10px] text-primary leading-relaxed">
                    {musicParams.lyrics 
                      ? "이전 단계에서 생성된 가사(한글/영어)를 기반으로 음악을 생성합니다." 
                      : "AI가 곡 정보에 맞춰 가사를 자동으로 생성하여 노래합니다."}
                  </p>
                </div>
              )}

              {/* Lyrics Input */}
              {lyricsMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Korean Lyrics</label>
                    <textarea 
                      value={musicParams.lyrics}
                      onChange={(e) => setMusicParams(p => ({ ...p, lyrics: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-32 overflow-y-auto custom-scrollbar text-sm"
                      placeholder="한글 가사를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">English Lyrics</label>
                    <textarea 
                      value={musicParams.englishLyrics}
                      onChange={(e) => setMusicParams(p => ({ ...p, englishLyrics: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-32 overflow-y-auto custom-scrollbar text-sm"
                      placeholder="English lyrics (Optional)"
                    />
                  </div>
                </div>
              )}

              {/* Style Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400">Styles</label>
                  <button className="text-[10px] text-primary hover:underline">Randomize</button>
                </div>
                <textarea 
                  value={musicParams.prompt}
                  onChange={(e) => setMusicParams(p => ({ ...p, prompt: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-24 resize-none text-sm"
                  placeholder="Enter musical style (e.g. K-Pop, Ballad, Synthwave)"
                />
              </div>

              {/* More Options Toggle */}
              <button 
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-400 hover:text-white transition-colors py-2"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3 h-3" /> More Options
                </span>
                {showMoreOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    {/* Vocal Gender */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Vocal Gender</label>
                        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                          <button 
                            onClick={() => setMusicParams(p => ({ ...p, vocal: 'Male' }))}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                              musicParams.vocal === 'Male' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                          >
                            Male
                          </button>
                          <button 
                            onClick={() => setMusicParams(p => ({ ...p, vocal: 'Female' }))}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                              musicParams.vocal === 'Female' ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                          >
                            Female
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Target</label>
                      <div className="flex gap-2">
                        {TARGETS.map(t => (
                          <button 
                            key={t}
                            onClick={() => setMusicParams(p => ({ ...p, target: t }))}
                            className={cn(
                              "flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all",
                              musicParams.target === t ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-gray-400"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Genre & Mood */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Genre</label>
                        <select 
                          value={musicParams.genre}
                          onChange={(e) => setMusicParams(p => ({ ...p, genre: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none text-white"
                        >
                          {(musicParams.target === '대중음악' ? POP_SUB_GENRES : CCM_SUB_GENRES).map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Mood</label>
                        <select 
                          value={musicParams.mood}
                          onChange={(e) => setMusicParams(p => ({ ...p, mood: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none text-white"
                        >
                          {(musicParams.target === '대중음악' ? POP_MOODS : CCM_MOODS).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Voice Reference Upload */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Voice Reference (Optional)</label>
                      <div className="relative group overflow-hidden rounded-lg border border-white/10 hover:border-primary/50 transition-colors bg-black/20 p-3">
                        <input 
                          type="file" 
                          accept="audio/*" 
                          onChange={handleVoiceUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Mic className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate">
                              {voiceRefName || 'Upload your voice'}
                            </p>
                            <p className="text-[8px] text-gray-500">MP3, WAV (Max 10MB)</p>
                          </div>
                          {voiceReference && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setVoiceReference(null); setVoiceRefName(''); }}
                              className="relative z-20 p-1 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Exclude Styles */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Exclude Styles</label>
                      <input 
                        type="text"
                        value={musicParams.excludeStyles}
                        onChange={(e) => setMusicParams(p => ({ ...p, excludeStyles: e.target.value }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] outline-none text-white"
                        placeholder="Styles to avoid"
                      />
                    </div>

                    {/* Sliders */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Weirdness</label>
                          <span className="text-[10px] text-primary font-bold">{musicParams.weirdness}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={musicParams.weirdness}
                          onChange={(e) => setMusicParams(p => ({ ...p, weirdness: parseInt(e.target.value) }))}
                          className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Style Influence</label>
                          <span className="text-[10px] text-primary font-bold">{musicParams.styleInfluence}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={musicParams.styleInfluence}
                          onChange={(e) => setMusicParams(p => ({ ...p, styleInfluence: parseInt(e.target.value) }))}
                          className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400">Song Title (Optional)</label>
                <input 
                  type="text"
                  value={musicParams.title}
                  onChange={(e) => setMusicParams(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all text-sm"
                  placeholder="Enter song title"
                />
              </div>

              {/* Create Button */}
              <button 
                onClick={generateMusic}
                disabled={isGenerating}
                className="w-full bg-primary text-background py-4 rounded-xl font-black text-lg hover:neon-glow-primary transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
              >
                {isGenerating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                {isGenerating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right: Workspaces / Track List (Suno Style) */}
        <div className="lg:col-span-8 space-y-4">
          <GlassCard className="border-white/5 bg-black/20 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">My Workspace</h2>
                  <p className="text-xs text-gray-400">{generatedTracks.length} tracks generated</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all">Newest</button>
                <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all">Liked</button>
              </div>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {generatedTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
                  <Music className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No tracks yet. Start creating!</p>
                </div>
              ) : (
                generatedTracks.map((track) => (
                  <div 
                    key={track.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all group cursor-pointer",
                      playingTrackId === track.id ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                    onClick={() => togglePlay(track)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative w-12 h-12 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden">
                        {playingTrackId === track.id ? (
                          <div className="flex items-center gap-0.5">
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-primary" />
                            <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-primary" />
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 bg-primary" />
                          </div>
                        ) : (
                          <Play className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm truncate">{track.title}</h4>
                          <span className="text-[8px] px-1.5 py-0.5 bg-secondary/20 text-secondary rounded uppercase font-bold">v3.5</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate mt-1">
                          {track.genre}, {track.mood}, {track.target}, {track.vocal}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="hidden sm:block">{new Date(track.timestamp).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={track.url} 
                          download={`${track.title}.wav`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                          className="p-2 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="mt-8">
        <Terminal logs={logs} />
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} className="hidden" />
    </div>
  );
};
