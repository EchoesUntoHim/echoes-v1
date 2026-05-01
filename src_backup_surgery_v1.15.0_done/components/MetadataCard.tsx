import React from 'react';
import { Copy } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface MetadataCardProps {
  title: string;
  content: string | any;
  onCopy: (t: string) => void;
  isTextArea?: boolean;
  isHtml?: boolean;
}

export const MetadataCard = ({ title, content, onCopy, isTextArea, isHtml }: MetadataCardProps) => {
  const safeContent = typeof content === 'string' ? content : JSON.stringify(content || '');
  
  const handleCopy = async () => {
    if (isHtml) {
      try {
        const blobHtml = new Blob([safeContent], { type: 'text/html' });
        const blobText = new Blob([safeContent.replace(/<[^>]*>?/gm, '')], { type: 'text/plain' });
        const clipboardItem = new (window as any).ClipboardItem({ 
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([clipboardItem]);
        alert('블로그 서식이 복사되었습니다. 에디터에 바로 붙여넣기(Ctrl+V) 하세요.');
      } catch (err) {
        console.error('HTML 복사 실패, 일반 텍스트로 복사합니다.', err);
        onCopy(safeContent);
      }
    } else {
      onCopy(safeContent);
    }
  };

  return (
    <GlassCard className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-gray-400">{title}</label>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <Copy className="w-3 h-3" /> 복사하기
        </button>
      </div>
      {isHtml ? (
        <div 
          className="w-full bg-white text-black border border-white/5 rounded-xl p-10 leading-relaxed min-h-[150px] prose prose-lg max-w-none overflow-x-auto shadow-inner blog-content-fancy"
          style={{ fontSize: '19px', fontFamily: "'Noto Sans KR', sans-serif" }}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      ) : isTextArea ? (
        <div className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap min-h-[150px]">
          {safeContent}
        </div>
      ) : (
        <div className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300 truncate">
          {safeContent}
        </div>
      )}
    </GlassCard>
  );
};
