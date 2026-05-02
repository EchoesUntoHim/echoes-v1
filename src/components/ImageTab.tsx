import React from 'react';
import { motion } from 'motion/react';
import { ImageIcon, Upload, Music, Download, RefreshCw, Key, ChevronRight, CheckCircle2, FileText, Trash2, Search, AlertTriangle, DownloadCloud, Database, Check, Zap } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { storage, auth } from '../firebase';
import { ref, listAll, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
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
  IMAGE_ENGINES,
  AI_ENGINES
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
  saveCurrentImagesToCloud: (setSunoTracks?: React.Dispatch<React.SetStateAction<any[]>>) => Promise<void>;
  aiEngine: string;
  setAiEngine: (engine: string) => void;
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
  setSunoTracks,
  saveCurrentImagesToCloud,
  aiEngine,
  setAiEngine
}: ImageTabProps) => {

  const [selectedShorts, setSelectedShorts] = React.useState<number[]>([]);
  const toggleShortsSelection = (num: number) => {
    setSelectedShorts(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  };

  const [orphanedImages, setOrphanedImages] = React.useState<{ name: string, url: string }[]>([]);
  const [isScanningOrphans, setIsScanningOrphans] = React.useState(false);
  const [selectedOrphanNames, setSelectedOrphanNames] = React.useState<Set<string>>(new Set());

  const toggleOrphanSelection = (name: string) => {
    setSelectedOrphanNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAllOrphans = () => {
    if (selectedOrphanNames.size === orphanedImages.length) {
      setSelectedOrphanNames(new Set());
    } else {
      setSelectedOrphanNames(new Set(orphanedImages.map(img => img.name)));
    }
  };

  const deleteSelectedOrphans = async () => {
    if (selectedOrphanNames.size === 0 || !auth.currentUser) return;
    if (!confirm(`선택한 ${selectedOrphanNames.size}개의 유령 이미지를 스토리지에서 영구 삭제하시겠습니까?`)) return;

    setIsScanningOrphans(true);
    addLog(`🗑️ 유령 이미지 ${selectedOrphanNames.size}개 일괄 삭제 시작...`);

    try {
      const namesToDelete = Array.from(selectedOrphanNames);
      let successCount = 0;

      for (const name of namesToDelete) {
        const itemRef = ref(storage, `users/${auth.currentUser.uid}/images/${name}`);
        await deleteObject(itemRef).catch(e => console.warn(`Failed to delete ${name}:`, e));
        successCount++;
      }

      setOrphanedImages(prev => prev.filter(img => !selectedOrphanNames.has(img.name)));
      setSelectedOrphanNames(new Set());
      addLog(`✅ 유령 이미지 ${successCount}개 삭제 완료.`);
    } catch (err: any) {
      addLog(`❌ 일괄 삭제 중 일부 오류가 발생했습니다.`);
    } finally {
      setIsScanningOrphans(false);
    }
  };

  const scanOrphanedImages = async () => {
    if (!auth.currentUser) return;
    setIsScanningOrphans(true);
    setSelectedOrphanNames(new Set());
    addLog("👻 스토리지에서 유령 이미지 탐색을 시작합니다...");
    try {
      const dbImageNames = new Set<string>();
      (sunoTracks || []).forEach(t => {
        if (t.generatedImages) {
          t.generatedImages.forEach((img: any) => {
            if (img.url) {
              // URL에서 파일명 추출 (토큰 변화 무시)
              const match = img.url.match(/\/images%2F(.*?)\?/);
              if (match && match[1]) dbImageNames.add(decodeURIComponent(match[1]));
            }
          });
        }
      });

      const storageRef = ref(storage, `users/${auth.currentUser?.uid}/images`);
      const res = await listAll(storageRef);
      const orphans: { name: string, url: string }[] = [];

      for (const item of res.items) {
        if (!dbImageNames.has(item.name)) {
          const url = await getDownloadURL(item);
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

  const downloadOrphanedImage = async (url: string, name: string) => {
    addLog(`📥 다운로드 시도: ${name}`);
    try {
      // 1. Firebase getBlob 시도
      const itemRef = ref(storage, `users/${auth.currentUser?.uid}/images/${name}`);
      const blob = await getBlob(itemRef);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      addLog(`✅ 직접 다운로드 완료: ${name}`);
    } catch (err: any) {
      // 2. 실패 시 안내 및 새 창 열기
      addLog(`⚠️ 서버 보안 설정(CORS)으로 인해 직접 다운로드가 제한되었습니다.`);
      addLog(`💡 새 창이 뜨면 '우클릭 > 이미지를 다른 이름으로 저장'을 눌러주세요.`);
      window.open(url, '_blank');
    }
  };

  const loadHistoryItem = (track: any) => {
    if (!track.generatedImages || track.generatedImages.length === 0) {
      addLog("⚠️ 해당 히스토리에 저장된 이미지가 없습니다.");
      return;
    }

    setWorkflow(prev => ({
      ...prev,
      params: {
        ...prev.params,
        title: track.title,
        koreanTitle: track.title.split('_')[0] || track.title,
        englishTitle: track.title.split('_')[1] || "",
        lyrics: track.lyrics || prev.params.lyrics,
        englishLyrics: track.englishLyrics || prev.params.englishLyrics
      },
      results: {
        ...prev.results,
        images: track.generatedImages,
        lyrics: track.lyrics || prev.results.lyrics,
        englishLyrics: track.englishLyrics || prev.results.englishLyrics
      },
      imageSettings: track.imageSettings || prev.imageSettings
    }));
    addLog(`🔄 [${track.title}] 히스토리 데이터를 현재 작업창으로 불러왔습니다.`);
  };

  const deleteTrackHistory = async (e: React.MouseEvent, track: any) => {
    e.stopPropagation(); // 카드 클릭 이벤트(불러오기) 방지
    if (!auth.currentUser) return;
    if (!confirm(`[${track.title}] 작업을 정말 삭제하시겠습니까?\n이 곡과 관련된 모든 생성 이미지와 데이터가 영구 삭제됩니다.`)) return;

    try {
      addLog(`🗑️ [${track.title}] 데이터 및 스토리지 파일 삭제 시작...`);

      // 1. 스토리지 파일 삭제
      if (track.generatedImages && track.generatedImages.length > 0) {
        for (const img of track.generatedImages) {
          if (img.url) {
            // URL에서 파일명 추출
            const match = img.url.match(/\/images%2F(.*?)\?/);
            if (match && match[1]) {
              const fileName = decodeURIComponent(match[1]);
              const itemRef = ref(storage, `users/${auth.currentUser.uid}/images/${fileName}`);
              await deleteObject(itemRef).catch(e => console.warn("File already deleted or not found:", fileName));
            }
          }
        }
      }

      // 2. DB(sunoTracks)에서 삭제 (App.tsx의 상태 업데이트 필요)
      setSunoTracks(prev => prev.filter(t => t.id !== track.id));

      // 3. Firestore 삭제 로직 (필요 시 App.tsx에서 전달받은 deleteTrack 함수 사용 가능)
      // 현재는 setSunoTracks를 통해 상위 상태를 업데이트하여 간접 반영

      addLog(`✅ [${track.title}] 히스토리 및 관련 파일 삭제 완료.`);
    } catch (err: any) {
      addLog(`❌ 삭제 중 오류 발생: ${err.message}`);
    }
  };

  // [v1.15.28] Filtered tracks: Strict criteria (must have generated images to show in ImageTab)
  const filteredTracks = React.useMemo(() => {
    return (sunoTracks || [])
      .filter(t => (t.title || t.koreanTitle) && t.generatedImages && t.generatedImages.length > 0)
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [sunoTracks]);

  return (
    <motion.div key="image" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">이미지 생성</h1>
          <p className="text-gray-400">수노(Suno) 음원을 업로드하여 AI가 곡의 분위기를 분석하고 이미지를 생성합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* AI 분석 엔진 선택 */}
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black text-primary/50 uppercase tracking-tighter mr-1">분석:</span>
            <select
              value={aiEngine}
              onChange={(e) => setAiEngine(e.target.value)}
              className="bg-transparent text-[10px] text-white outline-none cursor-pointer font-bold max-w-[150px]"
            >
              {AI_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                  {eng.label} ({eng.type === 'paid' ? '유료' : '무료'})
                </option>
              ))}
            </select>
          </div>

          {/* 이미지 생성 엔진 선택 */}
          <div className="flex items-center gap-2 bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 shadow-[0_0_10px_rgba(0,255,163,0.1)]">
            <ImageIcon className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-black text-primary/50 uppercase tracking-tighter mr-1">이미지:</span>
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

          {/* Compact Single Row Layout (Optimized Width & Height) */}
          <div className="flex items-stretch gap-2 h-[38px]">
            {/* Audio Upload (Optimized Width) */}
            <div className="relative group w-[220px] shrink-0">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className={cn(
                "w-full h-full px-2.5 border border-dashed rounded-xl flex items-center gap-2 transition-all relative overflow-hidden",
                workflow.results.audioFile ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/10 hover:border-primary/50"
              )}>
                {/* Analysis Progress Bar Overlay */}
                {workflow.progress.audioAnalysis > 0 && workflow.progress.audioAnalysis < 100 && (
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
                    style={{ width: `${workflow.progress.audioAnalysis}%` }}
                  />
                )}

                <Music className={cn("w-3.5 h-3.5 shrink-0", workflow.results.audioFile ? "text-primary" : "text-gray-500")} />
                <div className="overflow-hidden">
                  <p className="text-[9px] font-bold text-white truncate leading-tight">
                    {workflow.progress.audioAnalysis > 0 && workflow.progress.audioAnalysis < 100
                      ? `분석 중... ${workflow.progress.audioAnalysis}%`
                      : (workflow.results.audioFile ? (workflow.results.audioFile.name || 'Suno Audio') : '음원 업로드')}
                  </p>
                  <p className="text-[7px] text-gray-500 uppercase tracking-tighter">
                    {workflow.progress.audioAnalysis > 0 && workflow.progress.audioAnalysis < 100 ? 'AI Analyzing' : 'Suno Track'}
                  </p>
                </div>
              </div>
            </div>

            {/* Image Uploads (Flexible) */}
            <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
              {['main', 'tiktok', ...Array.from({ length: shortsCount }).map((_, i) => `shorts_${i + 1}`)].map(type => {
                const uploadedImg = workflow.results.images?.find((img: any) =>
                  (type === 'main' && (img.label === '메인 이미지' || img.label === '메인')) ||
                  (type === 'tiktok' && (img.label === '틱톡/릴스 이미지' || img.label === '틱톡')) ||
                  (type.startsWith('shorts') && img.label === `숏츠 이미지 ${type.split('_')[1]}`)
                );
                const label = type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `쇼츠${type.split('_')[1] || ''}`;

                return (
                  <div key={type} className="relative group w-[64px] shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSingleImageUpload(type, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <button className={cn(
                      "w-full h-full border rounded-xl transition-all flex flex-col items-center justify-center gap-0 px-1 leading-none",
                      uploadedImg
                        ? "bg-secondary/10 border-secondary/40 text-secondary shadow-[0_0_10px_rgba(0,255,163,0.1)]"
                        : "bg-white/5 border-white/10 text-gray-500 hover:border-secondary/50"
                    )}>
                      {uploadedImg ? (
                        <div className="flex flex-col items-center gap-0">
                          <Check className="w-2 h-2 text-secondary" />
                          <span className="text-[7px] font-black truncate w-[56px] text-center uppercase tracking-tighter">
                            {uploadedImg.fileName || label}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0 leading-none">
                          <Upload className="w-2 h-2 text-gray-600" />
                          <span className="text-[7px] font-black uppercase tracking-tighter">{label}</span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
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
                            main: newSettings,
                            tiktok: newSettings // 메인 설정 변경 시 틱톡도 동시에 업데이트
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
          <div className="flex justify-center items-center gap-4">
            <button
              onClick={() => saveCurrentImagesToCloud(setSunoTracks)}
              disabled={workflow.results.images.length === 0}
              className={cn(
                "px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 border",
                workflow.results.images.length > 0
                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                  : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
              )}
            >
              <Database className="w-5 h-5" />
              현재 생성된 이미지 클라우드 DB 저장
            </button>
            <button onClick={() => handleTabChange('video')} className="bg-white text-background px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              다음 단계: 영상 렌더링 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 곡 생성 히스토리 (SLIM LIST 스타일 통일) */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-bold text-[11px] text-gray-400 flex items-center gap-2 uppercase tracking-tight">
            <Database className="w-3.5 h-3.5 text-primary" /> 이미지 생성 히스토리 (SLIM LIST)
          </h4>
          <span className="text-[9px] text-gray-600 font-medium">통합 히스토리</span>
        </div>

        {filteredTracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {filteredTracks.slice(0, 16).map((track, idx) => (
              <div
                key={track.id || `track-${idx}`}
                onClick={() => loadHistoryItem(track)}
                className="group cursor-pointer flex items-center justify-between bg-black/20 hover:bg-white/5 border-l-2 border-transparent hover:border-primary transition-all pr-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 py-1.5 pl-3">
                  <span className="text-[9px] font-bold text-primary/40 group-hover:text-primary transition-colors w-3">{idx + 1}</span>
                  <p className="text-[11px] font-bold text-white/90 truncate tracking-tight">
                    {track.title || track.koreanTitle} <span className="text-primary/60 font-medium ml-1">[{track.generatedImages?.length || 0}]</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 h-full">
                  <span className="text-[8px] text-gray-600 font-medium">{new Date(track.created_at || track.createdAt).toLocaleDateString().replace(/\. /g, '.')}</span>
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
            <p className="text-xs text-gray-500 font-medium">히스토리가 비어 있습니다. 이미지를 생성해 보세요!</p>
          </div>
        )}
      </div>

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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 py-2 bg-black/20 rounded-xl border border-white/5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={toggleAllOrphans}
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-all",
                    selectedOrphanNames.size === orphanedImages.length ? "bg-red-500 border-red-500 text-white" : "border-white/20 bg-white/5 group-hover:border-red-500/50"
                  )}
                >
                  {selectedOrphanNames.size === orphanedImages.length && <Check className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-bold text-gray-400">전체 선택 ({selectedOrphanNames.size}/{orphanedImages.length})</span>
              </label>

              {selectedOrphanNames.size > 0 && (
                <button
                  onClick={deleteSelectedOrphans}
                  className="bg-red-500 text-white px-4 py-1.5 rounded-lg font-black text-xs flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  선택한 {selectedOrphanNames.size}개 일괄 삭제
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {orphanedImages.map((img, i) => (
                <div
                  key={i}
                  onClick={() => toggleOrphanSelection(img.name)}
                  className={cn(
                    "relative group rounded-xl overflow-hidden aspect-square border transition-all cursor-pointer",
                    selectedOrphanNames.has(img.name) ? "border-red-500 ring-2 ring-red-500/20" : "border-white/10 bg-black/60"
                  )}
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />

                  {/* Individual Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center transition-all backdrop-blur-sm",
                      selectedOrphanNames.has(img.name) ? "bg-red-500 border-red-500 text-white" : "border-white/40 bg-black/40 text-transparent"
                    )}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadOrphanedImage(img.url, img.name); }}
                      className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md"
                      title="이미지 다운로드"
                    >
                      <DownloadCloud className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOrphanedImage(img.name, img.url); }}
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
          </div>
        )}
      </GlassCard>

      <Terminal logs={logs} />
    </motion.div>
  );
};
