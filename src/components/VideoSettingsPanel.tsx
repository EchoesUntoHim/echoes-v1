import React from 'react';
import { Type as TypeIcon, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { TITLE_EFFECTS, KOREAN_FONTS, ENGLISH_FONTS } from '../constants';
import { TitleSettings, TitlePosition, TitleEffect, TitleAlign } from '../types';

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
    <div className="mt-2 p-2 bg-black/40 rounded-xl border border-white/10 space-y-2">
      {/* Row 1: Core Title Settings */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 p-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <TypeIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">타이틀</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Group 1: Positioning & Effect */}
          <div className="flex items-center gap-2 shrink-0">
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
          </div>

          {/* Group 2: Fonts */}
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

          {/* Group 3: Fades & Visibility */}
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

      {showLyricsControls && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">가사 설정</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-1">
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase shrink-0">표시</label>
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
