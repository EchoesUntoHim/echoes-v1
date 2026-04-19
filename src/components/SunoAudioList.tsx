import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Play, Pause, ChevronRight, Music, Save, AlertCircle, Trash2, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Terminal } from './Terminal';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

export interface SunoTrack {
    id: string;
    title: string;
    image_url: string;
    audio_url: string;
    video_url: string;
    metadata: {
        tags: string;
        prompt: string;
        type: string;
    };
    created_at: string;
    status: string;
}

interface SunoAudioListProps {
    workflow: any;
    setWorkflow: React.Dispatch<React.SetStateAction<any>>;
    addLog: (msg: string) => void;
    logs: string[];
    apiKey: string;
    aiEngine: string;
    analyzeAudioComprehensively: (file: File) => Promise<any>;
    user: User | null;
    tracks: SunoTrack[];
    setTracks: React.Dispatch<React.SetStateAction<SunoTrack[]>>;
}

export const SunoAudioList = ({ 
    workflow, 
    setWorkflow, 
    addLog, 
    logs, 
    apiKey, 
    aiEngine,
    analyzeAudioComprehensively,
    user,
    tracks,
    setTracks
}: SunoAudioListProps) => {
    const [jsonInput, setJsonInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // UI State
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    
    // Player State
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

        // But we keep it for now or remove it if not used.
    };

    // Player event listeners
    useEffect(() => {
        if (audioElement) {
            const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime);
            const handleLoadedMetadata = () => setDuration(audioElement.duration);
            const handleEnded = () => {
                setIsPlaying(false);
                // Play next track automatically
                const currentIndex = tracks.findIndex(t => t.id === playingTrackId);
                if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
                    handlePlayToggle(tracks[currentIndex + 1]);
                } else {
                    setPlayingTrackId(null);
                }
            };
            const handlePlayEvent = () => setIsPlaying(true);
            const handlePauseEvent = () => setIsPlaying(false);

            audioElement.addEventListener('timeupdate', handleTimeUpdate);
            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            audioElement.addEventListener('ended', handleEnded);
            audioElement.addEventListener('play', handlePlayEvent);
            audioElement.addEventListener('pause', handlePauseEvent);

            return () => {
                audioElement.removeEventListener('timeupdate', handleTimeUpdate);
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audioElement.removeEventListener('ended', handleEnded);
                audioElement.removeEventListener('play', handlePlayEvent);
                audioElement.removeEventListener('pause', handlePauseEvent);
            };
        }
    }, [audioElement, tracks, playingTrackId]);

    const handlePlayToggle = (track: SunoTrack) => {
        if (playingTrackId === track.id) {
            if (isPlaying) {
                audioElement?.pause();
            } else {
                audioElement?.play();
            }
            return;
        }

        if (audioElement) {
            audioElement.pause();
            audioElement.src = '';
        }

        const newAudio = new Audio(track.audio_url);
        newAudio.play();
        setAudioElement(newAudio);
        setPlayingTrackId(track.id);
        setIsPlaying(true);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        setCurrentTime(time);
        if (audioElement) {
            audioElement.currentTime = time;
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('이 곡을 목록에서 삭제하시겠습니까?')) {
            setTracks(prev => prev.filter(t => t.id !== id));
            addLog("🗑️ 곡이 목록에서 삭제되었습니다.");
            if (selectedTrackId === id) setSelectedTrackId(null);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        if (confirm(`선택한 ${selectedIds.size}곡을 목록에서 삭제하시겠습니까?`)) {
            setTracks(prev => prev.filter(t => !selectedIds.has(t.id)));
            setSelectedIds(new Set());
            addLog(`🗑️ 선택한 ${selectedIds.size}곡이 삭제되었습니다.`);
        }
    };

    const handleClearAll = () => {
        if (tracks.length === 0) return;
        if (confirm('정말로 모든 곡 목록을 삭제하시겠습니까? (수노 사이트의 원본은 유지됩니다)')) {
            setTracks([]);
            setSelectedIds(new Set());
            addLog("🗑️ 전체 곡 목록이 초기화되었습니다.");
        }
    };

    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === tracks.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tracks.map(t => t.id)));
        }
    };

    const analyzeSunoTrack = async (track: SunoTrack) => {
        if (!apiKey) {
            addLog("⚠️ API 키가 설정되어 있지 않습니다. 설정에서 키를 먼저 입력해주세요.");
            return null;
        }

        try {
            setIsAnalyzing(true);
            addLog(`📝 [${track.title}] 곡의 가사를 분석하고 영어 번역을 생성하는 중...`);
            
            const ai = new GoogleGenAI({ apiKey });
            const model = aiEngine;

            const prompt = `
                Suno AI에서 생성된 다음 곡 정보를 바탕으로, 우리 앱의 워크플로우에 필요한 데이터를 생성해주세요.
                
                [Suno 데이터]
                - 제목: ${track.title}
                - 태그/스타일: ${track.metadata?.tags}
                - 가사: ${track.metadata?.prompt}

                [요구사항]
                1. 제목: 한국어제목_영어제목 형식으로 만드세요. (예: "기적_Miracle")
                2. 영어 가사: 한국어 가사와 1:1 라인 매칭이 되도록 영어로 번역하세요. 
                   - [Verse], [Chorus] 등의 섹션 구분자를 반드시 포함하세요.
                   - 한국어 가사 한 줄당 영어 가사 한 줄이 나오도록 정확히 매칭하세요.
                3. 곡 분석: 이 곡의 분위기(Mood), 장르, 그리고 예상되는 BPM과 Key를 추측해서 작성하세요.

                Response Format (JSON):
                {
                  "finalTitle": "한글제목_EnglishTitle",
                  "englishLyrics": "Full English translation with line-by-line mapping",
                  "mood": "분위기",
                  "bpm": 120,
                  "key": "C Major",
                  "intent": "곡에 대한 짧은 해석 (한국어)"
                }
            `;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const text = response.text;
            if (!text) throw new Error("AI 응답이 없습니다.");
            
            // Clean JSON
            const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            const analysis = JSON.parse(cleanedText);
            
            addLog(`✅ 분석 완료: [${analysis.finalTitle}]`);
            return analysis;
        } catch (error: any) {
            console.error("Analysis Error:", error);
            addLog(`❌ 분석 실패: ${error.message}`);
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const importFromJson = async (replaceExisting: boolean = false) => {
        if (!jsonInput.trim()) {
            addLog("⚠️ Suno 데이터를 먼저 붙여넣어주세요.");
            return;
        }
        
        setIsLoading(true);
        try {
            let data = JSON.parse(jsonInput);
            
            // Deep search to find the array of tracks regardless of Suno's wrapper format
            const findArray = (obj: any): any[] | null => {
                if (Array.isArray(obj)) {
                    if (obj.length > 0 && obj[0].id) return obj; // Looks like tracks
                } else if (obj && typeof obj === 'object') {
                    for (const key of Object.keys(obj)) {
                        const res = findArray(obj[key]);
                        if (res) return res;
                    }
                }
                return null;
            };

            const foundArray = findArray(data);
            if (foundArray) data = foundArray;
            if (Array.isArray(data)) {
                const validTracks = data.filter(t => t.audio_url);
                setJsonInput('');
                
                if (replaceExisting) {
                    setTracks(validTracks);
                    addLog(`🔄 리스트 전체 동기화 완료! (${validTracks.length}곡으로 교체되었습니다.)`);
                } else {
                    setTracks(prev => {
                        const updatedTracks = [...prev];
                        let added = 0;
                        let updated = 0;

                        validTracks.forEach(track => {
                            const existingIndex = updatedTracks.findIndex(t => t.id === track.id);
                            if (existingIndex !== -1) {
                                updatedTracks[existingIndex] = { ...updatedTracks[existingIndex], ...track };
                                updated++;
                            } else {
                                updatedTracks.push(track);
                                added++;
                            }
                        });
                        
                        addLog(`✅ Suno 데이터 추가 완료! (신규 ${added}곡 추가, 기존 ${updated}곡 업데이트)`);
                        return updatedTracks;
                    });
                }
                
                if (validTracks.length > 0 && !selectedTrackId) {
                    setSelectedTrackId(validTracks[0].id);
                }
            } else {
                throw new Error("Suno API 응답 형식이 올바르지 않습니다. (배열 형태가 아님)");
            }
        } catch (error: any) {
            console.error("Error parsing Suno JSON:", error);
            addLog(`❌ 데이터를 분석하는데 실패했습니다. 텍스트를 정확히 복사했는지 확인해주세요. (에러: ${error.message})`);
        } finally {
            setIsLoading(false);
        }
    };

    const sendToWorkspace = async (track: SunoTrack) => {
        setIsAnalyzing(true);
        
        // 0. Parse Target and Clean Title
        const rawTitle = track.title || 'Untitled';
        let target: '대중음악' | 'CCM' = '대중음악';
        if (rawTitle.includes('[CCM]')) target = 'CCM';
        else if (rawTitle.includes('[대중음악]')) target = '대중음악';
        
        const cleanTitle = rawTitle.replace(/\[CCM\]|\[대중음악\]/g, '').trim();
        addLog(`🔄 [${cleanTitle}] (${target}) 곡 분석 및 싱크 정보 생성 중...`);
        
        try {
            // 1. Fetch audio via proxy to bypass CORS
            let proxyUrl = track.audio_url;
            if (proxyUrl.includes('cdn1.suno.ai')) {
                proxyUrl = proxyUrl.replace('https://cdn1.suno.ai', '/suno-cdn');
            } else if (proxyUrl.includes('audiopipe.suno.ai')) {
                proxyUrl = proxyUrl.replace('https://audiopipe.suno.ai', '/suno-pipe');
            }

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("음원 파일을 가져오는데 실패했습니다.");
            
            const blob = await response.blob();
            // Use clean title for the file name
            const file = new File([blob], `${cleanTitle}.mp3`, { type: "audio/mp3" });

            // 2. Call the comprehensive analyzer (Gemini)
            // This will handle lyrics, translation, and timestamps!
            // Pass the original lyrics (prompt) to improve sync accuracy
            await analyzeAudioComprehensively(file, { 
                referenceLyrics: track.metadata?.prompt 
            });
            
            // 3. Post-process: Set the correct target and cleaned titles
            const [kTitle, eTitle] = cleanTitle.includes('_') ? cleanTitle.split('_') : [cleanTitle, ''];
            
            setWorkflow((prev: any) => ({
                ...prev,
                params: {
                    ...prev.params,
                    target: target,
                    title: cleanTitle,
                    koreanTitle: kTitle.trim(),
                    englishTitle: eTitle.trim()
                },
                results: {
                    ...prev.results,
                    title: cleanTitle
                }
            }));

            addLog(`✨ [${cleanTitle}] 분석 완료 및 워크스페이스(${target}) 설정 완료.`);

        } catch (error: any) {
            console.error("Analysis/Sync Error:", error);
            addLog(`⚠️ 음원 직접 분석에 실패했습니다. (텍스트 분석으로 전환합니다)`);
            
            // Fallback to text-only analysis
            const analysis = await analyzeSunoTrack(track);
            const finalTitle = analysis?.finalTitle || cleanTitle;
            const [kTitle, eTitle] = finalTitle.includes('_') ? finalTitle.split('_') : [finalTitle, ''];

            setWorkflow((prev: any) => ({
                ...prev,
                params: {
                    ...prev.params,
                    target: target,
                    title: finalTitle,
                    koreanTitle: kTitle,
                    englishTitle: eTitle
                },
                results: {
                    ...prev.results,
                    audioFile: track.audio_url,
                    title: finalTitle,
                    lyrics: track.metadata?.prompt || '가사 정보 없음',
                    englishLyrics: analysis?.englishLyrics || '',
                    intent: analysis?.intent || ''
                }
            }));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const m = Math.floor(time / 60);
        const s = Math.floor(time % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const selectedTrack = tracks.find(t => t.id === selectedTrackId);
    const playingTrack = tracks.find(t => t.id === playingTrackId);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-7xl mx-auto space-y-6 ${playingTrack ? 'pb-24' : ''}`}
        >
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Suno 음원 리스트</h1>
                    <p className="text-gray-400">Suno에서 생성한 내 곡들을 일괄로 가져와 바로 작업할 수 있습니다.</p>
                </div>
            </header>

            {/* Input Section */}
            <GlassCard className="p-6 border-primary/20 bg-primary/5">
                <div className="mb-4 p-4 bg-black/40 rounded-xl border border-white/10 text-sm text-gray-300 space-y-2">
                    <p className="font-bold text-white flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        수동 복사 방식으로 곡을 추가하세요 (가져온 곡은 어차피 Suno에 있으므로 지워도 무방합니다):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-1 leading-relaxed">
                        <li><a href="https://suno.com" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">suno.com</a> 에 접속하여 로그인합니다.</li>
                        <li>키보드의 <kbd className="bg-white/20 px-1 rounded">F12</kbd>를 눌러 개발자 도구를 열고 <strong>Network(네트워크)</strong> 탭을 클릭합니다.</li>
                        <li>네트워크 목록에 나타난 <strong>v3</strong> (또는 feed 관련) 항목 중 하나를 클릭합니다.</li>
                        <li>우측 창에서 <strong>Response (응답)</strong> 탭을 누르고, 텍스트(JSON)를 모두 복사(Ctrl+A, Ctrl+C)하여 아래에 붙여넣으세요.</li>
                    </ol>
                    <p className="text-primary font-bold mt-2 text-xs">
                        * 팁: 스크롤을 내려서 다른 v3 항목을 여러 번 복사해 붙여넣으시면 곡이 계속 누적 추가됩니다!
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="이곳에 복사한 텍스트를 붙여넣으세요..."
                        className="w-full h-16 bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none font-mono custom-scrollbar"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => importFromJson(false)}
                            disabled={!jsonInput || isLoading}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            새 곡만 추가
                        </button>
                        <button 
                            onClick={() => importFromJson(true)}
                            disabled={!jsonInput || isLoading}
                            className="flex-1 bg-primary text-background py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            전체 동기화 (목록 교체)
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Split View */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
                {/* Left: List View */}
                <GlassCard className="flex-[3] p-4 flex flex-col max-h-[700px]">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={tracks.length > 0 && selectedIds.size === tracks.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary"
                            />
                            <h3 className="font-bold text-lg">내 곡 목록 <span className="text-gray-500 text-sm font-normal ml-2">{tracks.length}곡</span></h3>
                        </div>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button 
                                    onClick={handleDeleteSelected}
                                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    선택 삭제 ({selectedIds.size})
                                </button>
                            )}
                            <button 
                                onClick={handleClearAll}
                                className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
                            >
                                전체 삭제
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
                        <AnimatePresence>
                            {tracks.map(track => (
                                <motion.div 
                                    key={track.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0, margin: 0, overflow: 'hidden' }}
                                    onClick={() => setSelectedTrackId(track.id)}
                                    className={`flex items-center gap-4 p-2 rounded-xl cursor-pointer group transition-all ${selectedTrackId === track.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    {/* Checkbox */}
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.has(track.id)}
                                        onClick={(e) => toggleSelect(e, track.id)}
                                        onChange={() => {}} // Controlled by onClick for better event handling
                                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary ml-2 cursor-pointer"
                                    />

                                    {/* Thumbnail */}
                                    <div 
                                        className="w-12 h-12 relative rounded-md overflow-hidden bg-black/40 flex-shrink-0 cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); handlePlayToggle(track); }}
                                    >
                                        {track.image_url ? (
                                            <img src={track.image_url} alt="cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6 text-gray-600" /></div>
                                        )}
                                        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${playingTrackId === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {playingTrackId === track.id && isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate" title={track.title || 'Untitled'}>{track.title || 'Untitled'}</h4>
                                        <p className="text-xs text-gray-400 truncate">{new Date(track.created_at).toLocaleDateString()} • {track.status}</p>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => handleDelete(e, track.id)}
                                        className="w-8 h-8 rounded-full text-red-400 hover:bg-red-400/20 hover:text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                        title="목록에서 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {tracks.length > 0 && (
                            <div className="py-6 mt-4 border-t border-white/5 text-center">
                                <p className="text-xs text-primary/60 font-mono tracking-widest uppercase">
                                    Total {tracks.length} Tracks Syncing...
                                </p>
                            </div>
                        )}
                        {tracks.length === 0 && !isLoading && (
                            <div className="py-20 text-center text-gray-500">
                                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>곡 목록이 비어있습니다.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Right: Detail View */}
                <GlassCard className="flex-[2] p-6 flex flex-col h-[700px] sticky top-8">
                    {selectedTrack ? (
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={selectedTrack.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-6">
                                    <div className="w-48 h-48 mx-auto rounded-2xl overflow-hidden shadow-2xl mb-4 relative group">
                                        {selectedTrack.image_url ? (
                                            <img src={selectedTrack.image_url} alt="cover" className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-black/40 flex items-center justify-center"><Music className="w-16 h-16 text-gray-600" /></div>
                                        )}
                                        <div 
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm"
                                            onClick={() => handlePlayToggle(selectedTrack)}
                                        >
                                            {playingTrackId === selectedTrack.id && isPlaying ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white ml-2" />}
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-black text-white px-4 truncate" title={selectedTrack.title}>{selectedTrack.title || 'Untitled'}</h2>
                                </div>

                                <button
                                    onClick={() => sendToWorkspace(selectedTrack)}
                                    disabled={isAnalyzing}
                                    className="w-full bg-primary hover:bg-primary/80 text-background font-black py-4 rounded-xl mb-6 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] transition-all flex justify-center items-center gap-2 hover:-translate-y-1 disabled:opacity-50"
                                >
                                    {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : null}
                                    {isAnalyzing ? 'AI 분석 중...' : '작업 공간으로 보내기'} 
                                    {!isAnalyzing && <ChevronRight className="w-5 h-5" />}
                                </button>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 bg-black/20 rounded-xl p-4 border border-white/5">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pb-2 border-b border-white/10">Lyrics</h4>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-loose font-medium">
                                        {selectedTrack.metadata?.prompt || <span className="text-gray-600 italic">가사 정보가 없습니다. (Instrumental 이거나 프롬프트 없음)</span>}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <Music className="w-16 h-16 opacity-20 mb-4" />
                            <p>좌측 리스트에서 곡을 선택하세요.</p>
                        </div>
                    )}
                </GlassCard>
            </div>

            <Terminal logs={logs} />

            {/* Global Bottom Player */}
            <AnimatePresence>
                {playingTrack && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 left-0 right-0 h-20 bg-black/95 backdrop-blur-3xl border-t border-white/10 z-50 flex items-center px-4 lg:px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
                    >
                        {/* Track Info */}
                        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 shadow-lg">
                                {playingTrack.image_url ? (
                                    <img src={playingTrack.image_url} alt="cover" className="w-full h-full object-cover" />
                                ) : (
                                    <Music className="w-6 h-6 text-gray-600 m-3" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-white text-xs truncate leading-tight mb-0.5">{playingTrack.title || 'Untitled'}</h4>
                                <p className="text-[10px] text-primary/70 truncate cursor-pointer hover:text-primary transition-colors font-medium" onClick={() => setSelectedTrackId(playingTrack.id)}>
                                    가사 보기
                                </p>
                            </div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex-1 max-w-xl mx-auto flex flex-col items-center justify-center px-4">
                            <div className="flex items-center gap-5 mb-1.5">
                                <button className="text-gray-500 hover:text-white transition-colors"><SkipBack className="w-4 h-4 fill-current" /></button>
                                <button 
                                    onClick={() => handlePlayToggle(playingTrack)}
                                    className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                                >
                                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                </button>
                                <button className="text-gray-500 hover:text-white transition-colors"><SkipForward className="w-4 h-4 fill-current" /></button>
                            </div>
                            
                            <div className="w-full flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                                <span className="w-8 text-right">{formatTime(currentTime)}</span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={duration || 100} 
                                        value={currentTime} 
                                        onChange={handleSeek}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-primary pointer-events-none group-hover:bg-white transition-colors"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    />
                                </div>
                                <span className="w-8">{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Volume/Extra */}
                        <div className="w-1/4 flex justify-end items-center gap-3 hidden md:flex">
                            <Volume2 className="w-4 h-4 text-gray-500" />
                            <div className="w-20 h-1 bg-white/10 rounded-full relative overflow-hidden group">
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.01"
                                    defaultValue="1"
                                    onChange={(e) => { if(audioElement) audioElement.volume = Number(e.target.value); }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="absolute top-0 left-0 h-full bg-gray-500 group-hover:bg-primary pointer-events-none w-full" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
