import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Zap, Upload, CheckCircle2, FileText, Download, Music, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { MetadataCard } from './MetadataCard';
import { PlatformToggle } from './PlatformToggle';
import { ProgressBar } from './ProgressBar';
import { Terminal } from './Terminal';
import { cn } from '../lib/utils';
import { 
  AI_ENGINES, 
  TARGETS, 
  POP_SUB_GENRES, 
  CCM_SUB_GENRES, 
  POP_MOODS, 
  CCM_MOODS,
  BLOG_STYLES
} from '../constants';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  tags: string;
  timestamp: number;
}

interface BlogTabProps {
  workflow: any;
  setWorkflow: React.Dispatch<React.SetStateAction<any>>;
  aiEngine: string;
  setAiEngine: (engine: string) => void;
  generateBlogPost: () => Promise<void>;
  copyToClipboard: (text: string) => void;
  platforms: any;
  togglePlatform: (platform: string) => void;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSingleImageUpload: (type: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  downloadBlogImage: (url: string, text: string, label: string) => void;
  uploadedAudio: string | null;
  uploadedAudioName: string;
  shortsCount: number;
  logs: string[];
  availableModels?: {value: string, label: string, type?: string}[];
  fetchAvailableModels?: () => void;
}

export const BlogTab = ({
  workflow,
  setWorkflow,
  aiEngine,
  setAiEngine,
  generateBlogPost,
  copyToClipboard,
  platforms,
  togglePlatform,
  handleAudioUpload,
  handleSingleImageUpload,
  downloadBlogImage,
  uploadedAudio,
  uploadedAudioName,
  shortsCount,
  logs,
  availableModels,
  fetchAvailableModels
}: BlogTabProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [savedPosts, setSavedPosts] = useState<BlogPost[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'blogPosts'),
        where('uid', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BlogPost[];
        setSavedPosts(posts);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'blogPosts');
      });

      return () => unsubscribe();
    } else {
      setSavedPosts([]);
    }
  }, [user]);

  const deletePost = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'blogPosts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `blogPosts/${id}`);
    }
  };

  return (
    <motion.div key="blog" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">블로그 포스팅 생성</h1>
          <p className="text-gray-400">곡 정보를 바탕으로 네이버 블로그나 티스토리에 올릴 감성적인 글을 작성합니다.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
            <Settings className="w-3 h-3 text-gray-400" />
            <select
              value={aiEngine}
              onChange={(e) => {
                setAiEngine(e.target.value);
                localStorage.setItem('ai_engine', e.target.value);
              }}
              className="bg-transparent text-[11px] text-white outline-none cursor-pointer font-bold"
            >
              {AI_ENGINES.map(eng => (
                <option key={eng.value} value={eng.value} className="bg-[#1A1F26]">
                  {eng.label}
                </option>
              ))}
            </select>
          </div>
          <button 
            onClick={generateBlogPost}
            disabled={workflow.progress.blog > 0 && workflow.progress.blog < 100}
            className="bg-primary text-background px-6 py-2 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            AI 블로그 작성
          </button>
          {workflow.progress.blog > 0 && <div className="w-full"><ProgressBar progress={workflow.progress.blog} /></div>}
        </div>
      </header>

      <GlassCard className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">음악 종류 (블로그 작성 기준)</label>
            <div className="flex gap-2">
              {TARGETS.map(t => (
                <button
                  key={t}
                  onClick={() => {
                    const subGenre = t === '대중음악' ? POP_SUB_GENRES[0] : CCM_SUB_GENRES[0];
                    const mood = t === '대중음악' ? POP_MOODS[0] : CCM_MOODS[0];
                    setWorkflow(prev => ({ ...prev, params: { ...prev.params, target: t, subGenre, mood } }));
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold border transition-all",
                    workflow.params.target === t 
                      ? "bg-primary text-background border-primary" 
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">블로그 스타일</label>
            <select
              value={workflow.blogSettings?.style || BLOG_STYLES[0]}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, style: e.target.value } }))}
              className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
            >
              {BLOG_STYLES.map(s => <option key={s} value={s} className="bg-[#1A1F26] text-white">{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">생성할 플랫폼 다중 선택</label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'naver', label: '네이버 블로그', color: 'bg-[#03C75A]/20 text-[#03C75A] border-[#03C75A]/30' },
                { id: 'tistory', label: '티스토리', color: 'bg-[#EB531F]/20 text-[#EB531F] border-[#EB531F]/30' },
                { id: 'google', label: '구글 블로그', color: 'bg-[#4285F4]/20 text-[#4285F4] border-[#4285F4]/30' }
              ].map(platform => {
                const isSelected = workflow.blogSettings?.targets?.[platform.id] ?? (platform.id === 'naver');
                return (
                  <button
                    key={platform.id}
                    onClick={() => setWorkflow(prev => ({
                      ...prev,
                      blogSettings: {
                        ...prev.blogSettings,
                        targets: {
                          ...(prev.blogSettings?.targets || { naver: true, tistory: false, google: false }),
                          [platform.id]: !isSelected
                        }
                      }
                    }))}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold border transition-all flex items-center gap-2",
                      isSelected 
                        ? platform.color
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center transition-all", isSelected ? "border-current bg-current/20" : "border-gray-500")}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-current" />}
                    </div>
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">유튜브 링크 (선택)</label>
            <input
              type="text"
              placeholder="https://youtube.com/..."
              value={workflow.blogSettings?.youtubeLink || ''}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, youtubeLink: e.target.value } }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">반드시 들어가야 할 문구</label>
            <input
              type="text"
              placeholder="유튜브 링크 아래에 반드시 포함될 문구를 입력하세요"
              value={workflow.blogSettings?.youtubeFooterText || ''}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, youtubeFooterText: e.target.value } }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">참고할 사항</label>
            <textarea
              placeholder="블로그 작성 시 참고할 추가 정보를 입력하세요"
              value={workflow.blogSettings?.notes || ''}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, notes: e.target.value } }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all h-24 resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">타겟 고객층</label>
            <input
              type="text"
              placeholder="예: 위로가 필요한 2030 직장인, CCM을 찾는 청년부"
              value={workflow.blogSettings?.targetAudience || ''}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, targetAudience: e.target.value } }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none text-white transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-400 mb-2 block">글의 관점</label>
            <select
              value={workflow.blogSettings?.blogPerspective || '소개자 관점'}
              onChange={(e) => setWorkflow(prev => ({ ...prev, blogSettings: { ...prev.blogSettings, blogPerspective: e.target.value } }))}
              className="w-full bg-[#1A1F26] border border-white/10 rounded-xl px-3 py-3 outline-none text-white appearance-none cursor-pointer"
            >
              {[
                '소개자 관점', '구독자 관점', '제작자 관점', '음악 평론가 관점', '신앙인 관점',
                '위로자 관점', '동기부여가 관점', '역사학자 관점', '심리학자 관점', '음악 치료사 관점',
                '친구 관점', '멘토 관점', '예술가 관점', '철학자 관점', '경험자 관점'
              ].map(p => <option key={p} value={p} className="bg-[#1A1F26] text-white">{p}</option>)}
            </select>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 border-secondary/20">
        <h3 className="text-lg font-bold border-b border-white/5 pb-4 text-secondary">수동 데이터 입력 및 파일 업로드</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">곡 제목</label>
                <input 
                  type="text"
                  value={workflow.results.title || workflow.params.title || ''}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, results: { ...prev.results, title: e.target.value }, params: { ...prev.params, title: e.target.value } }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-secondary outline-none text-white transition-all"
                  placeholder="곡 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">가사</label>
                <textarea 
                  value={workflow.results.lyrics || ''}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, results: { ...prev.results, lyrics: e.target.value } }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-secondary outline-none text-white transition-all h-32 resize-none"
                  placeholder="가사를 입력하세요"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">곡 해석 (선택 - AI 해석보다 우선 적용됨)</label>
                <textarea 
                  value={workflow.params.songInterpretation || ''}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, params: { ...prev.params, songInterpretation: e.target.value } }))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-secondary outline-none text-white transition-all h-24 resize-none"
                  placeholder="곡에 대한 본인만의 해석이나 강조하고 싶은 분위기를 입력하세요. AI가 이를 최우선으로 반영합니다."
                />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-400 mb-2 block">파일 업로드</label>
              <div className="relative group overflow-hidden rounded-xl border-2 border-dashed border-white/10 hover:border-secondary/50 transition-colors bg-black/20 p-4">
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleAudioUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {uploadedAudio ? (
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Music className="w-5 h-5 text-secondary" />
                    </div>
                    <p className="font-bold text-sm text-white truncate">{uploadedAudioName}</p>
                    <p className="text-[10px] text-gray-500">분석 완료 • 재생 가능</p>
                  </div>
                ) : uploadedAudioName ? (
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-1">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    </div>
                    <p className="font-bold text-sm text-white truncate">{uploadedAudioName}</p>
                    <p className="text-[10px] text-yellow-500">새로고침됨: 파일을 다시 업로드해주세요</p>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Download className="w-5 h-5 text-gray-400 rotate-180" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">음원 업로드 (가사 추출)</p>
                      <p className="text-[10px] text-gray-400">MP3, WAV 파일을 선택하세요.</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {['main', 'tiktok', ...Array.from({length: shortsCount}).map((_, i) => `shorts_${i+1}`)].map(type => (
                  <div key={type} className="relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleSingleImageUpload(type, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <button className="w-full py-2 bg-secondary/10 border border-secondary/30 text-secondary rounded-lg text-[10px] font-black hover:bg-secondary/20 transition-all flex flex-col items-center justify-center gap-1">
                      <Upload className="w-3 h-3" />
                      {type === 'main' ? '메인' : type === 'tiktok' ? '틱톡' : `쇼츠 ${type.split('_')[1]}`} 이미지
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

      {workflow.results.images.length > 0 && (
        <GlassCard className="space-y-4 border-secondary/20">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4 text-secondary">블로그용 썸네일/이미지 생성</h3>
          <p className="text-sm text-gray-400">생성된 이미지를 가로(16:9) 비율로 맞추고 문구를 넣어 블로그에 활용하세요.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {workflow.results.images.map((img: any, idx: number) => (
              <div key={idx} className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50">
                  <img src={img.url || null} alt={img.label} className="w-full h-full object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-white font-bold text-center text-sm drop-shadow-lg whitespace-pre-wrap">
                      {workflow.blogSettings?.imageTexts?.[img.label] || workflow.results.title || '제목을 입력하세요'}
                    </p>
                  </div>
                </div>
                <textarea
                  value={workflow.blogSettings?.imageTexts?.[img.label] ?? (workflow.results.title || '')}
                  onChange={(e) => setWorkflow(prev => ({
                    ...prev,
                    blogSettings: {
                      ...prev.blogSettings,
                      imageTexts: {
                        ...(prev.blogSettings?.imageTexts || {}),
                        [img.label]: e.target.value
                      }
                    }
                  }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-secondary outline-none resize-none h-16"
                  placeholder="이미지에 들어갈 문구를 입력하세요"
                />
                <button
                  onClick={() => downloadBlogImage(img.url, workflow.blogSettings?.imageTexts?.[img.label] || workflow.results.title || '', img.label)}
                  className="w-full py-2 bg-secondary/20 text-secondary rounded-lg text-xs font-bold hover:bg-secondary/30 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  블로그용 다운로드
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {(workflow.results.naverBlogPost || workflow.results.tistoryBlogPost || workflow.results.googleBlogPost || workflow.results.blogPost) ? (
        <div className="grid grid-cols-1 gap-8">
          {/* Naver Blog Section */}
          {(workflow.results.naverBlogPost || (!workflow.results.naverBlogPost && !workflow.results.tistoryBlogPost && !workflow.results.googleBlogPost && workflow.results.blogPost)) && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-[#03C75A]/20 rounded-xl flex items-center justify-center border border-[#03C75A]/30">
                  <span className="text-[#03C75A] font-black text-xl drop-shadow-md">N</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">네이버 블로그 포스팅</h3>
                  <p className="text-[10px] text-[#03C75A] uppercase tracking-wider font-bold">Naver Blog Persona: Friendly & Engaging</p>
                </div>
              </div>
              <MetadataCard title="네이버 제목" content={workflow.results.naverBlogPost?.title || workflow.results.blogPost?.title || ''} onCopy={copyToClipboard} />
              <MetadataCard title="네이버 본문" content={workflow.results.naverBlogPost?.content || workflow.results.blogPost?.content || ''} onCopy={copyToClipboard} isHtml />
              <MetadataCard title="네이버 태그" content={workflow.results.naverBlogPost?.tags || workflow.results.blogPost?.tags || ''} onCopy={copyToClipboard} />
            </div>
          )}

          {/* Tistory Blog Section */}
          {workflow.results.tistoryBlogPost && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-[#EB531F]/20 rounded-xl flex items-center justify-center border border-[#EB531F]/30">
                  <span className="text-[#EB531F] font-black text-xl drop-shadow-md">T</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">티스토리 포스팅</h3>
                  <p className="text-[10px] text-[#EB531F] uppercase tracking-wider font-bold">Tistory Persona: Tech-savvy & Emotional</p>
                </div>
              </div>
              <MetadataCard title="티스토리 제목" content={workflow.results.tistoryBlogPost.title} onCopy={copyToClipboard} />
              <MetadataCard title="티스토리 본문" content={workflow.results.tistoryBlogPost.content} onCopy={copyToClipboard} isHtml />
              <MetadataCard title="티스토리 태그" content={workflow.results.tistoryBlogPost.tags} onCopy={copyToClipboard} />
            </div>
          )}

          {/* Google Blog Section */}
          {workflow.results.googleBlogPost && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 bg-[#4285F4]/20 rounded-xl flex items-center justify-center border border-[#4285F4]/30">
                  <span className="text-[#4285F4] font-black text-xl drop-shadow-md">G</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">구글 블로그 포스팅 (SEO 최적화)</h3>
                  <p className="text-[10px] text-[#4285F4] uppercase tracking-wider font-bold">Google Blog Persona: Professional & Analytical</p>
                </div>
              </div>
              <MetadataCard title="구글 제목" content={workflow.results.googleBlogPost.title} onCopy={copyToClipboard} />
              <MetadataCard title="구글 본문" content={workflow.results.googleBlogPost.content} onCopy={copyToClipboard} isHtml />
              <MetadataCard title="구글 태그" content={workflow.results.googleBlogPost.tags} onCopy={copyToClipboard} />
            </div>
          )}
          
          <GlassCard className="space-y-4 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-bold border-b border-white/5 pb-4">블로그 플랫폼 자동 업로드</h3>
            <div className="space-y-4">
              <PlatformToggle 
                label="네이버 블로그" 
                status={platforms.naver} 
                onToggle={() => togglePlatform('naver')}
                description="네이버 개발자 센터에서 '네이버 아이디로 로그인' 및 '블로그 글쓰기 API' 권한을 신청한 후 발급된 Client ID를 통해 연동할 수 있습니다."
              />
              <PlatformToggle 
                label="티스토리" 
                status={platforms.tistory} 
                onToggle={() => togglePlatform('tistory')}
                description="카카오 디벨로퍼스에서 앱을 생성하고 티스토리 Open API 권한을 활성화한 뒤, Access Token을 발급받아 연동합니다."
              />
              <PlatformToggle 
                label="구글 블로그 (Blogger)" 
                status={platforms.google} 
                onToggle={() => togglePlatform('google')}
                description="Google Cloud Console에서 Blogger API를 활성화하고 OAuth 2.0 클라이언트 ID를 발급받아 연동합니다."
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => alert('TODO: 실제 블로그 플랫폼 자동 업로드 백엔드 API 연동이 필요합니다.')}
                className="bg-primary text-background px-6 py-2 rounded-xl font-bold hover:neon-glow-primary transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                연동된 플랫폼에 업로드
              </button>
            </div>
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="p-12 text-center space-y-4">
          <FileText className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-xl font-bold text-gray-300">아직 작성된 블로그가 없습니다</h3>
          <p className="text-gray-500">우측 상단의 'AI 블로그 작성' 버튼을 눌러 포스팅을 생성해보세요.</p>
        </GlassCard>
      )}

      {/* Saved Blog Posts List */}
      {savedPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            저장된 블로그 목록 ({savedPosts.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {savedPosts.map((post) => (
              <div key={post.id}>
                <GlassCard className="p-0 overflow-hidden border-white/5 bg-white/5 hover:bg-white/10 transition-all">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{post.title}</h4>
                        <p className="text-[10px] text-gray-500 mt-1">{new Date(post.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedPostId === post.id ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedPostId === post.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-black/20"
                      >
                        <div className="p-6 space-y-6">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-primary uppercase tracking-wider">본문 미리보기</label>
                              <button 
                                onClick={() => copyToClipboard(post.content)}
                                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-all"
                              >
                                본문 복사
                              </button>
                            </div>
                            <div 
                              className="bg-black/40 p-4 rounded-xl text-sm leading-relaxed max-h-96 overflow-y-auto custom-scrollbar blog-preview"
                              dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-primary uppercase tracking-wider">태그</label>
                              <button 
                                onClick={() => copyToClipboard(post.tags)}
                                className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-all"
                              >
                                태그 복사
                              </button>
                            </div>
                            <p className="text-sm text-gray-400 bg-black/40 p-3 rounded-xl">{post.tags}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <Terminal logs={logs} />
    </motion.div>
  );
};
