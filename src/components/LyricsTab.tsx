import React from 'react';
import { motion } from 'motion/react';
import { Send, Type as TypeIcon, Music, Copy, RefreshCw, ChevronRight } from 'lucide-react';
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
  INSTRUMENTS
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
  musicEngine: string;
  apiKey: string;
  addLog: (msg: string) => void;
  availableModels?: { value: string, label: string, type?: string }[];
  fetchAvailableModels?: () => void;
  isTranslating?: boolean;
  regenerateTitles?: () => Promise<void>;
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
  musicEngine,
  apiKey,
  addLog,
  availableModels = AI_ENGINES,
  fetchAvailableModels,
  isTranslating = false,
  regenerateTitles
}: LyricsTabProps) => {
  const translationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 실시간 자동 번역 로직 제거 (비용 절감 및 사용자 수동 제어)
  /*
  React.useEffect(() => {
    ...
  }, [workflow.results.lyrics, apiKey, workflow.progress.lyrics]);
  */

  return (
    <motion.div key="lyrics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
      <GlassCard className="border-secondary/30 bg-secondary/5">
        <div className="flex items-center gap-2 text-secondary mb-4">
          <Send className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-widest">사용자 직접 입력 (최우선 반영)</span>
        </div>
        <textarea
          value={workflow.params.userInput || ''}
          onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, userInput: e.target.value } }))}
          placeholder="여기에 특정 가사 내용, 분위기, 스토리 등을 자유롭게 입력하세요. 입력 시 아래 설정보다 이 내용이 우선적으로 반영됩니다."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-secondary outline-none transition-all h-32 resize-none"
        />
      </GlassCard>

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
          <div className="text-right">
            <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">음악 엔진</span>
            <p className="text-xs font-mono text-secondary">
              {musicEngine.includes('magenta') ? 'Google Magenta' :
                musicEngine.includes('musiclm') ? 'Google MusicLM' :
                  musicEngine.includes('suno') ? 'Suno AI' :
                    musicEngine.includes('udio') ? 'Udio' : 'Echoes Unto Him'}
            </p>
          </div>
        </div>
      </header>

      <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-6 border-primary/20">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <TypeIcon className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">곡 정보 설정</span>
            </div>
            <div className="space-y-4 p-5 bg-primary/10 rounded-2xl border-2 border-primary/30 neon-glow-primary/20">
              <div>
                <label className="text-xs font-bold text-primary mb-2 block uppercase tracking-tighter">곡 제목 (AI 자동 생성 가능)</label>
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
                  className="w-full bg-black/60 border border-primary/40 rounded-xl px-4 py-4 focus:border-primary outline-none text-white transition-all text-xl font-black placeholder:text-white/20 shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">한글 제목</label>
                  <input
                    type="text"
                    value={workflow.params.koreanTitle || ''}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, koreanTitle: e.target.value } }))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">영어 제목</label>
                  <input
                    type="text"
                    value={workflow.params.englishTitle || ''}
                    onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, englishTitle: e.target.value } }))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-tighter">주제 (Topic)</label>
                <input
                  type="text"
                  value={workflow.params.topic}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, topic: e.target.value } }))}
                  placeholder="예: 그리운 고향, 첫사랑의 기억, 주님의 은혜"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all"
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
            <div className="flex flex-wrap gap-2">
              {(workflow.params.target === '대중음악' ? POP_MOODS : CCM_MOODS).map(m => (
                <button
                  key={m}
                  onClick={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, mood: m } }))}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    workflow.params.mood === m ? "bg-primary text-background border-primary" : "bg-white/5 border-white/10 text-gray-400"
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
            <label className="text-sm font-medium text-gray-400 mb-2 block">메인 악기 (AI가 세션을 구성합니다)</label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map(inst => (
                <button
                  key={inst}
                  onClick={() => {
                    setWorkflow(prev => ({ ...prev, params: { ...prev.params, instrument: inst } }));
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    workflow.params.instrument === inst ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 border-white/10 text-gray-400"
                  )}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-secondary" />
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">음악 엔진: Suno AI v3.5</span>
            </div>
            <button
              onClick={generateLyrics}
              className="w-full bg-primary text-background py-4 rounded-xl font-black text-lg neon-glow-primary"
            >
              가사 및 프롬프트 생성
            </button>
          </div>
        </div>
      </GlassCard>

      {workflow.progress.lyrics === 100 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          {workflow.results.intent && (
            <GlassCard className="border-secondary/20 bg-secondary/5 p-4">
              <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-2">AI 가사 생성 의도</p>
              <p className="text-sm text-gray-300 leading-relaxed">{workflow.results.intent}</p>
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
                <h3 className="font-bold text-primary">한글 가사 (수정 가능)</h3>
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

          {/* Timed Lyrics Editor Section */}
          {workflow.results.timedLyrics && workflow.results.timedLyrics.length > 0 && (
            <GlassCard className="border-secondary/30 bg-secondary/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/20 rounded-lg">
                    <Music className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tight">정밀 자막 싱크 (Timed Lyrics)</h3>
                    <p className="text-xs text-gray-400">이미지 하이라이트처럼 각 줄마다 개별 시간을 설정할 수 있습니다.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const text = workflow.results.timedLyrics.map((item: any) => `[${formatTime(item.time)}] ${item.kor}`).join('\n');
                      copyToClipboard(text);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all border border-white/10"
                  >
                    싱크 데이터 복사
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {workflow.results.timedLyrics.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start bg-black/30 p-3 rounded-xl border border-white/5 hover:border-secondary/30 transition-all group">
                    <div className="w-24 shrink-0">
                      <div className="text-[10px] font-bold text-secondary mb-1 uppercase opacity-60">시간</div>
                      <input
                        type="text"
                        value={formatTime(item.time)}
                        onChange={(e) => {
                          const newTime = parseTime(e.target.value);
                          const newList = [...workflow.results.timedLyrics];
                          newList[idx] = { ...newList[idx], time: newTime };
                          setWorkflow((prev: any) => ({
                            ...prev,
                            results: { ...prev.results, timedLyrics: newList }
                          }));
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono focus:border-secondary outline-none"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase opacity-60">한글 가사</div>
                          <input
                            type="text"
                            value={item.kor}
                            onChange={(e) => {
                              const newList = [...workflow.results.timedLyrics];
                              newList[idx] = { ...newList[idx], kor: e.target.value };
                              setWorkflow((prev: any) => ({
                                ...prev,
                                results: { ...prev.results, timedLyrics: newList }
                              }));
                            }}
                            className="w-full bg-transparent border-b border-white/5 focus:border-secondary/50 outline-none text-sm text-white py-1 transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase opacity-60">영어 번역</div>
                          <input
                            type="text"
                            value={item.eng}
                            onChange={(e) => {
                              const newList = [...workflow.results.timedLyrics];
                              newList[idx] = { ...newList[idx], eng: e.target.value };
                              setWorkflow((prev: any) => ({
                                ...prev,
                                results: { ...prev.results, timedLyrics: newList }
                              }));
                            }}
                            className="w-full bg-transparent border-b border-white/5 focus:border-secondary/50 outline-none text-sm text-gray-400 py-1 transition-all"
                          />
                        </div>
                      </div>
                      {item.section && (
                        <div className="inline-block px-2 py-0.5 bg-secondary/10 text-secondary text-[10px] font-bold rounded uppercase">
                          {item.section}
                        </div>
                      )}
                    </div>
                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const newList = workflow.results.timedLyrics.filter((_: any, i: number) => i !== idx);
                          setWorkflow((prev: any) => ({
                            ...prev,
                            results: { ...prev.results, timedLyrics: newList }
                          }));
                        }}
                        className="p-1.5 text-red-400/50 hover:text-red-400 transition-colors"
                        title="삭제"
                      >
                        <RefreshCw className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    const lastTime = workflow.results.timedLyrics[workflow.results.timedLyrics.length - 1]?.time || 0;
                    const newList = [...workflow.results.timedLyrics, { time: lastTime + 5, kor: '', eng: '' }];
                    setWorkflow((prev: any) => ({
                      ...prev,
                      results: { ...prev.results, timedLyrics: newList }
                    }));
                  }}
                  className="px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl text-xs font-bold transition-all border border-secondary/20"
                >
                  + 가사 줄 추가
                </button>
              </div>
            </GlassCard>
          )}

          <div className="flex justify-center">
            <button onClick={() => handleTabChange('music')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              다음 단계: 음악 생성 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
      <Terminal logs={logs} />
    </motion.div>
  );
};
