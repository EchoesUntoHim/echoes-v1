import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wand2, Music, Layers, Sliders, RefreshCw, Zap, Save, Upload, FileAudio, Mic, X, Play, Cpu, Music2, ChevronDown, Repeat, Pause, ListMusic, Download, Trash2 } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { GlassCard } from './GlassCard';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { GoogleGenAI, Modality } from "@google/genai";
import { AI_ENGINES, MUSIC_ENGINES, VOCAL_OPTIONS } from '../constants';
import { db, auth, OperationType, handleFirestoreError, uploadAudioToStorageSafe } from '../firebase';
import { addDoc, collection, onSnapshot, deleteDoc, doc, query, orderBy, Timestamp, where, serverTimestamp } from 'firebase/firestore';

import { saveVoiceToDB, loadVoiceFromDB, deleteVoiceFromDB } from '../utils/db';

export interface ArrangedTrack {
    id: string;
    title: string;
    mode: string;
    url: string;
    timestamp: number;
}

const KEY_OPTIONS = [
    'Original', 'C Major', 'C# Major', 'D Major', 'D# Major', 'E Major', 'F Major', 'F# Major', 'G Major', 'G# Major', 'A Major', 'A# Major', 'B Major',
    'A Minor', 'A# Minor', 'B Minor', 'C Minor', 'C# Minor', 'D Minor', 'D# Minor', 'E Minor', 'F Minor', 'F# Minor', 'G Minor', 'G# Minor'
];

/** Strip codecs etc.; do not rewrite audio/* to another container — API decodes by declared + actual bytes. */
function stripMimeParameters(mime: string): string {
    let cleaned = mime.split(';')[0].trim().toLowerCase();

    // Gemini API officially supports: audio/wav, audio/mp3, audio/mpeg, audio/aiff, audio/aac, audio/ogg, audio/flac.
    const supportedTypes = ['audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'];

    if (cleaned.includes('s16le') || cleaned === 'application/octet-stream' || cleaned.includes('wav')) {
        return 'audio/mp3';
    }

    if (!supportedTypes.includes(cleaned)) {
        return 'audio/mp3'; // Fallback to a universally accepted type for Gemini
    }

    return cleaned;
}

/** Use File.type as-is when present; if empty, infer only from extension. */
function getInlineMimeForUploadedFile(file: File): string {
    const primary = stripMimeParameters(file.type || '');
    if (primary && primary !== 'application/octet-stream') return primary;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const byExt: Record<string, string> = {
        mp3: 'audio/mpeg',
        mpeg: 'audio/mpeg',
        mp4: 'audio/mp4',
        m4a: 'audio/mp4',
        aac: 'audio/aac',
        wav: 'audio/wav',
        wave: 'audio/wav',
        webm: 'audio/webm',
        weba: 'audio/webm',
        ogg: 'audio/ogg',
        ogx: 'audio/ogg',
        flac: 'audio/flac',
        opus: 'audio/opus',
    };
    return byExt[ext] ?? primary;
}

/** Parse MIME from data URL header only; no s16le→wav or mpeg→mp3 remapping. */
function getInlineMimeFromDataUrlHeader(dataUrlHeader: string): string {
    const m = dataUrlHeader.match(/^data:([^;,]+)/);
    return m?.[1] ? stripMimeParameters(m[1]) : '';
}

interface ArrangementWorkspaceProps {
    workflow: any;
    setWorkflow: React.Dispatch<React.SetStateAction<any>>;
    addLog: (msg: string) => void;
    voiceReference: string | null;
    setVoiceReference: (ref: string | null) => void;
    voiceRefName: string;
    setVoiceRefName: (name: string) => void;
    apiKey: string;
    aiEngine: string;
    setAiEngine: (engine: string) => void;
    musicEngine: string;
    setMusicEngine: (engine: string) => void;
    handleGlobalAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    analyzeAudioComprehensively: (file: File, options?: { skipSync?: boolean }) => Promise<any>;
    logs: string[];
    availableModels?: { value: string, label: string, type?: string }[];
    fetchAvailableModels?: () => void;
}

