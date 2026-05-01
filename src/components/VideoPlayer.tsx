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
import { storage, auth, uploadAudioToStorageSafe, uploadImageToStorage } from '../firebase';
import { RENDER_API_URL } from '../constants';

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

// v1.11.0: Particle Class for Premium Effects (Moved outside for stability)
class Particle {
  x: number; y: number; size: number; speedX: number; speedY: number;
  opacity: number; color: string; life: number; maxLife: number;
  type: string;

  constructor(canvasWidth: number, canvasHeight: number, type: string) {
    this.type = type;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.maxLife = 100 + Math.random() * 100;
    this.life = this.maxLife;
    this.opacity = Math.random() * 0.5 + 0.2;

    if (type === 'snow') {
      this.size = Math.random() * 3 + 1;
      this.speedX = Math.random() * 1 - 0.5;
      this.speedY = Math.random() * 1 + 0.5;
      this.color = '255, 255, 255';
    } else if (type === 'petals') {
      this.size = Math.random() * 5 + 2;
      this.speedX = Math.random() * 1.5 - 0.5;
      this.speedY = Math.random() * 1 + 0.8;
      this.color = '255, 182, 193'; // Pink
    } else if (type === 'dust') {
      this.size = Math.random() * 3 + 1; // [v1.15.29] Larger
      this.speedX = Math.random() * 0.8 - 0.4;
      this.speedY = Math.random() * 0.6 - 0.8; // Floating up
      this.color = '255, 230, 100'; // Brighter Gold
    } else { // stars
      this.size = Math.random() * 3 + 1; // [v1.15.29] Larger and visible
      this.speedX = Math.random() * 0.2 - 0.1; // Subtle movement
      this.speedY = Math.random() * 0.2 - 0.1;
      this.color = '255, 255, 255';
    }
  }

  update(canvasWidth: number, canvasHeight: number) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life--;

    if (this.type === 'snow' || this.type === 'petals') {
      if (this.y > canvasHeight) this.y = -10;
      if (this.x > canvasWidth) this.x = 0;
      if (this.x < 0) this.x = canvasWidth;
    } else if (this.type === 'dust') {
      if (this.y < 0) this.y = canvasHeight;
      this.opacity = (this.life / this.maxLife) * 0.6;
    } else if (this.type === 'stars') {
      this.opacity = Math.abs(Math.sin(Date.now() / 1000 + this.x)) * 0.8;
    }

