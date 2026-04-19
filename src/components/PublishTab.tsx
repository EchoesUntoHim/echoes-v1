import React from 'react';
import { motion } from 'motion/react';
import { Settings, Zap, Upload, CheckCircle2, FileText, Download, Music, AlertCircle } from 'lucide-react';
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
  fetchAvailableModels
}: PublishTabProps) => {
  return (
    <motion.div key="publish" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">업로드 정보 확인</h1>
          <p className="text-gray-400">틱톡 등 숏폼 플랫폼 업로드에 필요한 정보를 확인하세요.</p>
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
            AI 메타데이터 생성 (틱톡/숏폼 최적화)
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
          <label className="text-sm font-medium text-gray-400 mb-2 block">곡 해석 (AI 분석보다 우선 적용)</label>
          <textarea
            placeholder="곡의 의미나 의도를 입력하세요. 입력 시 AI 메타데이터 및 블로그 생성에 최우선으로 반영됩니다."
            value={workflow.params.songInterpretation || ''}
            onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, songInterpretation: e.target.value } }))}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-24 resize-none"
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-6">
        <MetadataCard title="업로드 제목" content={workflow.results.youtubeMetadata?.title || ''} onCopy={copyToClipboard} />
        <MetadataCard title="본문 및 해시태그" content={workflow.results.youtubeMetadata?.description || ''} onCopy={copyToClipboard} isTextArea />
        <MetadataCard title="추천 태그" content={workflow.results.youtubeMetadata?.tags || ''} onCopy={copyToClipboard} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* YouTube Upload Section */}
        <GlassCard className="space-y-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Music className="w-5 h-5 text-red-500" /> 유튜브 (YouTube)</h3>
            <PlatformToggle 
              label="" 
              status={platforms.youtube} 
              onToggle={() => togglePlatform('youtube')}
            />
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['public', 'private', 'unlisted'] as const).map((v) => (
                <button 
                  key={v}
                  onClick={() => setWorkflow((prev: any) => ({ ...prev, publishSettings: { ...prev.publishSettings, youtubeVisibility: v } }))}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all",
                    (workflow.publishSettings?.youtubeVisibility || 'public') === v 
                      ? "bg-red-500 text-white border-red-500" 
                      : "bg-white/5 border-white/10 text-gray-400"
                  )}
                >
                  {v === 'public' ? '공개' : v === 'private' ? '비공개' : '링크공개'}
                </button>
              ))}
            </div>
            {workflow.publishSettings?.youtubeVisibility === 'private' && (
              <div className="flex items-center gap-2 p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-500 shrink-0">예약:</span>
                <input 
                  type="datetime-local" 
                  className="bg-transparent text-xs text-white outline-none w-full"
                  onChange={(e) => setWorkflow((prev: any) => ({ ...prev, publishSettings: { ...prev.publishSettings, youtubeSchedule: e.target.value } }))}
                />
              </div>
            )}
            <button 
              onClick={() => alert('TODO: 유튜브 API 연동 업로드 기능')}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              <Upload className="w-4 h-4" />
              유튜브에 업로드
            </button>
          </div>
        </GlassCard>

        {/* TikTok Upload Section */}
        <GlassCard className="space-y-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> 틱톡 (TikTok)</h3>
            <PlatformToggle 
              label="" 
              status={platforms.tiktok} 
              onToggle={() => togglePlatform('tiktok')}
            />
          </div>
          <div className="space-y-4">
             <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed">
              <span className="text-primary font-bold">틱톡 연동 안내:</span> 틱톡 앱에서 'Vibeflow' 권한을 승인해야 직접 업로드가 가능합니다. 설정 탭에서 연동 상태를 확인하세요.
            </div>
            <div className="flex gap-2">
              {(['PUBLIC', 'PRIVATE', 'FRIENDS'] as const).map((v) => (
                <button 
                  key={v}
                  onClick={() => setWorkflow((prev: any) => ({ ...prev, publishSettings: { ...prev.publishSettings, tiktokVisibility: v } }))}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all",
                    (workflow.publishSettings?.tiktokVisibility || 'PUBLIC') === v 
                      ? "bg-primary text-background border-primary" 
                      : "bg-white/5 border-white/10 text-gray-400"
                  )}
                >
                  {v === 'PUBLIC' ? '공개' : v === 'PRIVATE' ? '나만보기' : '친구공개'}
                </button>
              ))}
            </div>
            <button 
              onClick={() => alert('TODO: 틱톡 API 연동 업로드 기능')}
              className="w-full bg-primary text-background py-3 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Upload className="w-4 h-4" />
              틱톡에 업로드
            </button>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="bg-primary/5 border-primary/20 p-8 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
        <h2 className="text-2xl font-black">모든 작업이 완료되었습니다!</h2>
        <p className="text-gray-400">생성된 영상과 메타데이터를 사용하여 채널을 성장시켜 보세요.</p>
        <div className="flex justify-center gap-4 pt-4">
          <button onClick={() => setIsResetModalOpen(true)} className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-all">새 작업 시작</button>
          <button onClick={() => handleTabChange('blog')} className="px-6 py-3 bg-primary text-background rounded-xl font-bold hover:neon-glow-primary transition-all">블로그 작성하러 가기</button>
        </div>
      </GlassCard>

      <Terminal logs={logs} />
    </motion.div>
  );
};
