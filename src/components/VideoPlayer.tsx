import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo, memo } from 'react';
import { Play, Pause, Download, Maximize, Music, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoPlayerProps {
  imageSrc: string | null;
  audioSrc: string | null;
  lyrics: string;
  englishLyrics?: string;
  timedLyrics?: any[];
  type: 'main' | 'tiktok' | 'shorts';
  startTime?: number;
  duration?: number;
  onEnded?: () => void;
  title?: string;
  label?: string;
  koreanTitle?: string;
  englishTitle?: string;
  titleSettings?: any;
  showTitle?: boolean;
  lyricsStartTime?: number;
  lyricsScrollEnd?: number;
  lyricsFontSize?: number;
  addLog?: (msg: string) => void;
  originalFileName?: string;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

const VideoPlayer = memo(forwardRef(({
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
  const isRecordingRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      // Trigger a redraw if not playing
      if (!isPlaying && !isRecording) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && audioRef.current) renderFrame(ctx, canvas, audioRef.current, img);
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useImperativeHandle(ref, () => ({
    download: handleDownload,
    isPlaying: isPlaying,
    isRecording: isRecording
  }));

  const parsedLyrics = useMemo(() => {
    if (timedLyrics && timedLyrics.length > 0) {
      const korLines: string[] = [];
      const engLines: string[] = [];
      const pairs: { kor: string; eng: string }[] = [];
      timedLyrics.forEach(item => {
        korLines.push(item.kor || '');
        engLines.push(item.eng || '');
        pairs.push({ kor: item.kor || '', eng: item.eng || '' });
      });

      return { 
        flat: [...korLines, ...engLines], 
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
    const korLines = lyrics.split('\n').map(line => line.replace(timeRegex, '').trim());
    const engLines = englishLyrics.split('\n').map(line => line.replace(timeRegex, '').trim());
    
    const timedLines: {time: number, kor: string, eng: string}[] = [];
    lyrics.split('\n').forEach((line, idx) => {
      const match = line.match(timeRegex);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseInt(match[2]);
        timedLines.push({
          time,
          kor: line.replace(timeRegex, '').trim(),
          eng: engLines[idx] || ''
        });
      }
    });

    const pairs = korLines.map((kor, i) => ({ kor, eng: engLines[i] || "" }));
    return { flat: [...korLines, ...engLines], pairs, timedLines };
  }, [lyrics, englishLyrics, timedLyrics]);

  // Handle start time sync when not playing
  useEffect(() => {
    if (audioRef.current && !isPlaying && !isRecording) {
      audioRef.current.currentTime = startTime;
    }
  }, [startTime, isPlaying, isRecording]);

  // Unified render function
  const renderFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, audio: HTMLAudioElement, img: HTMLImageElement) => {
    const currentAudioTime = audio.currentTime;
    const segmentTime = currentAudioTime - (startTime || 0);

    // End check
    if (duration && currentAudioTime >= startTime + duration) {
      audio.pause();
      setIsPlaying(false);
      if (onEnded) onEnded();
      return false; // Stop loop
    }

    // Audio Fade
    const fadeOutSec = fadeOutDuration || 0;
    const fadeInSec = fadeInDuration || 0;
    if (fadeInSec > 0 && segmentTime < fadeInSec) {
      audio.volume = Math.min(1, segmentTime / fadeInSec);
    } else if (fadeOutSec > 0 && duration && segmentTime > duration - fadeOutSec) {
      const fadeOutProgress = (segmentTime - (duration - fadeOutSec)) / fadeOutSec;
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
    if (imageSrc && img.width > 0 && img.height > 0) {
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
    }
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
          ctx.shadowColor = color; ctx.shadowBlur = 40;
        } else if (titleSettings.titleEffect === 'soft_glow') {
          ctx.shadowColor = color; ctx.shadowBlur = 15;
        } else if (titleSettings.titleEffect === 'neon') {
          ctx.shadowColor = color; ctx.shadowBlur = 50; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeText(text, tx, ty);
        } else if (titleSettings.titleEffect === 'cyber') {
          ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 30; ctx.fillStyle = '#00ffff'; ctx.fillText(text, tx - 2, ty - 2); ctx.shadowColor = '#00ffff'; ctx.fillStyle = color;
        } else if (titleSettings.titleEffect === 'glitch') {
          ctx.fillStyle = '#ff0000'; ctx.fillText(text, tx - 4, ty); ctx.fillStyle = '#0000ff'; ctx.fillText(text, tx + 4, ty); ctx.fillStyle = color;
        } else if (titleSettings.titleEffect === 'gradient') {
          const grad = ctx.createLinearGradient(tx - size, ty, tx + size, ty);
          grad.addColorStop(0, color); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, color); ctx.fillStyle = grad;
        } else if (titleSettings.titleEffect === 'outline') {
          ctx.strokeStyle = 'black'; ctx.lineWidth = size * 0.1; ctx.strokeText(text, tx, ty); ctx.fillStyle = color;
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
      const finalKorTitle = (koreanTitle || title).replace(/\[.*?\]/g, '').trim();
      applyEffect(finalKorTitle, x, y, korSize, titleSettings.koreanColor || '#ffffff');

      if (englishTitle) {
        const engSize = (titleSettings.englishTitleSize / 100) * canvas.width * 0.05;
        ctx.font = `700 ${engSize}px ${titleSettings.englishFont || 'sans-serif'}`;
        applyEffect(englishTitle, x, y + korSize * spacing, engSize, titleSettings.englishColor || '#ffffff');
      }
    } else if (showTitle && title) {
      ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${canvas.width * 0.06}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10; ctx.fillText(title, canvas.width / 2, canvas.height * 0.15);
      ctx.shadowBlur = 0;
    }

    // Lyrics
    if (parsedLyrics.flat.length > 0 && segmentTime >= lyricsStartTime) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = `bold ${canvas.width * (lyricsFontSize / 100)}px sans-serif`;

      const displayMode = titleSettings?.lyricsDisplayMode || 'fade';
      const currentTimeForSync = currentAudioTime;

      if (displayMode === 'scroll') {
        const lineSpacing = canvas.height * (lyricsFontSize / 40);
        const endPosition = canvas.height * (lyricsScrollEnd / 100);
        const startOffset = canvas.height * 0.8;
        
        let activeIdx = 0;
        if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
          for (let i = 0; i < parsedLyrics.timedLines.length; i++) {
            if (parsedLyrics.timedLines[i].time <= currentTimeForSync) activeIdx = i; else break;
          }
        } else {
          const validDur = audio.duration && !isNaN(audio.duration) ? audio.duration : 100;
          activeIdx = Math.floor((currentTimeForSync / validDur) * parsedLyrics.flat.length);
        }

        const currentYOffset = activeIdx * lineSpacing;
        parsedLyrics.flat.forEach((line: string, index: number) => {
          if (!line) return;
          const y = startOffset + (index * lineSpacing) - currentYOffset;
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
            ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10; ctx.fillText(line, canvas.width / 2, y); ctx.shadowBlur = 0;
          }
        });
      } else {
        let currentPair;
        let pairProgress = 0;
        if (parsedLyrics.timedLines && parsedLyrics.timedLines.length > 0) {
          const lines = parsedLyrics.timedLines;
          let activeIdx = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].time <= currentTimeForSync) activeIdx = i; else break;
          }
          currentPair = lines[activeIdx];
          const nextTime = lines[activeIdx + 1]?.time || audio.duration || currentTimeForSync + 5;
          const lineDuration = nextTime - lines[activeIdx].time;
          pairProgress = lineDuration > 0 ? (currentTimeForSync - lines[activeIdx].time) / lineDuration : 0;
        }

        if (currentPair) {
          let opacity = 1;
          if (displayMode === 'fade') {
            if (pairProgress < 0.1) opacity = pairProgress / 0.1;
            else if (pairProgress > 0.9) opacity = (1 - pairProgress) / 0.1;
          }
          const lineSpacing = canvas.height * (lyricsFontSize / 40);
          let baseY = canvas.height * 0.8;
          if (displayMode === 'center') baseY = canvas.height * 0.5;
          if (displayMode === 'bottom') baseY = canvas.height * 0.9;

          ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
          if (currentPair.kor) {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`; ctx.fillText(currentPair.kor, canvas.width / 2, baseY);
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


    return true; // Continue loop
  };

  // Serialize titleSettings to prevent re-render on same-value object reference change
  const titleSettingsStr = JSON.stringify(titleSettings);

  // 1. STATIC RENDER EFFECT (Draw once on load/change)
  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set fixed aspect ratio
    const targetWidth = type === 'main' ? 1920 : 1080;
    const targetHeight = type === 'main' ? 1080 : 1920;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    if (!isPlaying && !isRecording) {
      if (imgRef.current) {
        renderFrame(ctx, canvas, audio, imgRef.current);
      } else if (imageSrc) {
        // imgRef not yet set — load image and draw immediately
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = "anonymous";
        fallbackImg.onload = () => {
          imgRef.current = fallbackImg;
          renderFrame(ctx, canvas, audio, fallbackImg);
        };
        fallbackImg.src = imageSrc;
      }
    }
  }, [imageSrc, type, startTime, duration, title, showTitle, titleSettingsStr, koreanTitle, englishTitle, lyricsStartTime, lyricsScrollEnd, lyricsFontSize, isPlaying, isRecording]);

  // 2. ANIMATION LOOP EFFECT (Only when playing/recording)
  useEffect(() => {
    if (!isPlaying && !isRecording) return;

    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const loop = () => {
      if (!imgRef.current) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }
      const shouldContinue = renderFrame(ctx, canvas, audio, imgRef.current);
      if (shouldContinue && (isPlaying || isRecordingRef.current)) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    loop();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, isRecording, imageSrc, type, startTime, duration, title, showTitle, titleSettings, koreanTitle, englishTitle, lyricsStartTime, lyricsScrollEnd, lyricsFontSize, fadeInDuration, fadeOutDuration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setAudioDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      // Trigger a manual draw when seeking while paused
      if (!isPlaying && !isRecording) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = imageSrc || '';
          img.onload = () => renderFrame(ctx, canvas, audioRef.current!, img);
        }
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;

    setIsRecording(true);
    const stream = canvas.captureStream(30);
    let audioStream;
    if ((audio as any).captureStream) audioStream = (audio as any).captureStream();
    else if ((audio as any).mozCaptureStream) audioStream = (audio as any).mozCaptureStream();
    if (audioStream) audioStream.getAudioTracks().forEach((track: any) => stream.addTrack(track));

    const getMime = () => {
      const types = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
      for (const t of types) if (MediaRecorder.isTypeSupported(t)) return t;
      return '';
    };

    const mimeType = getMime();
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 8000000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : (title || 'video');
      const fileName = `${baseName} ${label || type}.${extension}`;
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.body.appendChild(a); a.click();
        setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); window.open(url, '_blank'); }, 500);
      } else {
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIsRecording(false);
      if (addLog) addLog(`✅ ${label || '비디오'} 다운로드가 완료되었습니다.`);
    };

    audio.volume = 0;
    audio.currentTime = startTime;

    // Start recorder first (captures silence), then play audio to avoid pop
    setTimeout(() => {
      if (recorder.state === 'inactive') recorder.start();
      setTimeout(() => {
        audio.play().then(() => {
          setIsPlaying(true);
          // Ramp volume 0→1 over 300ms to prevent any pop
          if (!fadeInDuration || fadeInDuration === 0) {
            const rampSteps = 30;
            let step = 0;
            const ramp = setInterval(() => {
              step++;
              audio.volume = Math.min(1, step / rampSteps);
              if (step >= rampSteps) clearInterval(ramp);
            }, 10);
          }
        }).catch(() => {});
      }, 250);
    }, 200);

    const stopRec = () => { if (recorder.state !== 'inactive') { recorder.stop(); audio.pause(); setIsPlaying(false); } };
    if (duration) setTimeout(stopRec, duration * 1000);
    else audio.onended = stopRec;
  };

  return (
    <div className={cn("relative group rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl", type === 'main' ? "aspect-video" : "aspect-[9/16] max-h-[70vh]")} ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="w-12 h-12 bg-primary text-background rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/20">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              <input type="range" min={startTime} max={startTime + (duration || audioDuration)} step="0.1" value={currentTime} onChange={handleSeek} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                <span>{Math.floor((duration || audioDuration) / 60)}:{( (duration || audioDuration) % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <div className="flex flex-col">
              <span className="text-xs font-black text-primary uppercase tracking-widest">{label || type} PREVIEW</span>
              <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{title || 'No Title'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleDownload} disabled={isRecording} className="text-white hover:text-primary transition-colors disabled:opacity-50">
                {isRecording ? <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" /> : <Download className="w-5 h-5" />}
              </button>
              <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={audioSrc || undefined} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => { setIsPlaying(false); if (onEnded) onEnded(); }} />
    </div>
  );
}));

export { VideoPlayer };
