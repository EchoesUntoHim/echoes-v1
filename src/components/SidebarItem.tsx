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
      "w-full flex items-center rounded-xl transition-all duration-300 group",
      small ? "gap-2 px-3 py-2 text-xs" : "gap-3 px-4 py-3",
      active 
        ? "bg-primary/10 text-primary border border-primary/20" 
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className={cn("transition-transform group-hover:scale-110", small ? "w-4 h-4" : "w-5 h-5", active && "text-primary")} />
    <span className={cn("font-medium", small ? "text-xs" : "")}>{label}</span>
  </button>
);
