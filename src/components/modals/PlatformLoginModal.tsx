import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe } from 'lucide-react';

interface PlatformLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingPlatform: string | null;
  platforms: Record<string, string>;
  onConfirm: () => void;
}

export const PlatformLoginModal: React.FC<PlatformLoginModalProps> = ({
  isOpen,
  onClose,
  pendingPlatform,
  platforms,
  onConfirm
}) => {
  if (!pendingPlatform) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="platform-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1A1F26] border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {platforms[pendingPlatform] === 'connected' ? '연동 해제' : '플랫폼 연동'}
                </h3>
                <p className="text-sm text-gray-400">
                  {pendingPlatform === 'youtube' ? 'YouTube Data API v3' : pendingPlatform === 'tiktok' ? 'TikTok Content Posting API' : 'Instagram Graph API'}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-gray-300 leading-relaxed">
                {platforms[pendingPlatform] === 'connected'
                  ? `${pendingPlatform === 'youtube' ? '유튜브' : pendingPlatform === 'tiktok' ? '틱톡' : '인스타그램'} 계정 연동을 해제하시겠습니까?`
                  : `${pendingPlatform === 'youtube' ? '유튜브' : pendingPlatform === 'tiktok' ? '틱톡' : '인스타그램'} 계정으로 로그인하여 EchoesUntoHim에 영상 업로드 및 게시 권한을 허용하시겠습니까?`}
              </p>
              {platforms[pendingPlatform] === 'disconnected' && (
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-xs text-gray-400">
                  * 연동 시 EchoesUntoHim에서 제작한 영상을 해당 플랫폼에 직접 업로드할 수 있는 권한을 요청합니다.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-white/5 transition-all"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-primary text-background hover:neon-glow-primary transition-all"
              >
                {platforms[pendingPlatform] === 'connected' ? '연동 해제' : '로그인 및 허용'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
