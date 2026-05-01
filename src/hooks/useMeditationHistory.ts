// src/hooks/useMeditationHistory.ts
/**
 * Simple local storage based history for meditation images.
 * In a real production app this would be replaced with a proper DB/API.
 */
export interface MeditationHistoryEntry {
  date: string; // ISO string
  day: string;
  color: string;
  symbol: string;
  position: string;
  imageUrl: string; // permanent URL returned by saveImageToLibrary
  engine: string;
}

export function addHistory(entry: MeditationHistoryEntry) {
  const existing: MeditationHistoryEntry[] = JSON.parse(localStorage.getItem('meditation_history') ?? '[]');
  existing.unshift(entry); // newest first
  localStorage.setItem('meditation_history', JSON.stringify(existing));
}

export function loadHistory(): MeditationHistoryEntry[] {
  return JSON.parse(localStorage.getItem('meditation_history') ?? '[]');
}