    if (this.life <= 0) {
      this.life = this.maxLife;
      // [v1.15.29] Reset to random position to avoid concentration at bottom
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
    if (this.type === 'petals') {
      ctx.ellipse(this.x, this.y, this.size, this.size / 2, Math.PI / 4, 0, Math.PI * 2);
    } else {
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

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
  onRenderComplete?: (blob: Blob, type: string) => void;
  videoEngine?: string;
  videoRenderApiUrl?: string;
  karaokeColor?: string;
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
  onProgress,
  onRenderComplete,
  videoEngine = 'echoesuntohim-v2.1-free',
  videoRenderApiUrl = RENDER_API_URL,
  karaokeColor = '#00FFA3'
}: any, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // v1.11.0: Premium Effects Infrastructure
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<any[]>([]);
  const lastParticleSettingsRef = useRef<string>('none');
  // [v1.15.30] 재생 시작 시점 기록 (진입 효과 타이밍 보정용)
  const playStartedTimeRef = useRef<number>(0);

  // Initialize particles when settings change
  useEffect(() => {
    const pType = titleSettings?.particleSystem || 'none';
    if (pType !== lastParticleSettingsRef.current) {
      lastParticleSettingsRef.current = pType;
      if (pType === 'none') {
        particlesRef.current = [];
      } else {
        const count = pType === 'dust' ? 150 : 80;
        const newParticles = [];
        const canvas = canvasRef.current;
        if (canvas) {
          for (let i = 0; i < count; i++) {
            newParticles.push(new Particle(canvas.width, canvas.height, pType));
          }
        }
        particlesRef.current = newParticles;
      }
    }
  }, [titleSettings?.particleSystem]);

  // Setup Audio Analyzer
  useEffect(() => {
    if (audioSrc && audioRef.current && titleSettings?.showVisualizer) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyzerRef.current = audioCtxRef.current.createAnalyser();
        const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyzerRef.current);
        analyzerRef.current.connect(audioCtxRef.current.destination);
        analyzerRef.current.fftSize = 256;
      }
    }
  }, [audioSrc, titleSettings?.showVisualizer]);

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
        // [v1.15.29] 구조 태그([Chorus] 등)를 감지하지만, cleanText에서는 제거하여 줄바꿈 효과 유도
        const hasStructuralTag = /\[(Verse|Chorus|Bridge|Outro|Intro|Hook|Instrumental|.*?)\]/i.test(line);
        const cleanText = line.replace(/\[.*?\]|\(.*?\)/g, '').trim();

        if (timeMatch) {
          const mins = parseInt(timeMatch[1]);
          const secs = parseInt(timeMatch[2]);
          currentSectionTime = mins * 60 + secs;

          // [v1.15.29] 타임스탬프가 있으면 텍스트가 비어있어도 추가 (간주/무음/자막지우기 처리)
          result.push({ time: currentSectionTime, text: cleanText });
        } else if (cleanText || hasStructuralTag) {
          // [v1.15.29] 타임스탬프가 없는 줄이라도 구조 태그가 있거나 텍스트가 있으면 추가
          // 구조 태그만 있는 경우 cleanText는 ""이 되어 시각적 줄바꿈(공백) 역할을 함
          result.push({ time: currentSectionTime, text: cleanText });
        }
      });
      return result;
    };

    const korTimed = parseTimedLines(lyrics);
    const engTimed = parseTimedLines(englishLyrics);

    // Sync Korean and English lines by time (robust against mismatched line counts or blank lines)
    const timedLines: { time: number; kor: string; eng: string }[] = [];
    const timeMap = new Map<number, { kor: string; eng: string }>();

    korTimed.forEach(k => {
      if (!timeMap.has(k.time)) timeMap.set(k.time, { kor: '', eng: '' });
      timeMap.get(k.time)!.kor = k.text;
    });

    engTimed.forEach(e => {
      if (!timeMap.has(e.time)) timeMap.set(e.time, { kor: '', eng: '' });
      timeMap.get(e.time)!.eng = e.text;
    });

    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);
    sortedTimes.forEach(t => {
      timedLines.push({
        time: t,
        kor: timeMap.get(t)!.kor,
        eng: timeMap.get(t)!.eng
      });
    });

    const korLines = (lyrics || "").split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim());
    const engLines = (englishLyrics || "").split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim());

    const flat: string[] = [];
    const pairs: { kor: string; eng: string }[] = [];
    const maxLines = Math.max(korLines.length, engLines.length);

    for (let i = 0; i < maxLines; i++) {
      const kor = korLines[i] || '';
      const eng = engLines[i] || '';
      // [v1.15.29] 둘 다 비어있더라도(구조 태그 줄) 최소한 하나의 공백은 추가하여 줄바꿈 간격 확보
      flat.push(kor);
      if (eng) flat.push(eng);
      if (kor || eng || (korLines[i] !== undefined || engLines[i] !== undefined)) {
        pairs.push({ kor, eng });
      }
    }

    return { flat, pairs, timedLines };
  }, [lyrics, englishLyrics, timedLyrics]);

  const drawFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement, currentAudioTime: number) => {
    if (!ctx || !canvas || !img) return;

    const segmentTime = Math.max(0, currentAudioTime - startTime);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Drawing with Multi-layered Effects
    const { videoMotion = 'none', videoFilter = 'none', videoOverlay = 'none' } = titleSettings || {};

    const imgAspect = img.width / img.height;
    const canvasAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight;

    // Fill screen while maintaining aspect ratio (Cover)
    if (canvasAspect > imgAspect) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgAspect;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgAspect;
    }

    // 1. Motion Logic
    let scale = 1.0;
    let translateX = 0;
    let translateY = 0;

    if (videoMotion === 'ken_burns_in') {
      scale = 1.0 + (segmentTime * 0.005); // Slow zoom in (0.5% per second)
    } else if (videoMotion === 'ken_burns_out') {
      scale = 1.2 - (segmentTime * 0.005); // Slow zoom out from 1.2x
      if (scale < 1.0) scale = 1.0;
    } else if (videoMotion === 'pan_left') {
      translateX = -segmentTime * 10;
    } else if (videoMotion === 'pan_right') {
      translateX = segmentTime * 10;
    }

    // 2. Filter Logic & Image Draw
    ctx.save();

    // Apply Filter
    let filterStr = 'none';
    if (videoFilter === 'grayscale') filterStr = 'grayscale(100%)';
    else if (videoFilter === 'sepia') filterStr = 'sepia(80%)';
    else if (videoFilter === 'warm') filterStr = 'sepia(30%) saturate(140%) hue-rotate(-10deg)';
    else if (videoFilter === 'cool') filterStr = 'saturate(120%) hue-rotate(180deg) brightness(1.1)';
    else if (videoFilter === 'vibrant') filterStr = 'saturate(160%) contrast(110%)';
    else if (videoFilter === 'brightness_pulse') {
      const pulse = 1.0 + (Math.sin(segmentTime * 2) * 0.08);
      filterStr = `brightness(${pulse})`;
    }

    ctx.filter = filterStr;

    // Draw Image with Transform
    ctx.translate(canvas.width / 2 + translateX, canvas.height / 2 + translateY);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    // 3. Overlay & Particle Logic (Drawn on top of image)
    const intensity = titleSettings?.videoOverlayIntensity ?? 0.5;

    // Draw Particles
    if (particlesRef.current.length > 0) {
      particlesRef.current.forEach(p => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
    }

    if (videoOverlay === 'vignette') {
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.35,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.85
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${0.75 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (videoOverlay === 'cinematic_bars') {
      const barHeight = canvas.height * 0.125 * intensity;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, barHeight);
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
    } else if (videoOverlay === 'film_grain') {
      ctx.save();
      ctx.globalAlpha = 0.05 * intensity;
      for (let i = 0; i < 1000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
      }
      ctx.restore();
    } else if (videoOverlay === 'light_leak') {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const timeShift = (Math.sin(segmentTime) + 1) / 2;
      grad.addColorStop(0, `rgba(255, 150, 50, ${0.2 * intensity * timeShift})`);
      grad.addColorStop(0.5, `rgba(255, 100, 200, ${0.1 * intensity})`);
      grad.addColorStop(1, `rgba(100, 200, 255, ${0.15 * intensity * (1 - timeShift)})`);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (videoOverlay === 'scratches') {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.1 * intensity})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        if (Math.random() > 0.8) {
          const x = Math.random() * canvas.width;
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.random() * 20 - 10, canvas.height); ctx.stroke();
        }
      }
      ctx.restore();
    } else if (videoOverlay === 'soft_glow') {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,255,255,${0.08 * intensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    } else if (videoOverlay === 'vintage_frame') {
      ctx.strokeStyle = `rgba(255,255,255,${0.15 * intensity})`;
      ctx.lineWidth = canvas.width * 0.02;
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);
    }

    // 4. Audio Visualizer (Clean Bottom Bars)
    if (titleSettings?.showVisualizer && analyzerRef.current) {
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzerRef.current.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let bx = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * (canvas.height * 0.15); // Max 15% height

        // Gradient for bars
        const barGrad = ctx.createLinearGradient(bx, canvas.height, bx, canvas.height - barHeight);
        barGrad.addColorStop(0, 'rgba(0, 255, 163, 0.6)');
        barGrad.addColorStop(1, 'rgba(0, 255, 163, 0.1)');

        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, canvas.height - barHeight, barWidth - 1, barHeight);
        bx += barWidth;
      }
    }

    if (titleSettings && titleSettings.showTitleOverlay !== false) {
      const {
        animation = 'none',
        titleSpacing = 1.2,
        titleXOffset = 0,
        titleYOffset = 0
      } = titleSettings;

      const titleDuration = (titleSettings as any).titleDuration || 5;
      const titleFade = (titleSettings as any).titleFade || 0.5;

      // [v1.15.30] 진입 효과 타이밍: 실제 재생 시작 후 경과 시간 사용
      const elapsed = currentAudioTime - startTime;
      const realPlayElapsed = playStartedTimeRef.current > 0 ? (Date.now() - playStartedTimeRef.current) / 1000 : 0;
      const effectElapsed = isPlaying ? realPlayElapsed : 0;
      const isPrePlay = !isPlaying && elapsed <= 0.1;

      let titleOpacity = 0;
      if (isPrePlay) {
        titleOpacity = 1;
      } else if (effectElapsed < titleFade) {
        titleOpacity = Math.max(0.01, effectElapsed / titleFade);
      } else {
        titleOpacity = 1;
      }

      // Intelligently split title if separate parts aren't provided
      let finalKor = koreanTitle || "";
      let finalEng = englishTitle || "";

      if (!finalKor && !finalEng && title) {
        const splitters = ['_', '|', ' - '];
        for (const s of splitters) {
          if (title.includes(s)) {
            const parts = title.split(s);
            finalKor = parts[0].trim();
            finalEng = parts[1].trim();
            break;
          }
        }
        if (!finalKor) finalKor = title; // Fallback to full title as Korean
      }

      if (titleOpacity > 0 && (finalKor || finalEng)) {
        let animY = 0;
        let animScale = 1;
        let animBlur = 0;
        let typingProgress = 1;

        if (animation !== 'none') {
          const fadeIn = titleFade || 0.5;
          const animElapsed = isPrePlay ? 0.01 : effectElapsed; // [v1.15.30] 실제 재생 경과 시간 사용

          if (animation === 'floating') animY = Math.sin(segmentTime * 2) * 10;
          else if (animation === 'wave') animY = Math.sin(segmentTime * 3) * 15;
          else if (animation === 'zoom_in') animScale = 0.95 + (Math.min(1, animElapsed / 5) * 0.1);
          else if (animation === 'zoom_out') animScale = 1.05 - (Math.min(1, animElapsed / 5) * 0.1);
          else if (animation === 'slide_up') { if (animElapsed < fadeIn) animY = 30 * (1 - (animElapsed / fadeIn)); }
          else if (animation === 'blurry') { if (animElapsed < fadeIn) animBlur = 15 * (1 - (animElapsed / fadeIn)); }
          else if (animation === 'typing') typingProgress = Math.min(1, animElapsed / (fadeIn * 1.5));
          else if (animation === 'dramatic_zoom') { if (animElapsed < fadeIn) animScale = 0.5 + (0.5 * (animElapsed / fadeIn)); }
        }

        let x = canvas.width / 2 + (titleXOffset * (canvas.width / 100));
        let y = canvas.height / 2 + (titleYOffset * (canvas.height / 100)) + animY;

        if (titleSettings.titlePosition === 'top') y = canvas.height * 0.2 + (titleYOffset * (canvas.height / 100)) + animY;
        if (titleSettings.titlePosition === 'bottom') y = canvas.height * 0.8 + (titleYOffset * (canvas.height / 100)) + animY;

        ctx.textBaseline = 'middle';
        if (titleSettings.titleAlign === 'left') {
          ctx.textAlign = 'left';
          x = canvas.width * 0.1 + (titleXOffset * (canvas.width / 100));
        } else if (titleSettings.titleAlign === 'right') {
          ctx.textAlign = 'right';
          x = canvas.width * 0.9 + (titleXOffset * (canvas.width / 100));
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
        applyEffect(finalKor, x, y, korSize, titleSettings.koreanColor || '#ffffff', titleOpacity);

        if (finalEng) {
          const engSize = (titleSettings.englishTitleSize / 100) * canvas.width * 0.05;
          const engOpacity = titleOpacity * 0.9;
          const engYOffset = korSize * titleSpacing;
          ctx.font = `700 ${engSize}px ${titleSettings.englishFont || 'sans-serif'}`;
          let engAnimY = 0;
          if (animation === 'wave') engAnimY = Math.sin(segmentTime * 3 + 1) * 15;
          applyEffect(finalEng, x, y + engYOffset + engAnimY, engSize, titleSettings.englishColor || '#ffffff', engOpacity);
        }
      }

      if ((isPlaying || isRecording) && parsedLyrics.flat.length > 0 && segmentTime >= (lyricsStartTime || 0)) {
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
            const isCurrentLine = index === Math.floor(lyricsProgress * parsedLyrics.flat.length);
            const lineProgress = isCurrentLine ? (segmentTime - (lyricsStartTime || 0)) / 3 : 0;
            const karaokeEffect = titleSettings?.lyricsEffect === 'karaoke';

            if (y > 0 && y < canvas.height && opacity > 0) {
              ctx.save();
              ctx.globalAlpha = opacity;

              if (karaokeEffect && isCurrentLine) {
                const lineDuration = 3.5; // Default for scroll mode
                const lineProgress = Math.min(1, (segmentTime - (index * (lyricsDuration / parsedLyrics.flat.length))) / lineDuration);

                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillText(line, canvas.width / 2, y);

                ctx.save();
                ctx.beginPath();
                const textWidth = ctx.measureText(line).width;
                const progressWidth = textWidth * Math.max(0, lineProgress);
                ctx.rect(canvas.width / 2 - textWidth / 2, y - lineSpacing, progressWidth, lineSpacing * 2);
                ctx.clip();
                ctx.fillStyle = karaokeColor;
                ctx.fillText(line, canvas.width / 2, y);
                ctx.restore();
              } else {
                ctx.fillStyle = hexToRgba(lColor, opacity);
                ctx.fillText(line, canvas.width / 2, y);
              }
              ctx.restore();
            }
          });
        } else {
          let currentPair;
          const totalDur = duration || audioDuration || 100;
          if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
            const lines = parsedLyrics.timedLines;
            let activeIdx = -1;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].time <= currentAudioTime) {
                activeIdx = i;
              } else {
                break;
              }
            }
            if (activeIdx !== -1) currentPair = lines[activeIdx];
            else currentPair = null;
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

            const karaokeEffect = titleSettings?.lyricsEffect === 'karaoke';
            const nextTime = parsedLyrics.timedLines?.[parsedLyrics.timedLines.indexOf(currentPair) + 1]?.time || (currentPair.time + 4);
            const lineDur = Math.max(1, nextTime - currentPair.time);
            const lineProgress = Math.min(1, (currentAudioTime - currentPair.time) / lineDur);

            const drawLyricsWithEffect = (text: string, x: number, y: number, fontSize: number, font: string, color: string, alpha: number) => {
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.font = `bold ${fontSize}px ${font}`;

              if (karaokeEffect) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillText(text, x, y);

                ctx.save();
                ctx.beginPath();
                const textWidth = ctx.measureText(text).width;
                const progressWidth = textWidth * Math.max(0, lineProgress);
                ctx.rect(x - textWidth / 2, y - fontSize, progressWidth, fontSize * 2);
                ctx.clip();
                ctx.fillStyle = karaokeColor;
                ctx.fillText(text, x, y);
                ctx.restore();
              } else {
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
              }
              ctx.restore();
            };

            if (currentPair.kor) {
              const kSize = canvas.width * (lyricsFontSize / 100);
              drawLyricsWithEffect(currentPair.kor, canvas.width / 2, baseY, kSize, lKorFont, hexToRgba(lColor, opacity), opacity);
            }
            if (currentPair.eng) {
              const eSize = canvas.width * (lyricsFontSize * 0.7 / 100);
              const eOpacity = opacity * 0.8;
              drawLyricsWithEffect(currentPair.eng, canvas.width / 2, baseY + lineSpacing * 0.8, eSize, lEngFont, hexToRgba(lColor, eOpacity), eOpacity);
            }
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      // v1.11.3: startTime 변경 시 즉시 재생 위치를 동기화하여 사용자 피드백 강화
      audioRef.current.currentTime = startTime;
    }
  }, [startTime]);

  // 재생 상태 관리용 별도 useEffect
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const audio = audioRef.current;
    if (!ctx || !audio) return;

    const img = new Image();
    const setupImage = (i: HTMLImageElement, useCors: boolean) => {
      if (useCors && !imageSrc.startsWith('data:') && !imageSrc.startsWith('blob:')) {
        i.crossOrigin = "anonymous";
      }
      i.src = imageSrc;
    };

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
        drawFrame(ctx, canvas, i, currentAudioTime);
        lastRenderTime = currentAudioTime;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    let i = img;
    img.onload = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      render();
    };

    img.onerror = () => {
      console.warn("VideoPlayer: Image load failed with CORS, retrying without CORS...");
      const fallbackImg = new Image();
      i = fallbackImg;
      fallbackImg.onload = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        render();
      };
      fallbackImg.src = imageSrc;
    };

    setupImage(img, true);

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
        playStartedTimeRef.current = 0; // [v1.15.30] 정지 시 리셋
      } else {
        if (audioRef.current.currentTime < startTime || (duration && audioRef.current.currentTime >= startTime + duration)) {
          audioRef.current.currentTime = startTime;
        }
        playStartedTimeRef.current = Date.now(); // [v1.15.30] 재생 시작 시점 기록
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
      // v1.11.3: 로드 완료 시 즉시 시작 지점으로 이동 (재생 위치 보장)
      audioRef.current.currentTime = startTime;
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

    // v1.12.23: Local Server Rendering Logic (Restored)
    if (videoEngine === 'ffmpeg-cloud') {
      if (addLog) addLog(`🔌 로컬 FFmpeg 서버(${videoRenderApiUrl})로 고화질 렌더링을 요청합니다...`);
      try {
        const payload = {
          assets: {
            audioUrl: audioSrc,
            imageUrl: imageSrc,
          },
          settings: {
            title,
            koreanTitle,
            englishTitle,
            lyrics,
            englishLyrics,
            timedLyrics,
            type,
            quality: '1080p',
            startTime,
            duration: duration || audioDuration || 30,
            titleSettings,
            lyricsStartTime,
            lyricsScrollEnd,
            lyricsFontSize,
            fadeInDuration,
            fadeOutDuration,
            karaokeColor
          },
          version: '1.12.23'
        };

        const response = await fetch(videoRenderApiUrl, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(err => {
          throw new Error(`[Network Error] 로컬 서버에 접속할 수 없습니다. 서버가 실행 중인지 확인하세요. (${err.message})`);
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`[Server Error] ${response.status} ${response.statusText}${errorData.error ? `: ${errorData.error}` : ''}`);
        }

        // v1.12.5: 서버가 JSON(URL) 대신 영상 파일(Blob)을 직접 보낼 경우 처리
        const contentType = response.headers.get('Content-Type');
        if (contentType && (contentType.includes('video') || contentType.includes('application/octet-stream'))) {
          if (addLog) addLog("✅ 렌더링 서버로부터 영상 파일을 직접 수신했습니다.");
          const blob = await response.blob();
          if (onRenderComplete) onRenderComplete(blob, type);
          setIsRecording(false);
          setRenderProgress(0);
          if (addLog) addLog(`🎬 [Local] ${type} 영상 수신 완료!`);
          return;
        }

        const result = await response.json().catch(() => ({}));
        if (result.videoUrl) {
          if (addLog) addLog("✅ 클라우드 렌더링 완료! 파일을 다운로드합니다.");

          const videoRes = await fetch(result.videoUrl).catch(err => {
            throw new Error(`[Download Error] 결과 파일 다운로드 실패: ${err.message}`);
          });
          const blob = await videoRes.blob();

          if (onRenderComplete) onRenderComplete(blob, type);

          setIsRecording(false);
          setRenderProgress(0);
          if (addLog) addLog(`🎬 [Cloud] ${type} 영상 다운로드 준비 완료!`);
        } else {
          throw new Error("서버에서 영상 데이터를 정상적으로 받지 못했습니다. (JSON 또는 Blob 형식이 아님)");
        }
      } catch (err: any) {
        console.error("Cloud Render Error:", err);
        if (addLog) addLog(`❌ 클라우드 렌더링 실패: ${err.message}`);
        setIsRecording(false);
      } finally {
        setIsRecording(false);
      }
      return;
    }

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

      ffmpeg.setProgress(({ ratio }: { ratio: number }) => {
        const progress = Math.round(ratio * 100);
        if (addLog && progress % 10 === 0) { // 10% 단위로 로그 출력
          addLog(`🎞️ 인코딩 진행 중... ${progress}%`);
        }
        if (onProgress) onProgress(90 + (ratio * 10)); // 90% ~ 100% 구간
      });

      // FFmpeg command to combine images and audio
      // -framerate 30 -i frame_%06d.jpg -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest out.mp4
      // FFmpeg command to combine images and audio
      // -framerate 30 -i frame_%06d.jpg -ss {startTime} -i audio.mp3 -c:v libx264 -pix_fmt yuv420p -c:a aac -t {totalDuration} -shortest out.mp4
      await ffmpeg.run(
        '-framerate', fps.toString(),
        '-i', 'frame_%06d.jpg',
        '-ss', startTime.toString(), // 오디오 시작점 맞추기
        '-i', 'audio.mp3',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-t', totalDuration.toString(), // 정확한 지속 시간 지정
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
      if (onRenderComplete) onRenderComplete(videoBlob, label || type);

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
