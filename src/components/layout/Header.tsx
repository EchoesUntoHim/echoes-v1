import React from 'react';
import { Zap, Menu, X } from 'lucide-react';

interface HeaderProps {
  setView: (view: 'landing' | 'app') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  setView,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}) => {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background z-30">
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => setView('landing')}
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow-primary group-hover:scale-110 transition-transform">
          <Zap className="text-background w-5 h-5" fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Echoes Unto Him
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[7px] font-black text-primary tracking-[0.2em] uppercase opacity-80">AI Vision</span>
            <div className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-0.5 shadow-[0_0_10px_rgba(0,255,163,0.1)]">
              <div className="w-0.5 h-0.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[7px] font-black text-primary uppercase">v1.12.23 PREMIUM</span>
            </div>
          </div>
        </div>
      </div>
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        className="p-2 bg-white/5 rounded-lg"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </div>
  );
};
