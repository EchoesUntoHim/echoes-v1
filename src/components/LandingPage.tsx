import React from 'react';
import { motion } from 'motion/react';
import { Zap, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#0B0E14]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[150px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-5xl space-y-10 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
          <Zap className="w-4 h-4 text-primary" fill="currentColor" />
          <span className="text-sm font-bold text-primary tracking-tight text-right">차세대 AI 콘텐츠 자동화 엔진</span>
          <span className="ml-2 text-[10px] font-black text-primary/40 border-l border-primary/20 pl-2">v1.15.12</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white">
          AI로 찬양을 만들고,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-secondary">
            예배 영상까지 한 번에
          </span> 완성하세요.
        </h1>

        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed">
          Echoes Unto Him은 하나님께 울려퍼지는 예배를 위해 음악 생성부터 영상 편집, 블로그 포스팅까지 모든 과정을 자동화합니다.<br className="hidden md:block" />
          예배자를 위한 압도적인 콘텐츠 자동화 솔루션.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-10">
          <button
            onClick={onStart}
            className="px-10 py-5 bg-primary text-background rounded-2xl font-black text-xl flex items-center gap-3 hover:scale-105 transition-transform neon-glow-primary shadow-2xl shadow-primary/30"
          >
            지금 시작하기 <ChevronRight className="w-6 h-6" />
          </button>
          <button className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-xl hover:bg-white/10 transition-all backdrop-blur-sm">
            데모 영상 보기
          </button>
        </div>

        <div className="pt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50">
          <div className="flex flex-col items-center gap-2">
            <p className="text-3xl font-black">1.2M+</p>
            <p className="text-xs font-bold text-gray-500">생성된 콘텐츠</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-3xl font-black">10K+</p>
            <p className="text-xs font-bold text-gray-500">작성된 블로그</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-3xl font-black">98%</p>
            <p className="text-xs font-bold text-gray-500">자동화 성공률</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-3xl font-black">24/7</p>
            <p className="text-xs font-bold text-gray-500">실시간 모니터링</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
