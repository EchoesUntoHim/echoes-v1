import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Download,
  Maximize
} from 'lucide-react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { cn } from '../lib/utils';
import { TitleSettings } from '../types';

let ffmpeg: any = null;
let ffmpegLoadingPromise: Promise<any> | null = null;

const loadFFmpeg = async (addLog?: (msg: string) => void) => {
  if (ffmpeg && ffmpeg.isLoaded()) return ffmpeg;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;
  
  ffmpegLoadingPromise = (async () => {
    if (addLog) addLog("🛡️ FFmpeg v0.11 안정 버전 초기화 중...");
    
    try {
      if (!ffmpeg) {
        ffmpeg = createFFmpeg({
          log: true,
          corePath: '/ffmpeg/ffmpeg-core.js',
          logger: ({ message }) => {
            if (addLog) addLog(`[FFmpeg] ${message}`);
          }
        });
      }

      if (addLog) addLog("📦 로컬 엔진 로드 중 (/ffmpeg/ffmpeg-core.js)...");
      await ffmpeg.load();
      
      if (addLog) addLog("✅ FFmpeg 안정 버전 로드 완료 (Local)");
      return ffmpeg;
    } catch (err: any) {
      if (addLog) addLog(`❌ FFmpeg 초기화 오류: ${err.message}`);
      if (addLog) addLog("💡 페이지를 새로고침(F5) 후 다시 시도해 보세요.");
      ffmpegLoadingPromise = null;
      throw err;
    }
  })();

  return ffmpegLoadingPromise;
};

interface VideoPlayerProps {
  imageSrc: string | null;
  audioSrc: string | null;
  lyrics: string;
  englishLyrics?: string;
  timedLyrics?: any[];
  type: 'main' | 'tiktok' | string;
  startTime?: number;
  duration?: number;
  onEnded?: () => void;
  title?: string;
  label?: string;
  koreanTitle?: string;
  englishTitle?: string;
  titleSettings?: TitleSettings;
  showTitle?: boolean;
  lyricsStartTime?: number;
  lyricsScrollEnd?: number;
  lyricsFontSize?: number;
  addLog?: (msg: string) => void;
  originalFileName?: string;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  onProgress?: (progress: number) => void;
}

