import React, { useEffect, useState } from 'react';
import { loadHistory, MeditationHistoryEntry } from '../hooks/useMeditationHistory';

export const MeditationHistory: React.FC = () => {
  const [history, setHistory] = useState<MeditationHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  if (!history.length) return <p className="text-sm text-gray-500">⚡ 아직 생성된 이미지가 없습니다.</p>;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4">생성 히스토리</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {history.map((h, idx) => (
          <div key={idx} className="rounded-lg overflow-hidden shadow-md bg-white/90 backdrop-blur">
            <img src={h.imageUrl} alt={`${h.day} 이미지`} className="w-full h-48 object-cover" />
            <div className="p-2 text-sm">
              <p><strong>{h.day}</strong> ({h.color})</p>
              <p>심볼: {h.symbol}</p>
              <p>위치: {h.position}</p>
              <p className="text-xs text-gray-500">{new Date(h.date).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
