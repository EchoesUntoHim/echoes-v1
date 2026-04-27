import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, CheckCircle2, Info, Copy, HelpCircle, X, ExternalLink, Youtube, Music2, Share2, Globe, FileText, Trash2, AlertCircle } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Terminal } from './Terminal';
import { PlatformToggle } from './PlatformToggle';
import { cn } from '../lib/utils';
import { AI_ENGINES, IMAGE_ENGINES, MUSIC_ENGINES, VIDEO_ENGINES } from '../constants';

interface SettingsPageProps {
  onOpenKeySelection: () => void;
  platforms: {
    youtube: 'connected' | 'disconnected';
    tiktok: 'connected' | 'disconnected';
    naver: 'connected' | 'disconnected';
    tistory: 'connected' | 'disconnected';
    google: 'connected' | 'disconnected';
  };
  togglePlatform: (key: 'youtube' | 'tiktok' | 'naver' | 'tistory' | 'google') => void;
  aiEngine: string;
  setAiEngine: (engine: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  musicEngine: string;
  setMusicEngine: (engine: string) => void;
  imageEngine: string;
  setImageEngine: (engine: string) => void;
  videoEngine: string;
  setVideoEngine: (engine: string) => void;
  videoQuality: string;
  setVideoQuality: (quality: string) => void;
  audioFadeIn: number;
  setAudioFadeIn: (seconds: number) => void;
  audioFadeOut: number;
  setAudioFadeOut: (seconds: number) => void;
  onReset: () => void;
  availableModels?: { value: string, label: string, type?: string }[];
  fetchAvailableModels?: () => void;
  copyToClipboard?: (text: string) => void;
  logs?: string[];
  tiktokAccessToken?: string | null;
  setTiktokAccessToken?: (token: string | null) => void;
}

const GUIDES = {
  tiktok: {
    title: "✨ 틱톡(TikTok) 연동 - 왕초보 탈출 가이드",
    steps: [
      "1. [틱톡 개발자 센터](https://developers.tiktok.com/)에 접속해서 내 틱톡 아이디로 로그인하세요.",
      "2. 화면 위쪽 'My Apps'를 누르고 'Connect New App' (새 앱 연결) 버튼을 클릭하세요.",
      "3. 앱 이름은 자유롭게 적으시고 'Create'를 눌러 앱을 만듭니다.",
      "4. 왼쪽 메뉴에서 'Products'를 누른 뒤, 'Video Kit' 옆의 'Add' 버튼을 꼭! 눌러주세요.",
      "5. 이제 'App Details' 화면에 보이는 'Client Key'와 'Client Secret'을 아래 칸에 입력하세요.",
      "6. '키 저장 및 연동' 버튼을 누르면 끝!"
    ],
    link: "https://developers.tiktok.com/console/app"
  },
  youtube: {
    title: "✨ 유튜브(YouTube) 연동 - 80세 할머니도 하는 가이드",
    steps: [
      "1. [구글 콘솔](https://console.cloud.google.com/)에서 클라이언트 ID를 만들 때 유형을 반드시 '웹 애플리케이션'으로 선택하세요.",
      "2. [사용자 인증 정보] 메뉴에서 내 'OAuth 클라이언트 ID'를 클릭하고, 맨 아래 [승인된 리디렉션 URI] 칸에 위 주소를 붙여넣고 저장하세요.",
      "3. 발급된 '클라이언트 ID'와 '보안 비밀번호'를 아래 칸에 입력하면 끝납니다!"
    ],
    link: "https://console.cloud.google.com/apis/library/youtube.googleapis.com"
  },
  google: {
    title: "✨ 구글 블로그(Blogger) 연동 가이드",
    steps: [
      "1. [구글 콘솔](https://console.cloud.google.com/)에서 클라이언트 ID를 만들 때 유형을 반드시 '웹 애플리케이션'으로 선택하세요.",
      "2. [사용자 인증 정보] 메뉴 -> 내 'OAuth 클라이언트 ID' 클릭 -> 맨 아래 [승인된 리디렉션 URI] 칸에 위 주소를 붙여넣고 꼭 저장하세요.",
      "3. 그 다음 [여기(내 블로그 관리자 화면)](https://www.blogger.com/)를 눌러 로그인 후 주소창의 '숫자'를 확인하세요.",
      "4. 블로그 ID(숫자)와 주소를 아래 칸에 넣고 '저장 및 연동'을 누르면 끝납니다!"
    ],
    link: "https://console.cloud.google.com/apis/library/blogger.googleapis.com"
  },
  naver: {
    title: "✨ 네이버 블로그 연동 - 친절한 가이드",
    steps: [
      "1. [네이버 개발자 센터](https://developers.naver.com/)에 접속해서 로그인하세요.",
      "2. 'Application' -> '애플리케이션 등록' 메뉴로 들어갑니다.",
      "3. 이름 적고, 사용 API에서 '네이버 아이디로 로그인'을 선택하세요.",
      "4. 권한 설정에서 '블로그 글쓰기'를 꼭 체크해야 합니다.",
      "5. 서비스 URL에 'http://localhost:3000' (또는 사용 중인 주소)을 적으세요.",
      "6. 발급된 ID와 Secret을 아래 칸에 입력하세요."
    ],
    link: "https://developers.naver.com/apps/#/register"
  },
  tistory: {
    title: "✨ 티스토리 연동 - 가장 쉬운 가이드",
    steps: [
      "1. [티스토리 API 관리](https://www.tistory.com/guide/api/manage) 페이지에 접속하세요.",
      "2. 앱을 등록하고 '티스토리 Open API' 사용 권한을 받으세요.",
      "3. 안내에 따라 'Access Token' (비밀 번호 같은 것)을 발급받으세요.",
      "4. 발급받은 토큰을 아래 칸에 입력하고 저장하면 완료됩니다."
    ],
    link: "https://www.tistory.com/guide/api/manage"
  }
};

export const SettingsPage = ({
  onOpenKeySelection,
  platforms,
  togglePlatform,
  aiEngine,
  setAiEngine,
  apiKey,
  setApiKey,
  musicEngine,
  setMusicEngine,
  imageEngine,
  setImageEngine,
  videoEngine,
  setVideoEngine,
  videoQuality,
  setVideoQuality,
  audioFadeIn,
  setAudioFadeIn,
  audioFadeOut,
  setAudioFadeOut,
  onReset,
  availableModels = AI_ENGINES,
  fetchAvailableModels,
  copyToClipboard,
  logs = [],
  tiktokAccessToken,
  setTiktokAccessToken
}: SettingsPageProps) => {
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [activeGuide, setActiveGuide] = useState<keyof typeof GUIDES | null>(null);

  // Platform Keys State
  const [platformKeys, setPlatformKeys] = useState(() => {
    const saved = localStorage.getItem('echoesuntohim_platform_keys');
    try {
      return saved ? JSON.parse(saved) : {
        tiktok: { clientKey: '', clientSecret: '' },
        naver: { clientId: '', clientSecret: '' },
        google: { clientId: '', clientSecret: '', blogId: '', blogUrl: '' },
        youtube: { clientId: '', clientSecret: '' },
        tistory: { accessToken: '' }
      };
    } catch (e) {
      return {
        tiktok: { clientKey: '', clientSecret: '' },
        naver: { clientId: '', clientSecret: '' },
        google: { clientId: '', clientSecret: '', blogId: '', blogUrl: '' },
        youtube: { clientId: '', clientSecret: '' },
        tistory: { accessToken: '' }
      };
    }
  });

  const savePlatformKeys = (platform: keyof typeof platformKeys, keys: any) => {
    const newKeys = { ...platformKeys, [platform]: keys };
    setPlatformKeys(newKeys);
    localStorage.setItem('echoesuntohim_platform_keys', JSON.stringify(newKeys));

    // Auto-connect if keys are provided
    if (Object.values(keys).every(v => v !== '')) {
      if (platforms[platform as keyof typeof platforms] === 'disconnected') {
        togglePlatform(platform as any);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold mb-2">설정</h1>
        <p className="text-gray-400">계정 및 플랫폼 연동 설정을 관리합니다.</p>
      </header>

      <div className="space-y-6">
        <GlassCard className="space-y-6 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-primary">
            <Key className="w-5 h-5" />
            <h3 className="text-lg font-bold">API 키 관리</h3>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-4">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-sm">Gemini API 키 직접 입력</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    외부 환경에서 사용 시 API 키를 직접 입력하여 저장할 수 있습니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        localStorage.setItem('gemini_api_key', apiKey);
                        setIsKeySaved(true);
                        setTimeout(() => setIsKeySaved(false), 2000);
                      }}
                      className="px-4 py-2 bg-primary text-background rounded-lg text-xs font-black hover:neon-glow-primary transition-all shrink-0 flex items-center gap-2"
                    >
                      {isKeySaved ? <><CheckCircle2 className="w-4 h-4" /> 저장됨</> : '저장하기'}
                    </button>
                    <button
                      onClick={fetchAvailableModels}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-all shrink-0 flex items-center gap-2"
                    >
                      엔진 확인
                    </button>
                  </div>
                </div>

                {availableModels && availableModels.length > 0 && availableModels !== AI_ENGINES && (
                  <div className="mt-2 p-3 bg-primary/10 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        사용 가능한 엔진 목록 ({availableModels.length})
                      </p>
                      <button
                        onClick={() => {
                          if (copyToClipboard) {
                            const json = JSON.stringify(availableModels, null, 2);
                            copyToClipboard(json);
                          }
                        }}
                        className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        JSON 복사
                      </button>
                    </div>
                    <div className="space-y-2">
                      <select
                        value={aiEngine}
                        onChange={(e) => setAiEngine(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary outline-none cursor-pointer"
                      >
                        <option value="" disabled>사용할 엔진을 선택하세요</option>
                        {availableModels.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label} ({model.type === 'paid' ? '유료' : '무료'})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 px-1 italic">
                        * 선택한 엔진이 메인 텍스트 및 가사 생성에 적용됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold text-sm">AI Studio 키 선택기 (내부용)</p>
                  <p className="text-xs text-gray-400">AI Studio 환경에서만 동작합니다.</p>
                </div>
                <button
                  onClick={onOpenKeySelection}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20 transition-all shrink-0"
                >
                  키 선택기 열기
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-1 text-[10px] text-gray-500">
              <div className="flex items-center gap-2">
                <Info className="w-3 h-3" />
                <span>입력된 키는 브라우저 로컬 스토리지에만 저장되며 외부로 전송되지 않습니다.</span>
              </div>
              <div className="flex items-center gap-2 pl-5">
                <span>설정에서 사용할 키를 변경할 수 있으며, 할당량이 재설정되면 무료 생성으로 자동 전환됩니다.</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">엔진 설정</h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">언어/분석 엔진</p>
                  <p className="text-xs text-gray-400">가사 생성 및 음원 분석에 사용할 AI 모델을 선택합니다.</p>
                </div>
                <select
                  value={aiEngine}
                  onChange={(e) => setAiEngine(e.target.value)}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white appearance-none cursor-pointer text-sm min-w-[200px]"
                >
                  {availableModels.map(eng => (
                    <option key={eng.value} value={eng.value} className="bg-[#1A1F26] text-white">
                      {eng.label} {eng.type === 'paid' ? '(Pro)' : '(Free)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">음악 생성 엔진</p>
                  <p className="text-xs text-gray-400">배경 음악 생성에 사용할 엔진을 선택합니다.</p>
                </div>
                <select
                  value={musicEngine}
                  onChange={(e) => setMusicEngine(e.target.value)}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white appearance-none cursor-pointer text-sm min-w-[200px]"
                >
                  {MUSIC_ENGINES.map(eng => (
                    <option key={eng.value} value={eng.value} className="bg-[#1A1F26] text-white">
                      {eng.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">이미지 생성 엔진</p>
                  <p className="text-xs text-gray-400">영상 배경 이미지 생성에 사용할 엔진을 선택합니다.</p>
                </div>
                <select
                  value={imageEngine}
                  onChange={(e) => setImageEngine(e.target.value)}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white appearance-none cursor-pointer text-sm min-w-[200px]"
                >
                  {IMAGE_ENGINES.map(eng => (
                    <option key={eng.value} value={eng.value} className="bg-[#1A1F26] text-white">
                      {eng.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">플랫폼 연동</h3>
          <div className="space-y-4">
            <PlatformToggle
              label="유튜브 (YouTube)"
              status={platforms.youtube}
              icon={<Youtube className="w-5 h-5 text-[#FF0000]" />}
              onToggle={() => {
                if (platforms.youtube === 'connected') togglePlatform('youtube');
                else setActiveGuide('youtube');
              }}
              description="유튜브 채널에 영상을 직접 업로드합니다. Google Cloud Console 설정이 필요합니다."
              onHelp={() => setActiveGuide('youtube')}
            />
            <PlatformToggle
              label="틱톡 (TikTok)"
              status={platforms.tiktok}
              icon={<Music2 className="w-5 h-5 text-white" />}
              onToggle={() => {
                if (platforms.tiktok === 'connected') togglePlatform('tiktok');
                else setActiveGuide('tiktok');
              }}
              description="틱톡 영상 업로드를 위해 계정을 연동합니다. 개발자 포털의 Client Key가 필요합니다."
              onHelp={() => setActiveGuide('tiktok')}
            />
            <PlatformToggle
              label="네이버 블로그"
              status={platforms.naver}
              icon={<Share2 className="w-5 h-5 text-[#03C75A]" />}
              onToggle={() => {
                if (platforms.naver === 'connected') togglePlatform('naver');
                else setActiveGuide('naver');
              }}
              description="네이버 블로그 글쓰기 API를 통해 포스팅을 자동 업로드합니다."
              onHelp={() => setActiveGuide('naver')}
            />
            <PlatformToggle
              label="티스토리"
              status={platforms.tistory}
              icon={<Globe className="w-5 h-5 text-[#FF5E00]" />}
              onToggle={() => {
                if (platforms.tistory === 'connected') togglePlatform('tistory');
                else setActiveGuide('tistory');
              }}
              description="티스토리 Open API를 사용하여 포스팅을 자동 발행합니다."
              onHelp={() => setActiveGuide('tistory')}
            />
            <PlatformToggle
              label="구글 블로그 (Blogger)"
              status={platforms.google}
              icon={<FileText className="w-5 h-5 text-[#4285F4]" />}
              onToggle={() => {
                if (platforms.google === 'connected') togglePlatform('google');
                else setActiveGuide('google');
              }}
              description="구글 블로그(Blogger) API를 통해 고품질 SEO 포스팅을 업로드합니다."
              onHelp={() => setActiveGuide('google')}
            />
          </div>
        </GlassCard>

        <GlassCard className="space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">기타 설정</h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">비디오 렌더링 품질</p>
                  <p className="text-xs text-gray-400">최종 영상의 해상도와 품질을 설정합니다.</p>
                </div>
                <select
                  value={videoQuality}
                  onChange={(e) => {
                    setVideoQuality(e.target.value);
                    localStorage.setItem('video_quality', e.target.value);
                  }}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white appearance-none cursor-pointer text-sm"
                >
                  <option value="720p">720p HD (무료)</option>
                  <option value="1080p">1080p Full HD (무료)</option>
                  <option value="2k">2K Quad HD (Pro)</option>
                  <option value="4k">4K Ultra HD (Pro)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">오디오 페이드 인 (초)</p>
                  <p className="text-xs text-gray-400">영상 시작 시 오디오가 서서히 커지는 시간을 설정합니다.</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={audioFadeIn}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setAudioFadeIn(val);
                  }}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white w-20 text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold">오디오 페이드 아웃 (초)</p>
                  <p className="text-xs text-gray-400">영상 종료 시 오디오가 서서히 작아지는 시간을 설정합니다.</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={audioFadeOut}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setAudioFadeOut(val);
                  }}
                  className="bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-2 outline-none text-white w-20 text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-bold text-red-500">전체 초기화</p>
                  <p className="text-xs text-gray-400">모든 설정과 작업 데이터를 삭제하고 초기 상태로 되돌립니다.</p>
                </div>
                <button
                  onClick={onReset}
                  className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  초기화 실행
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Terminal at the bottom for System Logs */}
        <Terminal logs={logs} />
      </div>

      {/* Detailed Guide Modal */}
      <AnimatePresence>
        {activeGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#1A1F26] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{GUIDES[activeGuide].title}</h3>
                </div>
                <button
                  onClick={() => setActiveGuide(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar p-8">
                  {activeGuide && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-primary uppercase">승인된 리디렉션 URI (복사해서 구글 설정에 넣으세요)</span>
                        <button 
                          onClick={() => copyToClipboard?.(window.location.origin)}
                          className="text-[10px] px-2 py-1 bg-primary text-background rounded-md font-bold hover:scale-105 transition-all"
                        >
                          주소 복사하기
                        </button>
                      </div>
                      <code className="block text-xs text-white/80 bg-black/30 p-2 rounded border border-white/5 break-all">
                        {window.location.origin}
                      </code>
                    </div>
                  )}

                  <div className="space-y-4">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">Step-by-Step 가이드</p>
                  {GUIDES[activeGuide].steps.map((step, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 p-6 bg-black/40 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">연동 키 입력</p>
                  <div className="space-y-4">
                    {activeGuide === 'tiktok' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Client Key</label>
                          <input
                            type="text"
                            value={platformKeys.tiktok.clientKey}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, tiktok: { ...prev.tiktok, clientKey: e.target.value } }))}
                            placeholder="틱톡 클라이언트 키 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Client Secret</label>
                          <input
                            type="password"
                            value={platformKeys.tiktok.clientSecret}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, tiktok: { ...prev.tiktok, clientSecret: e.target.value } }))}
                            placeholder="틱톡 클라이언트 시크릿 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="pt-2 border-t border-white/5 mt-4 space-y-2">
                          <label className="text-[10px] text-primary font-bold ml-1">Access Token (자동 발급 또는 직접 입력)</label>
                          <input
                            type="password"
                            value={tiktokAccessToken || ''}
                            onChange={(e) => setTiktokAccessToken?.(e.target.value)}
                            placeholder="인증 후 발급된 엑세스 토큰"
                            className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                          <p className="text-[9px] text-gray-500 italic px-1">
                            * 틱톡 인증 페이지에서 승인 후 돌아오면 자동으로 입력되거나, 발급받은 토큰을 직접 넣으시면 됩니다.
                          </p>
                        </div>
                      </>
                    )}
                    {activeGuide === 'naver' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Client ID</label>
                          <input
                            type="text"
                            value={platformKeys.naver.clientId}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, naver: { ...prev.naver, clientId: e.target.value } }))}
                            placeholder="네이버 클라이언트 ID 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Client Secret</label>
                          <input
                            type="password"
                            value={platformKeys.naver.clientSecret}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, naver: { ...prev.naver, clientSecret: e.target.value } }))}
                            placeholder="네이버 클라이언트 시크릿 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                      </>
                    )}
                    {activeGuide === 'youtube' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">YouTube Client ID</label>
                          <input
                            type="text"
                            value={platformKeys.youtube?.clientId || ''}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, youtube: { ...prev.youtube, clientId: e.target.value } }))}
                            placeholder="유튜브 클라이언트 ID 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">YouTube Client Secret</label>
                          <input
                            type="password"
                            value={platformKeys.youtube?.clientSecret || ''}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, youtube: { ...prev.youtube, clientSecret: e.target.value } }))}
                            placeholder="유튜브 클라이언트 시크릿 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                      </>
                    )}
                    {activeGuide === 'google' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Blogger Client ID</label>
                          <input
                            type="text"
                            value={platformKeys.google.clientId}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, google: { ...prev.google, clientId: e.target.value } }))}
                            placeholder="구글 블로그 클라이언트 ID 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 ml-1">Blogger Client Secret</label>
                          <input
                            type="password"
                            value={platformKeys.google.clientSecret}
                            onChange={(e) => setPlatformKeys(prev => ({ ...prev, google: { ...prev.google, clientSecret: e.target.value } }))}
                            placeholder="구글 블로그 클라이언트 시크릿 입력"
                            className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[10px] text-primary/70 ml-1">블로그 ID (필수)</label>
                            <input
                              type="text"
                              value={platformKeys.google.blogId || ''}
                              onChange={(e) => setPlatformKeys(prev => ({ ...prev, google: { ...prev.google, blogId: e.target.value } }))}
                              placeholder="예: 123456789"
                              className="w-full bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] text-primary/70 ml-1">블로그 주소</label>
                            <input
                              type="text"
                              value={platformKeys.google.blogUrl || ''}
                              onChange={(e) => setPlatformKeys(prev => ({ ...prev, google: { ...prev.google, blogUrl: e.target.value } }))}
                              placeholder="example.blogspot.com"
                              className="w-full bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    {activeGuide === 'tistory' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 ml-1">Access Token</label>
                        <input
                          type="password"
                          value={platformKeys.tistory.accessToken}
                          onChange={(e) => setPlatformKeys(prev => ({ ...prev, tistory: { ...prev.tistory, accessToken: e.target.value } }))}
                          placeholder="티스토리 엑세스 토큰 입력"
                          className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <a
                    href={GUIDES[activeGuide].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all group"
                  >
                    <span>개발자 센터 바로가기</span>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </div>

              <div className="p-6 bg-black/20 border-t border-white/5 flex gap-3 shrink-0">
                <button
                  onClick={() => setActiveGuide(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    savePlatformKeys(activeGuide as any, platformKeys[activeGuide as keyof typeof platformKeys]);
                    if (platforms[activeGuide as keyof typeof platforms] === 'disconnected') {
                      togglePlatform(activeGuide as any);
                    }
                    setActiveGuide(null);
                  }}
                  className="flex-1 py-4 bg-primary text-background rounded-xl font-black hover:neon-glow-primary transition-all shadow-lg shadow-primary/20"
                >
                  키 저장 및 연동 완료하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 데이터 초기화 섹션 */}
      <GlassCard className="border-red-500/20 bg-red-500/5 mt-8 mb-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-500">데이터 초기화 및 캐시 삭제</h3>
            <p className="text-xs text-gray-400">앱이 꼬이거나 이전 작업 데이터가 계속 남을 때 사용하세요. 곡 데이터를 보존하는 '캐시 비우기'와 '전체 초기화' 중 선택할 수 있습니다.</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 flex-wrap">
          <button
            onClick={() => {
              if (window.confirm("⚠️ 임시 작업 캐시(찌꺼기)를 삭제하시겠습니까?\n\n(소중한 곡 데이터와 API 키는 유지되며 브라우저 용량 5MB 제한이 해제됩니다.)")) {
                localStorage.removeItem('echoesuntohim_workflow');
                localStorage.removeItem('echoesuntohim_logs');
                alert("✅ 캐시가 성공적으로 비워졌습니다. 이제 정상적으로 로그인이 가능합니다!");
                window.location.reload();
              }
            }}
            className="px-6 py-2 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-xl font-bold hover:bg-yellow-500 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            캐시 비우기 (용량 확보용)
          </button>

          <button
            onClick={() => {
              if (window.confirm("⚠️ 정말로 모든 데이터를 초기화하시겠습니까? 저장된 API 키와 곡 작업 내용이 모두 영구 삭제됩니다!")) {
                if (onReset) {
                  onReset();
                } else {
                  localStorage.clear();
                  window.location.reload();
                }
              }
            }}
            className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            모든 데이터 폭파 (전체 초기화)
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};
