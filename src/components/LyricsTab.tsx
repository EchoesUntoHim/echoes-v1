import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Type as TypeIcon, Music, Image as ImageIcon, Copy, RefreshCw, ChevronRight, FileText, Globe, Trash2, Database, AlertCircle } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GlassCard } from './GlassCard';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { GoogleGenAI } from "@google/genai";
import {
  AI_ENGINES,
  TARGETS,
  POP_SUB_GENRES,
  CCM_SUB_GENRES,
  POP_MOODS,
  CCM_MOODS,
  TEMPOS,
  LYRICS_STYLES,
  VOCAL_OPTIONS,
  INSTRUMENT_CATEGORIES,
  CCM_GENRE_DESCRIPTIONS,
  CCM_GENRE_RECOMMENDATIONS
} from '../constants';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (timeStr: string) => {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s)) return 0;
  return m * 60 + s;
};

interface LyricsTabProps {
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  generateLyrics: () => Promise<void>;
  generatePromptOnly: () => Promise<void>;
  copyToClipboard: (text: string) => void;
  handleTabChange: (tab: string) => void;
  logs: string[];
  aiEngine: string;
  setAiEngine: (engine: string) => void;
  apiKey: string;
  addLog: (msg: string) => void;
  availableModels?: { value: string, label: string, type?: string }[];
  fetchAvailableModels?: () => void;
  isTranslating?: boolean;
  regenerateTitles?: () => Promise<void>;
  sunoTracks?: any[];
  setSunoTracks?: React.Dispatch<React.SetStateAction<any[]>>;
  instrumentDescription?: string;
}

