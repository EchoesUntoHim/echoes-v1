import React from 'react';
import { motion } from 'motion/react';
import { ImageIcon, Upload, Music, Download, RefreshCw, Key, ChevronRight, CheckCircle2, FileText } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CanvasPreview } from './CanvasPreview';
import { VideoSettingsPanel } from './VideoSettingsPanel';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { 
  TARGETS, 
  POP_SUB_GENRES, 
  CCM_SUB_GENRES, 
  POP_MOODS, 
  CCM_MOODS, 
  ART_STYLES,
  CAMERA_VIEWS,
  TIME_OF_DAY_OPTIONS,
  LIGHTING_ATMOSPHERES,
  COLOR_GRADES,
  IMAGE_STYLES,
  COMPOSITIONS,
  DEPTH_OF_FIELDS,
  WEATHERS,
  SUBJECT_DETAILS,
  BACKGROUND_TYPES,
  IMAGE_ENGINES
} from '../constants';

interface ImageTabProps {
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  shortsCount: number;
  setShortsCount: React.Dispatch<React.SetStateAction<number>>;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSingleImageUpload: (type: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  generateImages: () => Promise<void>;
  regenerateShorts: () => Promise<void>;
  regenerateSpecificImage: (index: number, typeKey: string) => Promise<void>;
  downloadImageWithTitle: (img: any) => void;
  addLog: (msg: string) => void;
  handleTabChange: (tab: string) => void;
  setIsApiKeyModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isShortsGenerating: boolean;
  createDefaultSettings: () => any;
  logs: string[];
  imageEngine: string;
  setImageEngine: (engine: string) => void;
}

export const ImageTab = ({
  workflow,
  setWorkflow,
  shortsCount,
  setShortsCount,
  handleAudioUpload,
  handleSingleImageUpload,
  generateImages,
  regenerateShorts,
  regenerateSpecificImage,
  downloadImageWithTitle,
  addLog,
  handleTabChange,
  setIsApiKeyModalOpen,
  isShortsGenerating,
  createDefaultSettings,
  logs,
  imageEngine,
  setImageEngine
}: ImageTabProps) => {
  return (
    <motion.div key="image" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">이미지 생성</h1>
          <p className="text-gray-400">수노(Suno) 음원을 업로드하여 AI가 곡의 분위기를 분석하고 이미지를 생성합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <ImageIcon className="w-3 h-3 text-primary" />
            <select
              value={imageEngine}
              onChange={(e) => setImageEngine(e.target.value)}
              className="bg-transparent text-[10px] text-white outline-none cursor-pointer font-bold max-w-[150px]"
            >
              {IMAGE_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                  {eng.label} ({eng.type === 'paid' ? '유료' : '무료'})
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">분석 엔진</span>
            <p className="text-xs font-mono text-primary">Gemini 3.1 Flash Lite</p>
          </div>
        </div>
      </header>

      <GlassCard className="border-primary/20 bg-primary/5">
        <label className="text-sm font-medium text-gray-400 mb-2 block">음악 종류 (이미지 생성 기준)</label>
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
                "flex-1 py-3 rounded-xl font-bold border transition-all",
                workflow.params.target === t 
                  ? "bg-primary text-background border-primary" 
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Left Side: Title Inputs & Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">한글 제목 수정</label>
              <input 
                type="text"
                value={workflow.params.koreanTitle || ''}
                onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, koreanTitle: e.target.value } }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">영어 제목 수정</label>
              <input 
                type="text"
                value={workflow.params.englishTitle || ''}
                onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, englishTitle: e.target.value } }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
              />
            </div>
          </div>

          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-4">
              <ImageIcon className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">이미지 생성 옵션</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">화풍 및 장르</label>
                <select 
                  value={workflow.imageParams.artStyle}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, artStyle: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {ART_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">구도 및 시점</label>
                <select 
                  value={workflow.imageParams.cameraView}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, cameraView: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {CAMERA_VIEWS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">시간대</label>
                <select 
                  value={workflow.imageParams.timeOfDay}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, timeOfDay: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {TIME_OF_DAY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">조명 및 대기</label>
                <select 
                  value={workflow.imageParams.lightingAtmosphere}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, lightingAtmosphere: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {LIGHTING_ATMOSPHERES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">색감 및 톤</label>
                <select 
                  value={workflow.imageParams.colorGrade}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, colorGrade: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {COLOR_GRADES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">이미지 스타일</label>
                <select 
                  value={workflow.imageSettings.style}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageSettings: { ...prev.imageSettings, style: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {IMAGE_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">구도 구성</label>
                <select 
                  value={workflow.imageParams.composition}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, composition: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {COMPOSITIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">피사체 심도</label>
                <select 
                  value={workflow.imageParams.depthOfField}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, depthOfField: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {DEPTH_OF_FIELDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">날씨 및 환경</label>
                <select 
                  value={workflow.imageParams.weather}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, weather: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {WEATHERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">세부 묘사</label>
                <select 
                  value={workflow.imageParams.subjectDetail}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, subjectDetail: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {SUBJECT_DETAILS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">배경 유형</label>
                <select 
                  value={workflow.imageParams.backgroundType}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...prev.imageParams, backgroundType: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {BACKGROUND_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="md:col-span-1 space-y-6">
          {/* Right Side: Uploads & Generation */}
          <GlassCard className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-400">추가 숏츠 이미지 수</label>
                <span className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">메인 1개, 틱톡 1개 기본 생성</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="0" max="5" value={shortsCount} 
                  onChange={(e) => setShortsCount(parseInt(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="text-xl font-bold text-primary w-8">{shortsCount}</span>
              </div>
              {workflow.results.images.length > 0 && shortsCount > 0 && (
                <button 
                  onClick={regenerateShorts}
                  className="w-full mt-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> 숏츠 이미지만 전체 재생성
                </button>
              )}
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-primary/50 transition-colors py-6 relative overflow-hidden group">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleAudioUpload}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {workflow.results.audioFile ? (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Music className="w-6 h-6 text-primary" />
                </div>
                <p className="font-bold text-sm text-white">
                  {workflow.results.audioFile instanceof File 
                    ? workflow.results.audioFile.name 
                    : (workflow.results.title || 'Suno Audio')}
                </p>
                <p className="text-[10px] text-gray-500">
                  {workflow.results.audioFile instanceof File 
                    ? `${(workflow.results.audioFile.size / 1024 / 1024).toFixed(2)} MB` 
                    : 'Suno Audio'} • 분석 완료
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-gray-400 rotate-180" />
                </div>
                <div>
                  <p className="font-bold text-sm">수노(Suno) 음원 업로드</p>
                  <p className="text-[10px] text-gray-400">MP3, WAV 파일을 선택하세요.</p>
                </div>
              </div>
            )}
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            {['main', 'tiktok', ...Array.from({length: shortsCount}).map((_, i) => `shorts_${i+1}`)].map(type => (
              <div key={type} className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleSingleImageUpload(type, e)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <button className="w-full py-3 bg-secondary/10 border border-secondary/30 text-secondary rounded-xl text-[10px] font-black hover:bg-secondary/20 transition-all flex flex-col items-center justify-center gap-1">
                  <Upload className="w-4 h-4" />
                  {type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `쇼츠 ${type.split('_')[1]}`} 업로드
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={generateImages}
            disabled={(!workflow.results.audioFile && !workflow.results.lyrics) || (workflow.progress.image > 0 && workflow.progress.image < 100)}
            className={cn(
              "w-full py-4 rounded-xl font-black transition-all",
              (workflow.results.audioFile || workflow.results.lyrics)
                ? "bg-secondary text-background hover:neon-glow-secondary"
                : "bg-white/5 text-gray-500 cursor-not-allowed"
            )}
          >
            {workflow.progress.image > 0 && workflow.progress.image < 100 
              ? "생성 중..." 
              : "AI 최적화 이미지 생성"}
          </button>

          <div className="flex justify-center">
            <button 
              onClick={() => setIsApiKeyModalOpen(true)}
              className="text-[10px] font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              <Key className="w-3 h-3" /> API 키 설정/변경
            </button>
          </div>
        </div>
      </div>

      {workflow.results.images.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {workflow.results.images.map((img: any, i: number) => {
              const typeKey = img.label.includes('메인') ? 'main' : img.label.includes('틱톡') ? 'tiktok' : 'shorts';
              const settings = workflow.imageSettings[typeKey] || createDefaultSettings();

              return (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: i * 0.05 }}
                  className="space-y-4"
                >
                  <div className={cn(
                    "relative rounded-xl overflow-hidden border border-white/10 group @container",
                    img.type === 'horizontal' ? "aspect-video" : "aspect-[9/16]"
                  )}>
                    <CanvasPreview img={img} settings={settings} params={workflow.params} type={typeKey} />
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                      <button 
                        onClick={() => regenerateSpecificImage(i, typeKey)}
                        className="bg-white/20 backdrop-blur-md border border-white/30 p-2 rounded-full hover:bg-white/40 transition-all pointer-events-auto"
                        title="이 이미지만 재생성"
                      >
                        <RefreshCw className="w-4 h-4 text-white" />
                      </button>
                      <button 
                        onClick={() => downloadImageWithTitle(img)}
                        className="bg-primary/40 backdrop-blur-md border border-primary/30 p-2 rounded-full hover:bg-primary/60 transition-all pointer-events-auto"
                        title="타이틀 포함 다운로드"
                      >
                        <Download className="w-4 h-4 text-white" />
                      </button>
                      <button 
                        onClick={() => addLog(`[${img.label}] 프롬프트: ${img.prompt}`)}
                        className="bg-white/20 backdrop-blur-md border border-white/30 p-2 rounded-full hover:bg-white/40 transition-all pointer-events-auto"
                        title="프롬프트 보기"
                      >
                        <FileText className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold z-10">
                      {img.label}
                    </div>
                  </div>

                  <VideoSettingsPanel 
                    type={img.label}
                    settings={settings}
                    onChange={(newSettings) => setWorkflow(prev => ({
                      ...prev,
                      imageSettings: {
                        ...prev.imageSettings,
                        [typeKey]: newSettings
                      }
                    }))}
                    showLyricsControls={false}
                  />
                </motion.div>
              );
            })}

            {isShortsGenerating && Array.from({ length: Math.max(0, shortsCount - workflow.results.images.filter((img: any) => img.label.includes('숏츠')).length) }).map((_, i) => (
              <div key={`generating-${i}`} className="space-y-4">
                <div className="aspect-[9/16] rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-primary/40 animate-spin" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">숏츠 이미지 생성 중...</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <button onClick={() => handleTabChange('video')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              다음 단계: 영상 렌더링 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <Terminal logs={logs} />
    </motion.div>
  );
};
