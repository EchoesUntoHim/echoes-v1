import React from 'react';
import { motion } from 'motion/react';
import { Music, Upload, Download, RefreshCw, Zap, ImageIcon, Type as TypeIcon, CheckCircle2, ChevronRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { VideoPlayer } from './VideoPlayer';
import { VideoSettingsPanel } from './VideoSettingsPanel';
import { ProgressBar } from './ProgressBar';
import { TimeInput } from './TimeInput';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { VIDEO_ENGINES } from '../constants';

interface VideoTabProps {
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  shortsCount: number;
  setShortsCount: React.Dispatch<React.SetStateAction<number>>;
  uploadedAudio: string | null;
  uploadedAudioName: string;
  handleVideoAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSingleImageUpload: (type: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  videoLyrics: string;
  setVideoLyrics: React.Dispatch<React.SetStateAction<string>>;
  englishVideoLyrics: string;
  setEnglishVideoLyrics: React.Dispatch<React.SetStateAction<string>>;
  isVideoRendering: boolean;
  startVideoRender: () => void;
  handleDownloadAll: () => void;
  mainVideoRef: React.RefObject<any>;
  tiktokVideoRef: React.RefObject<any>;
  shortsVideoRefs: React.MutableRefObject<any[]>;
  shortsHighlights: any[];
  handleHighlightChange: (idx: number, type: 'start' | 'end', val: number) => void;
  addLog: (msg: string) => void;
  handleTabChange: (tab: string) => void;
  musicEngine: string;
  videoEngine: string;
  setVideoEngine: (engine: string) => void;
  videoQuality: string;
  logs: string[];
}

export const VideoTab = ({
  workflow,
  setWorkflow,
  shortsCount,
  setShortsCount,
  uploadedAudio,
  uploadedAudioName,
  handleVideoAudioUpload,
  handleSingleImageUpload,
  videoLyrics,
  setVideoLyrics,
  englishVideoLyrics,
  setEnglishVideoLyrics,
  isVideoRendering,
  startVideoRender,
  handleDownloadAll,
  mainVideoRef,
  tiktokVideoRef,
  shortsVideoRefs,
  shortsHighlights,
  handleHighlightChange,
  addLog,
  handleTabChange,
  musicEngine,
  videoEngine,
  setVideoEngine,
  videoQuality,
  logs
}: VideoTabProps) => {
  return (
    <motion.div key="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">영상 렌더링</h1>
          <p className="text-gray-400">생성된 이미지를 활용하여 플랫폼별 최적화 영상을 제작합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <Zap className="w-3 h-3 text-primary" />
            <select
              value={videoEngine}
              onChange={(e) => setVideoEngine(e.target.value)}
              className="bg-transparent text-[10px] text-white outline-none cursor-pointer font-bold max-w-[150px]"
            >
              {VIDEO_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                  {eng.label} ({eng.type === 'paid' ? '유료' : '무료'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">음악 엔진</span>
              <p className="text-xs font-mono text-secondary">
                {musicEngine.includes('magenta') ? 'Google Magenta' : 
                 musicEngine.includes('musiclm') ? 'Google MusicLM' : 
                 musicEngine.includes('suno') ? 'Suno AI' : 
                 musicEngine.includes('udio') ? 'Udio' : 'Echoes Unto Him'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary/50 uppercase tracking-widest">렌더링 품질</span>
              <p className="text-xs font-mono text-primary">{videoQuality.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-6">
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
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-bold text-primary flex items-center gap-2 shrink-0"><ImageIcon className="w-4 h-4" /> 1. 이미지 소스</h3>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[10px] text-gray-400">이미지: <span className="text-primary font-bold">{workflow.results.images.length}</span>장</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">숏츠 개수:</span>
                  <input 
                    type="range" min="0" max="5" value={shortsCount} 
                    onChange={(e) => setShortsCount(parseInt(e.target.value))}
                    className="w-20 sm:w-24 accent-primary"
                  />
                  <span className="text-xs font-bold text-primary shrink-0">{shortsCount}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['main', 'tiktok', ...Array.from({length: shortsCount}).map((_, i) => `shorts_${i+1}`)].map(type => {
                const label = type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `숏츠 ${type.split('_')[1]}`;
                const existingImg = workflow.results.images.find((img: any) => img.label === label);
                
                return (
                  <div key={type} className="relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleSingleImageUpload(type, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    <div className={cn(
                      "w-full aspect-video border rounded-xl transition-all flex flex-col items-center justify-center gap-1 overflow-hidden relative",
                      existingImg 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    )}>
                      {existingImg ? (
                        <>
                          <img 
                            src={existingImg.url || null} 
                            alt={label} 
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-90 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 group-hover:bg-black/10 transition-colors">
                            <div className="bg-primary/80 p-1 rounded-full shadow-lg">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[9px] font-black text-white drop-shadow-md bg-black/40 px-1.5 py-0.5 rounded">{label}</span>
                          </div>
                          {existingImg.prompt === '사용자 직접 업로드' && (
                            <div className="absolute top-1 right-1 bg-secondary/80 text-[8px] px-1 rounded text-white">UP</div>
                          )}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mb-1 text-gray-500" />
                          <span className="text-[9px] font-bold text-gray-500">{label} 업로드</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

            <GlassCard className="space-y-4">
              <h3 className="font-bold text-primary flex items-center gap-2"><Music className="w-4 h-4" /> 2. 오디오 소스</h3>
              <div>
                <label className="block w-full cursor-pointer bg-white/5 border border-white/10 border-dashed rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-400">
                    {uploadedAudioName ? `파일: ${uploadedAudioName} (클릭하여 변경)` : '클릭하여 오디오 직접 업로드'}
                  </span>
                  <input type="file" accept="audio/*" onChange={handleVideoAudioUpload} className="hidden" />
                </label>
                {workflow.results.audioFile && (
                  <p className="text-[10px] text-primary/60 mt-2 text-center">
                    * 이전 단계의 음원({workflow.results.audioFile.name})이 로드되어 있습니다.
                  </p>
                )}
              </div>
            </GlassCard>

          <GlassCard className="space-y-4">
            <h3 className="font-bold text-primary flex items-center gap-2"><TypeIcon className="w-4 h-4" /> 3. 가사 입력</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">한글 가사</label>
                <textarea 
                  value={videoLyrics} 
                  onChange={(e) => setVideoLyrics(e.target.value)}
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none overflow-y-auto custom-scrollbar"
                  placeholder="한글 가사를 입력하세요."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">영어 가사</label>
                <textarea 
                  value={englishVideoLyrics} 
                  onChange={(e) => setEnglishVideoLyrics(e.target.value)}
                  className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-primary outline-none overflow-y-auto custom-scrollbar"
                  placeholder="영어 가사를 입력하세요."
                />
              </div>
            </div>
            {workflow.results.lyrics && (
              <p className="text-[10px] text-gray-500 italic">* 이전 단계에서 생성된 가사가 자동으로 입력되었습니다. 필요시 수정 가능합니다.</p>
            )}
          </GlassCard>

          <GlassCard className="space-y-4">
            <div className="flex flex-col justify-center items-center p-6 bg-white/5 rounded-2xl border border-white/10">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <p className="text-center text-sm text-gray-400">서버 비용 없이 내 컴퓨터에서 직접 렌더링합니다.</p>
              {workflow.progress.video === 100 ? (
                <button 
                  onClick={handleDownloadAll}
                  className="w-full bg-green-500 text-white py-4 rounded-xl font-black mt-6 shadow-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-6 h-6" />
                  모든 영상 다운로드 (메인 + 틱톡 + 숏츠)
                </button>
              ) : (
                <button 
                  onClick={startVideoRender}
                  disabled={isVideoRendering || !uploadedAudio || workflow.results.images.length === 0}
                  className="w-full bg-primary text-background py-4 rounded-xl font-black mt-6 hover:neon-glow-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVideoRendering ? `렌더링 중... ${workflow.progress.video}%` : '영상 렌더링 시작'}
                </button>
              )}
            </div>
            {workflow.progress.video > 0 && <ProgressBar progress={workflow.progress.video} />}
          </GlassCard>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="font-bold text-primary mb-4">메인 영상 미리보기 (16:9)</h3>
            <VideoPlayer 
              ref={mainVideoRef}
              imageSrc={workflow.results.images.find((img: any) => img.label === '메인')?.url} 
              audioSrc={uploadedAudio} 
              lyrics={videoLyrics} 
              englishLyrics={englishVideoLyrics}
              type="main" 
              label="Main"
              title={workflow.results.title}
              koreanTitle={workflow.params.koreanTitle}
              englishTitle={workflow.params.englishTitle}
              titleSettings={workflow.imageSettings['main']}
              showTitle={workflow.imageSettings['main']?.showTitleOverlay ?? true}
              lyricsStartTime={workflow.imageSettings['main']?.lyricsStartTime ?? 0}
              lyricsScrollEnd={workflow.imageSettings['main']?.lyricsScrollEnd ?? 50}
              lyricsFontSize={workflow.imageSettings['main']?.lyricsFontSize ?? 4}
              addLog={addLog}
              originalFileName={uploadedAudioName}
            />
            {workflow.results.images.length > 0 && (
              <div className="space-y-4">
                <VideoSettingsPanel 
                  type="main" 
                  settings={workflow.imageSettings['main']} 
                  onChange={(newSettings) => setWorkflow(prev => ({
                    ...prev,
                    imageSettings: { ...prev.imageSettings, main: newSettings }
                  }))}
                />
                <button 
                  onClick={() => mainVideoRef.current?.download()}
                  className="w-full py-3 bg-primary text-background rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  메인 영상 다운로드
                </button>
              </div>
            )}
          </GlassCard>

          <GlassCard className="space-y-4">
            <h3 className="font-bold text-primary mb-4">틱톡 영상 미리보기 (9:16)</h3>
            <VideoPlayer 
              ref={tiktokVideoRef}
              imageSrc={workflow.results.images.find((img: any) => img.label === '틱톡')?.url} 
              audioSrc={uploadedAudio} 
              lyrics={videoLyrics} 
              englishLyrics={englishVideoLyrics}
              type="tiktok" 
              label="TikTok"
              title={workflow.results.title}
              koreanTitle={workflow.params.koreanTitle}
              englishTitle={workflow.params.englishTitle}
              titleSettings={workflow.imageSettings['tiktok']}
              showTitle={workflow.imageSettings['tiktok']?.showTitleOverlay ?? true}
              lyricsStartTime={workflow.imageSettings['tiktok']?.lyricsStartTime ?? 0}
              lyricsScrollEnd={workflow.imageSettings['tiktok']?.lyricsScrollEnd ?? 50}
              lyricsFontSize={workflow.imageSettings['tiktok']?.lyricsFontSize ?? 4}
              addLog={addLog}
              originalFileName={uploadedAudioName}
            />
            {workflow.results.images.length > 0 && (
              <div className="space-y-4">
                <VideoSettingsPanel 
                  type="tiktok" 
                  settings={workflow.imageSettings['tiktok']} 
                  onChange={(newSettings) => setWorkflow(prev => ({
                    ...prev,
                    imageSettings: { ...prev.imageSettings, tiktok: newSettings }
                  }))}
                />
                <button 
                  onClick={() => tiktokVideoRef.current?.download()}
                  className="w-full py-3 bg-primary text-background rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  틱톡 영상 다운로드
                </button>
              </div>
            )}
          </GlassCard>

          {shortsCount > 0 && shortsHighlights.length > 0 && (
            <GlassCard className="space-y-4">
              <h3 className="font-bold text-primary mb-4">숏츠 하이라이트 미리보기 (9:16)</h3>
              <div className="grid grid-cols-2 gap-4">
                {shortsHighlights.slice(0, shortsCount).map((highlight, idx) => (
                  <div key={idx} className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold text-primary">숏츠 #{idx + 1}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{Math.round(highlight.duration)}초 분량</div>
                    </div>
                    
                    <VideoPlayer 
                      ref={el => { shortsVideoRefs.current[idx] = el; }}
                      imageSrc={workflow.results.images.find((img: any) => img.label === `숏츠 ${idx + 1}`)?.url} 
                      audioSrc={uploadedAudio} 
                      lyrics="" 
                      type="shorts" 
                      label={`Shorts_${idx + 1}`}
                      startTime={highlight.start}
                      duration={highlight.duration}
                      title={workflow.results.title}
                      koreanTitle={workflow.params.koreanTitle}
                      englishTitle={workflow.params.englishTitle}
                      titleSettings={workflow.imageSettings['shorts']}
                      showTitle={workflow.imageSettings['shorts']?.showTitleOverlay ?? true}
                      lyricsStartTime={workflow.imageSettings['shorts']?.lyricsStartTime ?? 0}
                      lyricsScrollEnd={workflow.imageSettings['shorts']?.lyricsScrollEnd ?? 50}
                      lyricsFontSize={workflow.imageSettings['shorts']?.lyricsFontSize ?? 4}
                      addLog={addLog}
                      originalFileName={uploadedAudioName}
                    />

                    <div className="flex items-center gap-2 py-2">
                      <TimeInput 
                        label="시작" 
                        value={highlight.start} 
                        onChange={(val) => handleHighlightChange(idx, 'start', val)} 
                      />
                      <div className="pt-4 text-gray-600 font-bold">~</div>
                      <TimeInput 
                        label="종료" 
                        value={highlight.start + highlight.duration} 
                        onChange={(val) => handleHighlightChange(idx, 'end', val)} 
                      />
                    </div>

                    <button 
                      onClick={() => shortsVideoRefs.current[idx]?.download()}
                      className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-black flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      숏츠 #{idx + 1} 다운로드
                    </button>
                  </div>
                ))}
              </div>
              {workflow.results.images.length > 0 && (
                <VideoSettingsPanel 
                  type="shorts" 
                  settings={workflow.imageSettings['shorts']} 
                  onChange={(newSettings) => setWorkflow(prev => ({
                    ...prev,
                    imageSettings: { ...prev.imageSettings, shorts: newSettings }
                  }))}
                />
              )}
            </GlassCard>
          )}
        </div>
      </div>

      {workflow.progress.video === 100 && (
        <div className="space-y-8 pt-8">
          <div className="flex justify-center">
            <button onClick={() => handleTabChange('publish')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              다음 단계: 업로드 정보 확인 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <Terminal logs={logs} />
    </motion.div>
  );
};
