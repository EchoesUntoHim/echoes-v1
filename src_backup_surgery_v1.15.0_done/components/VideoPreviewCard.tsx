import React from 'react';
import { Play, Download } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../lib/utils';

interface VideoPreviewCardProps {
  title: string;
  type: string;
  count?: number;
}

export const VideoPreviewCard = ({ title, type, count }: VideoPreviewCardProps) => {
  return (
    <GlassCard className="p-4 space-y-4 group">
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-black/40 flex items-center justify-center",
        type === '메인' ? "aspect-video" : "aspect-[9/16] max-w-[50%] mx-auto"
      )}>
        <Play className="w-10 h-10 text-primary/40 group-hover:text-primary transition-colors" fill="currentColor" />
        {count && <div className="absolute top-2 right-2 bg-primary text-background text-[10px] font-black px-2 py-1 rounded-full">{count}개 생성됨</div>}
      </div>
      <div className="flex justify-between items-center">
        <p className="font-bold text-sm">{title}</p>
        <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10"><Download className="w-4 h-4" /></button>
      </div>
    </GlassCard>
  );
};
