import React from 'react';
import { motion } from 'motion/react';
import { ImageIcon, Upload, Music, Download, RefreshCw, Key, ChevronRight, CheckCircle2, FileText, Trash2, Search, AlertTriangle, DownloadCloud, Database } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { storage, auth } from '../firebase';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
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
  WEATHERS,
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
  regenerateShorts: (indices?: number[]) => Promise<void>;
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
  sunoTracks: any[];
  setSunoTracks: React.Dispatch<React.SetStateAction<any[]>>;
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
  setImageEngine,
  sunoTracks,
  setSunoTracks
}: ImageTabProps) => {
  const handleLoadFromHistory = (track: any) => {
    if (track.generatedImages && track.generatedImages.length > 0) {
      addLog(`📂 [${track.title}] 곡의 기록(이미지/가사/분석)을 불러옵니다.`);
      setWorkflow(prev => ({
        ...prev,
        params: {
          ...prev.params,
          title: track.title,
          koreanTitle: track.title.split('_')[0] || track.title,
          englishTitle: track.title.split('_')[1] || ''
        },
        results: {
          ...prev.results,
          images: track.generatedImages,
          lyrics: track.lyrics || prev.results.lyrics,
          englishLyrics: track.englishLyrics || prev.results.englishLyrics,
          audioAnalysis: track.audioAnalysis || prev.results.audioAnalysis
        }
      }));
    }
  };
  const [selectedShorts, setSelectedShorts] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;

  const toggleShortsSelection = (num: number) => {
    setSelectedShorts(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  };

  const handleDeleteHistory = (e: React.MouseEvent, trackTitle: string) => {
    e.stopPropagation();
    if (!confirm(`[${trackTitle}]의 이미지 히스토리를 삭제하시겠습니까?\n(DB에서 이미지 생성 기록만 삭제되며, 수노 곡 정보는 그대로 유지됩니다)`)) return;
    
    setSunoTracks(prev => prev.map(t => {
      if (t.title === trackTitle) {
        const { generatedImages, ...rest } = t;
        return rest;
      }
      return t;
    }));
    addLog(`🗑️ [${trackTitle}] 이미지 생성 기록을 삭제했습니다.`);
  };

  const [orphanedImages, setOrphanedImages] = React.useState<{name: string, url: string}[]>([]);
  const [isScanningOrphans, setIsScanningOrphans] = React.useState(false);

  const scanOrphanedImages = async () => {
    if (!auth.currentUser) return;
    setIsScanningOrphans(true);
    addLog("👻 스토리지에서 유령 이미지 탐색을 시작합니다...");
    try {
      const dbImageUrls = new Set<string>();
      (sunoTracks || []).forEach(t => {
        if (t.generatedImages) {
          t.generatedImages.forEach((img: any) => {
            if (img.url) dbImageUrls.add(img.url);
          });
        }
      });

      const storageRef = ref(storage, `users/${auth.currentUser.uid}/images`);
      const res = await listAll(storageRef);
      const orphans: {name: string, url: string}[] = [];
      
      for (const item of res.items) {
        const url = await getDownloadURL(item);
        if (!dbImageUrls.has(url)) {
          orphans.push({ name: item.name, url });
        }
      }
      
      setOrphanedImages(orphans);
      if (orphans.length > 0) {
        addLog(`⚠️ DB에 없는 유령 이미지 ${orphans.length}개를 스토리지에서 발견했습니다.`);
      } else {
        addLog(`✅ 스토리지에 유령 이미지가 없습니다. 깨끗합니다!`);
      }
    } catch (err) {
      console.error(err);
      addLog("❌ 유령 이미지 탐색 중 오류가 발생했습니다.");
    } finally {
      setIsScanningOrphans(false);
    }
  };

  const deleteOrphanedImage = async (name: string, url: string) => {
    if (!auth.currentUser) return;
    if (!confirm('스토리지에서 이 미아 이미지를 완전히 영구 삭제하시겠습니까?\n(삭제 후에는 복구할 수 없습니다)')) return;
    try {
      const itemRef = ref(storage, `users/${auth.currentUser.uid}/images/${name}`);
      await deleteObject(itemRef);
      setOrphanedImages(prev => prev.filter(img => img.name !== name));
      addLog(`🗑️ 스토리지 유령 이미지 영구 삭제 완료: ${name}`);
    } catch (err) {
      console.error(err);
      addLog(`❌ 유령 이미지 삭제 실패`);
    }
  };

  return (
    <motion.div key="image" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
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

      <GlassCard className="border-primary/20 bg-primary/5 space-y-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">원본 가사 입력 (타임스탬프 생성 기준)</span>
          </div>
          <textarea
            value={workflow.params.originalLyrics || ''}
            onChange={(e) => setWorkflow((prev: any) => ({ ...prev, params: { ...prev.params, originalLyrics: e.target.value } }))}
            placeholder="싱크를 맞출 원본 가사를 입력해주세요. 오디오 소스 업로드 시 이 가사를 기준으로 타임스탬프가 작성됩니다."
            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all resize-none"
          />
        </div>

        <div className="pt-2 border-t border-white/5">
          <label className="text-sm font-medium text-gray-400 mb-2 block">음악 종류 (이미지 생성 기준)</label>
          <div className="flex gap-2">
            {TARGETS.map(t => (
              <button
                key={t}
                onClick={() => {
                  const subGenre = t === '대중음악' ? POP_SUB_GENRES[0] : CCM_SUB_GENRES[0];
                  const mood = t === '대중음악' ? POP_MOODS[0] : CCM_MOODS[0];
                  setWorkflow((prev: any) => ({ ...prev, params: { ...prev.params, target: t, subGenre, mood } }));
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
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
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
                  value={workflow.imageParams?.artStyle || ART_STYLES[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), artStyle: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {ART_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">구도 및 시점</label>
                <select
                  value={workflow.imageParams?.cameraView || CAMERA_VIEWS[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), cameraView: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {CAMERA_VIEWS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">시간대</label>
                <select
                  value={workflow.imageParams?.timeOfDay || TIME_OF_DAY_OPTIONS[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), timeOfDay: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {TIME_OF_DAY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">조명 및 대기</label>
                <select
                  value={workflow.imageParams?.lightingAtmosphere || LIGHTING_ATMOSPHERES[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), lightingAtmosphere: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {LIGHTING_ATMOSPHERES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">날씨 및 환경</label>
                <select
                  value={workflow.imageParams?.weather || WEATHERS[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), weather: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {WEATHERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">배경 유형</label>
                <select
                  value={workflow.imageParams?.backgroundType || BACKGROUND_TYPES[0]}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, imageParams: { ...(prev.imageParams || {}), backgroundType: e.target.value } }))}
                  className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-primary outline-none cursor-pointer"
                >
                  {BACKGROUND_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </GlassCard>

          {/* New Horizontal Upload Row (The Red Square Area) */}
          <div className="flex flex-wrap items-stretch gap-2">
            <div className="relative group min-w-[140px] flex-1 h-full">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className={cn(
                "w-full h-full py-2.5 px-3 border border-dashed rounded-xl flex items-center gap-3 transition-all",
                workflow.results.audioFile ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10 hover:border-primary/50"
              )}>
                <div className={cn("shrink-0 p-1.5 rounded-full", workflow.results.audioFile ? "bg-primary/20" : "bg-white/5")}>
                  <Music className={cn("w-4 h-4", workflow.results.audioFile ? "text-primary" : "text-gray-400")} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-white truncate">
                    {workflow.results.audioFile ? (workflow.results.audioFile.name || 'Suno Audio') : '음원 업로드'}
                  </p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-tighter">Suno Track</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 flex-[2]">
              {['main', 'tiktok', ...Array.from({ length: shortsCount }).map((_, i) => `shorts_${i + 1}`)].map(type => (
                <div key={type} className="relative group min-w-[80px] flex-1 h-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSingleImageUpload(type, e)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <button className="w-full h-full py-2.5 bg-secondary/5 border border-secondary/20 text-secondary rounded-xl text-[9px] font-bold hover:bg-secondary/10 transition-all flex flex-col items-center justify-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    {type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `쇼츠 ${type.split('_')[1]}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-1 space-y-4">
          {/* Right Side: Shorts Selection & Overall Control */}
          <GlassCard className="p-4 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">추가 숏츠 이미지 수</label>
                <span className="text-[10px] text-primary/50 font-bold px-2 py-0.5 bg-primary/5 rounded-full border border-primary/10">메인 1개, 틱톡 1개 기본 생성</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={shortsCount}
                  onChange={(e) => setShortsCount(parseInt(e.target.value))}
                  className="flex-1 accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-black text-primary">{shortsCount}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">숏츠 개별 생성 선택</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(num => (
                    <label key={num} className="flex items-center gap-1 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedShorts.includes(num)} 
                        onChange={() => toggleShortsSelection(num)}
                        className="hidden"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold transition-all",
                        selectedShorts.includes(num) ? "bg-primary border-primary text-background" : "border-white/20 bg-white/5 text-gray-500 group-hover:border-primary/50"
                      )}>
                        {num}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => regenerateShorts(selectedShorts)}
                disabled={selectedShorts.length === 0}
                className={cn(
                  "w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                  selectedShorts.length > 0 ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30" : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isShortsGenerating && "animate-spin")} />
                {isShortsGenerating ? "숏츠 생성 중..." : "선택한 숏츠 개별 생성"}
              </button>
            </div>
          </GlassCard>

          <div className="space-y-3">
            <button
              onClick={generateImages}
              disabled={(!workflow.results.audioFile && !workflow.results.lyrics) || (workflow.progress.image > 0 && workflow.progress.image < 100)}
              className={cn(
                "w-full py-4 rounded-xl font-black transition-all text-sm",
                (workflow.results.audioFile || workflow.results.lyrics)
                  ? "bg-secondary text-background hover:neon-glow-secondary shadow-[0_0_20px_rgba(0,255,163,0.3)]"
                  : "bg-white/5 text-gray-500 cursor-not-allowed"
              )}
            >
              {workflow.progress.image > 0 && workflow.progress.image < 100
                ? "이미지 엔진 가동 중..."
                : "AI 최적화 이미지 전체 생성"}
            </button>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="text-[10px] font-bold text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
              >
                <Key className="w-3 h-3" /> API 키 설정/변경
              </button>
            </div>
          </div>
        </div>
      </div>

      {workflow.results.images.length > 0 && (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row gap-8 items-start">
            {workflow.results.images.filter((img: any) => img && !(img.label || '').includes('숏츠')).map((img: any, i: number) => {
              const labelStr = img.label || '';
              const typeKey = labelStr.includes('메인') ? 'main' : labelStr.includes('틱톡') ? 'tiktok' : 'shorts';
              const settings = (typeKey === 'main' || typeKey === 'tiktok')
                ? (workflow.imageSettings['main'] || createDefaultSettings())
                : (workflow.imageSettings['shorts'] || createDefaultSettings());
              const isVertical = img.type !== 'horizontal';

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "shrink-0",
                    isVertical ? "w-full xl:w-[40%]" : "w-full xl:w-[60%]",
                    isVertical ? "flex flex-col gap-6 items-center" : "space-y-4"
                  )}
                >
                  <div className={cn(
                    "relative rounded-xl overflow-hidden border border-white/10 group shrink-0",
                    isVertical ? "aspect-[9/16] w-full" : "aspect-video w-full"
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

                  {typeKey === 'main' && (
                    <div className={cn("w-full space-y-4 flex flex-col justify-center", isVertical ? "md:w-[50%]" : "")}>
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
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isShortsGenerating && Array.from({ length: Math.max(0, shortsCount - workflow.results.images.filter((img: any) => img.label.includes('숏츠')).length) }).map((_, i) => (
              <div key={`generating-${i}`} className="space-y-4">
                <div className="aspect-[9/16] w-full max-w-[50%] mx-auto rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-primary/40 animate-spin" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">생성 중...</p>
                </div>
              </div>
            ))}
          </div>

          {workflow.results.images.some((img: any) => img.label.includes('숏츠')) && (
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h4 className="font-bold text-sm text-primary mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> 숏츠 이미지 확인
              </h4>
              <div className="flex flex-row flex-wrap gap-4 w-full items-start">
                {workflow.results.images
                  .filter((img: any) => img && (img.label || '').includes('숏츠'))
                  .sort((a, b) => {
                    const aNum = parseInt(a.label.replace(/[^0-9]/g, '')) || 0;
                    const bNum = parseInt(b.label.replace(/[^0-9]/g, '')) || 0;
                    return aNum - bNum;
                  })
                  .map((img: any, i: number) => {
                  const settings = workflow.imageSettings['shorts'] || createDefaultSettings();
                  return (
                    <motion.div
                      key={img.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-[calc(50%-1rem)] md:w-[calc(33.33%-1rem)] lg:w-[calc(25%-1rem)] xl:w-[calc(20%-1rem)] min-w-[160px] flex flex-col gap-2"
                    >
                      <div className="relative rounded-xl overflow-hidden border border-white/10 group aspect-[9/16] w-full bg-black/40">
                        <CanvasPreview img={img} settings={settings} params={workflow.params} type="shorts" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
                          <button
                            onClick={() => regenerateSpecificImage(workflow.results.images.findIndex((im: any) => im.label === img.label), 'shorts')}
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
                        </div>
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold z-10">
                          {img.label}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 숏츠용 개별 설정 패널 복구 */}
          {workflow.results.images.some((img: any) => img.label.includes('숏츠')) && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <h4 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-3 h-3" /> 모든 숏츠 공통 타이틀 설정
              </h4>
              <VideoSettingsPanel
                type="shorts"
                settings={workflow.imageSettings['shorts'] || createDefaultSettings()}
                onChange={(newSettings) => setWorkflow(prev => ({
                  ...prev,
                  imageSettings: { ...prev.imageSettings, shorts: newSettings }
                }))}
                showLyricsControls={false}
              />
            </div>
          )}
          <div className="flex justify-center">
            <button onClick={() => handleTabChange('video')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              다음 단계: 영상 렌더링 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {/* Image History List (v1.12.1: Slimmed) */}
      {(sunoTracks || []).some(t => t && t.generatedImages && t.generatedImages.length > 0) && (
        <div className="space-y-4 mt-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-2 pb-3 border-b border-white/5">
              <Database className="w-3 h-3 text-primary/50" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">이미지 생성 히스토리 (Slim List)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {(() => {
                const uniqueTracks = Array.from(new Map((sunoTracks || [])
                  .filter(t => t && t.title && t.generatedImages && t.generatedImages.length > 0)
                  .map(t => [t.title, t])
                ).values());
                
                const totalPages = Math.ceil(uniqueTracks.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedTracks = uniqueTracks.slice(startIndex, startIndex + itemsPerPage);

                return (
                  <>
                    {paginatedTracks.map((track, idx) => {
                      const globalIdx = startIndex + idx + 1;
                      return (
                        <div key={idx} className="flex items-center group hover:bg-white/5 overflow-hidden transition-all h-[28px] px-1 -mx-1">
                          <button
                            onClick={() => handleLoadFromHistory(track)}
                            className="flex-1 text-left px-3 py-1.5 flex items-center justify-between relative overflow-hidden"
                          >
                            <div className="flex items-center gap-3 overflow-hidden relative z-10 flex-1">
                              <span className="text-[9px] text-primary/40 font-mono w-4 text-center group-hover:text-primary transition-colors shrink-0">{globalIdx}</span>
                              <span className="text-xs font-bold text-gray-300 truncate group-hover:text-white transition-colors">
                                {track.title} 
                                <span className="text-primary/60 ml-2 text-[8px] font-black uppercase">{track.generatedImages?.length || 0} Images</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 relative z-10">
                              <span className="text-[8px] text-gray-600 font-medium tabular-nums">
                                {track.created_at ? new Date(track.created_at).toLocaleDateString() : track.createdAt ? new Date(track.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                              </span>
                            </div>
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHistory(e, track.title)}
                            className="w-[36px] h-full flex items-center justify-center bg-red-500/5 hover:bg-red-500/20 text-red-400 border-l border-white/5 transition-colors opacity-0 group-hover:opacity-100"
                            title="히스토리에서 삭제 (DB 반영)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                  {/* 페이지네이션 컨트롤 */}
                  {totalPages > 1 && (
                    <div className="col-span-2 flex justify-center items-center gap-2 mt-6 pb-4">
                      <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </button>
                      
                      {Array.from({ length: totalPages }).map((_, pIdx) => {
                        const pageNum = pIdx + 1;
                        // 현재 페이지 근처만 표시 (옵션)
                        if (totalPages > 7 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                          if (Math.abs(pageNum - currentPage) === 3) return <span key={pageNum} className="text-gray-600">...</span>;
                          return null;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all",
                              currentPage === pageNum ? "bg-primary text-background" : "hover:bg-white/10 text-gray-500"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* Orphaned Images Scanner Panel */}
      <GlassCard className="mt-8 border-red-500/20 bg-red-500/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="text-sm font-black text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> 스토리지 유령 이미지 관리
            </h4>
            <p className="text-xs text-gray-400 mt-1">DB에는 없지만 스토리지에 남아있는 '미아 이미지'들을 스캔하고 삭제하여 용량을 확보합니다.</p>
          </div>
          <button
            onClick={scanOrphanedImages}
            disabled={isScanningOrphans}
            className="shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-red-500/30"
          >
            <Search className={cn("w-4 h-4", isScanningOrphans && "animate-spin")} />
            {isScanningOrphans ? "스토리지 전체 스캔 중..." : "유령 이미지 찾기"}
          </button>
        </div>

        {orphanedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {orphanedImages.map((img, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 bg-black/60">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md"
                    title="크게 보기 / 다운로드"
                  >
                    <DownloadCloud className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => deleteOrphanedImage(img.name, img.url)}
                    className="p-2 bg-red-500/60 hover:bg-red-500/80 rounded-full text-white backdrop-blur-md"
                    title="스토리지 영구 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/80 px-2 py-1">
                  <p className="text-[8px] text-gray-400 truncate text-center">{img.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Terminal logs={logs} />
    </motion.div>
  );
};
