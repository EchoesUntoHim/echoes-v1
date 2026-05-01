import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const ProgressBar = ({ progress, color = "primary" }: { progress: number, color?: "primary" | "secondary" }) => (
  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
    <motion.div
      className={cn("h-full transition-all duration-500", color === "primary" ? "bg-primary" : "bg-secondary")}
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
    />
  </div>
);
