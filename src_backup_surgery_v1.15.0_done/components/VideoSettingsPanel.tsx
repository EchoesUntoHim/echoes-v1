// v1.11.0: Premium Video Engine - Force Recompile
import React from 'react';
import { Type as TypeIcon, FileText, Palette, Zap, Video, Settings, Music } from 'lucide-react';
import { cn } from '../lib/utils';
import { TITLE_EFFECTS, TITLE_ANIMATIONS, KOREAN_FONTS, ENGLISH_FONTS, LYRICS_KOREAN_FONTS, LYRICS_ENGLISH_FONTS, VIDEO_MOTIONS, VIDEO_FILTERS, VIDEO_OVERLAYS, VIDEO_PARTICLES, LYRICS_EFFECTS } from '../constants';
import { TitleSettings, TitlePosition, TitleEffect, TitleAnimation, TitleAlign } from '../types';

interface VideoSettingsPanelProps {
  type: string;
  settings: TitleSettings;
  onChange: (newSettings: TitleSettings) => void;
  showLyricsControls?: boolean;
}

export const VideoSettingsPanel = ({
  type,
  settings,
  onChange,
  showLyricsControls = true
}: VideoSettingsPanelProps) => {
  return (
    <div className="mt-4 p-4 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 space-y-4 shadow-2xl">
      {/* Section 1: Background & Video Effects */}
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl p-4 space-y-4 border border-white/5 shadow-inner">
        <div className="flex items-center gap-3 px-1">
          <div className="p-1.5 bg-primary/20 rounded-lg">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-black text-white uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">배경 및 영상 효과</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5 min-w-0">
            <label className="text-[9px] font-bold text-gray-500 ml-1 block truncate">다이내믹 모션</label>
            <select
              value={settings.videoMotion || 'none'}
              onChange={(e) => onChange({ ...settings, videoMotion: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
            >
              {VIDEO_MOTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-[9px] font-bold text-gray-500 ml-1 block truncate">색감 필터</label>
            <select
              value={settings.videoFilter || 'none'}
              onChange={(e) => onChange({ ...settings, videoFilter: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
            >
              {VIDEO_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-[9px] font-bold text-gray-500 ml-1 block truncate">오버레이</label>
            <div className="flex flex-col gap-1.5">
              <select
                value={settings.videoOverlay || 'none'}
                onChange={(e) => onChange({ ...settings, videoOverlay: e.target.value })}
                className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
              >
                {VIDEO_OVERLAYS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {settings.videoOverlay !== 'none' && (
                <input
                  type="range" min="0.1" max="1.0" step="0.1"
                  value={settings.videoOverlayIntensity || 0.5}
                  onChange={(e) => onChange({ ...settings, videoOverlayIntensity: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-primary bg-white/5 rounded-full appearance-none"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-[9px] font-bold text-gray-500 ml-1 flex items-center gap-1 block truncate">
              <Zap className="w-2.5 h-2.5 text-yellow-400" /> 파티클
            </label>
            <select
              value={settings.particleSystem || 'none'}
              onChange={(e) => onChange({ ...settings, particleSystem: e.target.value })}
              className="w-full bg-[#1A1F26] border border-[#FFD700]/30 rounded-lg px-2 py-2 text-[10px] text-[#FFD700] focus:border-primary outline-none cursor-pointer"
            >
              {VIDEO_PARTICLES.map(p => <option key={p.value} value={p.value} className="bg-[#1A1F26]">{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Title & Audio Visualizer */}
      <div className="bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl p-4 space-y-4 border border-white/5 shadow-inner">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <TypeIcon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-black text-white uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">타이틀 및 오디오 설정</span>
          </div>

          <div className="flex items-center gap-3 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer group">
            <Settings className="w-3.5 h-3.5 text-primary group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-bold text-primary">비주얼라이저</span>
            <input
              type="checkbox"
              checked={settings.showVisualizer || false}
              onChange={(e) => onChange({ ...settings, showVisualizer: e.target.checked })}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-1">
          <select
            value={settings.titlePosition}
            onChange={(e) => onChange({ ...settings, titlePosition: e.target.value as TitlePosition })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary outline-none cursor-pointer min-w-[85px]"
          >
            <option value="middle">중앙 (Center)</option>
            <option value="top">상단 (Top)</option>
            <option value="bottom">하단 (Bottom)</option>
            <option value="custom">사용자 (Custom)</option>
          </select>

          <select
            value={settings.titleAlign || 'center'}
            onChange={(e) => onChange({ ...settings, titleAlign: e.target.value as TitleAlign })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary outline-none cursor-pointer min-w-[80px]"
          >
            <option value="center">가운데 정렬</option>
            <option value="left">왼쪽 정렬</option>
            <option value="right">오른쪽 정렬</option>
          </select>

          <select
            value={settings.titleEffect}
            onChange={(e) => onChange({ ...settings, titleEffect: e.target.value as TitleEffect })}
            className="bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:border-primary outline-none cursor-pointer min-w-[85px]"
          >
            {TITLE_EFFECTS.map(effect => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
          </select>

          <select
            value={settings.titleAnimation || 'none'}
            onChange={(e) => onChange({ ...settings, titleAnimation: e.target.value as TitleAnimation })}
            className="bg-[#1A1F26] border border-[#00FFA3]/30 rounded-lg px-2 py-1 text-[10px] text-[#00FFA3] focus:border-primary outline-none cursor-pointer min-w-[95px]"
          >
            {TITLE_ANIMATIONS.map(anim => <option key={anim.value} value={anim.value} className="bg-[#1A1F26]">{anim.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 px-1">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10 flex-1 min-w-0">
              <span className="text-[9px] text-gray-500 shrink-0">한글</span>
              <select
                value={settings.koreanFont}
                onChange={(e) => onChange({ ...settings, koreanFont: e.target.value })}
                className="flex-1 bg-transparent text-[10px] text-white outline-none cursor-pointer truncate"
                style={{ fontFamily: settings.koreanFont }}
              >
                {KOREAN_FONTS.map(font => <option key={font.value} value={font.value} className="bg-[#1A1F26]" style={{ fontFamily: font.value }}>{font.label}</option>)}
              </select>
              <input
                type="color"
                value={settings.koreanColor}
                onChange={(e) => onChange({ ...settings, koreanColor: e.target.value })}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none shrink-0"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10 flex-1 min-w-0">
              <span className="text-[9px] text-gray-500 shrink-0">영어</span>
              <select
                value={settings.englishFont}
                onChange={(e) => onChange({ ...settings, englishFont: e.target.value })}
                className="flex-1 bg-transparent text-[10px] text-white outline-none cursor-pointer truncate"
                style={{ fontFamily: settings.englishFont }}
              >
                {ENGLISH_FONTS.map(font => <option key={font.value} value={font.value} className="bg-[#1A1F26]" style={{ fontFamily: font.value }}>{font.label}</option>)}
              </select>
              <input
                type="color"
                value={settings.englishColor}
                onChange={(e) => onChange({ ...settings, englishColor: e.target.value })}
                className="w-4 h-4 rounded cursor-pointer bg-transparent border-none shrink-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-black/20 p-1 rounded-lg border border-white/5">
            <input
              type="checkbox"
              checked={settings.showTitleOverlay ?? true}
              onChange={(e) => onChange({ ...settings, showTitleOverlay: e.target.checked })}
              className="w-3.5 h-3.5 accent-primary shrink-0 ml-1"
            />

            <div className="flex items-center gap-1 bg-white/5 rounded px-1.5 py-0.5 border border-white/10 shrink-0">
              <span className="text-[9px] text-gray-500 shrink-0">In</span>
              <input
                type="number" min="0" max="10" step="0.5" value={settings.fadeInDuration ?? 1.5}
                onChange={(e) => onChange({ ...settings, fadeInDuration: parseFloat(e.target.value) || 0 })}
                className="w-9 bg-transparent text-[10px] text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded px-1.5 py-0.5 border border-white/10 shrink-0">
              <span className="text-[9px] text-gray-500 shrink-0">Out</span>
              <input
                type="number" min="0" max="10" step="0.5" value={settings.fadeOutDuration ?? 3}
                onChange={(e) => onChange({ ...settings, fadeOutDuration: parseFloat(e.target.value) || 0 })}
                className="w-9 bg-transparent text-[10px] text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Fine-tuning (Size, Spacing, Offset) */}
        <div className="flex items-center gap-4 py-1.5 px-2 border-t border-white/5 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap">한글크기</span>
            <input
              type="number" min="20" max="200" value={settings.koreanTitleSize}
              onChange={(e) => onChange({ ...settings, koreanTitleSize: parseInt(e.target.value) || 20 })}
              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap">영어크기</span>
            <input
              type="number" min="10" max="150" value={settings.englishTitleSize}
              onChange={(e) => onChange({ ...settings, englishTitleSize: parseInt(e.target.value) || 10 })}
              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-white/5 pl-4 shrink-0">
            <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap">자간/행간</span>
            <input
              type="number" min="0.1" max="2.0" step="0.1" value={settings.titleSpacing}
              onChange={(e) => onChange({ ...settings, titleSpacing: parseFloat(e.target.value) || 0.1 })}
              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-4 border-l border-white/5 pl-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap">좌우(X)</span>
              <input
                type="number" min="-100" max="100" value={settings.titleXOffset}
                onChange={(e) => onChange({ ...settings, titleXOffset: parseInt(e.target.value) || 0 })}
                className="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-primary outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-gray-500 uppercase whitespace-nowrap">상하(Y)</span>
              <input
                type="number" min="-100" max="100" value={settings.titleYOffset}
                onChange={(e) => onChange({ ...settings, titleYOffset: parseInt(e.target.value) || 0 })}
                className="w-14 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:border-primary outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Lyrics & Karaoke Effects */}
      {showLyricsControls && (
        <div className="bg-gradient-to-br from-white/[0.05] to-transparent rounded-xl p-4 space-y-4 border border-white/5 shadow-inner">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary/20 rounded-lg">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-black text-white uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">가사 및 노래방 효과</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-[#00FFA3] animate-pulse" />
                <select
                  value={settings.lyricsEffect || 'none'}
                  onChange={(e) => onChange({ ...settings, lyricsEffect: e.target.value })}
                  className="bg-[#1A1F26] border border-[#00FFA3]/30 rounded-lg px-2 py-1 text-[10px] text-[#00FFA3] focus:border-primary outline-none cursor-pointer"
                >
                  {LYRICS_EFFECTS.map(e => <option key={e.value} value={e.value} className="bg-[#1A1F26]">{e.label}</option>)}
                </select>
              </div>

              {settings.lyricsEffect === 'karaoke' && (
                <div className="flex items-center gap-2 bg-white/5 rounded-lg border border-white/10 px-2 py-1">
                  <Palette className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[9px] text-gray-500 font-bold uppercase">하이라이트</span>
                  <input
                    type="color"
                    value={settings.karaokeColor || '#00FFA3'}
                    onChange={(e) => onChange({ ...settings, karaokeColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer bg-transparent border-none shrink-0"
                    title="노래방 하이라이트 색상"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Lyrics Font Selectors & Global Color */}
            <div className="flex items-center gap-2 flex-1 min-w-[400px]">
              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10 flex-1 min-w-0">
                <span className="text-[9px] text-gray-500 shrink-0">한글</span>
                <select
                  value={settings.lyricsKoreanFont || 'sans-serif'}
                  onChange={(e) => onChange({ ...settings, lyricsKoreanFont: e.target.value })}
                  className="flex-1 bg-transparent text-[10px] text-white outline-none cursor-pointer truncate"
                  style={{ fontFamily: settings.lyricsKoreanFont }}
                >
                  {LYRICS_KOREAN_FONTS.map((font, idx) => (
                    <option key={`${font.value}-${idx}`} value={font.value} className="bg-[#1A1F26]" style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/10 flex-1 min-w-0">
                <span className="text-[9px] text-gray-500 shrink-0">영어</span>
                <select
                  value={settings.lyricsEnglishFont || 'sans-serif'}
                  onChange={(e) => onChange({ ...settings, lyricsEnglishFont: e.target.value })}
                  className="flex-1 bg-transparent text-[10px] text-white outline-none cursor-pointer truncate"
                  style={{ fontFamily: settings.lyricsEnglishFont }}
                >
                  {LYRICS_ENGLISH_FONTS.map((font, idx) => (
                    <option key={`${font.value}-${idx}`} value={font.value} className="bg-[#1A1F26]" style={{ fontFamily: font.value }}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 px-1.5 py-1">
                <Palette className="w-3 h-3 text-primary shrink-0" />
                <input
                  type="color"
                  value={settings.lyricsColor || '#ffffff'}
                  onChange={(e) => onChange({ ...settings, lyricsColor: e.target.value })}
                  className="w-4 h-4 rounded cursor-pointer bg-transparent border-none shrink-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-[120px]">
              <label className="text-[9px] font-bold text-gray-400 uppercase shrink-0">모드</label>
              <select
                value={settings.lyricsDisplayMode || 'fade'}
                onChange={(e) => onChange({ ...settings, lyricsDisplayMode: e.target.value as any })}
                className="w-full bg-[#1A1F26] border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
              >
                <option value="scroll">스크롤</option>
                <option value="fade">페이드</option>
                <option value="center">중앙</option>
                <option value="bottom">하단</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-1 p-1">
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase shrink-0">시작({settings.lyricsStartTime ?? 0}s)</label>
              <input
                type="range" min="0" max="30" step="0.5"
                value={settings.lyricsStartTime ?? 0}
                onChange={(e) => onChange({ ...settings, lyricsStartTime: parseFloat(e.target.value) })}
                className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase shrink-0">종료({settings.lyricsScrollEnd ?? 50}%)</label>
              <input
                type="range" min="10" max="80" step="1"
                value={settings.lyricsScrollEnd ?? 50}
                onChange={(e) => onChange({ ...settings, lyricsScrollEnd: parseInt(e.target.value) })}
                className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase shrink-0">크기({settings.lyricsFontSize ?? 4})</label>
              <input
                type="range" min="2" max="10" step="0.5"
                value={settings.lyricsFontSize ?? 4}
                onChange={(e) => onChange({ ...settings, lyricsFontSize: parseFloat(e.target.value) })}
                className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