export const VideoPlayer = forwardRef(({
  imageSrc,
  audioSrc,
  lyrics,
  englishLyrics = "",
  timedLyrics = [],
  type,
  startTime = 0,
  duration,
  onEnded,
  title = "",
  label = "",
  koreanTitle = "",
  englishTitle = "",
  titleSettings,
  showTitle = true,
  lyricsStartTime = 0,
  lyricsScrollEnd = 50,
  lyricsFontSize = 4,
  addLog,
  originalFileName = "",
  fadeInDuration = 0,
  fadeOutDuration = 0,
  onProgress
}: any, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  useImperativeHandle(ref, () => ({
    download: handleDownload,
    isPlaying: isPlaying,
    isRecording: isRecording,
    renderProgress: renderProgress
  }));

  const parsedLyrics = useMemo(() => {
    const timeRegex = /\[(\d{2}):(\d{2})\]/;
    // v1.9.0: 가사 텍스트에 타임스탬프가 있는 경우 이를 최우선 소스로 사용 (편집창 싱크 보장)
    const hasTimestampsInLyrics = lyrics && typeof lyrics === 'string' && timeRegex.test(lyrics);

    if (!hasTimestampsInLyrics && Array.isArray(timedLyrics) && timedLyrics.length > 0) {
      const flat: string[] = [];
      const pairs: { kor: string; eng: string }[] = [];

      timedLyrics.forEach(item => {
        if (item.kor) flat.push(item.kor);
        if (item.eng) flat.push(item.eng);
        pairs.push({ kor: item.kor || '', eng: item.eng || '' });
      });

      return {
        flat,
        pairs,
        timedLines: timedLyrics.map(item => ({
          time: item.time,
          kor: item.kor || '',
          eng: item.eng || ''
        }))
      };
    }

    if (!lyrics && !englishLyrics) return { flat: [], pairs: [], timedLines: [] };


    const parseTimedLines = (text: string) => {
      const lines = (text || '').split('\n');
      let currentSectionTime = 0;
      const result: { time: number; text: string }[] = [];

      lines.forEach(line => {
        const timeMatch = line.match(timeRegex);
        const cleanText = line.replace(/\[.*?\]|\(.*?\)/g, '').trim();

        if (timeMatch) {
          const mins = parseInt(timeMatch[1]);
          const secs = parseInt(timeMatch[2]);
          currentSectionTime = mins * 60 + secs;
        }

        if (cleanText) {
          result.push({ time: currentSectionTime, text: cleanText });
        }
      });
      return result;
    };

    const korTimed = parseTimedLines(lyrics);
    const engTimed = parseTimedLines(englishLyrics);

    // Sync Korean and English lines by index (assuming they match 1:1)
    const timedLines: { time: number; kor: string; eng: string }[] = [];
    const maxIdx = Math.max(korTimed.length, engTimed.length);

    for (let i = 0; i < maxIdx; i++) {
      const k = korTimed[i];
      const e = engTimed[i];
      timedLines.push({
        time: k?.time ?? e?.time ?? 0,
        kor: k?.text ?? '',
        eng: e?.text ?? ''
      });
    }

    const korLines = (lyrics || "").split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);
    const engLines = (englishLyrics || "").split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);

    const flat: string[] = [];
    const pairs: { kor: string; eng: string }[] = [];
    const maxLines = Math.max(korLines.length, engLines.length);

    for (let i = 0; i < maxLines; i++) {
      const kor = korLines[i] || '';
      const eng = engLines[i] || '';
      if (kor) flat.push(kor);
      if (eng) flat.push(eng);
      if (kor || eng) pairs.push({ kor, eng });
    }

    return { flat, pairs, timedLines };
  }, [lyrics, englishLyrics, timedLyrics]);

  const drawFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement, currentAudioTime: number) => {
    if (!ctx || !canvas || !img) return;

    const segmentTime = Math.max(0, currentAudioTime - startTime);
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight;
    if (canvasAspect > imgAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
    }
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    if (titleSettings && titleSettings.showTitleOverlay !== false) {
      const { animation = 'none', spacing = 1.2, xOffset = 0, yOffset = 0 } = titleSettings;
      
      const titleDuration = titleSettings.titleDuration || 5;
      const titleFade = titleSettings.titleFade || 0.5;
      
      const elapsed = currentAudioTime - startTime;
      const isPrePlay = !isPlaying && elapsed <= 0.1;
      
      let titleOpacity = 0;
      if (isPrePlay) {
        titleOpacity = 1;
      } else if (elapsed < titleDuration) {
        if (elapsed < titleFade) titleOpacity = elapsed / titleFade;
        else if (elapsed > titleDuration - titleFade) titleOpacity = (titleDuration - elapsed) / titleFade;
        else titleOpacity = 1;
      }

      if (titleOpacity > 0 && (koreanTitle || title)) {
        let animY = 0;
        let animScale = 1;
        let animBlur = 0;
        let typingProgress = 1;

        if (!isPrePlay && animation !== 'none') {
          const fadeIn = titleFade;
          if (animation === 'floating') animY = Math.sin(segmentTime * 2) * 10;
          else if (animation === 'wave') animY = Math.sin(segmentTime * 3) * 15;
          else if (animation === 'zoom_in') animScale = 0.95 + (Math.min(1, elapsed / 5) * 0.1);
          else if (animation === 'zoom_out') animScale = 1.05 - (Math.min(1, elapsed / 5) * 0.1);
          else if (animation === 'slide_up') { if (fadeIn > 0 && elapsed < fadeIn) animY = 30 * (1 - (elapsed / fadeIn)); }
          else if (animation === 'blurry') { if (fadeIn > 0 && elapsed < fadeIn) animBlur = 15 * (1 - (elapsed / fadeIn)); }
          else if (animation === 'typing') typingProgress = fadeIn > 0 ? Math.min(1, elapsed / (fadeIn * 1.5)) : 1;
          else if (animation === 'dramatic_zoom') { if (fadeIn > 0 && elapsed < fadeIn) animScale = 0.5 + (0.5 * (elapsed / fadeIn)); }
        }

        let x = canvas.width / 2 + (xOffset * (canvas.width / 100));
        let y = canvas.height / 2 + (yOffset * (canvas.height / 100)) + animY;

        if (titleSettings.titlePosition === 'top') y = canvas.height * 0.2 + (yOffset * (canvas.height / 100)) + animY;
        if (titleSettings.titlePosition === 'bottom') y = canvas.height * 0.8 + (yOffset * (canvas.height / 100)) + animY;

        ctx.textBaseline = 'middle';
        if (titleSettings.titleAlign === 'left') {
          ctx.textAlign = 'left';
          x = canvas.width * 0.1 + (xOffset * (canvas.width / 100));
        } else if (titleSettings.titleAlign === 'right') {
          ctx.textAlign = 'right';
          x = canvas.width * 0.9 + (xOffset * (canvas.width / 100));
        } else {
          ctx.textAlign = 'center';
        }

        const applyEffect = (text: string, tx: number, ty: number, size: number, color: string, currentOpacity: number) => {
          if (!text) return;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
          if (animBlur > 0) ctx.filter = `blur(${animBlur}px)`;
          ctx.translate(tx, ty);
          if (animScale !== 1) ctx.scale(animScale, animScale);
          ctx.translate(-tx, -ty);

          const progress = Math.max(0, Math.min(1, typingProgress));
          const displayText = animation === 'typing' ? text.substring(0, Math.ceil(text.length * progress)) : text;
          if (!displayText) { ctx.restore(); return; }

          const currentEffect = titleSettings.titleEffect || 'none';
          if (currentEffect === 'shadow') { ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 15; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; }
          else if (currentEffect === 'bold_shadow') { ctx.shadowColor = 'rgba(0,0,0,1)'; ctx.shadowBlur = 25; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 6; }
          else if (currentEffect === 'glow') { ctx.shadowColor = color; ctx.shadowBlur = 40; }
          else if (currentEffect === 'soft_glow') { ctx.shadowColor = color; ctx.shadowBlur = 15; }
          else if (currentEffect === 'neon') { ctx.shadowColor = color; ctx.shadowBlur = 50; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeText(displayText, tx, ty); }
          else if (currentEffect === 'outline') { ctx.strokeStyle = '#000000'; ctx.lineWidth = 6; ctx.strokeText(displayText, tx, ty); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeText(displayText, tx, ty); }
          else if (currentEffect === 'gradient') { const grad = ctx.createLinearGradient(tx - size, ty, tx + size, ty); grad.addColorStop(0, color); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, color); ctx.fillStyle = grad; }
          else if (currentEffect === 'glass') { ctx.shadowColor = 'rgba(255,255,255,0.3)'; ctx.shadowBlur = 20; ctx.fillStyle = 'rgba(255,255,255,0.8)'; }
          else if (currentEffect === 'cyber') { ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 30; ctx.fillStyle = '#00ffff'; ctx.fillText(displayText, tx - 2, ty - 2); ctx.shadowColor = '#00ffff'; ctx.fillStyle = color; }
          else if (currentEffect === 'glitch') { ctx.fillStyle = '#ff0000'; ctx.fillText(displayText, tx - 4, ty); ctx.fillStyle = '#0000ff'; ctx.fillText(displayText, tx + 4, ty); ctx.fillStyle = color; }
          else if (currentEffect === 'retro') { ctx.shadowColor = '#ffae00'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; }
          else if (currentEffect === 'vintage') { ctx.fillStyle = '#f4e4bc'; ctx.shadowColor = '#2c1e1e'; ctx.shadowBlur = 2; }
          else if (currentEffect === 'elegant') { ctx.shadowColor = 'rgba(255,215,0,0.3)'; ctx.shadowBlur = 10; }

          if (currentEffect !== 'gradient' && currentEffect !== 'cyber' && currentEffect !== 'glass') ctx.fillStyle = color;
          ctx.fillText(displayText, tx, ty);
          ctx.restore();
        };

        const korSize = (titleSettings.koreanTitleSize / 100) * canvas.width * 0.08;
        ctx.font = `900 ${korSize}px ${titleSettings.koreanFont || 'sans-serif'}`;
        applyEffect(koreanTitle || title, x, y, korSize, titleSettings.koreanColor || '#ffffff', titleOpacity);

        if (englishTitle) {
          const engSize = (titleSettings.englishTitleSize / 100) * canvas.width * 0.05;
          const engOpacity = titleOpacity * 0.9;
          const engYOffset = korSize * spacing;
          ctx.font = `700 ${engSize}px ${titleSettings.englishFont || 'sans-serif'}`;
          let engAnimY = 0;
          if (animation === 'wave') engAnimY = Math.sin(segmentTime * 3 + 1) * 15;
          applyEffect(englishTitle, x, y + engYOffset + engAnimY, engSize, titleSettings.englishColor || '#ffffff', engOpacity);
        }
      } else if (showTitle && title) {
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${canvas.width * 0.06}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10; ctx.fillText(title, canvas.width / 2, canvas.height * 0.15); ctx.shadowBlur = 0;
      }

      if (parsedLyrics.flat.length > 0 && segmentTime >= (lyricsStartTime || 0)) {
        const lKorFont = titleSettings.lyricsKoreanFont || 'sans-serif';
        const lEngFont = titleSettings.lyricsEnglishFont || 'sans-serif';
        const lColor = titleSettings.lyricsColor || '#ffffff';
        const hexToRgba = (hex: string, alpha: number) => {
          if (!hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
          const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `bold ${canvas.width * (lyricsFontSize / 100)}px ${lKorFont}`;

        const displayMode = titleSettings?.lyricsDisplayMode || 'scroll';
        const totalVideoDuration = duration || audioDuration || 100;
        const lyricsDuration = totalVideoDuration - (lyricsStartTime || 0);
        const lyricsProgress = lyricsDuration > 0 ? (segmentTime - (lyricsStartTime || 0)) / lyricsDuration : 0;

        if (displayMode === 'scroll') {
          const lineSpacing = canvas.height * (lyricsFontSize / 40);
          const endPosition = canvas.height * ((lyricsScrollEnd || 50) / 100);
          const startOffset = canvas.height * 0.8;
          const totalScrollDistance = startOffset - endPosition + ((parsedLyrics.flat.length - 1) * lineSpacing);
          const currentYOffset = lyricsProgress * totalScrollDistance;

          parsedLyrics.flat.forEach((line: string, index: number) => {
            if (!line) return;
            const startY = startOffset + (index * lineSpacing);
            const y = startY - currentYOffset;
            const fadeOutEnd = endPosition, fadeOutStart = endPosition + (canvas.height * 0.15);
            const fadeInStart = canvas.height * 0.9, fadeInEnd = canvas.height * 0.8;
            let opacity = 1;
            if (y < fadeOutEnd) opacity = 0; else if (y < fadeOutStart) opacity = (y - fadeOutEnd) / (fadeOutStart - fadeOutEnd);
            if (y > fadeInStart) opacity = 0; else if (y > fadeInEnd) opacity = Math.min(opacity, (fadeInStart - y) / (fadeInStart - fadeInEnd));
            if (y > 0 && y < canvas.height && opacity > 0) {
              ctx.fillStyle = hexToRgba(lColor, opacity); ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10; ctx.fillText(line, canvas.width / 2, y); ctx.shadowBlur = 0;
            }
          });
        } else {
          let currentPair;
          const totalDur = duration || audioDuration || 100;
          if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
            const lines = parsedLyrics.timedLines;
            let activeIdx = 0;
            for (let i = 0; i < lines.length; i++) { if (lines[i].time <= currentAudioTime) activeIdx = i; else break; }
            currentPair = lines[activeIdx];
          } else {
            const pairCount = parsedLyrics.pairs.length;
            const pairIndex = Math.min(pairCount - 1, Math.floor(lyricsProgress * pairCount));
            currentPair = parsedLyrics.pairs[pairIndex];
          }
          if (currentPair) {
            let opacity = 1;
            if (displayMode === 'fade') {
              const fadeDur = 0.5;
              const timeSinceStart = currentAudioTime - (currentPair.time || 0);
              if (timeSinceStart < fadeDur && (currentPair.time || 0) > startTime) opacity = timeSinceStart / fadeDur;
            }
            const lineSpacing = canvas.height * (lyricsFontSize / 40);
            let baseY = canvas.height * 0.8;
            if (displayMode === 'center') baseY = canvas.height * 0.5;
            if (displayMode === 'bottom') baseY = canvas.height * 0.9;
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
            if (currentPair.kor) { ctx.font = `bold ${canvas.width * (lyricsFontSize / 100)}px ${lKorFont}`; ctx.fillStyle = hexToRgba(lColor, opacity); ctx.fillText(currentPair.kor, canvas.width / 2, baseY); }
            if (currentPair.eng) { ctx.fillStyle = hexToRgba(lColor, opacity * 0.8); ctx.font = `bold ${canvas.width * (lyricsFontSize * 0.7 / 100)}px ${lEngFont}`; ctx.fillText(currentPair.eng, canvas.width / 2, baseY + lineSpacing * 0.8); }
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  };

  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.currentTime = startTime;
    }
  }, [startTime, isPlaying]);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const audio = audioRef.current;
    if (!ctx || !audio) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    let animationFrameId: number;
    let lastRenderTime = -1;

    const render = () => {
      const currentAudioTime = audio.currentTime;
      
      // Handle Auto-pause at end
      if (duration && currentAudioTime >= startTime + duration) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
          if (onEnded) onEnded();
        }
      }

      // Audio Fade Logic
      const segmentTime = currentAudioTime - startTime;
      const audioFadeIn = fadeInDuration || 0;
      const audioFadeOut = fadeOutDuration || 0;

      if (segmentTime < audioFadeIn) {
        audio.volume = Math.min(1, Math.max(0, segmentTime / audioFadeIn));
      } else if (duration && currentAudioTime >= startTime + duration - audioFadeOut) {
        const fadeOutProgress = (currentAudioTime - (startTime + duration - audioFadeOut)) / audioFadeOut;
        audio.volume = Math.min(1, Math.max(0, 1 - fadeOutProgress));
      } else {
        audio.volume = 1;
      }

      // Skip heavy drawing if time hasn't changed (GPU optimization)
      if (currentAudioTime !== lastRenderTime) {
        drawFrame(ctx, canvas, img, currentAudioTime);
        lastRenderTime = currentAudioTime;
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    img.onload = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      render();
    };

    if (img.complete) {
      render();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [imageSrc, isPlaying, parsedLyrics, type, startTime, duration, onEnded, title, showTitle, titleSettings, koreanTitle, englishTitle, lyricsStartTime, lyricsScrollEnd, lyricsFontSize, fadeInDuration, fadeOutDuration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (audioRef.current.currentTime < startTime || (duration && audioRef.current.currentTime >= startTime + duration)) {
          audioRef.current.currentTime = startTime;
        }
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioSrc || !imageSrc || isRecording) {
      if (addLog) {
        if (!canvas) addLog("❌ [Error] Canvas not found");
        if (!audioSrc) addLog("❌ [Error] Audio source missing");
        if (!imageSrc) addLog("❌ [Error] Image source missing");
        if (isRecording) addLog("⚠️ 이미 렌더링이 진행 중입니다.");
      }
      return;
    }

    setIsRecording(true);
    setRenderProgress(0);
    if (addLog) addLog(`🚀 [${label || type}] 오프라인 고화질 렌더링을 시작합니다...`);

    try {
      if (addLog) addLog("📂 FFmpeg 엔진 로딩 중...");
      const ffmpeg = await loadFFmpeg(addLog);
      
      const fps = 30;
      const totalDuration = duration || audioDuration || 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      
      if (addLog) addLog(`🎬 총 ${totalFrames} 프레임 생성 준비 중 (FPS: ${fps}, 기간: ${totalDuration.toFixed(1)}s)...`);

      // 1. Write Audio File to FFmpeg FS
      if (addLog) addLog("🎵 오디오 소스 준비 중...");
      ffmpeg.FS('writeFile', 'audio.mp3', await fetchFile(audioSrc));
      if (addLog) addLog("✅ 오디오 파일 준비 완료");

      // 2. Rendering Frames
      const frameInterval = 1 / fps;
      if (addLog) addLog(`🖼️ 프레임 생성 시작 (총 ${totalFrames}개)...`);
      
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = startTime + (i * frameInterval);
        
        // Draw to current canvas
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = imageSrc;
          
          // Wait for image to be ready if not already
          if (!img.complete) {
            await new Promise((resolve, reject) => { 
              img.onload = resolve; 
              img.onerror = () => reject(new Error("이미지 로드 실패"));
              setTimeout(() => reject(new Error("이미지 로드 시간 초과")), 10000);
            });
          }
          
          drawFrame(ctx, canvas, img, frameTime);
          
          // Capture frame as Blob
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.90));
          if (blob) {
            const buffer = await blob.arrayBuffer();
            ffmpeg.FS('writeFile', `frame_${i.toString().padStart(6, '0')}.jpg`, new Uint8Array(buffer));
          }
        }
        
        if (i % 30 === 0) {
          const progress = Math.round((i / totalFrames) * 90);
          setRenderProgress(progress);
          if (onProgress) onProgress(progress);
          if (addLog) addLog(`🖼️ 프레임 생성 중... (${i}/${totalFrames})`);
        }
      }

      // 3. Encode Video
      if (addLog) addLog("🎞️ 비디오 인코딩 및 오디오 믹싱 시작...");
      
      // FFmpeg command to combine images and audio
      // -framerate 30 -i frame_%06d.jpg -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest out.mp4
      await ffmpeg.run(
        '-framerate', fps.toString(),
        '-i', 'frame_%06d.jpg',
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        'output.mp4'
      );

      if (addLog) addLog("✅ 인코딩 완료. 파일 생성 중...");
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);

      const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : (title || 'video');
      const fileName = `${baseName} ${label || type}.mp4`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      setRenderProgress(100);
      if (onProgress) onProgress(100);
      if (addLog) addLog(`🎉 [${label || type}] 영상 제작이 완료되었습니다!`);
      
      // Clean up FFmpeg FS
      try {
        const files = ffmpeg.FS('readdir', '/');
        for (const file of files) {
          if (file.endsWith('.jpg') || file === 'audio.mp3' || file === 'output.mp4') {
            ffmpeg.FS('unlink', file);
          }
        }
      } catch (e) {
        console.error("Cleanup error:", e);
      }

      setIsRecording(false);
    } catch (error: any) {
      console.error("Rendering failed:", error);
      if (addLog) addLog(`❌ 렌더링 실패: ${error.message}`);
      setIsRecording(false);
    }
  };

  const displayDuration = duration || audioDuration;
  const displayCurrentTime = Math.max(0, currentTime - startTime);

  return (
    <div ref={containerRef} className={cn(
      "relative group rounded-xl overflow-hidden bg-black",
      type === 'main' ? "aspect-video" : "aspect-[9/16]"
    )}>
      <canvas
        ref={canvasRef}
        width={type === 'main' ? 1920 : 1080}
        height={type === 'main' ? 1080 : 1920}
        className="w-full h-full object-contain"
      />
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      />

      {/* Center Play Button (Hidden when playing or hovering controls) */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none",
        isPlaying ? "opacity-0" : "opacity-100"
      )}>
        <button onClick={togglePlay} className="bg-white/20 p-4 rounded-full backdrop-blur-md hover:bg-white/40 transition-all pointer-events-auto">
          {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
        </button>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-white font-mono">
          <span>{Math.floor(displayCurrentTime / 60)}:{(Math.floor(displayCurrentTime % 60)).toString().padStart(2, '0')}</span>
          <input
            type="range"
            min={startTime}
            max={startTime + displayDuration}
            step="0.1"
            value={Math.max(startTime, currentTime)}
            onChange={handleSeek}
            className="flex-1 accent-primary h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
          />
          <span>{Math.floor(displayDuration / 60)}:{(Math.floor(displayDuration % 60)).toString().padStart(2, '0')}</span>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={isRecording}
              className="text-white hover:text-primary transition-colors disabled:opacity-50"
              title="영상 다운로드"
            >
              {isRecording ? <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" /> : <Download className="w-5 h-5" />}
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