export const LyricsTab = ({
  workflow,
  setWorkflow,
  generateLyrics,
  generatePromptOnly,
  copyToClipboard,
  handleTabChange,
  logs,
  aiEngine,
  setAiEngine,
  apiKey,
  addLog,
  availableModels = AI_ENGINES,
  fetchAvailableModels,
  isTranslating = false,
  regenerateTitles,
  sunoTracks = [],
  setSunoTracks,
  instrumentDescription = ''
}: LyricsTabProps) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [stripTimestamps, setStripTimestamps] = React.useState(false);
  const [isInstrumentOpen, setIsInstrumentOpen] = React.useState(false);
  const [libraryPage, setLibraryPage] = React.useState(0);
  const [selectedHistoryId, setSelectedHistoryId] = React.useState<string | null>(null);
  const itemsPerPage = 10;
  const translationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleLoadFromHistory = (track: any) => {
    setWorkflow(prev => ({
      ...prev,
      params: {
        ...prev.params,
        title: track.title,
        koreanTitle: track.title.split('_')[0].replace(/\[.*?\]/g, '').trim(),
        englishTitle: track.title.split('_')[1] || '',
        genre: track.genre || prev.params.genre,
        mood: track.mood || prev.params.mood
      },
      results: {
        ...prev.results,
        trackId: track.id,
        title: track.title || track.koreanTitle || '무제',
        lyrics: track.lyrics || track.koreanLyrics || track.content || '',
        englishLyrics: track.englishLyrics || '',
        timedLyrics: track.timedLyrics || [],
        interpretation: track.interpretation || track.intent || '',
        sunoPrompt: track.sunoPrompt || track.prompt || ''
      },
      progress: {
        ...prev.progress,
        lyrics: 100
      }
    }));

    // Auto-strip if enabled
    if (stripTimestamps) {
      setTimeout(() => {
        const regex = /\[\d{2}:\d{2}\]\s?/g;
        setWorkflow(prev => ({
          ...prev,
          results: {
            ...prev.results,
            lyrics: prev.results.lyrics?.replace(regex, ''),
            englishLyrics: prev.results.englishLyrics?.replace(regex, '')
          }
        }));
      }, 100);
    }

    addLog(`'${track.title}' 데이터를 불러왔습니다.`);
  };

  const deleteTrackHistory = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    if (!db) return;
    if (!confirm(`[${track.title || track.koreanTitle || '무제'}] 히스토리를 정말 삭제하시겠습니까?`)) return;

    try {
      addLog(`🗑️ [${track.title || track.koreanTitle}] 삭제 중...`);
      await deleteDoc(doc(db, 'sunoTracks', track.id)).catch(() => { });
      await deleteDoc(doc(db, 'generated_lyrics', track.id)).catch(() => { });
      if (setSunoTracks) {
        setSunoTracks(prev => prev.filter(t => t.id !== track.id));
      }
      addLog(`✅ 삭제 완료.`);
    } catch (err: any) {
      addLog(`❌ 삭제 실패: ${err.message}`);
    }
  };

  const toggleTimestamps = (val: boolean) => {
    setStripTimestamps(val);
    if (val) {
      const regex = /\[\d{2}:\d{2}\]\s?/g;
      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          lyrics: prev.results.lyrics?.replace(regex, ''),
          englishLyrics: prev.results.englishLyrics?.replace(regex, '')
        }
      }));
      addLog("✂️ 가사에서 타임스탬프를 제거했습니다.");
    } else {
      // If we have timedLyrics, we could potentially re-insert, but it's complex.
      // For now, just logging that we stop stripping.
      addLog("ℹ️ 타임스탬프 제거 모드를 비활성화했습니다. (새로 불러오기 시 반영)");
    }
  };

  // [v1.12.21] 실시간 동기화: 가사, 제목, 프롬프트 수정 시 즉시 히스토리(DB) 업데이트
  useEffect(() => {
    if (workflow.results.trackId && setSunoTracks) {
      setSunoTracks(prev => prev.map(t =>
        t.id === workflow.results.trackId
          ? {
            ...t,
            title: workflow.results.title,
            lyrics: workflow.results.lyrics,
            englishLyrics: workflow.results.englishLyrics,
            sunoPrompt: workflow.results.sunoPrompt,
            interpretation: workflow.results.interpretation
          }
          : t
      ));
    }
  }, [
    workflow.results.trackId,
    workflow.results.title,
    workflow.results.lyrics,
    workflow.results.englishLyrics,
    workflow.results.sunoPrompt,
    workflow.results.interpretation,
    setSunoTracks
  ]);

  return (
    <>
      <motion.div key="lyrics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">가사 및 프롬프트 생성</h1>
            <p className="text-gray-400">음악의 주제와 스타일을 설정하여 완벽한 가사를 만듭니다.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
              <RefreshCw className="w-3 h-3 text-primary" />
              <select
                value={aiEngine}
                onChange={(e) => setAiEngine(e.target.value)}
                className="bg-transparent text-[10px] text-white outline-none cursor-pointer font-bold max-w-[150px]"
              >
                {availableModels.map(eng => (
                  <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                    {eng.label} ({eng.type === 'paid' ? '유료' : '무료'})
                  </option>
                ))}
              </select>
              {fetchAvailableModels && (
                <button
                  onClick={fetchAvailableModels}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="모델 목록 갱신"
                >
                  <RefreshCw className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </header>

        <GlassCard className="border-secondary/30 bg-secondary/10 mb-[-8px]">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">사용자 전용 우선적용 (곡 해석/분위기)</span>
          </div>
          <textarea
            placeholder="곡에 대한 해석이나 강조하고 싶은 가사/분위기, 기타 지시사항을 자유롭게 입력하세요. AI가 이를 최우선으로 반영합니다."
            value={workflow.params.userInput || ''}
            onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, userInput: e.target.value } }))}
            className="w-full h-20 bg-black/60 border border-secondary/40 rounded-xl px-4 py-3 text-sm text-white focus:border-secondary outline-none transition-all resize-none shadow-inner placeholder:text-white/30"
          />
        </GlassCard>

        <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-6 border-primary/20">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <TypeIcon className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">곡 정보 설정</span>
              </div>
              <div className="space-y-1.5 p-2.5 bg-primary/10 rounded-xl border border-primary/30 neon-glow-primary/20">
                <div>
                  <label className="text-[10px] font-bold text-primary mb-1 block uppercase tracking-tighter">곡 제목 (AI 자동 생성 가능)</label>
                  <input
                    type="text"
                    placeholder="예: 벚꽃 흩날리는 오후"
                    value={workflow.params.title || ''}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const [kTitle, eTitle] = newTitle.includes('_') ? newTitle.split('_') : [newTitle, ''];
                      setWorkflow(prev => ({
                        ...prev,
                        params: {
                          ...prev.params,
                          title: newTitle,
                          koreanTitle: kTitle || prev.params.koreanTitle,
                          englishTitle: eTitle || prev.params.englishTitle
                        },
                        results: { ...prev.results, title: newTitle }
                      }));
                    }}
                    className="w-full bg-black/60 border border-primary/40 rounded-lg px-3 py-2 focus:border-primary outline-none text-white transition-all text-sm font-bold placeholder:text-white/20 shadow-inner"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 mb-0.5 block uppercase tracking-tighter">한글 제목</label>
                    <input
                      type="text"
                      value={workflow.params.koreanTitle || ''}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, koreanTitle: e.target.value } }))}
                      className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 mb-0.5 block uppercase tracking-tighter">영어 제목</label>
                    <input
                      type="text"
                      value={workflow.params.englishTitle || ''}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, englishTitle: e.target.value } }))}
                      className="w-full bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">주제 (Topic)</label>
                  <input
                    type="text"
                    value={workflow.params.topic}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, topic: e.target.value } }))}
                    placeholder="예: 그리운 고향, 첫사랑의 기억, 주님의 은혜"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">참조 곡/영상 링크 (YouTube)</label>
                  <input
                    type="text"
                    value={workflow.params.referenceLink || ''}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, referenceLink: e.target.value } }))}
                    placeholder="스타일을 참고할 유튜브 링크를 입력하세요."
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none text-white transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">타겟층</label>
                <select
                  value={workflow.params.target}
                  onChange={(e) => {
                    const target = e.target.value;
                    const subGenre = target === '대중음악' ? POP_SUB_GENRES[0] : CCM_SUB_GENRES[0];
                    const mood = target === '대중음악' ? POP_MOODS[0] : CCM_MOODS[0];
                    setWorkflow(prev => ({ ...prev, params: { ...prev.params, target, subGenre, mood } }));
                  }}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
                >
                  {TARGETS.map(t => <option key={t} value={t} className="bg-[#1A1F26] text-white">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">음악 장르</label>
                <select
                  value={workflow.params.subGenre}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, subGenre: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
                >
                  {(workflow.params.target === '대중음악' ? POP_SUB_GENRES : CCM_SUB_GENRES).map(sg => (
                    <option key={sg} value={sg} className="bg-[#1A1F26] text-white">{sg}</option>
                  ))}
                </select>
                {workflow.params.target === 'CCM' && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-primary/70 font-medium animate-pulse">
                      ✨ {CCM_GENRE_DESCRIPTIONS[workflow.params.subGenre] || '다양한 스타일의 기독교 음악'}
                    </p>
                    {CCM_GENRE_RECOMMENDATIONS[workflow.params.subGenre] && (
                      <div className="text-[10px] mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="shrink-0 text-gray-400">💡 추천 악기:</span>
                        {CCM_GENRE_RECOMMENDATIONS[workflow.params.subGenre].map(inst => (
                          <span key={inst} className="text-white font-bold px-1 rounded-sm bg-white/5 border border-white/10 text-[9px]">
                            {inst}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">템포</label>
                <select
                  value={workflow.params.tempo}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, tempo: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
                >
                  {TEMPOS.map(t => <option key={t} value={t} className="bg-[#1A1F26] text-white">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">가사 스타일</label>
                <select
                  value={workflow.params.lyricsStyle}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, lyricsStyle: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
                >
                  {LYRICS_STYLES.map(s => <option key={s} value={s} className="bg-[#1A1F26] text-white">{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">분위기</label>
              <div className={cn(
                "flex flex-wrap gap-2",
                workflow.params.target === 'CCM' ? "gap-x-1.5 gap-y-1" : "gap-2"
              )}>
                {(workflow.params.target === '대중음악' ? POP_MOODS : CCM_MOODS).map(m => (
                  <button
                    key={m}
                    onClick={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, mood: m } }))}
                    className={cn(
                      "transition-all duration-200",
                      workflow.params.target === 'CCM'
                        ? cn(
                          "px-2 py-0.5 text-xs font-bold border-b-2 rounded-sm",
                          workflow.params.mood === m
                            ? "text-primary border-primary bg-primary/5"
                            : "text-gray-500 border-transparent hover:text-gray-300 hover:border-white/10"
                        )
                        : cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border",
                          workflow.params.mood === m
                            ? "bg-primary text-background border-primary shadow-[0_0_15px_rgba(0,255,163,0.3)]"
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        )
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">보컬 타입</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(Object.keys(VOCAL_OPTIONS)).map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      const firstVocal = (VOCAL_OPTIONS as any)[v][0];
                      setWorkflow(prev => ({ ...prev, params: { ...prev.params, vocal: firstVocal } }));
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                      Object.values(VOCAL_OPTIONS).some(opts => opts.includes(workflow.params.vocal) && opts === (VOCAL_OPTIONS as any)[v])
                        ? "bg-secondary text-white border-secondary"
                        : "bg-white/5 border-white/10 text-gray-400"
                    )}
                  >
                    {v === 'Male' ? '남성' : v === 'Female' ? '여성' : v === 'Duet' ? '듀엣' : '합창'}
                  </button>
                ))}
              </div>
              <select
                value={workflow.params.vocal}
                onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, vocal: e.target.value } }))}
                className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-sm text-white appearance-none cursor-pointer"
              >
                {Object.values(VOCAL_OPTIONS).find(opts => opts.includes(workflow.params.vocal))?.map(opt => (
                  <option key={opt} value={opt} className="bg-[#1A1F26] text-white" disabled={opt.startsWith('---')}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1.5">
                <label className="text-sm font-medium text-gray-400 block">메인 악기 (AI가 세션을 구성합니다)</label>
                <span className="text-[9px] font-bold text-primary border border-primary/30 px-1.5 py-0.5 rounded">다중 선택 (퓨전)</span>
              </div>

              <button
                onClick={() => setIsInstrumentOpen(!isInstrumentOpen)}
                className="w-full flex items-center justify-between bg-black/40 border border-white/10 p-2.5 rounded-lg hover:border-primary/50 transition-all text-sm text-left group"
              >
                <span className="text-gray-300 font-bold group-hover:text-primary transition-colors">악기 목록 {isInstrumentOpen ? '접기 ▲' : '펼치기 ▼'}</span>
              </button>

              {workflow.params.instrument && (
                <div className="mt-1.5 p-2 bg-white/5 rounded-lg border border-white/10 flex flex-wrap gap-1 items-center">
                  <span className="text-[9px] text-gray-400 font-bold mr-1">현재 선택됨:</span>
                  {workflow.params.instrument.split(', ').filter(Boolean).map((inst: string) => (
                    <span key={inst} className="text-[9px] text-white font-bold px-1.5 py-0.5 bg-white/10 border border-white/20 rounded">
                      {inst}
                    </span>
                  ))}
                  {instrumentDescription && (
                    <span className="text-[9px] text-primary font-black px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded ml-1 animate-pulse">
                      ✨ AI 매핑: {instrumentDescription}
                    </span>
                  )}
                </div>
              )}

              {isInstrumentOpen && (
                <div className="space-y-2.5 mt-2 p-2.5 bg-black/20 rounded-lg border border-white/5">
                  {Object.entries(INSTRUMENT_CATEGORIES).map(([category, instruments]) => (
                    <div key={category} className="space-y-1">
                      <p className="text-[9px] font-bold text-primary/80 uppercase tracking-widest pl-1">{category}</p>
                      <div className={cn(
                        "flex flex-wrap gap-1.5",
                        workflow.params.target === 'CCM' ? "gap-x-1.5 gap-y-1" : "gap-1.5"
                      )}>
                        {instruments.map(inst => {
                          const currentInstruments = workflow.params.instrument ? workflow.params.instrument.split(', ').filter(Boolean) : [];
                          const isSelected = currentInstruments.includes(inst);
                          return (
                            <button
                              key={inst}
                              onClick={() => {
                                let newInstruments;
                                if (isSelected) {
                                  newInstruments = currentInstruments.filter((i: string) => i !== inst);
                                } else {
                                  newInstruments = [...currentInstruments, inst];
                                }
                                setWorkflow(prev => ({ ...prev, params: { ...prev.params, instrument: newInstruments.join(', ') } }));
                              }}
                              className={cn(
                                "transition-all duration-200",
                                workflow.params.target === 'CCM'
                                  ? cn(
                                    "px-2 py-0.5 text-xs font-bold border-b-2 rounded-sm",
                                    isSelected
                                      ? "text-primary border-primary bg-primary/10"
                                      : "text-gray-400 border-transparent hover:text-white hover:border-white/10"
                                  )
                                  : cn(
                                    "px-3 py-1 text-xs font-medium border rounded-md",
                                    isSelected
                                      ? "bg-primary/10 text-primary border-primary/30"
                                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                                  )
                              )}
                            >
                              {inst}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>



            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">음악 엔진: Suno AI v3.5</span>
              </div>
              <button
                onClick={generateLyrics}
                className="w-full bg-primary/10 text-primary border border-primary/40 py-3 rounded-xl font-black text-lg hover:bg-primary/20 transition-colors shadow-[0_0_15px_rgba(0,255,163,0.1)]"
              >
                가사 및 프롬프트 생성
              </button>
            </div>
          </div>
        </GlassCard>

        {workflow.progress.lyrics === 100 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            {(workflow.results.interpretation || workflow.results.intent) && (
              <GlassCard className="border-secondary/20 bg-secondary/5 p-4">
                <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">AI 곡 해석 (Song Interpretation)</p>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {workflow.results.interpretation || workflow.results.intent}
                </p>
              </GlassCard>
            )}
            <GlassCard className="border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">생성된 제목 (수정 가능)</span>
                  <input
                    type="text"
                    value={workflow.results.title}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, results: { ...prev.results, title: e.target.value } }))}
                    className="text-2xl font-black text-white bg-transparent border-none outline-none w-full focus:ring-0 p-0"
                  />
                </div>
                <button onClick={() => copyToClipboard(workflow.results.title || '')} className="p-2 hover:bg-white/10 rounded-lg text-primary shrink-0">
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              {workflow.results.suggestedTitles && workflow.results.suggestedTitles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">AI가 제안하는 다른 제목들 (클릭하여 변경)</p>
                    {regenerateTitles && (
                      <button
                        onClick={regenerateTitles}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-black transition-all border border-primary/20"
                      >
                        <RefreshCw className="w-3 h-3" /> 제목만 다시 생성
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workflow.results.suggestedTitles.map((title: any, idx: number) => {
                      if (typeof title !== 'string') return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const [kTitle, eTitle] = title.includes('_') ? title.split('_') : [title, ''];
                            setWorkflow(prev => ({
                              ...prev,
                              params: {
                                ...prev.params,
                                title: title,
                                koreanTitle: kTitle,
                                englishTitle: eTitle
                              },
                              results: {
                                ...prev.results,
                                title: title
                              }
                            }));
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            workflow.results.title === title
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                          )}
                        >
                          {title.includes('_') ? title.replace('_', ' / ') : title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-primary">한글 가사 (수정 가능)</h3>
                    <label className="flex items-center gap-2 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md cursor-pointer hover:bg-primary/20 transition-all">
                      <input
                        type="checkbox"
                        checked={stripTimestamps}
                        onChange={(e) => toggleTimestamps(e.target.checked)}
                        className="w-3 h-3 accent-primary"
                      />
                      <span className="text-[10px] font-black text-primary uppercase tracking-tighter">타임스탬프 제외</span>
                    </label>
                  </div>
                  <button onClick={() => copyToClipboard(workflow.results.lyrics || '')} className="p-2 hover:bg-white/5 rounded-lg"><Copy className="w-4 h-4" /></button>
                </div>
                <textarea
                  value={workflow.results.lyrics}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, results: { ...prev.results, lyrics: e.target.value } }))}
                  className="w-full text-sm font-sans whitespace-pre-wrap text-gray-300 leading-relaxed h-80 overflow-y-auto p-4 bg-black/20 rounded-xl border border-white/5 focus:border-primary/30 outline-none resize-none"
                />
              </GlassCard>
              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-primary">영어 가사 (수정 가능)</h3>
                  <div className="flex items-center gap-2">
                    {isTranslating && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
                    <button onClick={() => copyToClipboard(workflow.results.englishLyrics || '')} className="p-2 hover:bg-white/5 rounded-lg"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
                <textarea
                  value={workflow.results.englishLyrics || ''}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, results: { ...prev.results, englishLyrics: e.target.value } }))}
                  className="w-full text-sm font-sans whitespace-pre-wrap text-gray-300 leading-relaxed h-80 overflow-y-auto p-4 bg-black/20 rounded-xl border border-white/5 focus:border-primary/30 outline-none resize-none"
                />
              </GlassCard>
              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-secondary">Suno AI 프롬프트</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={generatePromptOnly}
                      className="px-3 py-1.5 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> 프롬프트만 재생성
                    </button>
                    <button onClick={() => copyToClipboard(workflow.results.sunoPrompt || '')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-secondary transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={workflow.results.sunoPrompt}
                  className="w-full text-xs font-mono text-gray-400 h-80 overflow-y-auto p-4 bg-black/40 rounded-xl border border-white/5 focus:border-secondary/30 outline-none resize-none leading-relaxed"
                />
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* 곡 생성 히스토리 (SLIM LIST 스타일 통일) */}
        <div className="space-y-4 pt-12 mt-12 border-t border-white/10">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-bold text-[11px] text-gray-400 flex items-center gap-2 uppercase tracking-tight">
              <Database className="w-3.5 h-3.5 text-primary" /> 가사 생성 히스토리 (SLIM LIST)
            </h4>
            <span className="text-[9px] text-gray-600 font-medium">통합 히스토리</span>
          </div>

          {sunoTracks.filter(t => t.lyrics || t.koreanLyrics || t.content).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {sunoTracks
                .filter(t => t.lyrics || t.koreanLyrics || t.content)
                .slice(0, 20)
                .map((track, idx) => (
                  <div
                    key={track.id || `track-${idx}`}
                    onClick={() => {
                      handleLoadFromHistory(track);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group cursor-pointer flex items-center justify-between bg-black/20 hover:bg-white/5 border-l-2 border-transparent hover:border-primary transition-all pr-0"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 py-1.5 pl-3">
                      <span className="text-[9px] font-bold text-primary/40 group-hover:text-primary transition-colors w-3">{idx + 1}</span>
                      <p className="text-[11px] font-bold text-white/90 truncate tracking-tight">
                        {(track.title || track.koreanTitle || '무제')
                          .replace(/#\S+/g, '') // 해시태그 제거
                          .replace(/\[.*?\]/g, '') // [CCM] 등 분류 태그 제거
                          .trim()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 h-full">
                      <span className="text-[8px] text-gray-600 font-medium">
                        {new Date(track.createdAt || track.created_at || Date.now()).toLocaleDateString().replace(/\. /g, '.')}
                      </span>
                      <button
                        onClick={(e) => deleteTrackHistory(e, track)}
                        className="opacity-0 group-hover:opacity-100 h-[32px] aspect-square flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400/40 hover:text-red-400 transition-all border-l border-white/5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
              <p className="text-xs text-gray-500 font-medium">히스토리가 비어 있습니다.</p>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-10">
          <button onClick={() => handleTabChange('music')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
            다음 단계: 음악 생성 <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <Terminal logs={logs} />
      </motion.div>
    </>
  );
};
