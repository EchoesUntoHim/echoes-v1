import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Download,
  Maximize
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TitleSettings } from '../types';

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
  fadeOutDuration = 0
}: any, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useImperativeHandle(ref, () => ({
    download: handleDownload,
    isPlaying: isPlaying,
    isRecording: isRecording
  }));

  const parsedLyrics = useMemo(() => {
    // 1. Prioritize structured timedLyrics if provided
    if (timedLyrics && timedLyrics.length > 0) {
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

    const timeRegex = /\[(\d{2}):(\d{2})\]/;

    const parseTimedLines = (text: string) => {
      const lines = text.split('\n');
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

    const korLines = lyrics.split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);
    const engLines = englishLyrics.split('\n').map((line: string) => line.replace(/\[.*?\]|\(.*?\)/g, '').trim()).filter(l => l);

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

  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.currentTime = startTime;
    }
  }, [startTime, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !imageSrc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    let animationFrameId: number;
    let lastRenderTime = -1;

    const render = () => {
      const currentAudioTime = audio.currentTime;
      const segmentTime = currentAudioTime - (startTime || 0);

      if (duration && currentAudioTime >= startTime + duration) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
          if (onEnded) onEnded();
        }
        // Do not return here to keep the loop alive for manual seeking
      }

      // GPU 최적화: 오디오 시간이 변경되지 않았으면(일시정지 상태) 무거운 그리기 연산 생략
      if (currentAudioTime === lastRenderTime) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = currentAudioTime;

      // v1.5.6: 개별 설정 기반 오디오 페이드
      const audioFadeIn = fadeInDuration; 
      const audioFadeOut = fadeOutDuration;

      if (segmentTime < audioFadeIn) {
        audio.volume = Math.min(1, segmentTime / audioFadeIn);
      } else if (duration && currentAudioTime >= startTime + duration - audioFadeOut) {
        const fadeOutProgress = (currentAudioTime - (startTime + duration - audioFadeOut)) / audioFadeOut;
        audio.volume = Math.max(0, 1 - fadeOutProgress);
      } else {
        audio.volume = 1;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const validAudioDuration = !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 100;
      const totalDuration = duration || validAudioDuration;
      const progress = totalDuration > 0 ? Math.max(0, currentAudioTime - startTime) / totalDuration : 0;
      const scale = 1.0 + (progress * 0.1);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
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
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Title
      if (showTitle && titleSettings) {
        const xOffset = titleSettings.titleXOffset || 0;
        const yOffset = titleSettings.titleYOffset || 0;
        const spacing = titleSettings.titleSpacing !== undefined ? titleSettings.titleSpacing : 0.8;

        let x = canvas.width / 2 + (xOffset * (canvas.width / 100));
        let y = canvas.height / 2 + (yOffset * (canvas.height / 100));

        if (titleSettings.titlePosition === 'top') y = canvas.height * 0.2 + (yOffset * (canvas.height / 100));
        if (titleSettings.titlePosition === 'bottom') y = canvas.height * 0.8 + (yOffset * (canvas.height / 100));

        ctx.textBaseline = 'middle';

        // Handle Alignment
        if (titleSettings.titleAlign === 'left') {
          ctx.textAlign = 'left';
          x = canvas.width * 0.1 + (xOffset * (canvas.width / 100));
        } else if (titleSettings.titleAlign === 'right') {
          ctx.textAlign = 'right';
          x = canvas.width * 0.9 + (xOffset * (canvas.width / 100));
        } else {
          ctx.textAlign = 'center';
        }

        const applyEffect = (text: string, tx: number, ty: number, size: number, color: string) => {
          ctx.save();
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          if (titleSettings.titleEffect === 'shadow') {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
          } else if (titleSettings.titleEffect === 'bold_shadow') {
            ctx.shadowColor = 'rgba(0,0,0,1)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 6;
            ctx.shadowOffsetY = 6;
          } else if (titleSettings.titleEffect === 'glow') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 40;
          } else if (titleSettings.titleEffect === 'soft_glow') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
          } else if (titleSettings.titleEffect === 'neon') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 50;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeText(text, tx, ty);
          } else if (titleSettings.titleEffect === 'cyber') {
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 30;
            ctx.fillStyle = '#00ffff';
            ctx.fillText(text, tx - 2, ty - 2);
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = color;
          } else if (titleSettings.titleEffect === 'glitch') {
            ctx.fillStyle = '#ff0000';
            ctx.fillText(text, tx - 4, ty);
            ctx.fillStyle = '#0000ff';
            ctx.fillText(text, tx + 4, ty);
            ctx.fillStyle = color;
          } else if (titleSettings.titleEffect === 'gradient') {
            const grad = ctx.createLinearGradient(tx - size, ty, tx + size, ty);
            grad.addColorStop(0, color);
            grad.addColorStop(0.5, '#ffffff');
            grad.addColorStop(1, color);
            ctx.fillStyle = grad;
          } else if (titleSettings.titleEffect === 'outline') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = size * 0.1;
            ctx.strokeText(text, tx, ty);
            ctx.fillStyle = color;
          } else {
            ctx.fillStyle = color;
          }

          if (titleSettings.titleEffect !== 'gradient' && titleSettings.titleEffect !== 'cyber' && titleSettings.titleEffect !== 'glitch') {
            ctx.fillStyle = color;
          }

          ctx.fillText(text, tx, ty);
          ctx.restore();
        };

        const korSize = (titleSettings.koreanTitleSize / 100) * canvas.width * 0.08;
        ctx.font = `900 ${korSize}px ${titleSettings.koreanFont || 'sans-serif'}`;
        applyEffect(koreanTitle || title, x, y, korSize, titleSettings.koreanColor || '#ffffff');

        if (englishTitle) {
          const engSize = (titleSettings.englishTitleSize / 100) * canvas.width * 0.05;
          ctx.font = `700 ${engSize}px ${titleSettings.englishFont || 'sans-serif'}`;
          applyEffect(englishTitle, x, y + korSize * spacing, engSize, titleSettings.englishColor || '#ffffff');
        }
      } else if (showTitle && title) {
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${canvas.width * 0.06}px sans-serif`;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(title, canvas.width / 2, canvas.height * 0.15);
        ctx.shadowBlur = 0;
      }

      if (parsedLyrics.flat.length > 0 && segmentTime >= lyricsStartTime) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `bold ${canvas.width * (lyricsFontSize / 100)}px sans-serif`;

        const displayMode = titleSettings?.lyricsDisplayMode || 'scroll';
        const validAudioDuration = audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity ? audio.duration : 100;
        const totalDuration = duration || validAudioDuration;
        const lyricsDuration = totalDuration - lyricsStartTime;
        const lyricsProgress = lyricsDuration > 0 ? (segmentTime - lyricsStartTime) / lyricsDuration : 0;

        if (displayMode === 'scroll') {
          const lineSpacing = canvas.height * (lyricsFontSize / 40);
          const endPosition = canvas.height * (lyricsScrollEnd / 100);
          const startOffset = canvas.height * 0.8;
          const totalScrollDistance = startOffset - endPosition + ((parsedLyrics.flat.length - 1) * lineSpacing);
          const currentYOffset = lyricsProgress * totalScrollDistance;

          parsedLyrics.flat.forEach((line: string, index: number) => {
            if (!line) return;
            const startY = startOffset + (index * lineSpacing);
            const y = startY - currentYOffset;

            const fadeOutEnd = endPosition;
            const fadeOutStart = endPosition + (canvas.height * 0.15);
            const fadeInStart = canvas.height * 0.9;
            const fadeInEnd = canvas.height * 0.8;

            let opacity = 1;
            if (y < fadeOutEnd) opacity = 0;
            else if (y < fadeOutStart) opacity = (y - fadeOutEnd) / (fadeOutStart - fadeOutEnd);

            if (y > fadeInStart) opacity = 0;
            else if (y > fadeInEnd) opacity = Math.min(opacity, (fadeInStart - y) / (fadeInStart - fadeInEnd));

            if (y > 0 && y < canvas.height && opacity > 0) {
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.shadowColor = 'rgba(0,0,0,0.8)';
              ctx.shadowBlur = 10;
              ctx.fillText(line, canvas.width / 2, y);
              ctx.shadowBlur = 0;
            }
          });
        } else {
          // Fade, Center, Bottom modes
          let currentPair;
          let pairProgress = 0;
          let nextTime = totalDuration;

          if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
            const lines = parsedLyrics.timedLines;
            let activeIdx = 0;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].time <= currentAudioTime) {
                activeIdx = i;
              } else {
                break;
              }
            }
            currentPair = lines[activeIdx];

            nextTime = lines[activeIdx + 1]?.time || totalDuration;
            const lineDuration = nextTime - lines[activeIdx].time;
            pairProgress = lineDuration > 0 ? (currentAudioTime - lines[activeIdx].time) / lineDuration : 0;
          } else {
            const pairCount = parsedLyrics.pairs.length;
            const pairIndex = Math.min(pairCount - 1, Math.floor(lyricsProgress * pairCount));
            const p = parsedLyrics.pairs[pairIndex];
            if (p) {
              currentPair = { kor: p.kor, eng: p.eng };
              pairProgress = (lyricsProgress * pairCount) % 1;
              // For non-timed lyrics, nextTime is approximated by pair progress
              nextTime = startTime + lyricsStartTime + (lyricsDuration * ((pairIndex + 1) / pairCount));
            }
          }

          if (currentPair) {
            let opacity = 1;

            if (displayMode === 'fade') {
              const fadeDur = 0.5;
              const timeSinceStart = currentAudioTime - currentPair.time;
              const timeUntilEnd = nextTime - currentAudioTime;
              // v1.5.2: 숏츠(시작시간) 이전 자막은 페이드인 생략하여 즉시 표시
              if (timeSinceStart < fadeDur && currentPair.time > startTime) {
                opacity = timeSinceStart / fadeDur;
              } else if (timeUntilEnd < fadeDur) {
                opacity = timeUntilEnd / fadeDur;
              }
            }

            const lineSpacing = canvas.height * (lyricsFontSize / 40);
            let baseY = canvas.height * 0.8;
            if (displayMode === 'center') baseY = canvas.height * 0.5;
            if (displayMode === 'bottom') baseY = canvas.height * 0.9;

            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 10;

            if (currentPair.kor) {
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.fillText(currentPair.kor, canvas.width / 2, baseY);
            }
            if (currentPair.eng) {
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
              ctx.font = `bold ${canvas.width * (lyricsFontSize * 0.7 / 100)}px sans-serif`;
              ctx.fillText(currentPair.eng, canvas.width / 2, baseY + lineSpacing * 0.8);
            }
            ctx.shadowBlur = 0;
          }
        }
      }

      // v1.5.6: 시각적 블랙 페이드인 제거 (사용자 요청)
      // visualOpacity 관련 로직 삭제됨

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
  }, [imageSrc, isPlaying, parsedLyrics, type, startTime, duration, onEnded, title, showTitle, titleSettings, koreanTitle, englishTitle, lyricsStartTime, lyricsScrollEnd, lyricsFontSize]);

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

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    setIsRecording(true);

    // Create a stream from canvas
    const stream = canvas.captureStream(30);

    // Try to capture audio stream
    let audioStream;
    if ((audio as any).captureStream) {
      audioStream = (audio as any).captureStream();
    } else if ((audio as any).mozCaptureStream) {
      audioStream = (audio as any).mozCaptureStream();
    }

    if (audioStream) {
      audioStream.getAudioTracks().forEach((track: any) => stream.addTrack(track));
    }

    // Determine the best supported mime type (prefer mp4 for mobile/iOS compatibility)
    const getSupportedMimeType = () => {
      const types = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return '';
    };

    const mimeType = getSupportedMimeType();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

    // GPU Acceleration Hint: Use high bitrate and specific codecs
    const recorderOptions: MediaRecorderOptions = {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 8000000, // 8Mbps for high quality / GPU usage
      audioBitsPerSecond: 128000   // 128kbps for clear audio
    };

    const recorder = new MediaRecorder(stream, recorderOptions);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : (title || 'video');
      const fileName = `${baseName} ${label || type}.${extension}`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // On mobile, we try to click but also provide a fallback
        // Some browsers require the element to be in the DOM
        document.body.appendChild(a);
        a.click();

        // Fallback: if it's a blob, opening in a new tab can sometimes trigger the system download UI
        // or at least show the video so the user can long-press to save.
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
          // If the user is still on the page, maybe the download didn't start
          // We can't know for sure, but opening in new tab is a common mobile fallback
          window.open(url, '_blank');
        }, 500);
      } else {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIsRecording(false);
      if (addLog) addLog(`✅ ${label || '비디오'} 다운로드가 완료되었습니다.`);
    };

    // v1.5.2: 음튐 해결 - 볼륨 0에서 시작 후 빠르게 램프업
    audio.currentTime = startTime;
    audio.volume = 0; // 팝 노이즈 방지를 위해 0으로 시작

    audio.play().then(() => {
      setIsPlaying(true);
      recorder.start(); // 즉시 녹화 시작 (딜레이 없음)
      // 100ms 동안 볼륨 0→1 램프업으로 팝 노이즈 제거
      let vol = 0;
      const rampTimer = setInterval(() => {
        vol = Math.min(1, vol + 0.1);
        if (audio) audio.volume = vol;
        if (vol >= 1) clearInterval(rampTimer);
      }, 10);
    }).catch(e => {
      console.error("Playback failed during download:", e);
      if (recorder.state === 'inactive') recorder.start();
      audio.volume = 1;
    });

    // Stop recording when duration is reached or audio ends
    const stopRecording = () => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
        audio.pause();
        setIsPlaying(false);
      }
    };

    if (duration) {
      setTimeout(stopRecording, duration * 1000);
    } else {
      audio.onended = stopRecording;
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
        className="w-full h-full object-cover"
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
        "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity pointer-events-none",
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
