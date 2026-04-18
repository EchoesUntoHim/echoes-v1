import React from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlatformToggleProps {
  label: string;
  status: 'connected' | 'disconnected';
  onToggle: () => void;
  description: string;
  onHelp?: () => void;
}

export const PlatformToggle = ({ label, status, onToggle, description, onHelp }: PlatformToggleProps) => {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-2.5 h-2.5 rounded-full", status === 'connected' ? "bg-primary neon-glow-primary" : "bg-gray-600")} />
          <span className="font-bold text-lg">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {onHelp && (
            <button 
              onClick={onHelp}
              className="p-2 text-gray-500 hover:text-primary transition-colors"
              title="연동 가이드 보기"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={onToggle}
            className={cn(
            "px-5 py-2 rounded-xl text-xs font-black transition-all",
            status === 'connected' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-primary text-background hover:scale-105 active:scale-95"
          )}>
            {status === 'connected' ? "연동 해제" : "연동하기"}
          </button>
        </div>
      </div>
      <div className="pl-5 text-sm text-gray-400 leading-relaxed border-l-2 border-white/10 ml-1 group-hover:border-primary/30 transition-colors">
        {description}
      </div>
    </div>
  );
};
