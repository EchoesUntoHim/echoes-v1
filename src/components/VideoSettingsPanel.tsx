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
    <div className="space-y-3">
      {/* Section 1: Background & Video Effects */}
      <div className="space-y-2">

        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-500 ml-1 block truncate">모션</label>
            <select
              value={settings.videoMotion || 'none'}
              onChange={(e) => onChange({ ...settings, videoMotion: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/5 rounded-md px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
            >
              {VIDEO_MOTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-500 ml-1 block truncate">필터</label>
            <select
              value={settings.videoFilter || 'none'}
              onChange={(e) => onChange({ ...settings, videoFilter: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/5 rounded-md px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
            >
              {VIDEO_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-500 ml-1 block truncate">오버레이</label>
            <select
              value={settings.videoOverlay || 'none'}
              onChange={(e) => onChange({ ...settings, videoOverlay: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/5 rounded-md px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
            >
              {VIDEO_OVERLAYS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-bold text-gray-500 ml-1 block truncate">파티클</label>
            <select
              value={settings.particleSystem || 'none'}
              onChange={(e) => onChange({ ...settings, particleSystem: e.target.value })}
              className="w-full bg-[#1A1F26] border border-white/5 rounded-md px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
            >
              {VIDEO_PARTICLES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Title & Audio Visualizer */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
            <span className="text-[9px] font-bold text-primary">비주얼라이저</span>
            <input
              type="checkbox"
              checked={settings.showVisualizer || false}
              onChange={(e) => onChange({ ...settings, showVisualizer: e.target.checked })}
              className="w-3 h-3 accent-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-1">
          <select
            value={settings.titlePosition}
            onChange={(e) => onChange({ ...settings, titlePosition: e.target.value as TitlePosition })}
            className="bg-[#1A1F26] border border-white/5 rounded px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
          >
            <option value="middle">중앙</option>
            <option value="top">상단</option>
            <option value="bottom">하단</option>
            <option value="custom">커스텀</option>
          </select>

          <select
            value={settings.titleAlign || 'center'}
            onChange={(e) => onChange({ ...settings, titleAlign: e.target.value as TitleAlign })}
            className="bg-[#1A1F26] border border-white/5 rounded px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
          >
            <option value="center">가운데</option>
            <option value="left">왼쪽</option>
            <option value="right">오른쪽</option>
          </select>

          <select
            value={settings.titleEffect}
            onChange={(e) => onChange({ ...settings, titleEffect: e.target.value as TitleEffect })}
            className="bg-[#1A1F26] border border-white/5 rounded px-1.5 py-1 text-[10px] text-white outline-none cursor-pointer"
          >
            {TITLE_EFFECTS.map(effect => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
          </select>

          <select
            value={settings.titleAnimation || 'none'}
            onChange={(e) => onChange({ ...settings, titleAnimation: e.target.value as TitleAnimation })}
            className="bg-[#1A1F26] border border-white/5 rounded px-1.5 py-1 text-[10px] text-[#00FFA3] outline-none cursor-pointer"
          >
            {TITLE_ANIMATIONS.map(anim => <option key={anim.value} value={anim.value} className="bg-[#1A1F26]">{anim.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2 px-1">
          <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1 border border-white/10 flex-1">
            <span className="text-[9px] text-gray-500">K</span>
            <select
              value={settings.koreanFont}
              onChange={(e) => onChange({ ...settings, koreanFont: e.target.value })}
              className="flex-1 bg-transparent text-[10px] text-white outline-none"
            >
              {KOREAN_FONTS.map(font => <option key={font.value} value={font.value} className="bg-[#1A1F26]">{font.label}</option>)}
            </select>
            <input type="color" value={settings.koreanColor} onChange={(e) => onChange({ ...settings, koreanColor: e.target.value })} className="w-3.5 h-3.5 rounded cursor-pointer bg-transparent border-none" />
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1 border border-white/10 flex-1">
            <span className="text-[9px] text-gray-500">E</span>
            <select
              value={settings.englishFont}
              onChange={(e) => onChange({ ...settings, englishFont: e.target.value })}
              className="flex-1 bg-transparent text-[10px] text-white outline-none"
            >
              {ENGLISH_FONTS.map(font => <option key={font.value} value={font.value} className="bg-[#1A1F26]">{font.label}</option>)}
            </select>
            <input type="color" value={settings.englishColor} onChange={(e) => onChange({ ...settings, englishColor: e.target.value })} className="w-3.5 h-3.5 rounded cursor-pointer bg-transparent border-none" />
          </div>

          <div className="flex items-center gap-1.5 px-1 shrink-0">
             <input type="checkbox" checked={settings.showTitleOverlay ?? true} onChange={(e) => onChange({ ...settings, showTitleOverlay: e.target.checked })} className="w-3 h-3 accent-primary" />
             <span className="text-[9px] text-gray-500">표시</span>
          </div>
        </div>

        <div className="flex items-center gap-4 px-2 py-1 border-t border-white/5 overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-gray-500 uppercase">Size</span>
            <input type="number" min="10" max="200" value={settings.koreanTitleSize} onChange={(e) => onChange({ ...settings, koreanTitleSize: parseInt(e.target.value) || 20 })} className="w-9 bg-white/5 rounded px-1 py-0.5 text-[9px] text-white outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-gray-500 uppercase">Space</span>
            <input type="number" min="0.1" max="2.0" step="0.1" value={settings.titleSpacing} onChange={(e) => onChange({ ...settings, titleSpacing: parseFloat(e.target.value) || 0.1 })} className="w-9 bg-white/5 rounded px-1 py-0.5 text-[9px] text-white outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-gray-500 uppercase">X</span>
            <input type="number" value={settings.titleXOffset} onChange={(e) => onChange({ ...settings, titleXOffset: parseInt(e.target.value) || 0 })} className="w-9 bg-white/5 rounded px-1 py-0.5 text-[9px] text-white outline-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-gray-500 uppercase">Y</span>
            <input type="number" value={settings.titleYOffset} onChange={(e) => onChange({ ...settings, titleYOffset: parseInt(e.target.value) || 0 })} className="w-9 bg-white/5 rounded px-1 py-0.5 text-[9px] text-white outline-none" />
          </div>
        </div>
      </div>

      {/* Section 3: Lyrics & Karaoke Effects */}
      {showLyricsControls && (
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between px-1">
            <select
              value={settings.lyricsDisplayMode || 'fade'}
              onChange={(e) => onChange({ ...settings, lyricsDisplayMode: e.target.value as any })}
              className="bg-[#1A1F26] border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-white outline-none cursor-pointer"
            >
              <option value="scroll">스크롤</option>
              <option value="fade">페이드</option>
              <option value="center">중앙</option>
              <option value="bottom">하단</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1 border border-white/10 flex-1">
               <span className="text-[9px] text-gray-500">K</span>
               <select value={settings.lyricsKoreanFont} onChange={(e) => onChange({ ...settings, lyricsKoreanFont: e.target.value })} className="flex-1 bg-transparent text-[10px] text-white outline-none">
                 {LYRICS_KOREAN_FONTS.map(f => <option key={f.value} value={f.value} className="bg-[#1A1F26]">{f.label}</option>)}
               </select>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1 border border-white/10 flex-1">
               <span className="text-[9px] text-gray-500">E</span>
               <select value={settings.lyricsEnglishFont} onChange={(e) => onChange({ ...settings, lyricsEnglishFont: e.target.value })} className="flex-1 bg-transparent text-[10px] text-white outline-none">
                 {LYRICS_ENGLISH_FONTS.map(f => <option key={f.value} value={f.value} className="bg-[#1A1F26]">{f.label}</option>)}
               </select>
            </div>
            <input type="color" value={settings.lyricsColor || '#ffffff'} onChange={(e) => onChange({ ...settings, lyricsColor: e.target.value })} className="w-3.5 h-3.5 rounded cursor-pointer bg-transparent border-none" />
          </div>

          <div className="flex items-center gap-4 px-2 py-1 border-t border-white/5 overflow-x-auto custom-scrollbar">
             <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] font-bold text-gray-500">START</span>
                <input type="range" min="0" max="30" step="0.5" value={settings.lyricsStartTime ?? 0} onChange={(e) => onChange({ ...settings, lyricsStartTime: parseFloat(e.target.value) })} className="w-16 accent-primary h-1" />
             </div>
             <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] font-bold text-gray-500">END</span>
                <input type="range" min="10" max="80" step="1" value={settings.lyricsScrollEnd ?? 50} onChange={(e) => onChange({ ...settings, lyricsScrollEnd: parseInt(e.target.value) })} className="w-16 accent-primary h-1" />
             </div>
             <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[8px] font-bold text-gray-500">SIZE</span>
                <input type="range" min="2" max="10" step="0.5" value={settings.lyricsFontSize ?? 4} onChange={(e) => onChange({ ...settings, lyricsFontSize: parseFloat(e.target.value) })} className="w-16 accent-primary h-1" />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
