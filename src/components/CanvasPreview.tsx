import React, { useRef, useEffect } from 'react';

interface CanvasPreviewProps {
  img: { url: string; localUrl?: string };
  settings: any;
  params: any;
  type: string;
}

export const CanvasPreview = ({ img, settings, params, type }: CanvasPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawCanvas = (loadedImg: HTMLImageElement) => {
      // Set fixed aspect ratio based on type
      const targetWidth = type === 'main' ? 1920 : 1080;
      const targetHeight = type === 'main' ? 1080 : 1920;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Apply "Cover" logic to match VideoPlayer
      const imgAspect = loadedImg.width / loadedImg.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawWidth, drawHeight;
      
      if (canvasAspect > imgAspect) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image with "Cover" logic
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.drawImage(loadedImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Apply dark overlay to match VideoPlayer
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const korTitle = (params.koreanTitle || "제목 없음").replace(/\[.*?\]/g, '').trim();
      const engTitle = params.englishTitle || "";

      const xOffset = settings.titleXOffset || 0;
      const yOffset = settings.titleYOffset || 0;
      const spacing = settings.titleSpacing !== undefined ? settings.titleSpacing : 0.8;

      let x = canvas.width / 2 + (xOffset * (canvas.width / 100));
      let y = canvas.height / 2 + (yOffset * (canvas.height / 100));
      
      if (settings.titlePosition === 'top') y = canvas.height * 0.2 + (yOffset * (canvas.height / 100));
      if (settings.titlePosition === 'bottom') y = canvas.height * 0.8 + (yOffset * (canvas.height / 100));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const applyEffect = (text: string, tx: number, ty: number, size: number, color: string) => {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        if (settings.titleEffect === 'shadow') {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
        } else if (settings.titleEffect === 'bold_shadow') {
          ctx.shadowColor = 'rgba(0,0,0,1)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetX = 6;
          ctx.shadowOffsetY = 6;
        } else if (settings.titleEffect === 'glow') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 40;
        } else if (settings.titleEffect === 'soft_glow') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
        } else if (settings.titleEffect === 'neon') {
          ctx.shadowColor = color;
          ctx.shadowBlur = 50;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeText(text, tx, ty);
        } else if (settings.titleEffect === 'cyber') {
          ctx.shadowColor = '#ff00ff';
          ctx.shadowBlur = 30;
          ctx.fillStyle = '#00ffff';
          ctx.fillText(text, tx - 2, ty - 2);
          ctx.shadowColor = '#00ffff';
          ctx.fillStyle = color;
        } else if (settings.titleEffect === 'glitch') {
          ctx.fillStyle = '#ff0000';
          ctx.fillText(text, tx - 4, ty);
          ctx.fillStyle = '#0000ff';
          ctx.fillText(text, tx + 4, ty);
          ctx.fillStyle = color;
        } else if (settings.titleEffect === 'gradient') {
          const grad = ctx.createLinearGradient(tx - size, ty, tx + size, ty);
          grad.addColorStop(0, color);
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(1, color);
          ctx.fillStyle = grad;
        } else if (settings.titleEffect === 'outline') {
          ctx.strokeStyle = 'black';
          ctx.lineWidth = size * 0.1;
          ctx.strokeText(text, tx, ty);
        }
        
        ctx.fillStyle = color;
        ctx.fillText(text, tx, ty);
        ctx.restore();
      };

      const korSize = (settings.koreanTitleSize / 100) * canvas.width * 0.08;
      ctx.font = `900 ${korSize}px ${settings.koreanFont || 'sans-serif'}`;
      applyEffect(korTitle, x, y, korSize, settings.koreanColor);

      if (engTitle) {
        const engSize = (settings.englishTitleSize / 100) * canvas.width * 0.05;
        ctx.font = `700 ${engSize}px ${settings.englishFont || 'sans-serif'}`;
        applyEffect(engTitle, x, y + korSize * spacing, engSize, settings.englishColor);
      }
    };

    const drawError = () => {
      ctx.fillStyle = '#1A1F26';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('이미지 로드 실패', canvas.width / 2, canvas.height / 2);
      ctx.font = '20px sans-serif';
      ctx.fillText('다시 생성하거나 업로드해주세요', canvas.width / 2, canvas.height / 2 + 50);
    };

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = img.localUrl || img.url;

    mainImg.onload = () => drawCanvas(mainImg);

    mainImg.onerror = () => {
      // CORS 에러 우회를 위해 새로운 Image 객체로 재시도
      const fallbackImg = new Image();
      fallbackImg.src = img.localUrl || img.url;
      fallbackImg.onload = () => drawCanvas(fallbackImg);
      fallbackImg.onerror = drawError;
    };
  }, [img, settings, params, type]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full object-contain transition-transform duration-500" 
    />
  );
};
