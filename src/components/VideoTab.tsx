import React from 'react';
import { motion } from 'framer-motion';
import { Music, Upload, Download, RefreshCw, Zap, ImageIcon, Type as TypeIcon, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { VideoPlayer } from './VideoPlayer';
import { VideoSettingsPanel } from './VideoSettingsPanel';
import { ProgressBar } from './ProgressBar';
import { TimeInput } from './TimeInput';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { VIDEO_ENGINES, RENDER_API_URL } from '../constants';
import { createDefaultSettings } from '../types';

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
  startVideoRender: (type: 'main' | 'tiktok' | 'shorts') => void;
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
  translateLyrics?: (lyrics: string) => Promise<void>;
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
  translateLyrics,
  onRenderComplete
}: VideoTabProps) => {
  const [internalIsTranslating, setInternalIsTranslating] = React.useState(false);
  const translationTimeoutRef = React.useRef<any>(null);
  const prevKoreanLyricsRef = React.useRef(videoLyrics);

  // 1. 자동 번역 로직 유지
  React.useEffect(() => {
    const isEnglishMissing = !englishVideoLyrics || englishVideoLyrics.trim() === "";
    const isKoreanModified = prevKoreanLyricsRef.current !== videoLyrics;

    if (videoLyrics && (isEnglishMissing || isKoreanModified) && translateLyrics) {
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

      translationTimeoutRef.current = setTimeout(async () => {
        setInternalIsTranslating(true);
        try {
          addLog("🌐 가사 수정 감지: 자동 번역을 시작합니다...");
          await translateLyrics(videoLyrics);
          prevKoreanLyricsRef.current = videoLyrics;
        } catch (error) {
          console.error("번역 중 오류 발생:", error);
        } finally {
          setInternalIsTranslating(false);
        }
      }, 1500);
    }
  }, [videoLyrics, englishVideoLyrics, translateLyrics, addLog]);

  // 2. 이미지 매칭 로직 유지
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

  // 3. 기록 복구 로직 유지
  React.useEffect(() => {
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
              results: { ...prev.results, images: match.generatedImages }
            }));
            addLog(`🔄 이미지 기록 복구: ${currentTitle}`);
          }
        } catch (e) { console.error(e); }
      }
    }
  }, [workflow.params.title, workflow.params.koreanTitle, workflow.results.images?.length]);

  const [videoProgressMap, setVideoProgressMap] = React.useState<Record<string, number>>({});

  return (
    <motion.div key="video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* 헤더 부분 */}
      <header className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">영상 렌더링</h1>
          <p className="text-sm text-gray-400">생성된 이미지를 활용하여 플랫폼별 최적화 영상을 제작합니다.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#13171C] border border-[#2A313A] rounded-lg px-4 py-2">
          <span className="text-xs text-gray-400">렌더링 엔진:</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={videoEngine}
              onChange={(e) => setVideoEngine(e.target.value)}
              className="bg-transparent text-xs text-emerald-400 outline-none cursor-pointer font-bold"
            >
              {VIDEO_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26] text-white">
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* 상단 설정 영역 (이미지 이미지 참고하여 2단 분할) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 왼쪽: 소스 업로드 영역 (이미지 + 오디오) */}
        <GlassCard className="p-5 flex flex-col gap-6 bg-[#0B0F13] border-[#1E252C]">
          {/* 오류/경고 메시지 표시 영역 세분화 */}
          {!uploadedAudio && (workflow.results.images?.length || 0) > 0 && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <span className="text-xs text-yellow-400 font-medium flex items-center gap-2">
                ⚠️ 배경 이미지 소스는 준비되었으나, 배경 음악(오디오)이 아직 없습니다.
              </span>
            </div>
          )}
          {uploadedAudio && (workflow.results.images?.length || 0) === 0 && (
            <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <span className="text-xs text-yellow-400 font-medium flex items-center gap-2">
                ⚠️ 오디오 소스는 준비되었으나, 배경 이미지 소스가 아직 없습니다.
              </span>
              <button onClick={() => handleTabChange('image')} className="text-[10px] bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded hover:bg-yellow-500/30 transition-colors">
                이미지 탭으로 이동
              </button>
            </div>
          )}
          {!uploadedAudio && (workflow.results.images?.length || 0) === 0 && (
            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <span className="text-xs text-red-400 font-medium flex items-center gap-2">
                ⚠️ 데이터가 없습니다. 먼저 데이터 소스(오디오/이미지)를 연결해주세요.
              </span>
              <button onClick={() => handleTabChange('data')} className="text-[10px] bg-red-500/20 text-red-300 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors">
                데이터 탭으로 이동
              </button>
            </div>
          )}

          {/* 이미지 소스 */}
          <div className="space-y-3 border border-[#1E252C] rounded-xl p-4 bg-[#11161B]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> 1. 배경 이미지 소스
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500">숏츠 개수</span>
                <input
                  type="range" min="0" max="5" value={shortsCount}
                  onChange={(e) => setShortsCount(parseInt(e.target.value))}
                  className="w-20 accent-emerald-500"
                />
                <span className="text-xs font-bold text-emerald-400">{shortsCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {['main', 'tiktok', ...Array.from({ length: Math.max(shortsCount, 3) }).map((_, i) => `shorts_${i + 1}`)].map((type, index) => {
                const label = type === 'main' ? '메인 영상' : type === 'tiktok' ? '틱톡 영상' : `숏츠 영상 ${index - 1}`;
                const existingImg = getMatchingImage(type);
                // shortsCount 설정값 이상의 숏츠 슬롯은 비활성화/숨김 처리
                if (type.startsWith('shorts') && parseInt(type.split('_')[1]) > shortsCount) return null;

                return (
                  <div key={type} className="relative group aspect-square rounded-lg overflow-hidden border border-[#1E252C] bg-[#0A0D10] hover:border-emerald-500/50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(type, e)} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    {existingImg ? (
                      <>
                        <img src={existingImg.url} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 py-1">
                          <p className="text-[9px] text-center text-gray-300 font-medium truncate px-1">{label}</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-600">
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px] text-center px-1 font-medium">{label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-2 px-1">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 ml-1 font-bold uppercase">Korean Title</label>
              <input type="text" value={workflow.params.koreanTitle || ''} onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, koreanTitle: e.target.value } }))} placeholder="한글 제목" className="w-full bg-[#11161B] border border-[#1E252C] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 ml-1 font-bold uppercase">English Title</label>
              <input type="text" value={workflow.params.englishTitle || ''} onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, englishTitle: e.target.value } }))} placeholder="영어 제목" className="w-full bg-[#11161B] border border-[#1E252C] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* 오디오 소스 */}
          <div className="space-y-3 border border-[#1E252C] rounded-xl p-4 bg-[#11161B] border-dashed">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <Music className="w-4 h-4" /> 2. 배경 음악 소스
            </h3>
            <label className="block w-full cursor-pointer bg-[#0A0D10] border border-[#1E252C] rounded-lg p-4 text-center hover:bg-[#1E252C]/50 transition-colors">
              <Upload className="w-5 h-5 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-400 mb-1">여기를 클릭하여 오디오 파일을 업로드하세요 (MP3/WAV 권장)</p>
              {uploadedAudioName && <p className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 inline-block px-2 py-0.5 rounded">현재: {uploadedAudioName}</p>}
              <input type="file" accept="audio/*" onChange={handleVideoAudioUpload} className="hidden" />
            </label>
          </div>
        </GlassCard>

        {/* 오른쪽: 텍스트 설정 영역 (제목/가사) */}
        <GlassCard className="p-5 bg-[#0B0F13] border-[#1E252C] flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
              <TypeIcon className="w-4 h-4" /> 3. 가사 설정
            </h3>
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* 한글 가사 입력 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-wider">Korean Lyrics</label>
                <textarea
                  value={videoLyrics}
                  onChange={(e) => setVideoLyrics(e.target.value)}
                  className="w-full flex-1 bg-[#0A0D10] border border-[#1E252C] rounded-xl p-4 text-[11px] text-white focus:border-emerald-500 outline-none resize-none custom-scrollbar leading-relaxed font-mono shadow-inner"
                  placeholder="한글 가사를 입력하세요. [00:15] 형식의 타임스탬프를 인식합니다."
                />
              </div>

              {/* 영어 가사 입력 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-wider">English Lyrics</label>
                <textarea
                  value={englishVideoLyrics}
                  onChange={(e) => setEnglishVideoLyrics(e.target.value)}
                  className="w-full flex-1 bg-[#0A0D10] border border-[#1E252C] rounded-xl p-4 text-[11px] text-gray-300 focus:border-emerald-500 outline-none resize-none custom-scrollbar leading-relaxed font-mono shadow-inner"
                  placeholder="영어 번역 가사가 들어갑니다."
                />
              </div>
            </div>

            <button
              className="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs hover:bg-emerald-500 hover:text-black transition-all"
              onClick={() => { if (translateLyrics) translateLyrics(videoLyrics) }}
            >
              🔄 가사 번역 & 동기화
            </button>
          </div>
        </GlassCard>
      </div>

      {/* 구분선 및 출력 영역 타이틀 */}
      <div className="pt-8 border-t border-[#1E252C]">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
          <ImageIcon className="w-5 h-5 text-emerald-400" /> 출력물 확인 및 개별 다운로드
        </h2>
      </div>

      {/* 출력물 뷰어 영역 (메인, 틱톡 가로 배치) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* 메인 영상 (가로비율) - 3/5 영역 */}
        <GlassCard className="lg:col-span-3 p-5 bg-[#0B0F13] border-[#1E252C]">
          <h3 className="font-bold text-emerald-400 mb-4 text-sm">메인 영상 미리보기 (16:9)</h3>
          <div className="rounded-xl overflow-hidden border border-[#1E252C]">
            <VideoPlayer
              ref={mainVideoRef}
              key={`main_${getMatchingImage('main')?.url || 'none'}`}
              imageSrc={getMatchingImage('main')?.url}
              audioSrc={uploadedAudio}
              lyrics={videoLyrics}
              englishLyrics={englishVideoLyrics}
              timedLyrics={timedLyrics}
              type="main" label="Main"
              title={workflow.results.title}
              koreanTitle={workflow.params.koreanTitle}
              englishTitle={workflow.params.englishTitle}
              titleSettings={workflow.imageSettings?.['main'] || createDefaultSettings()}
              showTitle={workflow.imageSettings?.['main']?.showTitleOverlay ?? true}
              lyricsStartTime={workflow.imageSettings?.['main']?.lyricsStartTime ?? 0}
              lyricsScrollEnd={workflow.imageSettings?.['main']?.lyricsScrollEnd ?? 50}
              lyricsFontSize={workflow.imageSettings?.['main']?.lyricsFontSize ?? 4}
              addLog={addLog} originalFileName={uploadedAudioName}
              fadeInDuration={workflow.imageSettings?.['main']?.fadeInDuration ?? 1.5}
              fadeOutDuration={workflow.imageSettings?.['main']?.fadeOutDuration ?? 3}
              onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, main: p }))}
              onRenderComplete={onRenderComplete}
              videoEngine={videoEngine}
              videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined}
              karaokeColor={workflow.imageSettings?.['main']?.karaokeColor}
              category={workflow.params.target === 'CCM' ? 'CCM' : 'Pop'}
            />
          </div>
          {videoProgressMap.main !== undefined && videoProgressMap.main < 100 && (
            <div className="mt-3"><ProgressBar progress={videoProgressMap.main} /></div>
          )}

          {/* 메인 및 틱톡 통합 설정 (헤더 및 외부 박스 제거) */}
          <div className="mt-4 border-t border-[#1E252C] -mx-5 px-5 pt-4">
            <VideoSettingsPanel
              type="main"
              settings={workflow.imageSettings?.['main'] || createDefaultSettings()}
              onChange={(newSettings) => setWorkflow(prev => ({
                ...prev,
                imageSettings: {
                  ...prev.imageSettings,
                  main: newSettings,
                  tiktok: newSettings
                }
              }))}
            />
          </div>

          <button onClick={() => mainVideoRef.current?.download()} className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2">
            <Download className="w-3.5 h-3.5" /> 메인 영상 다운로드
          </button>
        </GlassCard>

        {/* 틱톡 영상 (세로비율) - 2/5 영역 */}
        <GlassCard className="lg:col-span-2 p-5 bg-[#0B0F13] border-[#1E252C] h-full flex flex-col">
          <h3 className="font-bold text-emerald-400 mb-4 text-sm">틱톡 영상 미리보기 (9:16)</h3>
          <div className="flex-1 flex justify-center items-center">
            <div className="w-[80%] max-w-[300px] rounded-xl overflow-hidden border border-[#1E252C] shadow-2xl">
              <VideoPlayer
                ref={tiktokVideoRef}
                key={`tiktok_${getMatchingImage('tiktok')?.url || 'none'}`}
                imageSrc={getMatchingImage('tiktok')?.url}
                audioSrc={uploadedAudio}
                lyrics={videoLyrics}
                englishLyrics={englishVideoLyrics}
                timedLyrics={timedLyrics}
                type="tiktok" label="TikTok"
                title={workflow.results.title} koreanTitle={workflow.params.koreanTitle} englishTitle={workflow.params.englishTitle}
                titleSettings={workflow.imageSettings?.['main'] || createDefaultSettings()}
                showTitle={workflow.imageSettings?.['main']?.showTitleOverlay ?? true}
                lyricsStartTime={workflow.imageSettings?.['main']?.lyricsStartTime ?? 0}
                lyricsScrollEnd={workflow.imageSettings?.['main']?.lyricsScrollEnd ?? 50}
                lyricsFontSize={workflow.imageSettings?.['main']?.lyricsFontSize ?? 4}
                addLog={addLog} originalFileName={uploadedAudioName}
                fadeInDuration={workflow.imageSettings?.['main']?.fadeInDuration ?? 1.5}
                fadeOutDuration={workflow.imageSettings?.['main']?.fadeOutDuration ?? 3}
                onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, tiktok: p }))}
                onRenderComplete={onRenderComplete}
                videoEngine={videoEngine}
                videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined}
                karaokeColor={workflow.imageSettings?.['main']?.karaokeColor}
                category={workflow.params.target === 'CCM' ? 'CCM' : 'Pop'}
              />
            </div>
          </div>
          {videoProgressMap.tiktok !== undefined && videoProgressMap.tiktok < 100 && (
            <div className="mt-3 w-full max-w-[300px] mx-auto"><ProgressBar progress={videoProgressMap.tiktok} /></div>
          )}
          <button onClick={() => tiktokVideoRef.current?.download()} className="w-full mt-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Download className="w-4 h-4" /> 틱톡 영상 다운로드
          </button>
        </GlassCard>
      </div>

      {/* 숏츠 리스트 패널 */}
      <GlassCard className="p-6 bg-[#0B0F13] border-[#1E252C]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: shortsCount }).map((_, idx) => {
            const highlight = shortsHighlights[idx] || { start: 0, duration: 30 };
            return (
              <div key={idx} className="bg-[#11161B] rounded-xl border border-[#1E252C] overflow-hidden flex flex-col hover:border-[#2A313A] transition-colors">
                {/* 비디오 썸네일 영역 */}
                <div className="w-full aspect-[9/16] relative border-b border-[#1E252C]">
                  <VideoPlayer
                    ref={el => { shortsVideoRefs.current[idx] = el; }}
                    key={`shorts-${idx}-${highlight.start}`}
                    imageSrc={getMatchingImage(`shorts_${idx + 1}`)?.url} audioSrc={uploadedAudio} lyrics={videoLyrics} englishLyrics={englishVideoLyrics} timedLyrics={timedLyrics} type="shorts" label={`Shorts_${idx + 1}`}
                    startTime={highlight.start} duration={highlight.duration}
                    title={workflow.results.title} koreanTitle={workflow.params.koreanTitle} englishTitle={workflow.params.englishTitle}
                    titleSettings={workflow.imageSettings?.['shorts'] || createDefaultSettings()} showTitle={workflow.imageSettings?.['shorts']?.showTitleOverlay ?? true}
                    lyricsStartTime={workflow.imageSettings?.['shorts']?.lyricsStartTime ?? 0} lyricsScrollEnd={workflow.imageSettings?.['shorts']?.lyricsScrollEnd ?? 50} lyricsFontSize={workflow.imageSettings?.['shorts']?.lyricsFontSize ?? 4}
                    addLog={addLog} originalFileName={uploadedAudioName}
                    fadeInDuration={workflow.imageSettings?.['shorts']?.fadeInDuration ?? 1.5} fadeOutDuration={workflow.imageSettings?.['shorts']?.fadeOutDuration ?? 3}
                    onProgress={(p) => setVideoProgressMap(prev => ({ ...prev, [`shorts_${idx}`]: p }))}
                    onRenderComplete={onRenderComplete} videoEngine={videoEngine} videoRenderApiUrl={workflow.params.isLocalMode ? RENDER_API_URL : undefined} karaokeColor={workflow.imageSettings?.['shorts']?.karaokeColor} category={workflow.params.target === 'CCM' ? 'CCM' : 'Pop'}
                  />
                </div>
                {/* 컨트롤 하단 영역 */}
                <div className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-300">#{idx + 1}</span>
                    <span className="text-[10px] text-gray-500 bg-[#0B0F13] px-2 py-0.5 rounded border border-[#1E252C]">{Math.round(highlight.duration)}s</span>
                  </div>
                  <div className="space-y-1">
                    <TimeInput label="시작" value={highlight.start} onChange={(val) => handleHighlightChange(idx, 'start', val)} />
                    <TimeInput label="종료" value={highlight.start + highlight.duration} onChange={(val) => handleHighlightChange(idx, 'end', val)} />
                  </div>
                  <button onClick={() => shortsVideoRefs.current[idx]?.download()} className="w-full mt-2 py-2 bg-transparent hover:bg-emerald-500/10 border border-[#2A313A] hover:border-emerald-500/50 text-gray-400 hover:text-emerald-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> 받기
                  </button>
                  {videoProgressMap[`shorts_${idx}`] !== undefined && videoProgressMap[`shorts_${idx}`] < 100 && (
                    <div className="mt-1"><ProgressBar progress={videoProgressMap[`shorts_${idx}`]} /></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 숏츠 설정 패널 (헤더, 외부 박스, 가로 구분선 모두 제거) */}
      <div className="mt-4">
        <VideoSettingsPanel
          type="shorts"
          settings={workflow.imageSettings?.['shorts'] || createDefaultSettings()}
          onChange={(newSettings) => setWorkflow(prev => ({
            ...prev,
            imageSettings: { ...prev.imageSettings, shorts: newSettings }
          }))}
        />
      </div>

      {workflow.progress?.video === 100 && (
        <div className="flex justify-center pt-8 pb-12">
          <button onClick={() => handleTabChange('publish')} className="bg-emerald-500 text-black px-10 py-4 rounded-full font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            다음 단계: 업로드 정보 확인 <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 터미널 로그 */}
      <div className="mt-8 rounded-xl overflow-hidden border border-[#1E252C]">
        <Terminal logs={logs} />
      </div>
    </motion.div>
  );
};
