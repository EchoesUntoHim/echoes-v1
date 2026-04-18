import React from 'react';
import { Type as TypeIcon, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { TITLE_EFFECTS, KOREAN_FONTS, ENGLISH_FONTS } from '../constants';
import { TitleSettings, TitlePosition, TitleEffect } from '../types';

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
    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">타이틀 설정</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">정렬</label>
          <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10">
            {(['left', 'center', 'right'] as const).map(align => (
              <button
                key={align}
                onClick={() => onChange({ ...settings, titleAlign: align })}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black transition-all duration-200",
                  settings.titleAlign === align 
                    ? "bg-primary text-background shadow-lg shadow-primary/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {align === 'left' ? '왼쪽' : align === 'center' ? '중앙' : '오른쪽'}
              </button>
            ))}
          </div>
        </div>
        <input 
          type="checkbox" 
          checked={settings.showTitleOverlay ?? true} 
          onChange={(e) => onChange({ ...settings, showTitleOverlay: e.target.checked })}
          className="w-4 h-4 accent-primary"
        />
      </div>
      
      {(settings.showTitleOverlay ?? true) && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">타이틀 위치</label>
              <select 
                value={settings.titlePosition}
                onChange={(e) => onChange({ ...settings, titlePosition: e.target.value as TitlePosition })}
                className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary outline-none cursor-pointer"
              >
                <option value="center" className="bg-[#1A1F26] text-white">중앙 (Center)</option>
                <option value="top" className="bg-[#1A1F26] text-white">상단 (Top)</option>
                <option value="bottom" className="bg-[#1A1F26] text-white">하단 (Bottom)</option>
                <option value="custom" className="bg-[#1A1F26] text-white">사용자 지정 (Custom)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">타이틀 효과</label>
              <select 
                value={settings.titleEffect}
                onChange={(e) => onChange({ ...settings, titleEffect: e.target.value as TitleEffect })}
                className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-primary outline-none cursor-pointer"
              >
                {TITLE_EFFECTS.map(effect => <option key={effect.value} value={effect.value} className="bg-[#1A1F26] text-white">{effect.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Korean Settings */}
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60">한글 제목 설정</span>
                <div className="flex gap-2 items-center">
                  <select 
                    value={settings.koreanFont}
                    onChange={(e) => onChange({ ...settings, koreanFont: e.target.value })}
                    className="flex-1 bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
                    style={{ fontFamily: settings.koreanFont }}
                  >
                    {KOREAN_FONTS.map(font => <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>)}
                  </select>
                  <input 
                    type="color" 
                    value={settings.koreanColor}
                    onChange={(e) => onChange({ ...settings, koreanColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none shrink-0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-[10px] text-gray-400">크기 (%)</span>
                <input 
                  type="number" min="20" max="200" value={settings.koreanTitleSize}
                  onChange={(e) => onChange({ ...settings, koreanTitleSize: parseInt(e.target.value) || 20 })}
                  className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* English Settings */}
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/60">영어 제목 설정</span>
                <div className="flex gap-2 items-center">
                  <select 
                    value={settings.englishFont}
                    onChange={(e) => onChange({ ...settings, englishFont: e.target.value })}
                    className="flex-1 bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
                    style={{ fontFamily: settings.englishFont }}
                  >
                    {ENGLISH_FONTS.map(font => <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>)}
                  </select>
                  <input 
                    type="color" 
                    value={settings.englishColor}
                    onChange={(e) => onChange({ ...settings, englishColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-none shrink-0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-[10px] text-gray-400">크기 (%)</span>
                <input 
                  type="number" min="10" max="150" value={settings.englishTitleSize}
                  onChange={(e) => onChange({ ...settings, englishTitleSize: parseInt(e.target.value) || 10 })}
                  className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] text-gray-400">자간/행간</span>
              <input 
                type="number" min="0.1" max="2.0" step="0.1" value={settings.titleSpacing}
                onChange={(e) => onChange({ ...settings, titleSpacing: parseFloat(e.target.value) || 0.1 })}
                className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary outline-none"
              />
            </div>
            <span className="text-xs font-bold text-white/60 block">위치 미세 조정 (X, Y)</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 whitespace-nowrap">좌우 (X)</span>
                <input 
                  type="number" min="-100" max="100" value={settings.titleXOffset}
                  onChange={(e) => onChange({ ...settings, titleXOffset: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary outline-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 whitespace-nowrap">상하 (Y)</span>
                <input 
                  type="number" min="-100" max="100" value={settings.titleYOffset}
                  onChange={(e) => onChange({ ...settings, titleYOffset: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showLyricsControls && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">가사 설정</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">표시 방식</label>
              </div>
              <select 
                value={settings.lyricsDisplayMode || 'scroll'}
                onChange={(e) => onChange({ ...settings, lyricsDisplayMode: e.target.value as any })}
                className="w-full bg-[#1A1F26] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-primary outline-none cursor-pointer"
              >
                <option value="scroll">스크롤</option>
                <option value="fade">페이드</option>
                <option value="center">중앙</option>
                <option value="bottom">하단</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">시작 시간</label>
                <span className="text-[10px] text-primary font-mono">{settings.lyricsStartTime ?? 0}s</span>
              </div>
              <input 
                type="range" min="0" max="30" step="0.5"
                value={settings.lyricsStartTime ?? 0} 
                onChange={(e) => onChange({ ...settings, lyricsStartTime: parseFloat(e.target.value) })}
                className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">종료 위치</label>
                <span className="text-[10px] text-primary font-mono">{settings.lyricsScrollEnd ?? 50}%</span>
              </div>
              <input 
                type="range" min="10" max="80" step="1"
                value={settings.lyricsScrollEnd ?? 50} 
                onChange={(e) => onChange({ ...settings, lyricsScrollEnd: parseInt(e.target.value) })}
                className="w-full accent-primary h-1 bg-white/10 rounded-full appearance-none"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase">가사 크기</label>
                <span className="text-[10px] text-primary font-mono">{settings.lyricsFontSize ?? 4}</span>
              </div>
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
