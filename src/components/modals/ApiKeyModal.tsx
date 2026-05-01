import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, CheckCircle2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onSave: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  apiKey, 
  setApiKey, 
  onSave 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="api-key-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0A0F16] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">API 키 설정</h2>
                <p className="text-sm text-gray-400">Gemini API 키를 입력해주세요.</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
              />
              <p className="text-[10px] text-gray-500 leading-relaxed px-1">
                설정에서 사용할 키를 변경할 수 있으며, 할당량이 재설정되면 무료 생성으로 자동 전환됩니다.
              </p>
              <button
                onClick={onSave}
                className="w-full bg-primary text-background py-3 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                저장 및 계속하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
