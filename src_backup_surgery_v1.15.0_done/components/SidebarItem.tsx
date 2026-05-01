import React from 'react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick: () => void;
  small?: boolean;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, small = false }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center rounded-xl transition-all duration-300 group tracking-wide",
      small ? "gap-2 px-3 py-2.5 text-xs font-bold" : "gap-3 px-4 py-3 font-bold",
      active 
        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,255,163,0.15)]" 
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className={cn("transition-transform group-hover:scale-110", small ? "w-4 h-4" : "w-5 h-5", active && "text-primary")} />
    <span style={{ fontFamily: "'Noto Sans KR', sans-serif" }} className={cn("mt-[1px]", small ? "text-xs" : "text-sm")}>{label}</span>
  </button>
);
