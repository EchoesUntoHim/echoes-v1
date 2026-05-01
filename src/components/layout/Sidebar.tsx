import React from 'react';
import {
  Zap, RefreshCw, Type as TypeIcon, Music, Image as ImageIcon,
  Video, Send, FileText, Sparkles, Key, Users, Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SidebarItem } from '../SidebarItem';
import { Step } from '../../types';
import { User } from 'firebase/auth';

interface SidebarProps {
  view: 'landing' | 'app';
  setView: (view: 'landing' | 'app') => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  setIsResetModalOpen: (open: boolean) => void;
  activeTab: Step;
  handleTabChange: (tab: Step) => void;
  setIsApiKeyModalOpen: (open: boolean) => void;
  user: User | null;
  logout: () => void;
  signInWithGoogle: () => Promise<any>;
  setUser: (user: any) => void;
  addLog: (msg: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  setView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  setIsResetModalOpen,
  activeTab,
  handleTabChange,
  setIsApiKeyModalOpen,
  user,
  logout,
  signInWithGoogle,
  setUser,
  addLog
}) => {
  return (
    <aside className={cn(
      "fixed md:static inset-y-0 left-0 z-20 w-60 border-r border-white/5 p-4 flex flex-col gap-4 bg-background transition-transform duration-300 ease-in-out md:translate-x-0",
      isMobileMenuOpen ? "translate-x-0 top-[73px] h-[calc(100vh-73px)]" : "-translate-x-full h-full"
    )}>
      <div
        className="hidden md:flex items-center gap-2 px-2 cursor-pointer group"
        onClick={() => setView('landing')}
      >
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center neon-glow-primary group-hover:scale-110 transition-transform">
          <Zap className="text-background w-5 h-5" fill="currentColor" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 whitespace-nowrap">
            Echoes Unto Him
          </span>
          <span className="text-[10px] font-bold text-primary/60 mt-1">v1.15.29</span>
        </div>
      </div>

      <button
        onClick={() => setIsResetModalOpen(true)}
        className="mx-2 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-3 h-3" />
        데이터 전체 초기화
      </button>

      <nav className="flex-1 flex flex-col gap-1 min-h-0 overflow-y-auto pr-1">
        <SidebarItem small={true} icon={TypeIcon} label="가사 생성" active={activeTab === 'lyrics'} onClick={() => handleTabChange('lyrics')} />
        <SidebarItem small={true} icon={Music} label="음원 리스트" active={activeTab === 'music'} onClick={() => handleTabChange('music')} />
        <SidebarItem small={true} icon={ImageIcon} label="이미지 생성" active={activeTab === 'image'} onClick={() => handleTabChange('image')} />
        <SidebarItem small={true} icon={Video} label="영상 렌더링" active={activeTab === 'video'} onClick={() => handleTabChange('video')} />
        <SidebarItem small={true} icon={Send} label="영상 업로드" active={activeTab === 'publish'} onClick={() => handleTabChange('publish')} />
        <SidebarItem small={true} icon={FileText} label="블로그 생성" active={activeTab === 'blog'} onClick={() => handleTabChange('blog')} />
        <SidebarItem small={true} icon={Sparkles} label="1분 묵상(Factory)" active={activeTab === 'meditation'} onClick={() => handleTabChange('meditation')} />

        <div className="mt-2 pt-2 border-t border-white/5">
          <SidebarItem small={true} icon={Key} label="API 키 설정" active={false} onClick={() => { setIsApiKeyModalOpen(true); setIsMobileMenuOpen(false); }} />
        </div>
      </nav>

      <div className="mt-auto space-y-2">
        {user ? (
          <div className="px-2 py-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-2 mb-2">
            <div className="flex items-center gap-3">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{user.displayName || '사용자'}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all rounded-lg text-[10px] font-bold border border-white/5"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={async () => {
              try {
                const result = await signInWithGoogle();
                if (result.user) setUser(result.user);
              } catch (err: any) {
                if (err.code === 'auth/popup-closed-by-user') {
                  addLog(`❌ 로그인 팝업이 강제 종료되었습니다. (저장공간 부족일 수 있습니다. 설정에서 캐시를 비워보세요)`);
                } else {
                  addLog(`❌ 구글 로그인 실패: ${err.message || 'API 키 혹은 권한 문제'}`);
                }
                console.error("Firebase Login Error:", err);
              }
            }}
            className="w-full px-4 py-3 bg-primary text-background rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:neon-glow-primary transition-all mb-2"
          >
            <Users className="w-4 h-4" /> 구글 로그인
          </button>
        )}
        <SidebarItem icon={Settings} label="설정" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} />
      </div>
    </aside>
  );
};
