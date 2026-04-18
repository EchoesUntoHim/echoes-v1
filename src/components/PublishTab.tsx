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
        <MetadataCard title="업로드 제목" content={workflow.results.metadata?.title || ''} onCopy={copyToClipboard} />
        <MetadataCard title="본문 및 해시태그" content={workflow.results.metadata?.description || ''} onCopy={copyToClipboard} isTextArea />
        <MetadataCard title="추천 태그" content={workflow.results.metadata?.tags || ''} onCopy={copyToClipboard} />
      </div>

      <GlassCard className="space-y-4 border-primary/20 bg-primary/5">
        <h3 className="text-lg font-bold border-b border-white/5 pb-4">영상 플랫폼 자동 업로드</h3>
        <div className="space-y-4">
          <PlatformToggle 
            label="틱톡 (TikTok)" 
            status={platforms.tiktok} 
            onToggle={() => togglePlatform('tiktok')}
            description="틱톡 계정을 연동하여 제작된 영상을 앱에서 바로 업로드할 수 있습니다. (설정 페이지에서 연동 가이드를 확인하세요)"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button 
            onClick={() => alert('TODO: 실제 영상 플랫폼 자동 업로드 백엔드 API 연동이 필요합니다.')}
            className="bg-primary text-background px-6 py-2 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            틱톡에 업로드 실행
          </button>
        </div>
      </GlassCard>

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
