import React from 'react';
import { cn } from '../lib/utils';

export const GlassCard = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div 
    className={cn("bg-[#1A1F26]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl", className)}
    {...props}
  >
    {children}
  </div>
);