export const ArrangementWorkspace = ({
    workflow,
    setWorkflow,
    addLog,
    voiceReference,
    setVoiceReference,
    voiceRefName,
    setVoiceRefName,
    apiKey,
    aiEngine,
    setAiEngine,
    musicEngine,
    setMusicEngine,
    handleGlobalAudioUpload,
    analyzeAudioComprehensively,
    logs,
    availableModels,
    fetchAvailableModels
}: ArrangementWorkspaceProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [arrangementPrompt, setArrangementPrompt] = useState('');
    const [instrumentLevels, setInstrumentLevels] = useState<Record<string, number>>({
        '보컬': 80, '피아노': 80, '베이스': 80, '기타': 80, '드럼': 80, '기타반주': 80
    });
    const [multiTracks, setMultiTracks] = useState<Record<string, { file: File | null, url: string | null }>>({
        '보컬': { file: null, url: null },
        '피아노': { file: null, url: null },
        '베이스': { file: null, url: null },
        '기타': { file: null, url: null },
        '드럼': { file: null, url: null },
        '기타반주': { file: null, url: null },
    });
    const multiAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const isGlobalAnalyzing = workflow.progress.audioAnalysis > 0 && workflow.progress.audioAnalysis < 100;
    const showAnalyzing = isAnalyzing || isGlobalAnalyzing;

    const [isTranslating, setIsTranslating] = useState(false);
    const [savedVoices, setSavedVoices] = useState<Record<string, { name: string, data: string }>>({});
    const activeWaveformInstRef = useRef<string | null>(null);

    const [arrangedTracks, setArrangedTracks] = useState<ArrangedTrack[]>([]);
    const [playingListTrackId, setPlayingListTrackId] = useState<string | null>(null);
    const listAudioRef = useRef<HTMLAudioElement>(null);

    // Local lyrics for the workspace
    const [localLyrics, setLocalLyrics] = useState<string>(workflow.results.lyrics || "");
    const [localEnglishLyrics, setLocalEnglishLyrics] = useState<string>(workflow.results.englishLyrics || "");

    useEffect(() => {
        if (workflow.results.lyrics && workflow.results.lyrics !== localLyrics) {
            setLocalLyrics(workflow.results.lyrics);
        }
        if (workflow.results.englishLyrics && workflow.results.englishLyrics !== localEnglishLyrics) {
            setLocalEnglishLyrics(workflow.results.englishLyrics);
        }
    }, [workflow.results.lyrics, workflow.results.englishLyrics]);

    useEffect(() => {
        // Load local storage first
        const local = localStorage.getItem('vibeflow_arranged_tracks');
        if (local) {
            setArrangedTracks(JSON.parse(local));
        }

        const user = auth.currentUser;
        if (user) {
            const q = query(
                collection(db, 'arranged_tracks'),
                where('uid', '==', user.uid),
                orderBy('timestamp', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const tracks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ArrangedTrack[];
                setArrangedTracks(tracks);
                localStorage.setItem('vibeflow_arranged_tracks', JSON.stringify(tracks));
            }, (error) => {
                handleFirestoreError(error, OperationType.GET, 'arranged_tracks');
            });

            return () => unsubscribe();
        }
    }, []);

    const saveArrangedTrack = async (blobUrl: string, blob: Blob | null, mode: string) => {
        const user = auth.currentUser;
        const trackId = Math.random().toString(36).substr(2, 9);
        let finalUrl = blobUrl;

        if (user && blob) {
            addLog("☁️ 클라우드 스토리지 데이터 백업 시도 중...");
            const cloudUrl = await uploadAudioToStorageSafe(blob, 'arranged');
            if (cloudUrl) {
                finalUrl = cloudUrl;
                addLog("✅ 클라우드 저장 성공! (URL 추출 완료)");
            } else {
                addLog("⚠️ 클라우드 설정이나 연결에 문제가 있어, 로컬 메모리에 백업합니다.");
            }
        }

        const track: ArrangedTrack = {
            id: trackId,
            title: workflow.results.title || 'Untitled Arrangement',
            mode,
            url: finalUrl,
            timestamp: Date.now()
        };

        if (user) {
            try {
                await addDoc(collection(db, 'arranged_tracks'), {
                    uid: user.uid,
                    title: track.title,
                    url: track.url,
                    mode: track.mode,
                    createdAt: serverTimestamp()
                });
            } catch (error: any) {
                console.warn("Firestore save failed, falling back to local storage:", error);
                const updatedTracks = [track, ...arrangedTracks];
                setArrangedTracks(updatedTracks);
                localStorage.setItem('vibeflow_arranged_tracks', JSON.stringify(updatedTracks));
            }
        } else {
            const updatedTracks = [track, ...arrangedTracks];
            setArrangedTracks(updatedTracks);
            localStorage.setItem('vibeflow_arranged_tracks', JSON.stringify(updatedTracks));
        }
    };

    const deleteArrangedTrack = async (id: string) => {
        const user = auth.currentUser;
        if (user) {
            try {
                await deleteDoc(doc(db, 'arranged_tracks', id));
            } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, `arranged_tracks/${id}`);
            }
        } else {
            const updatedTracks = arrangedTracks.filter(t => t.id !== id);
            setArrangedTracks(updatedTracks);
            localStorage.setItem('vibeflow_arranged_tracks', JSON.stringify(updatedTracks));
        }
    };

    const toggleListPlay = (track: ArrangedTrack) => {
        if (playingListTrackId === track.id) {
            if (listAudioRef.current) listAudioRef.current.pause();
            setPlayingListTrackId(null);
        } else {
            setPlayingListTrackId(track.id);
            if (listAudioRef.current) {
                listAudioRef.current.src = track.url;
                listAudioRef.current.play();
            }
        }
    };

    useEffect(() => {
        const loadVoices = async () => {
            const v1 = await loadVoiceFromDB('voice_1');
            const v2 = await loadVoiceFromDB('voice_2');
            const voices: Record<string, { name: string, data: string }> = {};
            if (v1) voices['voice_1'] = v1;
            if (v2) voices['voice_2'] = v2;
            setSavedVoices(voices);

            const lastUsed = localStorage.getItem('lastVoiceKey');
            if (lastUsed && voices[lastUsed]) {
                setVoiceReference(voices[lastUsed].data);
                setVoiceRefName(voices[lastUsed].name);
            }
        };
        loadVoices();
    }, []);

    const handleVoiceSelect = (key: string) => {
        const voice = savedVoices[key];
        if (voice) {
            setVoiceReference(voice.data);
            setVoiceRefName(voice.name);
            localStorage.setItem('lastVoiceKey', key);
            addLog(`🎙️ [${voice.name}] 목소리가 선택되었습니다.`);
        }
    };

    const [analysisResult, setAnalysisResult] = useState<{ bpm: number; key: string; energy: number } | null>(() => {
        const saved = localStorage.getItem('vibeflow_analysisResult');
        try { return saved ? JSON.parse(saved) : null; } catch { return null; }
    });

    useEffect(() => {
        if (analysisResult) {
            localStorage.setItem('vibeflow_analysisResult', JSON.stringify(analysisResult));
        } else {
            localStorage.removeItem('vibeflow_analysisResult');
        }
    }, [analysisResult]);

    useEffect(() => {
        if (workflow.results.audioFile) {
            loadVoiceFromDB('workspace_audio').then(async (saved) => {
                if (saved && saved.data) {
                    try {
                        const res = await fetch(saved.data);
                        const blob = await res.blob();
                        const file = new File([blob], saved.name || 'uploaded_audio.wav', { type: blob.type });
                        setUploadedFile(file);
                    } catch (err) {
                        console.error("Failed to restore workspace audio", err);
                    }
                }
            });
        } else {
            setUploadedFile(null);
        }
    }, [workflow.results.audioFile]);

    useEffect(() => {
        if (workflow.results.audioAnalysis) {
            setAnalysisResult({
                bpm: workflow.results.audioAnalysis.bpm,
                key: workflow.results.audioAnalysis.key || 'C Major',
                energy: workflow.results.audioAnalysis.energy
            });
        }
    }, [workflow.results.audioAnalysis]);

    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!workflow.results.lyrics || isAnalyzing) return;

        let isCancelled = false;

        if (translationTimeoutRef.current) {
            clearTimeout(translationTimeoutRef.current);
        }

        translationTimeoutRef.current = setTimeout(async () => {
            if (!apiKey || isCancelled) return;

            setIsTranslating(true);
            try {
                const currentKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
                if (!currentKey) return;
                const genAI = new GoogleGenAI({ apiKey: currentKey });

                const prompt = `다음 한글 가사를 영어로 번역해줘. 
        타임스탬프와 섹션 태그([00:00] [Intro] 등)는 그대로 유지해야 해.
        **가장 중요한 규칙**: 한글 가사의 줄 바꿈과 영어 번역의 줄 바꿈 위치가 완벽하게 일치해야 해. 
        한글이 5줄이면 영어도 반드시 5줄이어야 비디오 자막이 꼬이지 않아.
        가사 내용만 자연스럽고 시적인 영어로 번역해줘.
        번역된 결과물만 출력해줘.
        
        한글 가사:
        ${workflow.results.lyrics}`;

                const response = await genAI.models.generateContent({
                    model: aiEngine || "gemini-3.1-flash-lite-preview",
                    contents: prompt
                });

                if (isCancelled) return;
                const translatedText = response.text;
                setWorkflow(prev => ({
                    ...prev,
                    results: { ...prev.results, englishLyrics: translatedText }
                }));
            } catch (error: any) {
                if (error?.message?.includes('aborted') || error?.name === 'AbortError') return;
                console.error("Translation error:", error);
            } finally {
                if (!isCancelled) setIsTranslating(false);
            }
        }, 2000);

        return () => {
            isCancelled = true;
            if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
        };
    }, [workflow.results.lyrics, apiKey, isAnalyzing, aiEngine, setWorkflow]);

    useEffect(() => {
        if (!waveformRef.current) return;

        let targetAudio: File | Blob | string | null = uploadedFile;
        let targetInst: string | null = null;

        if (!targetAudio) {
            const entry = Object.entries(multiTracks).find(([_, t]) => (t as any).url !== null);
            if (entry) {
                targetInst = entry[0];
                targetAudio = (entry[1] as any).url;
            }
        }

        activeWaveformInstRef.current = targetInst;

        if (!targetAudio) {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
            return;
        }

        const ws = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#4F46E5',
            progressColor: '#818CF8',
            cursorColor: '#818CF8',
            barWidth: 2,
            barRadius: 3,
            height: 60,
            normalize: true
        });

        if (targetAudio instanceof File) {
            ws.loadBlob(targetAudio);
        } else {
            ws.load(targetAudio as string);
        }

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));

        wavesurferRef.current = ws;

        return () => {
            ws.destroy();
        };
    }, [uploadedFile, multiTracks]);

    useEffect(() => {
        Object.entries(instrumentLevels).forEach(([inst, level]) => {
            const audio = multiAudioRefs.current[inst];
            if (audio) {
                if (wavesurferRef.current && activeWaveformInstRef.current === inst) {
                    audio.volume = 0;
                } else {
                    audio.volume = (level as number) / 100;
                }
            }

            if (wavesurferRef.current && activeWaveformInstRef.current === inst) {
                wavesurferRef.current.setVolume((level as number) / 100);
            }
        });

        if (wavesurferRef.current && !activeWaveformInstRef.current) {
            const hasMultiTracks = Object.values(multiTracks).some((t: any) => t.url !== null);
            if (hasMultiTracks) {
                wavesurferRef.current.setVolume(0);
            } else {
                const allZero = Object.values(instrumentLevels).every(v => v === 0);
                wavesurferRef.current.setVolume(allZero ? 0 : 0.8);
            }
        }
    }, [instrumentLevels, multiTracks]);

    const handlePlay = () => {
        const isCurrentlyPlaying = isPlaying;
        const hasAnyMultiAudio = Object.values(multiAudioRefs.current).some(audio => audio !== null);
        const hasAnyMedia = hasAnyMultiAudio || wavesurferRef.current !== null || workflow.results.arrangedAudioUrl;

        if (!hasAnyMedia) return;

        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }

        Object.entries(multiAudioRefs.current).forEach(([inst, audio]) => {
            const audioElement = audio as HTMLAudioElement | null;
            if (audioElement) {
                if (isCurrentlyPlaying) {
                    audioElement.pause();
                } else {
                    if (wavesurferRef.current) {
                        audioElement.currentTime = wavesurferRef.current.getCurrentTime();
                    }
                    audioElement.play().catch(err => console.error(`Playback error for ${inst}:`, err));
                }
            }
        });

        if (!wavesurferRef.current && hasAnyMultiAudio) {
            setIsPlaying(!isCurrentlyPlaying);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFile(file);
        addLog(`📁 편곡용 음원 업로드: ${file.name}`);
        setLocalLyrics("음원 분석 중...");
        setLocalEnglishLyrics("Analyzing...");
        const result = await analyzeAudioComprehensively(file, { skipSync: true });
        if (result) {
            setAnalysisResult({
                bpm: result.bpm,
                key: result.key,
                energy: result.energy
            });
            if (result.lyrics) setLocalLyrics(result.lyrics);
            if (result.englishLyrics) setLocalEnglishLyrics(result.englishLyrics);
        }
    };

    const handleTrackUpload = async (inst: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setMultiTracks(prev => ({
                ...prev,
                [inst]: { file, url }
            }));
            addLog(`📁 멀티트랙 업로드 완료: ${inst} (${file.name})`);

            if (inst === '보컬') {
                addLog("🎤 보컬 트랙 분석을 시작합니다...");
                setLocalLyrics("보컬 트랙 분석 중...");
                setLocalEnglishLyrics("Analyzing vocal track...");
                const result = await analyzeAudioComprehensively(file, { skipSync: true });
                if (result) {
                    setAnalysisResult({
                        bpm: result.bpm,
                        key: result.key,
                        energy: result.energy
                    });
                    if (result.lyrics) setLocalLyrics(result.lyrics);
                    if (result.englishLyrics) setLocalEnglishLyrics(result.englishLyrics);
                }
            }
        }
    };

    const applyVoiceToVocalTrack = async () => {
        if (voiceReference) {
            try {
                const response = await fetch(voiceReference);
                const blob = await response.blob();
                const file = new File([blob], voiceRefName || "my_voice.wav", { type: blob.type });
                const url = URL.createObjectURL(file);

                setMultiTracks(prev => ({
                    ...prev,
                    ['보컬']: { file, url }
                }));

                addLog(`🎤 [내 목소리]를 보컬 트랙에 적용했습니다.`);
                setLocalLyrics("보컬 트랙 분석 중...");
                setLocalEnglishLyrics("Analyzing vocal track...");
                const result = await analyzeAudioComprehensively(file, { skipSync: true });
                if (result) {
                    setAnalysisResult({
                        bpm: result.bpm,
                        key: result.key,
                        energy: result.energy
                    });
                    if (result.lyrics) setLocalLyrics(result.lyrics);
                    if (result.englishLyrics) setLocalEnglishLyrics(result.englishLyrics);
                }
            } catch (error) {
                console.error("Error applying voice:", error);
                addLog("❌ 목소리 적용 중 오류가 발생했습니다.");
            }
        }
    };

    const removeTrack = (inst: string) => {
        const track = multiTracks[inst];
        if (track.url) {
            URL.revokeObjectURL(track.url);
        }
        setMultiTracks(prev => ({
            ...prev,
            [inst]: { file: null, url: null }
        }));
        addLog(`🗑️ 멀티트랙 삭제됨: ${inst}`);
    };

    const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>, slotKey?: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const data = reader.result as string;
                const name = file.name;

                if (slotKey) {
                    await saveVoiceToDB(slotKey, data, name);
                    setSavedVoices(prev => ({ ...prev, [slotKey]: { name, data } }));
                    setVoiceReference(data);
                    setVoiceRefName(name);
                    localStorage.setItem('lastVoiceKey', slotKey);
                    addLog(`🎙️ [${name}] 목소리가 ${slotKey === 'voice_1' ? '내 목소리 1' : '내 목소리 2'} 슬롯에 저장되었습니다.`);
                } else {
                    setVoiceReference(data);
                    setVoiceRefName(name);
                    addLog(`🎙️ 임시 목소리 레퍼런스 업로드 완료: ${name}`);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // =========================================================================
    // 🛑 완벽하게 수정된 handleArrange 함수 (테스트 모드 및 구조 호환 반영)
    // =========================================================================
    const handleArrange = async (mode: 'full' | 'vocal_only' = 'full') => {
        // 🚨 과금 방지용 테스트 모드 스위치 (true: 가짜 테스트, false: 진짜 과금) 🚨
        const IS_TEST_MODE = false;

        if (IS_TEST_MODE) {
            addLog("🛑 [무료 테스트 모드] 과금 없이 로직 및 Firebase 연동만 2초간 테스트합니다.");
            setIsProcessing(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const dummyBlob = new Blob(["dummy audio"], { type: "audio/mp3" });
                const dummyUrl = URL.createObjectURL(dummyBlob);

                setWorkflow((prev: any) => ({
                    ...prev,
                    results: { ...prev.results, arrangedAudioUrl: dummyUrl }
                }));

                await saveArrangedTrack(dummyUrl, dummyBlob, mode);
                addLog("✅ [무료 테스트 성공] 가짜 음원이 생성되고 리스트에 저장되었습니다!");
                addLog("💡 에러가 없다면, 코드의 'IS_TEST_MODE = false' 로 변경하고 짧은 mp3 파일로 테스트하세요.");
            } catch (e: any) {
                addLog(`❌ [테스트 실패] Firebase 저장 에러: ${e.message}`);
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        if (!apiKey) {
            addLog("⚠️ API 키가 필요합니다.");
            return;
        }

        setIsProcessing(true);
        addLog(mode === 'vocal_only' ? "🎙️ 보컬 교체 작업을 시작합니다..." : "🎹 AI 편곡 작업을 시작합니다...");
        addLog(`⚙️ 사용 엔진: ${musicEngine}`);

        try {
            const currentKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
            const ai = new GoogleGenAI({ apiKey: currentKey });

            // 1. 요청 데이터를 담을 parts 배열
            const requestParts: any[] = [
                {
                    text: `
          [ARRANGEMENT REQUEST]
          Mode: ${mode === 'vocal_only' ? 'VOCAL SWAP ONLY' : 'FULL ARRANGEMENT'}
          Prompt: ${arrangementPrompt || '전체적으로 세련되게 편곡해줘.'}
          Target Key: ${workflow.params.keyChange || 'Original'}
          Vocal Target: ${workflow.params.vocalSwap || 'Keep original'}
          
          [INSTRUCTIONS]
          Output ONLY the generated audio file. Do not output text. Ensure high audio quality.
        `}
            ];

            // 2. 원곡 데이터 첨부 (용량 경고 포함)
            if (uploadedFile) {
                addLog("📤 원곡 데이터를 전송 중...");
                const reader = new FileReader();
                const audioData = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(uploadedFile);
                });

                if (audioData.length > 20000000) {
                    addLog("⚠️ [경고] 원곡의 용량이 너무 큽니다! 구글 API 제한에 걸릴 수 있으니 짧은 mp3로 테스트하세요.");
                }

                let safeMimeType = getInlineMimeForUploadedFile(uploadedFile);
                const isLyria = (musicEngine || "lyria-3-pro-preview").toLowerCase().includes('lyria');

                if (isLyria && safeMimeType.includes('wav')) {
                    addLog("❌ Lyria 엔진은 WAV 형식의 원곡을 지원하지 않습니다. MP3 또는 M4A 형식으로 업로드해주세요.");
                    setIsProcessing(false);
                    return;
                }

                safeMimeType = safeMimeType && safeMimeType !== 'application/octet-stream' ? safeMimeType : 'audio/mp3';
                requestParts.push({
                    inlineData: {
                        data: audioData,
                        mimeType: safeMimeType && safeMimeType !== 'application/octet-stream' ? safeMimeType : 'audio/mp3'
                    }
                });
            }

            // 3. 목소리 레퍼런스 첨부
            if (voiceReference) {
                addLog("📤 목소리 레퍼런스 데이터를 전송 중...");
                const [header, data] = voiceReference.split(',');
                let mimeType = header.match(/:(.*?);/)?.[1] || "audio/wav";
                const isLyria = (musicEngine || "lyria-3-pro-preview").toLowerCase().includes('lyria');

                if (isLyria && mimeType.includes('wav')) {
                    addLog("❌ Lyria 엔진은 WAV 형식의 음성을 지원하지 않습니다. MP3 또는 M4A 형식으로 업로드해주세요.");
                    setIsProcessing(false);
                    return;
                }

                if (mimeType.includes('s16le') || mimeType.includes('wav')) {
                    mimeType = 'audio/wav';
                } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
                    mimeType = 'audio/mp3';
                }

                requestParts.push({
                    inlineData: {
                        data: data,
                        mimeType: mimeType
                    }
                });
            }

            addLog("⚡ AI가 음악을 생성 중입니다. (1~3분 소요될 수 있습니다...)");

            // 4. API 호출 (구조 수정 완료: { role: "user", parts: [...] })
            const response = await ai.models.generateContent({
                model: musicEngine || "lyria-3-pro-preview",
                contents: [{ role: "user", parts: requestParts }], // ⭐️ 이 부분이 돈낭비를 막는 핵심 규격입니다
                config: {
                    responseModalities: ["AUDIO"], // 오디오 반환 강제
                    temperature: 0.7
                }
            });

            let audioBase64 = "";
            let responseMimeType = "audio/mp3";

            addLog("⏳ AI 응답을 분석 중입니다...");

            const responseParts = response.candidates?.[0]?.content?.parts;
            if (responseParts) {
                for (const part of responseParts) {
                    if (part.text) {
                        addLog(`📝 [AI 응답]: ${part.text}`);
                    }
                    if (part.inlineData?.data) {
                        if (!audioBase64 && part.inlineData.mimeType) {
                            responseMimeType = part.inlineData.mimeType;
                        }
                        audioBase64 += part.inlineData.data;
                    }
                }
            }

            if (audioBase64) {
                addLog("📦 생성된 음원 데이터를 변환 중...");
                try {
                    let blob;
                    try {
                        const dataUrl = `data:${responseMimeType};base64,${audioBase64}`;
                        const res = await fetch(dataUrl);
                        blob = await res.blob();
                    } catch (fetchError) {
                        addLog("⚠️ 페치 변환 오류, 바이너리 파서로 전환 중...");
                        const binary = atob(audioBase64);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        blob = new Blob([bytes], { type: responseMimeType });
                    }

                    const url = URL.createObjectURL(blob);
                    addLog("✅ AI 편곡 완료! 저장 로직을 시작합니다.");

                    setWorkflow((prev: any) => ({
                        ...prev,
                        results: { ...prev.results, arrangedAudioUrl: url }
                    }));

                    try {
                        await saveArrangedTrack(url, blob, mode);
                    } catch (saveError) {
                        console.error("Firestore save failed:", saveError);
                        addLog("⚠️ 클라우드 저장에 실패했지만, 로컬에서 재생은 가능합니다.");
                    }

                } catch (convertError) {
                    console.error("Audio conversion error:", convertError);
                    addLog("❌ 생성된 오디오 변환 오류가 발생했습니다.");
                }
            } else {
                addLog("⚠️ API가 응답했으나 오디오 데이터가 없습니다. (원곡 용량 초과 또는 거절일 수 있습니다)");
            }
        } catch (error: any) {
            if (error?.message?.includes('aborted') || error?.name === 'AbortError') return;
            console.error("API Call Error:", error);
            addLog(`❌ API 오류 발생: ${error.message || String(error)}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            key="arrangement"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-8"
        >
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-2">AI 편곡 워크스페이스</h1>
                    <p className="text-gray-400">생성된 곡이나 업로드한 곡을 AI 프로듀서와 함께 다듬어보세요.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleArrange('vocal_only')}
                        disabled={isProcessing || (!uploadedFile && !voiceReference)}
                        className="bg-primary/20 text-primary border border-primary/30 px-6 py-3 rounded-xl font-bold hover:bg-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Repeat className="w-5 h-5" />}
                        보컬만 교체
                    </button>
                    <button
                        onClick={() => handleArrange('full')}
                        disabled={isProcessing}
                        className="bg-secondary text-white px-8 py-3 rounded-xl font-bold hover:neon-glow-secondary transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                        AI 전체 편곡
                    </button>
                </div>
            </header>

            {/* Engine Selection Bar */}
            <GlassCard className="py-4 px-6 border-white/10 bg-white/5">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Cpu className="w-4 h-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">분석 엔진 (AI)</p>
                            <select
                                value={aiEngine}
                                onChange={(e) => setAiEngine(e.target.value)}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-primary transition-colors"
                            >
                                {AI_ENGINES.map(eng => (
                                    <option key={eng.value} value={eng.value} className="bg-gray-900">
                                        {eng.label} {eng.type === 'paid' ? '(유료)' : '(무료)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Music2 className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">편곡 엔진 (Music)</p>
                            <select
                                value={musicEngine}
                                onChange={(e) => setMusicEngine(e.target.value)}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-secondary transition-colors"
                            >
                                {MUSIC_ENGINES.map(eng => (
                                    <option key={eng.value} value={eng.value} className="bg-gray-900">
                                        {eng.label} {eng.type === 'paid' ? '(유료)' : '(무료)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Zap className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">곡의 키(Key) 조절</p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={workflow.params.keyChange || 'Original'}
                                    onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, keyChange: e.target.value } }))}
                                    className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-orange-500 transition-colors"
                                >
                                    {KEY_OPTIONS.map(key => (
                                        <option key={key} value={key} className="bg-gray-900">{key}</option>
                                    ))}
                                </select>
                                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                                    <button
                                        onClick={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, genderKey: 'male' } }))}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all",
                                            workflow.params.genderKey === 'male' ? "bg-blue-500 text-white" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        남키
                                    </button>
                                    <button
                                        onClick={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, genderKey: 'female' } }))}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all",
                                            workflow.params.genderKey === 'female' ? "bg-pink-500 text-white" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        여키
                                    </button>
                                    <button
                                        onClick={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, genderKey: 'original' } }))}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] font-bold rounded-md transition-all",
                                            (!workflow.params.genderKey || workflow.params.genderKey === 'original') ? "bg-gray-500 text-white" : "text-gray-500 hover:text-white"
                                        )}
                                    >
                                        원키
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg">
                            <Mic className="w-4 h-4 text-pink-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">보컬 교체 타겟</p>
                            <select
                                value={workflow.params.vocalSwap || 'Keep original'}
                                onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, vocalSwap: e.target.value } }))}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer hover:text-pink-500 transition-colors"
                            >
                                <option value="Keep original" className="bg-gray-900">원본 유지</option>
                                <optgroup label="Male" className="bg-gray-900">
                                    {VOCAL_OPTIONS.Male.map(v => <option key={v} value={v}>{v}</option>)}
                                </optgroup>
                                <optgroup label="Female" className="bg-gray-900">
                                    {VOCAL_OPTIONS.Female.map(v => <option key={v} value={v}>{v}</option>)}
                                </optgroup>
                            </select>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Track Info & Analysis */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="border-primary/20 bg-primary/5">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-primary" />
                            편곡할 곡 업로드
                        </h3>
                        <div className="space-y-4">
                            <div className="relative group overflow-hidden rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors bg-black/20 p-6 text-center">
                                <input
                                    type="file"
                                    accept="audio/mp3,audio/wav,audio/mpeg"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                        <FileAudio className="w-6 h-6 text-primary" />
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {uploadedFile ? uploadedFile.name : 'Suno 생성 곡 또는 MP3/WAV 업로드'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(multiTracks).map(([inst, data]) => {
                                    const trackData = data as { file: File | null, url: string | null };
                                    return (
                                        <div key={inst} className="relative group overflow-hidden rounded-lg border border-white/10 hover:border-primary/50 transition-colors bg-black/40 p-2 text-center min-h-[60px] flex flex-col justify-center">
                                            {!trackData.url ? (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept="audio/*"
                                                        onChange={(e) => handleTrackUpload(inst, e)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className="space-y-1 z-0">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{inst}</p>
                                                        {inst === '보컬' && voiceReference ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); applyVoiceToVocalTrack(); }}
                                                                className="relative z-20 py-1 px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded text-[8px] font-bold transition-all flex items-center justify-center gap-1 mx-auto"
                                                            >
                                                                <Mic className="w-2 h-2" /> 내 목소리 사용
                                                            </button>
                                                        ) : (
                                                            <p className="text-[9px] text-gray-500 truncate px-1">
                                                                업로드
                                                            </p>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-1 z-0 relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeTrack(inst);
                                                        }}
                                                        className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors z-20"
                                                    >
                                                        <X className="w-2 h-2 text-white" />
                                                    </button>
                                                    <p className="text-[10px] font-bold text-primary uppercase">{inst}</p>
                                                    <p className="text-[9px] text-gray-300 truncate px-1">
                                                        {trackData.file?.name}
                                                    </p>
                                                    <audio
                                                        ref={el => { multiAudioRefs.current[inst] = el; }}
                                                        src={trackData.url}
                                                        className="hidden"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {uploadedFile && (
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-primary">파일 준비됨</span>
                                    <button
                                        onClick={() => {
                                            setUploadedFile(null);
                                            deleteVoiceFromDB('workspace_audio').catch(e => console.error(e));
                                        }}
                                        className="text-[10px] text-red-400 hover:underline"
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard className="border-primary/20 bg-primary/5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Mic className="w-5 h-5 text-primary" />
                                내 목소리 관리
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {['voice_1', 'voice_2'].map((key) => {
                                    const voice = savedVoices[key];
                                    const isSelected = voice && voice.data === voiceReference;
                                    return (
                                        <div
                                            key={key}
                                            className={cn(
                                                "p-3 rounded-xl border-2 transition-all relative group",
                                                isSelected ? "border-primary bg-primary/10" : "border-white/5 bg-black/40 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex flex-col gap-2 h-full">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                        {key === 'voice_1' ? '내 목소리 1' : '내 목소리 2'}
                                                    </span>
                                                    {voice && (
                                                        <button
                                                            onClick={() => {
                                                                deleteVoiceFromDB(key);
                                                                setSavedVoices(prev => {
                                                                    const newState = { ...prev };
                                                                    delete newState[key];
                                                                    return newState;
                                                                });
                                                                if (isSelected) {
                                                                    setVoiceReference(null);
                                                                    setVoiceRefName('');
                                                                }
                                                            }}
                                                            className="p-1 text-red-400 hover:text-red-500 transition-all bg-black/40 rounded-full"
                                                            title="삭제"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                {voice ? (
                                                    <div
                                                        className="flex-1 cursor-pointer"
                                                        onClick={() => handleVoiceSelect(key)}
                                                    >
                                                        <p className="text-xs font-bold truncate text-white">{voice.name}</p>
                                                        <div className="mt-2 text-[8px] bg-primary/20 text-primary px-2 py-0.5 rounded-full w-fit">
                                                            저장됨
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 relative flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg py-4 hover:border-primary/50 transition-colors cursor-pointer">
                                                        <input
                                                            type="file"
                                                            accept="audio/*"
                                                            onChange={(e) => handleVoiceUpload(e, key)}
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        />
                                                        <Upload className="w-4 h-4 text-gray-500 mb-1" />
                                                        <p className="text-[9px] text-gray-500">등록하기</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="w-full h-px bg-white/5" />

                            {voiceReference && !Object.values(savedVoices as Record<string, { data: string }>).some(v => v.data === voiceReference) && (
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        <p className="text-[10px] font-bold text-primary truncate max-w-[150px]">{voiceRefName}</p>
                                    </div>
                                    <button
                                        onClick={() => { setVoiceReference(null); setVoiceRefName(''); }}
                                        className="text-[10px] text-red-400 hover:underline"
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard className="border-secondary/20 bg-secondary/5">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Music className="w-5 h-5 text-secondary" />
                            분석된 트랙 정보
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">BPM</p>
                                    <p className="text-sm font-bold text-primary">{showAnalyzing ? '...' : analysisResult?.bpm || '-'}</p>
                                </div>
                                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">KEY</p>
                                    <p className="text-sm font-bold text-secondary">{showAnalyzing ? '...' : analysisResult?.key || '-'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">에너지 레벨</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000"
                                            style={{ width: showAnalyzing ? '0%' : `${analysisResult?.energy || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono">{showAnalyzing ? '...' : `${analysisResult?.energy || 0}%`}</span>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="border-white/5">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            곡 구조 분석 (AI)
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {showAnalyzing ? (
                                <div className="py-8 text-center space-y-3">
                                    <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
                                    <p className="text-xs text-gray-500">곡의 파형을 분석하고 있습니다...</p>
                                </div>
                            ) : workflow.results.shortsHighlights && workflow.results.shortsHighlights.length > 0 ? (
                                workflow.results.shortsHighlights.map((highlight: any, idx: number) => {
                                    const mins = Math.floor(highlight.start / 60);
                                    const secs = highlight.start % 60;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 text-xs">
                                            <span className="font-bold text-gray-300">{highlight.label || `Section ${idx + 1}`}</span>
                                            <span className="text-gray-500">{mins}:{secs.toString().padStart(2, '0')}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center py-4 text-xs text-gray-500">분석된 구조가 없습니다.</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right: Arrangement Controls */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Lyrics Display */}
                    <GlassCard className="border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">가사 편집 및 선택</h4>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                                    <input type="checkbox" checked={!workflow.params.useEnglish} onChange={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, useEnglish: false } }))} className="accent-primary" />
                                    한글 버전
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                                    <input type="checkbox" checked={!!workflow.params.useEnglish} onChange={() => setWorkflow(prev => ({ ...prev, params: { ...prev.params, useEnglish: true } }))} className="accent-primary" />
                                    영어 버전
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-80 font-mono text-sm">
                            <div className="space-y-2 flex flex-col">
                                <h5 className="text-[10px] font-bold text-primary">한글 가사</h5>
                                <textarea
                                    className="w-full flex-1 bg-black/20 p-3 rounded-xl border border-white/10 text-white whitespace-pre-wrap outline-none focus:border-primary/50 transition-all resize-none custom-scrollbar"
                                    value={localLyrics}
                                    onChange={(e) => setLocalLyrics(e.target.value)}
                                    placeholder="분석된 한글 가사가 여기에 표시됩니다."
                                />
                            </div>
                            <div className="space-y-2 flex flex-col relative">
                                <div className="flex justify-between items-center">
                                    <h5 className="text-[10px] font-bold text-secondary">English Lyrics</h5>
                                    {isTranslating && <RefreshCw className="w-3 h-3 text-secondary animate-spin" />}
                                </div>
                                <textarea
                                    className="w-full flex-1 bg-black/20 p-3 rounded-xl border border-white/10 text-white whitespace-pre-wrap outline-none focus:border-secondary/50 transition-all resize-none custom-scrollbar"
                                    value={localEnglishLyrics}
                                    onChange={(e) => setLocalEnglishLyrics(e.target.value)}
                                    placeholder="분석된 영어 가사가 여기에 표시됩니다."
                                />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Sliders className="w-5 h-5 text-primary" />
                                편곡 컨트롤러
                            </h3>
                            <button className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Save className="w-3 h-3" /> 설정 저장
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-sm font-medium text-gray-400 block">원곡 재생 및 파형</label>
                                    <button
                                        onClick={handlePlay}
                                        disabled={!uploadedFile && !Object.values(multiTracks).some(t => (t as any).url !== null) && !workflow.results.arrangedAudioUrl}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all disabled:opacity-30"
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        {isPlaying ? '일시정지' : '원곡 재생'}
                                    </button>
                                </div>

                                <div className="bg-black/40 rounded-xl border border-white/5 p-4 mb-6">
                                    <div ref={waveformRef} className="w-full" />
                                    {!uploadedFile && (
                                        <div className="h-[60px] flex items-center justify-center text-xs text-gray-600 italic">
                                            곡을 업로드하면 파형이 여기에 표시됩니다.
                                        </div>
                                    )}
                                </div>

                                <label className="text-sm font-medium text-gray-400 mb-4 block">악기 밸런스 및 구성</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(instrumentLevels).map(([inst, level]) => (
                                        <div key={inst} className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold">{inst}</span>
                                                <span className="text-[10px] text-primary">{level}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={level}
                                                onChange={(e) => setInstrumentLevels(prev => ({ ...prev, [inst]: parseInt(e.target.value) }))}
                                                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-400 mb-4 block">AI 프로듀서에게 요청하기</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={arrangementPrompt}
                                        onChange={(e) => setArrangementPrompt(e.target.value)}
                                        placeholder="예: 후렴구 드럼을 더 웅장하게 해줘, 전체적으로 재즈풍으로 바꿔줘"
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-secondary outline-none text-white transition-all"
                                    />
                                    <button
                                        onClick={() => handleArrange()}
                                        disabled={isProcessing}
                                        className="bg-secondary p-3 rounded-xl hover:neon-glow-secondary transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="bg-primary/5 border-primary/20 p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                    <ListMusic className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">생성된 리스트</h3>
                                    <p className="text-xs text-gray-400">AI가 편곡한 트랙들을 관리하세요.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {arrangedTracks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-500 space-y-4">
                                    <Music className="w-8 h-8 opacity-20" />
                                    <p className="text-sm">아직 생성된 곡이 없습니다.</p>
                                </div>
                            ) : (
                                arrangedTracks.map((track) => (
                                    <div
                                        key={track.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border transition-all group cursor-pointer",
                                            playingListTrackId === track.id ? "bg-primary/10 border-primary/30" : "bg-white/5 border-white/5 hover:bg-white/10"
                                        )}
                                        onClick={() => toggleListPlay(track)}
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="relative w-10 h-10 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                                {playingListTrackId === track.id ? (
                                                    <div className="flex items-center gap-0.5">
                                                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-primary" />
                                                        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-primary" />
                                                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 bg-primary" />
                                                    </div>
                                                ) : (
                                                    <Play className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-sm truncate">{track.title}</h4>
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-secondary/20 text-secondary rounded uppercase font-bold">
                                                        {track.mode === 'vocal_only' ? 'Vocal Swap' : 'Arrangement'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={track.url}
                                                    download={`${track.title}.wav`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1.5 hover:text-white transition-colors text-gray-400"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteArrangedTrack(track.id); }}
                                                    className="p-1.5 hover:text-red-400 transition-colors text-gray-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <audio ref={listAudioRef} onEnded={() => setPlayingListTrackId(null)} className="hidden" />
                    </GlassCard>
                </div>
            </div>

            <div className="mt-8">
                <Terminal logs={logs} />
            </div>
        </motion.div>
    );
};