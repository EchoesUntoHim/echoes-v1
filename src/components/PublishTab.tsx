import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Zap, Upload, CheckCircle2, FileText, Download, Music, 
  AlertCircle, HelpCircle, X, ExternalLink, Youtube, Info, Video 
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MetadataCard } from './MetadataCard';
import { PlatformToggle } from './PlatformToggle';
import { ProgressBar } from './ProgressBar';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { 
  AI_ENGINES, 
  TARGETS, 
  POP_SUB_GENRES, 
  CCM_SUB_GENRES, 
  POP_MOODS, 
  CCM_MOODS,
  BLOG_STYLES
} from '../constants';

const GUIDES = {
  tiktok: {
    title: "틱톡(TikTok) 연동 방법",
    steps: [
      "틱톡 개발자 포털(TikTok for Developers)에 접속하여 로그인합니다.",
      "'My Apps' 메뉴에서 'Connect New App'을 클릭합니다.",
      "앱 이름과 설명을 입력하고 앱을 생성합니다.",
      "'Products' 섹션에서 'Video Kit' 기능을 반드시 추가하세요.",
      "대시보드에 있는 'Client Key'와 'Client Secret'을 복사하여 설정 탭에 입력합니다.",
      "연동하기 버튼을 누르고 틱톡 계정 권한을 승인하면 완료됩니다."
    ],
    link: "https://developers.tiktok.com/"
  },
  youtube: {
    title: "유튜브(YouTube) 연동 방법",
    steps: [
      "Google Cloud Console에 접속합니다.",
      "새 프로젝트를 생성하고 'YouTube Data API v3'를 활성화합니다.",
      "'OAuth 동의 화면'을 설정하고 '외부' 사용자로 등록합니다.",
      "'사용자 인증 정보'에서 'OAuth 클라이언트 ID'를 생성합니다 (웹 애플리케이션).",
      "발급된 클라이언트 ID를 설정 탭에 입력합니다.",
      "유튜브 로그인을 통해 업로드 권한을 승인하면 완료됩니다."
    ],
    link: "https://console.cloud.google.com/"
  }
};


interface PublishTabProps {
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  aiEngine: string;
  setAiEngine: (engine: string) => void;
  generateYoutubeMetadata: () => Promise<void>;
  copyToClipboard: (text: string) => void;
  platforms: any;
  togglePlatform: (platform: string) => void;
  setIsResetModalOpen: (isOpen: boolean) => void;
  handleTabChange: (tab: string) => void;
  logs: string[];
  availableModels?: {value: string, label: string, type?: string}[];
  fetchAvailableModels?: () => void;
  shortsCount: number;
}

