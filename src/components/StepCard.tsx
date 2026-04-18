import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Zap } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { cn } from '../lib/utils';

interface StepCardProps {
  icon: any;
  title: string;
  status: 'idle' | 'loading' | 'done';
  progress: number;
}

export const StepCard = ({ icon: Icon, title, status, progress }: StepCardProps) => {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-300",
      status === 'done' ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/10"
    )}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={cn("w-5 h-5", status === 'done' ? "text-primary" : "text-gray-400")} />
        {status === 'done' && <CheckCircle2 className="w-4 h-4 text-primary" />}
        {status === 'loading' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}><Zap className="w-4 h-4 text-primary" /></motion.div>}
      </div>
      <p className="font-bold text-sm mb-2">{title}</p>
      <ProgressBar progress={progress} />
    </div>
  );
};
