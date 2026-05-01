import React, { useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export const Terminal = ({ logs }: { logs: string[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
      ref={scrollRef}
      className="bg-black/40 rounded-xl border border-white/10 p-4 font-mono text-xs text-primary/80 h-40 overflow-y-auto space-y-1 scroll-smooth"
    >
      <div className="flex items-center gap-2 mb-2 text-gray-500 border-b border-white/5 pb-1 sticky top-0 bg-black/40 backdrop-blur-sm z-10">
        <TerminalIcon className="w-3 h-3" />
        <span>시스템 로그</span>
      </div>
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
          <span>{log}</span>
        </div>
      ))}
      {logs.length === 0 && <div className="text-gray-600 italic">대기 중...</div>}
    </div>
  );
};
