import React, { useState, useEffect } from 'react';

interface TimeInputProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
}

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(Math.round(seconds % 60));
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const parseTime = (timeStr: string) => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]);
    const secs = parseInt(parts[1]);
    if (!isNaN(mins) && !isNaN(secs)) return mins * 60 + secs;
  }
  return null;
};

export const TimeInput = ({ value, onChange, label }: TimeInputProps) => {
  const [tempValue, setTempValue] = useState(formatTime(value));
  
  useEffect(() => {
    setTempValue(formatTime(value));
  }, [value]);

  return (
    <div className="flex-1 space-y-1">
      <label className="text-[10px] text-gray-500 font-bold">{label}</label>
      <input 
        type="text" 
        value={tempValue} 
        onChange={(e) => {
          const val = e.target.value;
          setTempValue(val);
          // Only update parent if it's a valid MM:SS format
          if (/^\d{1,2}:\d{2}$/.test(val)) {
            const parsed = parseTime(val);
            if (parsed !== null) onChange(parsed);
          }
        }}
        onBlur={() => setTempValue(formatTime(value))}
        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white font-mono focus:border-primary outline-none transition-colors"
        placeholder="00:00"
      />
    </div>
  );
};
