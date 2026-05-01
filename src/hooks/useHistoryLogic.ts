import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';

interface HistoryLogicProps {
  user: User | null;
  addLog: (msg: string) => void;
}

export const useHistoryLogic = ({ user, addLog }: HistoryLogicProps) => {
  const [sunoTracks, setSunoTracks] = useState<any[]>([]);
  const [isTracksLoaded, setIsTracksLoaded] = useState(false);
  const loadedUidRef = useRef<string | null>(null);

  // --- Logic 1: Data Migration ---
  useEffect(() => {
    const migrationKeys = ['view', 'activeTab', 'logs', 'shortsCount', 'audioName', 'videoLyrics', 'englishVideoLyrics', 'shortsHighlights', 'platforms', 'workflow', 'suno_json_data'];
    migrationKeys.forEach(key => {
      const oldKey = `vibeflow_${key}`;
      const newKey = `echoesuntohim_${key}`;
      const oldData = localStorage.getItem(oldKey);
      if (oldData && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldData);
      }
    });
  }, []);

  // --- Logic 2: loadTracks (Extracted and wrapped with useCallback) ---
  const loadTracks = useCallback(async () => {
    const currentUid = user ? user.uid : 'guest';
    if (!user) {
      setSunoTracks([]);
      setIsTracksLoaded(true);
      return;
    }

    try {
      setIsTracksLoaded(false);
      const { collection, query, where, getDocs } = await import('firebase/firestore');

      const fetchCollection = async (collName: string) => {
        try {
          return await getDocs(query(collection(db, collName), where('userId', '==', user.uid)));
        } catch (e: any) {
          console.error(`[Firestore Permission] Failed to fetch ${collName}:`, e.message);
          return { docs: [] };
        }
      };

      const [sunoSnapshot, lyricsSnapshot, imagesSnapshot, meditationSnapshot] = await Promise.all([
        fetchCollection('sunoTracks'),
        fetchCollection('generated_lyrics'),
        fetchCollection('generated_images'),
        fetchCollection('meditation_history')
      ]);

      const collectionTracks = (sunoSnapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id, type: 'song' }));
      const lyricsTracks = (lyricsSnapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id, type: 'lyrics' }));
      const imagesTracks = (imagesSnapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id, type: 'image' }));
      const meditationTracks = (meditationSnapshot.docs || []).map(doc => ({ ...doc.data(), id: doc.id, type: 'meditation' }));

      const combined = [...collectionTracks, ...lyricsTracks, ...imagesTracks, ...meditationTracks];
      const uniqueTracks = Array.from(new Map(combined.map(t => [t.id, t])).values());

      uniqueTracks.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          const d = new Date(val);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        return getTime((b as any).created_at || (b as any).createdAt) - getTime((a as any).created_at || (a as any).createdAt);
      });

      setSunoTracks(uniqueTracks);
      setIsTracksLoaded(true);
      loadedUidRef.current = currentUid;
    } catch (error) {
      console.error("Load tracks error:", error);
      setIsTracksLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // --- Logic 3: 실시간 클라우드 동기화 ---
  useEffect(() => {
    if (!isTracksLoaded || !user || sunoTracks.length === 0) return;

    const syncToCloud = async () => {
      try {
        const { collection, doc, writeBatch } = await import('firebase/firestore');
        const batch = writeBatch(db);

        sunoTracks.slice(0, 50).forEach(track => {
          if (!track.id) return;
          // [v1.15.38] 곡(song) 타입만 sunoTracks 컬렉션에 동기화하도록 제한 (묵상/가사 오염 방지)
          if (track.type && track.type !== 'song') return;

          const trackRef = doc(collection(db, 'sunoTracks'), track.id);
          const trackToSave = {
            ...track,
            userId: user.uid,
            updated_at: serverTimestamp(),
            generatedImages: (track.generatedImages || []).filter((img: any) => img.url && !img.url.startsWith('data:image'))
          };
          batch.set(trackRef, trackToSave, { merge: true });
        });
        await batch.commit();
      } catch (error) { }
    };

    const timer = setTimeout(syncToCloud, 3000);
    return () => clearTimeout(timer);
  }, [sunoTracks, user, isTracksLoaded]);

  const deleteTrack = useCallback(async (trackId: string, type?: string) => {
    if (!user || !confirm('정말로 이 항목을 DB에서 영구 삭제하시겠습니까?')) return;

    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      let collectionName = 'sunoTracks';
      if (type === 'lyrics') collectionName = 'generated_lyrics';
      if (type === 'image') collectionName = 'generated_images';
      if (type === 'meditation') collectionName = 'meditation_history';

      await deleteDoc(doc(db, collectionName, trackId));
      setSunoTracks(prev => prev.filter(t => t.id !== trackId));
      addLog(`✅ 삭제 완료: ${trackId}`);
    } catch (err: any) {
      addLog(`❌ 삭제 실패: ${err.message}`);
    }
  }, [user, addLog, setSunoTracks]);

  return {
    sunoTracks,
    setSunoTracks,
    isTracksLoaded,
    loadTracks,
    deleteTrack
  };
};