export const PublishTab = ({
  workflow,
  setWorkflow,
  aiEngine,
  setAiEngine,
  generateYoutubeMetadata,
  copyToClipboard,
  platforms,
  togglePlatform,
  setIsResetModalOpen,
  handleTabChange,
  logs,
  availableModels,
  fetchAvailableModels,
  shortsCount
}: PublishTabProps) => {
  const [activeGuide, setActiveGuide] = useState<keyof typeof GUIDES | null>(null);

  const renderUploadSlot = (platform: 'youtube' | 'tiktok', label: string, type: 'main' | 'tiktok' | 'shorts', index?: number) => {
    const isYoutube = platform === 'youtube';
    const accentColor = isYoutube ? 'red-500' : 'primary';
    const visibilityKey = `${platform}Visibility_${type}${index !== undefined ? `_${index}` : ''}`;
    const scheduleKey = `${platform}Schedule_${type}${index !== undefined ? `_${index}` : ''}`;
    
    return (
      <div key={`${platform}-${type}-${index}`} className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className={cn("w-4 h-4", isYoutube ? "text-red-500" : "text-primary")} />
            <span className="text-xs font-bold text-white">{label}</span>
          </div>
          <div className="flex gap-1">
            {(isYoutube ? ['public', 'private', 'scheduled'] : ['PUBLIC', 'PRIVATE', 'FRIENDS']).map((v) => (
              <button 
                key={v}
                onClick={() => setWorkflow((prev: any) => ({ 
                  ...prev, 
                  publishSettings: { ...prev.publishSettings, [visibilityKey]: v } 
                }))}
                className={cn(
                  "px-2 py-1 rounded text-[9px] font-bold border transition-all",
                  (workflow.publishSettings?.[visibilityKey] || (isYoutube ? 'public' : 'PUBLIC')) === v 
                    ? `bg-${accentColor} text-${isYoutube ? 'white' : 'background'} border-${accentColor}` 
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                )}
              >
                {v === 'public' || v === 'PUBLIC' ? '공개' : v === 'private' || v === 'PRIVATE' ? '비공개' : '예약'}
              </button>
            ))}
          </div>
        </div>

        {(workflow.publishSettings?.[visibilityKey] === 'private' || workflow.publishSettings?.[visibilityKey] === 'PRIVATE' || workflow.publishSettings?.[visibilityKey] === 'scheduled') && (
          <div className="flex items-center gap-2 p-2 bg-black/60 rounded-lg border border-white/10">
            <span className="text-[9px] text-gray-500 shrink-0 font-bold uppercase">Schedule:</span>
            <input 
              type="datetime-local" 
              className="bg-transparent text-[10px] text-white outline-none w-full"
              onChange={(e) => setWorkflow((prev: any) => ({ 
                ...prev, 
                publishSettings: { ...prev.publishSettings, [scheduleKey]: e.target.value } 
              }))}
            />
          </div>
        )}


        <button 
          onClick={() => alert(`${label} 업로드 API 연동 필요`)}
          className={cn(
            "w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2",
            isYoutube 
              ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/10" 
              : "bg-primary text-background hover:neon-glow-primary shadow-lg shadow-primary/10"
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {label} 업로드 실행
        </button>
      </div>
    );
  };

  return (
    <motion.div key="publish" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">영상 업로드 및 발행</h1>
          <p className="text-gray-400">제작된 영상을 유튜브와 틱톡에 즉시 업로드합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <Settings className="w-3 h-3 text-gray-400" />
            <select
              value={aiEngine}
              onChange={(e) => {
                setAiEngine(e.target.value);
                localStorage.setItem('ai_engine', e.target.value);
              }}
              className="bg-transparent text-[11px] text-white outline-none cursor-pointer font-bold"
            >
              {AI_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={generateYoutubeMetadata}
            disabled={workflow.progress.youtube > 0 && workflow.progress.youtube < 100}
            className="bg-primary text-background px-6 py-2 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            AI 메타데이터 생성 (플랫폼 최적화)
          </button>
          {workflow.progress.youtube > 0 && <div className="w-full"><ProgressBar progress={workflow.progress.youtube} /></div>}
        </div>
      </header>

      <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-4 border-primary/20 bg-primary/5">
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">음악 종류 (메타데이터 생성 기준)</label>
          <div className="flex gap-2">
            {TARGETS.map(t => (
              <button
                key={t}
                onClick={() => {
                  const subGenre = t === '대중음악' ? POP_SUB_GENRES[0] : CCM_SUB_GENRES[0];
                  const mood = t === '대중음악' ? POP_MOODS[0] : CCM_MOODS[0];
                  setWorkflow(prev => ({ ...prev, params: { ...prev.params, target: t, subGenre, mood } }));
                }}
                className={cn(
                  "flex-1 py-2 rounded-xl font-bold border transition-all",
                  workflow.params.target === t 
                    ? "bg-primary text-background border-primary" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-400 mb-2 block">세부 장르</label>
          <select 
            value={workflow.params.subGenre}
            onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, subGenre: e.target.value } }))}
            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-2 outline-none text-white appearance-none cursor-pointer"
          >
            {(workflow.params.target === '대중음악' ? POP_SUB_GENRES : CCM_SUB_GENRES).map(sg => (
              <option key={sg} value={sg} className="bg-[#1A1F26] text-white">{sg}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-400 mb-2 block font-bold text-primary flex items-center gap-2">
            <Info className="w-4 h-4" /> 곡 해석 (AI 분석보다 우선 적용)
          </label>
          <textarea
            placeholder="곡의 의미나 의도를 입력하세요. 입력 시 AI 메타데이터 및 블로그 생성에 최우선으로 반영됩니다."
            value={workflow.params.songInterpretation || ''}
            onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, songInterpretation: e.target.value } }))}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-24 resize-none text-sm"
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6">
        <MetadataCard title="업로드 제목" content={workflow.results.youtubeMetadata?.title || ''} onCopy={copyToClipboard} />
        <MetadataCard title="본문 및 해시태그" content={workflow.results.youtubeMetadata?.description || ''} onCopy={copyToClipboard} isTextArea />
        <MetadataCard title="추천 태그" content={workflow.results.youtubeMetadata?.tags || ''} onCopy={copyToClipboard} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* YouTube Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-500">
              <Youtube className="w-6 h-6" /> 유튜브 업로드
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveGuide('youtube')}
                className="text-[10px] font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3" /> 연동 도움말
              </button>
              <PlatformToggle 
                label="" 
                status={platforms.youtube} 
                onToggle={() => togglePlatform('youtube')}
              />
            </div>
          </div>
          <div className="space-y-4">
            {renderUploadSlot('youtube', '메인 영상 (16:9)', 'main')}
            {Array.from({ length: shortsCount }).map((_, i) => (
              renderUploadSlot('youtube', `숏츠 영상 #${i + 1} (9:16)`, 'shorts', i)
            ))}
          </div>
        </div>

        {/* TikTok Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
              <Zap className="w-6 h-6" /> 틱톡 업로드
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveGuide('tiktok')}
                className="text-[10px] font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3 h-3" /> 연동 도움말
              </button>
              <PlatformToggle 
                label="" 
                status={platforms.tiktok} 
                onToggle={() => togglePlatform('tiktok')}
              />
            </div>
          </div>
          <div className="space-y-4">
            {renderUploadSlot('tiktok', '틱톡 최적화 영상 (9:16)', 'tiktok')}
            {Array.from({ length: shortsCount }).map((_, i) => (
              renderUploadSlot('tiktok', `틱톡 숏츠 #${i + 1}`, 'shorts', i)
            ))}
          </div>
        </div>
      </div>

      <GlassCard className="bg-primary/5 border-primary/20 p-8 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto shadow-2xl" />
        <h2 className="text-2xl font-black">모든 작업이 완료되었습니다!</h2>
        <p className="text-gray-400">생성된 영상과 메타데이터를 사용하여 채널을 성장시켜 보세요.</p>
        <div className="flex justify-center gap-4 pt-4">
          <button onClick={() => setIsResetModalOpen(true)} className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/5">새 작업 시작</button>
          <button onClick={() => handleTabChange('blog')} className="px-6 py-3 bg-primary text-background rounded-xl font-bold hover:neon-glow-primary transition-all shadow-lg shadow-primary/20">블로그 작성하러 가기</button>
        </div>
      </GlassCard>

      {/* Draggable Optimal Time Info Card */}
      <motion.div 
        drag
        dragConstraints={{ left: 0, right: 300, top: -500, bottom: 0 }}
        initial={{ x: 20, y: -20 }}
        className="fixed bottom-10 right-10 z-[100] cursor-move"
      >
        <GlassCard className="w-64 p-4 border-primary/30 bg-primary/10 backdrop-blur-xl shadow-2xl relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-black text-primary uppercase tracking-tighter flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> 업로드 최적 시간 가이드
            </h4>
            <Info className="w-3 h-3 text-primary/50" />
          </div>
          
          <div className="space-y-3">
            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
              <p className="text-[9px] text-gray-500 font-bold mb-1">CCM (워십/찬양)</p>
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-white">주일 오전 06:00 - 07:00</span>
                <span className="text-[8px] text-primary/70">1-2h Before Peak</span>
              </div>
            </div>

            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
              <p className="text-[9px] text-gray-500 font-bold mb-1">대중음악 (K-POP/Indie)</p>
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-white">평일 오후 17:00 - 18:00</span>
                <span className="text-[8px] text-primary/70">1-2h Before Peak</span>
              </div>
            </div>

            <p className="text-[8px] text-gray-500 italic leading-tight">
              * 마우스를 드래그하여 위치를 옮길 수 있습니다.<br/>
              * 예약 업로드 시 위 시간을 활용해 보세요.
            </p>
          </div>
        </GlassCard>
      </motion.div>

      <Terminal logs={logs} />

      {/* Guide Modal */}
      <AnimatePresence>
        {activeGuide && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#1A1F26] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{GUIDES[activeGuide].title}</h3>
                </div>
                <button onClick={() => setActiveGuide(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar text-left">
                <div className="space-y-4">
                  {GUIDES[activeGuide].steps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <a 
                    href={GUIDES[activeGuide].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all group"
                  >
                    <span>개발자 센터 바로가기</span>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-white/5">
                <button 
                  onClick={() => setActiveGuide(null)}
                  className="w-full py-4 bg-primary text-background rounded-xl font-black hover:neon-glow-primary transition-all"
                >
                  확인했습니다
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
