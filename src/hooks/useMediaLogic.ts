import React, { useState, useRef, useCallback } from 'react';
import { WorkflowState, createDefaultSettings } from '../types';
import { saveAudioToDB, saveVoiceToDB } from '../utils/db';
import { uploadImageToStorage, db } from '../firebase';
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_IMAGE_ENGINE, RENDER_API_URL } from '../constants';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, setDoc, arrayUnion } from 'firebase/firestore';

export const useMediaLogic = (
  workflow: WorkflowState,
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowState>>,
  addLog: (msg: string) => void,
  apiKey: string,
  aiEngine: string,
  imageEngine: string,
  shortsCount: number,
  setShortsCount: React.Dispatch<React.SetStateAction<number>>,
  setSunoTracks: React.Dispatch<React.SetStateAction<any[]>>,
  sunoTracks: any[],
  analyzeAudioComprehensively: (file: File, options?: any) => Promise<void>,
  resetSubsequentSteps: (step: string) => void,
  parsePromptSection: (content: string, sectionName: string) => string,
  imagePrompts: string,
  user: User | null,
  shortsHighlights: any[],
  setShortsHighlights: React.Dispatch<React.SetStateAction<any[]>>
) => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState(() => localStorage.getItem('echoesuntohim_audioName') || '');
  const [isVideoRendering, setIsVideoRendering] = useState(false);
  const [isShortsGenerating, setIsShortsGenerating] = useState(false);
  const [renderQueue, setRenderQueue] = useState<any[]>([]);
  const [renderedVideos, setRenderedVideos] = useState<Record<string, Blob>>({});

  React.useEffect(() => {
    const processQueue = async () => {
      if (isVideoRendering || renderQueue.length === 0) return;
      const nextTask = renderQueue[0];
      setRenderQueue(prev => prev.slice(1));
      setIsVideoRendering(true);
      addLog(`🚀 [Queue] 다음 작업 시작: ${nextTask.label}`);
      try {
        const response = await fetch(RENDER_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextTask.payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        addLog(`✅ [Queue] ${nextTask.label} 요청 성공.`);
        setIsVideoRendering(false);
        if (nextTask.onComplete) nextTask.onComplete(result);
      } catch (err: any) {
        addLog(`❌ [Queue] ${nextTask.label} 처리 오류 (${RENDER_API_URL}): ${err.message}`);
        setIsVideoRendering(false);
      }
    };
    processQueue();
  }, [renderQueue, isVideoRendering, addLog]);

  const addToRenderQueue = useCallback((task: { label: string, payload: any, onComplete?: (res: any) => void }) => {
    setRenderQueue(prev => [...prev, task]);
    addLog(`📥 [Queue] 대기열에 추가됨: ${task.label}`);
  }, [addLog]);

  const mainVideoRef = useRef<any>(null);
  const tiktokVideoRef = useRef<any>(null);
  const shortsVideoRefs = useRef<any[]>([]);

  const processAudioFile = useCallback(async (file: File) => {
    if (!file) return;
    try {
      addLog(`📁 음원 파일 분석 시작: ${file.name}`);
      const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/^\[.*?\]\s*/, "");
      const [parsedK, parsedE] = rawName.includes('_') ? rawName.split('_') : [rawName, ""];
      const cleanTitle = rawName.trim();

      const matchedTrack = sunoTracks.find(track => {
        const tK = (track.koreanTitle || track.title || "").toLowerCase();
        const tE = (track.englishTitle || "").toLowerCase();
        return (parsedK && tK.includes(parsedK.toLowerCase())) || (parsedE && tE && tE.includes(parsedE.toLowerCase()));
      });

      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const dataUrl = await base64Promise;
      setUploadedAudio(dataUrl);
      setUploadedAudioName(file.name);
      localStorage.setItem('echoesuntohim_audioName', file.name);

      let cloudAudioUrl = "";
      if (user) {
        addLog(`☁️ 음원 파일을 클라우드 스토리지에 안전하게 저장 중...`);
        const uploadedUrl = await uploadImageToStorage(file, 'manual_uploads');
        if (uploadedUrl) cloudAudioUrl = uploadedUrl;
      }

      setWorkflow(prev => ({
        ...prev,
        params: {
          ...prev.params,
          title: cleanTitle,
          koreanTitle: matchedTrack?.koreanTitle || parsedK || cleanTitle,
          englishTitle: matchedTrack?.englishTitle || parsedE || "",
          originalLyrics: matchedTrack?.lyrics || prev.params.originalLyrics,
          lyrics: matchedTrack?.lyrics || prev.params.lyrics,
          englishLyrics: matchedTrack?.englishLyrics || prev.params.englishLyrics
        },
        results: {
          ...prev.results,
          trackId: matchedTrack?.id || prev.results.trackId,
          title: cleanTitle,
          audioFile: file,
          audioUrl: cloudAudioUrl || dataUrl
        }
      }));

      await saveAudioToDB(dataUrl);
      await saveVoiceToDB('workspace_audio', dataUrl, file.name);

      if (matchedTrack) {
        addLog(`🎯 히스토리 자동 매칭 성공: ${matchedTrack.koreanTitle || matchedTrack.title}`);
        const shouldAnalyze = window.confirm("이미 분석 데이터가 존재하는 곡입니다. 다시 정밀 분석을 진행할까요?\n(취소 시 기존 데이터를 유지합니다.)");

        if (shouldAnalyze) {
          await analyzeAudioComprehensively(file, { referenceLyrics: matchedTrack.lyrics });
        } else {
          addLog("ℹ️ 기존 데이터를 유지합니다. 정밀 분석을 건너뜜.");
          // 기존 하이라이트 정보가 있다면 복구
          if (matchedTrack.audioAnalysis?.highlights) {
            setShortsHighlights(matchedTrack.audioAnalysis.highlights);
          }
        }
      } else {
        addLog(`❓ 일치하는 히스토리가 없습니다. 음원에서 직접 가사를 추출합니다.`);
        await analyzeAudioComprehensively(file, { referenceLyrics: "" });
      }
    } catch (err: any) {
      addLog(`❌ 음원 처리 실패: ${err.message}`);
    }
  }, [sunoTracks, addLog, analyzeAudioComprehensively, setWorkflow, user]);

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAudioFile(file);
  }, [processAudioFile]);

  const handleSingleImageUpload = useCallback((type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addLog(`[${type}] 이미지 클라우드 업로드 중: ${file.name}`);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      const label = type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `숏츠 ${type.split('_')[1] || ''}`;
      const imgType = type === 'main' ? 'horizontal' : 'vertical';
      let cloudImageUrl = "";
      if (user) {
        try {
          const uploadedUrl = await uploadImageToStorage(file, 'manual_uploads/images');
          if (uploadedUrl) cloudImageUrl = uploadedUrl;
        } catch (e) { }
      }
      const finalUrl = cloudImageUrl || base64Url;
      setWorkflow(prev => {
        const existingImages = [...prev.results.images];
        const index = existingImages.findIndex(img => img.label === label);
        const newImg = { url: finalUrl, localUrl: base64Url, type: imgType as any, label, prompt: '사용자 직접 업로드', fileName: file.name };
        return {
          ...prev,
          results: {
            ...prev.results,
            images: index > -1 ? existingImages.map((img, i) => i === index ? newImg : img) : [...existingImages, newImg]
          }
        };
      });
      addLog(`✅ [${label}] 이미지가 클라우드 DB에 저장되었습니다.`);
    };
    reader.readAsDataURL(file);
  }, [setWorkflow, addLog, user]);

  const generateImages = useCallback(async () => {
    if (!apiKey) {
      addLog(`⚠️ API 키가 없습니다. 이미지 생성을 진행합니다.`);
    }
    addLog("Gemini AI 이미지 프롬프트 생성 중...");
    resetSubsequentSteps('image');
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 10 } }));
    try {
      const ai = new GoogleGenAI({ apiKey });
      const imagePersona = parsePromptSection(imagePrompts, 'IMAGE_PERSONA');
      const imageInstructions = parsePromptSection(imagePrompts, 'IMAGE_INSTRUCTIONS');
      const promptGen = `
        [IDENTITY] ${imagePersona}
        [SONG DATA] Title: ${workflow.results.title || "Untitled"}, Lyrics: ${workflow.results.lyrics || "N/A"}
        [INSTRUCTIONS] ${imageInstructions}
        JSON 출력: { "mainPrompt": "...", "tiktokPrompt": "...", "shortsPrompts": [] }
      `;
      const promptResponse = await ai.models.generateContent({
        model: aiEngine,
        contents: [{ role: 'user', parts: [{ text: promptGen }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainPrompt: { type: Type.STRING },
              tiktokPrompt: { type: Type.STRING },
              shortsPrompts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["mainPrompt", "tiktokPrompt", "shortsPrompts"]
          }
        }
      });
      const resultData = JSON.parse(promptResponse.text.replace(/```json|```/g, '').trim());
      addLog(`✅ 프롬프트 생성 완료.`);

      const generateAndSave = async (prompt: string, aspectRatio: "16:9" | "9:16", label: string, type: 'horizontal' | 'vertical') => {
        try {
          const response = await ai.models.generateImages({
            model: imageEngine, prompt, config: { aspectRatio, numberOfImages: 1, outputMimeType: "image/png" }
          });
          const base64Url = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;

          // [v1.15.42] 생성 즉시 클라우드 스토리지 업로드
          const storageUrl = await uploadImageToStorage(base64Url);
          const finalImage = { url: storageUrl || base64Url, type, label, prompt };

          // [v1.15.42] 클라우드 DB 즉시 저장
          if (user) {
            try {
              // 1. 개별 이미지 기록 (generated_images)
              await addDoc(collection(db, 'generated_images'), {
                userId: user.uid, url: storageUrl || base64Url, prompt, type, label,
                songTitle: workflow.params.title || "무제", createdAt: serverTimestamp()
              });

              // 2. 메인 히스토리(sunoTracks) 즉시 업데이트
              const trackId = workflow.results.trackId || (workflow.params.title || "무제").replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
              const trackRef = doc(collection(db, 'sunoTracks'), trackId);

              await setDoc(trackRef, {
                userId: user.uid,
                title: workflow.params.title || "무제",
                koreanTitle: workflow.params.koreanTitle || "",
                englishTitle: workflow.params.englishTitle || "",
                lyrics: workflow.results.lyrics || "",
                englishLyrics: workflow.results.englishLyrics || "",
                generatedImages: arrayUnion(finalImage),
                updatedAt: serverTimestamp(),
                created_at: new Date().toISOString() // Fallback
              }, { merge: true });

              addLog(`✅ [${label}] 이미지가 클라우드 DB에 안전하게 저장되었습니다.`);
            } catch (dbErr) {
              console.error("DB Sync Error:", dbErr);
            }
          }

          setWorkflow(prev => ({
            ...prev,
            results: { ...prev.results, images: [...prev.results.images.filter(img => img.label !== label), finalImage] }
          }));
          return true;
        } catch (e) {
          addLog(`❌ [${label}] 이미지 생성/저장 실패: ${e instanceof Error ? e.message : String(e)}`);
          return false;
        }
      };

      await generateAndSave(resultData.mainPrompt, "16:9", '메인', 'horizontal');
      await generateAndSave(resultData.tiktokPrompt, "9:16", '틱톡', 'vertical');
      if (shortsCount > 0) {
        const max = Math.min(resultData.shortsPrompts.length, shortsCount);
        for (let i = 0; i < max; i++) {
          const prompt = resultData.shortsPrompts[i];
          if (!prompt) {
            addLog(`⚠️ 숏츠 ${i + 1}에 대한 프롬프트가 없습니다. 건너뛰었습니다.`);
            continue;
          }
          await generateAndSave(prompt, "9:16", `숏츠 ${i + 1}`, 'vertical');
        }
      }
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 100 } }));
      addLog("✨ 이미지 생성 완료!");
    } catch (e: any) { addLog(`❌ 오류: ${e.message}`); }
  }, [apiKey, aiEngine, imageEngine, workflow, shortsCount, addLog, setWorkflow, resetSubsequentSteps, imagePrompts, parsePromptSection, user]);

  const regenerateSpecificImage = useCallback(async (index: number) => {
    addLog("⚠️ 개별 재생성 기능은 현재 개선 작업 중입니다.");
  }, [addLog]);

  const downloadImageWithTitle = useCallback(async (img: any) => {
    addLog(`📥 [${img.label}] 이미지 다운로드 중...`);
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `${workflow.params.title || "무제"}_${img.label}.png`;
    link.click();
  }, [workflow.params.title, addLog]);

  const startVideoRender = useCallback(async (type: 'main' | 'tiktok' | 'shorts') => {
    const payload = {
      assets: {
        audioUrl: uploadedAudio,
        imageUrl: workflow.results.images.find(img => img.label.includes(type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : '숏츠'))?.url
      },
      settings: {
        koreanTitle: workflow.params.koreanTitle,
        englishTitle: workflow.params.englishTitle,
        lyrics: workflow.results.lyrics,
        timedLyrics: workflow.results.timedLyrics || [],
        type: type, // Pass the specific label (main, tiktok, shorts)
        category: workflow.params.target === 'CCM' ? 'CCM' : 'Pop'
      }
    };
    addToRenderQueue({ label: `${workflow.params.title} (${type})`, payload });
  }, [workflow, uploadedAudio, addToRenderQueue]);

  const downloadVideo = useCallback((url: string, type: string) => {
    // 🚀 파일명 표준화 (Naming Rule) 적용: [분류] 한글제목_영어제목_타입.mp4
    const kTitle = workflow.params.koreanTitle || '제목없음';
    const eTitle = workflow.params.englishTitle || 'Untitled';
    const category = workflow.params.target === 'CCM' ? 'CCM' : 'Pop';
    const safeType = type || 'shorts';

    // [CCM] 한글 제목_English Title_main.mp4 형식 (공백 유지)
    const fileName = `[${category}] ${kTitle}_${eTitle}_${safeType}.mp4`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [workflow.params.koreanTitle, workflow.params.englishTitle, workflow.params.target]);

  const handleDownloadAll = useCallback(async () => {
    addLog("📥 일괄 다운로드 실행...");
    // 렌더링된 비디오가 있다면 모두 다운로드
    const results = workflow.results.videos || [];
    if (results.length === 0) {
      addLog("⚠️ 다운로드할 영상이 없습니다.");
      return;
    }
    results.forEach((v: any) => downloadVideo(v.url, v.type));
  }, [workflow.results.videos, downloadVideo, addLog]);

  const downloadBlogImage = useCallback((imgUrl: string, text: string, label: string) => {
    addLog(`📥 블로그 이미지 합성 중: ${label}`);
  }, [addLog]);

  const saveCurrentImagesToCloud = useCallback(async (updateSunoTracks?: any) => {
    if (!user || !workflow.results.images.length) return;
    addLog("☁️ 이미지 히스토리 저장 중...");
    const newTrack = {
      userId: user.uid,
      title: workflow.params.title || "이미지 작업",
      generatedImages: workflow.results.images.map(img => ({ url: img.url, prompt: img.prompt, label: img.label, type: img.type })),
      createdAt: serverTimestamp(),
      created_at: new Date().toISOString()
    };
    try {
      const docRef = await addDoc(collection(db, 'sunoTracks'), newTrack);
      if (updateSunoTracks) updateSunoTracks((prev: any) => [{ ...newTrack, id: docRef.id }, ...prev]);
      addLog("✅ 히스토리 저장 완료!");
    } catch (e: any) { addLog(`❌ 저장 실패: ${e.message}`); }
  }, [user, workflow, addLog]);

  const regenerateShorts = useCallback(async () => { }, []);

  return {
    audioBuffer, setAudioBuffer, uploadedAudio, setUploadedAudio, uploadedAudioName, setUploadedAudioName,
    isVideoRendering, isShortsGenerating, shortsHighlights, setShortsHighlights,
    mainVideoRef, tiktokVideoRef, shortsVideoRefs, handleAudioUpload, handleSingleImageUpload,
    generateImages, regenerateSpecificImage, regenerateShorts, saveCurrentImagesToCloud,
    startVideoRender, handleDownloadAll, downloadImageWithTitle, downloadBlogImage,
    renderedVideos, renderQueue, addToRenderQueue,
    onRenderComplete: (blob: Blob, type: string) => {
      setRenderedVideos(prev => ({ ...prev, [type]: blob }));
      addLog(`✅ 영상 렌더링 완료: ${type}`);
    }
  };
};
