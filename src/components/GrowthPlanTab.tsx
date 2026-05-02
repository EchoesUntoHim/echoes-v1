import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Calendar, CheckCircle2 } from 'lucide-react';

interface GrowthPlanTabProps {
  addLog: (msg: string) => void;
}

export const GrowthPlanTab: React.FC<GrowthPlanTabProps> = ({ addLog }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" /> 성장플랜
          </h2>
          <p className="text-gray-400 mt-2 font-medium">영적 성장과 콘텐츠 확산을 위한 중장기 플랜을 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">목표 설정</h3>
          <p className="text-sm text-gray-400">콘텐츠 업로드 및 영적 성장 목표를 설정하고 관리합니다.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">업로드 일정</h3>
          <p className="text-sm text-gray-400">주간/월간 콘텐츠 발행 스케줄을 확인합니다.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">진행률 확인</h3>
          <p className="text-sm text-gray-400">설정된 목표 대비 현재 달성도를 시각적으로 확인합니다.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-gray-600" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-gray-300">현재 준비 중인 기능입니다.</h4>
          <p className="text-gray-500 text-sm max-w-md mt-2">
            보다 체계적인 채널 성장과 신앙 생활을 돕기 위한 성장플랜 기능이 곧 출시됩니다.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
