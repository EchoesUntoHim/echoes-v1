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
import { VIDEO_ENGINES, RENDER_API_URL } from '../constants';
import { createDefaultSettings } from '../types';
import { GoogleGenAI } from "@google/genai";

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
  timedLyrics?: any[];
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
  videoEngine: string;
  setVideoEngine: (engine: string) => void;
  videoQuality: string;

  logs: string[];
  apiKey: string;
  aiEngine: string;
  isTranslating?: boolean;
  onRenderComplete?: (blob: Blob, type: string) => void;
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
  timedLyrics,
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
  videoEngine,
  setVideoEngine,
  videoQuality,

  logs,
  apiKey,
  aiEngine,
  isTranslating = false,
  onRenderComplete
}: VideoTabProps) => {
  const [internalIsTranslating, setInternalIsTranslating] = React.useState(false);
  const translationTimeoutRef = React.useRef<any>(null);

  // 공통 이미지 검색 함수 (상단 미리보기와 하단 VideoPlayer 동기화용)
  const getMatchingImage = React.useCallback((type: string) => {
    const labelMap: Record<string, string> = { 'main': '메인', 'tiktok': '틱톡' };
    const label = labelMap[type] || `숏츠 ${type.split('_')[1] || ''}`;
    const normalize = (s: string) => s.replace(/\s/g, '').toLowerCase();
    const targetLabel = normalize(label);

    const existingImgMatch = [...(workflow.results.images || [])].reverse().find((img: any) => {
      const imgLabel = normalize(img.label || '');
      const isCompatMatch = (type === 'main' && imgLabel.includes('main')) ||
        (type === 'tiktok' && imgLabel.includes('tiktok')) ||
        (type.startsWith('shorts') && imgLabel.includes(type.replace('_', '')));
      return imgLabel === targetLabel || imgLabel.includes(targetLabel) || targetLabel.includes(imgLabel) || isCompatMatch;
    });

    return existingImgMatch ? { ...existingImgMatch, url: existingImgMatch.localUrl || existingImgMatch.url } : null;
  }, [workflow.results.images]);

  // 실시간 자동 번역 (v1.4.26 - App.tsx에서 통합 관리)
  // 단, VideoTab에서 가사를 직접 수정할 경우를 위해 최소한의 싱크는 App.tsx의 useEffect가 담당함
  // 여기서는 중복 호출 방지를 위해 로컬 번역 로직 제거
  React.useEffect(() => {
    // Auto-recovery for missing images from sunoTracks history
    if ((!workflow.results.images || workflow.results.images.length === 0) && (workflow.params.title || workflow.params.koreanTitle)) {
      const saved = localStorage.getItem('echoesuntohim_sunoTracks');
      if (saved) {
        try {
          const tracks = JSON.parse(saved);
          if (!Array.isArray(tracks)) return;
          const currentTitle = workflow.params.title || workflow.params.koreanTitle || '';
          const match = tracks.find((t: any) => t.title === currentTitle && t.generatedImages && t.generatedImages.length > 0);
          if (match) {
            setWorkflow((prev: any) => ({
              ...prev,
              results: {
                ...prev.results,
                images: match.generatedImages
              }
            }));
            addLog(`🔄 이미지 기록에서 데이터를 복구했습니다: ${currentTitle}`);
          }
        } catch (e) {
          console.error("Failed to recover images from history", e);
        }
      }
    }
  }, [workflow.params.title, workflow.params.koreanTitle, workflow.results.images?.length]);

  const [videoProgressMap, setVideoProgressMap] = React.useState<Record<string, number>>({});

  return (
    <motion.div key="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
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
        </div>
      </header>

      <div className="space-y-12">
        {/* Top: Settings */}
        <div className="space-y-4 max-w-5xl mx-auto w-full bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">

              {(!workflow.results.images || workflow.results.images.length === 0) && (
                <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-xs font-bold text-red-300">이미지가 없습니다. 먼저 이미지를 생성해주세요.</span>
                  </div>
                  <button
                    onClick={() => handleTabChange('image')}
                    className="shrink-0 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-300 text-[10px] font-black rounded-lg transition-all"
                  >
                    ← 이미지 생성으로
                  </button>
                </div>
              )}
              <GlassCard className="space-y-3 p-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1 shrink-0"><ImageIcon className="w-3 h-3" /> 1. 이미지 소스</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] text-gray-400">이미지: <span className={(workflow.results.images?.length || 0) > 0 ? "text-primary font-bold" : "text-red-400 font-bold"}>{workflow.results.images?.length || 0}</span>장</span>
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
                  {['main', 'tiktok', ...Array.from({ length: shortsCount }).map((_, i) => `shorts_${i + 1}`)].map(type => {
                    const label = type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `숏츠 ${type.split('_')[1]}`;
                    const existingImg = getMatchingImage(type);

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

              <GlassCard className="space-y-3 p-4">
                <h3 className="text-xs font-bold text-primary flex items-center gap-1"><Music className="w-3 h-3" /> 2. 오디오 소스</h3>
                <div>
                  <label className="block w-full cursor-pointer bg-black/40 border border-white/10 border-dashed rounded-lg p-3 text-center hover:bg-white/10 transition-colors">
                    <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                    <span className="text-[10px] text-gray-400">
                      {uploadedAudioName
                        ? `현재 음원: ${uploadedAudioName}\n(음질이 낮을 경우 클릭하여 고음질 파일로 교체)`
                        : '클릭하여 오디오 직접 업로드 (고음질 권장)'}
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

            </div>

            <div className="space-y-4">
              <GlassCard className="space-y-3 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" /> 3. 가사 입력
                    {isTranslating && (
                      <span className="ml-2 text-[10px] text-primary animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-2 h-2 animate-spin" /> 실시간 번역 중...
                      </span>
                    )}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">한글 가사</label>
                    <textarea
                      value={videoLyrics}
                      onChange={(e) => setVideoLyrics(e.target.value)}
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-primary outline-none overflow-y-auto custom-scrollbar"
                      placeholder="한글 가사를 입력하세요."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">영어 가사</label>
                    <textarea
                      value={englishVideoLyrics}
                      onChange={(e) => setEnglishVideoLyrics(e.target.value)}
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-primary outline-none overflow-y-auto custom-scrollbar"
                      placeholder="영어 가사를 입력하세요."
                    />
                  </div>
                </div>
                {workflow.results.lyrics && (
                  <p className="text-[10px] text-gray-500 italic">* 이전 단계에서 생성된 가사가 자동으로 입력되었습니다. 필요시 수정 가능합니다.</p>
                )}
              </GlassCard>

              <GlassCard className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">한글 제목 수정</label>
                    <input
                      type="text"
                      value={workflow.params.koreanTitle || ''}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, koreanTitle: e.target.value } }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">영어 제목 수정</label>
                    <input
                      type="text"
                      value={workflow.params.englishTitle || ''}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, englishTitle: e.target.value } }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-center items-center">
                  <button
                    onClick={handleDownloadAll}
                    disabled={isVideoRendering || !uploadedAudio || (workflow.results.images?.length || 0) === 0}
                    className="w-full bg-primary text-background py-3 rounded-xl font-black shadow-lg hover:neon-glow-primary transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVideoRendering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        제작 및 다운로드 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        전체 다운로드
                      </>
                    )}
                  </button>
                </div>
                {isVideoRendering && (
                  <div className="space-y-1">
                    <ProgressBar progress={Object.values(videoProgressMap).reduce((a, b) => a + b, 0) / (2 + shortsCount)} />
                    <p className="text-[10px] text-center text-primary font-bold animate-pulse">전체 공정 진행 중...</p>
                  </div>
                )}

              </GlassCard>
            </div>
          </div>
        </div>

        {/* Bottom: Preview Grid */}
        <div className="space-y-6 pt-8 border-t border-white/10 w-full">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-primary" /> 출력물 확인 및 개별 다운로드</h2>
          <div className="flex flex-col xl:flex-row gap-8 items-start">
            <div className="w-full xl:w-[60%] shrink-0">
              <GlassCard className="space-y-4">
                <h3 className="font-bold text-primary mb-4">메인 영상 미리보기 (16:9)</h3>
                <VideoPlayer
                  ref={mainVideoRef}
                  key={`main_${getMatchingImage('main')?.url || 'none'}`}
                  imageSrc={getMatchingImage('main')?.url}
                  audioSrc={uploadedAudio}
                  lyrics={videoLyrics}
                  englishLyrics={englishVideoLyrics}
                  timedLyrics={timedLyrics}
                  type="main"
                  label="Main"
                  title={workflow.results.title}
                  koreanTitle={workflow.params.koreanTitle}
                  englishTitle={workflow.params.englishTitle}
                  titleSettings={workflow.imageSettings?.['main'] || createDefaultSettings()}
                  showTitle={workflow.imageSettings?.['main']?.showTitleOverlay ?? true}
                  lyricsStartTime={workflow.imageSettings?.['main']?.lyricsStartTime ?? 0}
                  lyricsScrollEnd={workflow.imageSettings?.['main']?.lyricsScrollEnd ?? 50}
                  lyricsFontSize={workflow.imageSettings?.['main']?.lyricsFontSize ?? 4}
                  addLog={addLog}
                  originalFileName={uploadedAudioName}
                  fadeInDuration={workflow.imageSettings?.['main']?.fadeInDuration ?? 1.5}
                  fadeOutDuration={workflow.imageSettings?.['main']?.fadeOutDuration ?? 3}
                  onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, main: p }))}
                  onRenderComplete={onRenderComplete}
                  videoEngine={videoEngine}
                  videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined}
                  karaokeColor={workflow.imageSettings?.['main']?.karaokeColor}
                />
                {videoProgressMap.main !== undefined && videoProgressMap.main < 100 && (
                  <div className="mt-2">
                    <ProgressBar progress={videoProgressMap.main} />
                    <p className="text-[10px] text-primary text-center mt-1">메인 영상 인코딩 중... {videoProgressMap.main}%</p>
                  </div>
                )}
                {(workflow.results.images?.length || 0) > 0 && (
                  <div className="space-y-4">
                    <VideoSettingsPanel
                      type="main"
                      settings={workflow.imageSettings?.['main'] || createDefaultSettings()}
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
            </div>

            <div className="w-full xl:w-[40%] shrink-0">
              <GlassCard className="space-y-4 h-full">
                <h3 className="font-bold text-primary mb-4 flex items-center gap-2">틱톡 영상 미리보기 (9:16)</h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full mx-auto shrink-0">
                    <VideoPlayer
                      ref={tiktokVideoRef}
                      key={`tiktok_${getMatchingImage('tiktok')?.url || 'none'}`}
                      imageSrc={getMatchingImage('tiktok')?.url}
                      audioSrc={uploadedAudio}
                      lyrics={videoLyrics}
                      englishLyrics={englishVideoLyrics}
                      timedLyrics={timedLyrics}
                      type="tiktok"
                      label="TikTok"
                      title={workflow.results.title}
                      koreanTitle={workflow.params.koreanTitle}
                      englishTitle={workflow.params.englishTitle}
                      titleSettings={workflow.imageSettings?.['main'] || createDefaultSettings()}
                      showTitle={workflow.imageSettings?.['main']?.showTitleOverlay ?? true}
                      lyricsStartTime={workflow.imageSettings?.['main']?.lyricsStartTime ?? 0}
                      lyricsScrollEnd={workflow.imageSettings?.['main']?.lyricsScrollEnd ?? 50}
                      lyricsFontSize={workflow.imageSettings?.['main']?.lyricsFontSize ?? 4}
                      addLog={addLog}
                      originalFileName={uploadedAudioName}
                      fadeInDuration={workflow.imageSettings?.['main']?.fadeInDuration ?? 1.5}
                      fadeOutDuration={workflow.imageSettings?.['main']?.fadeOutDuration ?? 3}
                      onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, tiktok: p }))}
                      onRenderComplete={onRenderComplete}
                      videoEngine={videoEngine}
                      videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined}
                      karaokeColor={workflow.imageSettings?.['main']?.karaokeColor}
                    />
                    {videoProgressMap.tiktok !== undefined && videoProgressMap.tiktok < 100 && (
                      <div className="mt-2 w-full">
                        <ProgressBar progress={videoProgressMap.tiktok} />
                        <p className="text-[10px] text-primary text-center mt-1">틱톡 영상 인코딩 중... {videoProgressMap.tiktok}%</p>
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <button
                      onClick={() => tiktokVideoRef.current?.download()}
                      className="w-full py-4 bg-primary text-background rounded-xl font-black hover:neon-glow-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      틱톡 영상 다운로드
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          <GlassCard className="space-y-4 xl:col-span-2">
            <div className="flex flex-row flex-wrap gap-4 w-full">
              {Array.from({ length: shortsCount }).map((_, idx) => {
                const highlight = shortsHighlights[idx] || { start: 0, duration: 30 };
                return (
                  <div key={idx} className="w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] lg:w-[calc(25%-1rem)] xl:w-[calc(20%-1rem)] min-w-[160px] space-y-2 p-2 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-[10px] font-bold text-primary truncate"># {idx + 1}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{Math.round(highlight.duration)}s</div>
                    </div>

                    <VideoPlayer
                      ref={el => { shortsVideoRefs.current[idx] = el; }}
                      key={`shorts-v1.12.23-${idx}-${highlight.start}-${highlight.duration}-${getMatchingImage(`shorts_${idx + 1}`)?.url || 'none'}`}
                      imageSrc={getMatchingImage(`shorts_${idx + 1}`)?.url}
                      audioSrc={uploadedAudio}
                      lyrics={videoLyrics}
                      englishLyrics={englishVideoLyrics}
                      timedLyrics={timedLyrics}
                      type="shorts"
                      label={`Shorts_${idx + 1}`}
                      startTime={highlight.start}
                      duration={highlight.duration}
                      title={workflow.results.title}
                      koreanTitle={workflow.params.koreanTitle}
                      englishTitle={workflow.params.englishTitle}
                      titleSettings={workflow.imageSettings?.['shorts'] || createDefaultSettings()}
                      showTitle={workflow.imageSettings?.['shorts']?.showTitleOverlay ?? true}
                      lyricsStartTime={workflow.imageSettings?.['shorts']?.lyricsStartTime ?? 0}
                      lyricsScrollEnd={workflow.imageSettings?.['shorts']?.lyricsScrollEnd ?? 50}
                      lyricsFontSize={workflow.imageSettings?.['shorts']?.lyricsFontSize ?? 4}
                      addLog={addLog}
                      originalFileName={uploadedAudioName}
                      fadeInDuration={workflow.imageSettings?.['shorts']?.fadeInDuration ?? 1.5}
                      fadeOutDuration={workflow.imageSettings?.['shorts']?.fadeOutDuration ?? 3}
                      onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, [`shorts_${idx}`]: p }))}
                      onRenderComplete={onRenderComplete}
                      videoEngine={videoEngine}
                      videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined}
                      karaokeColor={workflow.imageSettings?.['shorts']?.karaokeColor}
                    />
                    {videoProgressMap[`shorts_${idx}`] !== undefined && videoProgressMap[`shorts_${idx}`] < 100 && (
                      <div className="mt-1">
                        <ProgressBar progress={videoProgressMap[`shorts_${idx}`]} />
                      </div>
                    )}

                    <div className="flex flex-col gap-1 py-1">
                      <TimeInput
                        label="S"
                        value={highlight.start}
                        onChange={(val) => handleHighlightChange(idx, 'start', val)}
                      />
                      <TimeInput
                        label="E"
                        value={highlight.start + highlight.duration}
                        onChange={(val) => handleHighlightChange(idx, 'end', val)}
                      />
                    </div>

                    <button
                      onClick={() => shortsVideoRefs.current[idx]?.download()}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      받기
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-white/5 pt-4">
              <VideoSettingsPanel
                type="shorts"
                settings={workflow.imageSettings?.['shorts'] || createDefaultSettings()}
                onChange={(newSettings) => setWorkflow(prev => ({
                  ...prev,
                  imageSettings: { ...prev.imageSettings, shorts: newSettings }
                }))}
              />
            </div>
          </GlassCard>
        </div>
      </div>

      {workflow.progress?.video === 100 && (
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
