import { useState, useEffect, useRef } from 'react';
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

  // --- Logic 1: Data Migration (Synchronous part of hook initialization) ---
  useEffect(() => {
    const migrationKeys = ['view', 'activeTab', 'logs', 'shortsCount', 'audioName', 'videoLyrics', 'englishVideoLyrics', 'shortsHighlights', 'platforms', 'workflow', 'suno_json_data'];
    migrationKeys.forEach(key => {
      const oldKey = `vibeflow_${key}`;
      const newKey = `echoesuntohim_${key}`;
      const oldData = localStorage.getItem(oldKey);
      
      if (key === 'suno_json_data' && !localStorage.getItem(newKey)) {
        const bareData = localStorage.getItem('suno_json_data');
        if (bareData) localStorage.setItem(newKey, bareData);
      }

      if (oldData && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldData);
        console.log(`[Migration] Recovered ${key} from vibeflow_ prefix`);
      }
    });
  }, []);

  // --- Logic 2: loadTracks (Extracted from App.tsx) ---
  useEffect(() => {
    const currentUid = user ? user.uid : 'guest';
    if (loadedUidRef.current === currentUid) return;

    const loadTracks = async () => {
      try {
        setIsTracksLoaded(false);
        // Load from LocalStorage first
        const localSaved = localStorage.getItem('echoesuntohim_suno_json_data') || localStorage.getItem('suno_json_data');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSunoTracks(parsed);
            addLog(`⚡ 로컬 히스토리에서 ${parsed.length}곡을 불러왔습니다.`);
          }
        }

        if (user) {
          addLog("☁️ 클라우드(Firebase)에서 최신 목록을 가져오는 중...");
          const userRef = doc(db, 'users', user.uid, 'settings', 'sunoTracks');
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const cloudTracks = userDoc.data().tracks || [];
            if (cloudTracks.length > 0) {
              setSunoTracks(prev => {
                const localIds = new Set(prev.map(t => t.id));
                const newFromCloud = cloudTracks.filter((t: any) => !localIds.has(t.id));
                const combined = [...newFromCloud, ...prev].sort((a, b) => 
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                );
                return combined;
              });
              addLog(`✅ 클라우드 동기화 성공: 새로운 ${cloudTracks.length}곡을 병합했습니다.`);
            } else {
              addLog("ℹ️ 클라우드에 저장된 기록이 없습니다.");
            }
          }
        }
        setIsTracksLoaded(true);
        loadedUidRef.current = currentUid;
      } catch (error) {
        console.error("Load tracks error:", error);
        setIsTracksLoaded(true);
      }
    };

    loadTracks();
  }, [user]);

  // --- Logic 3: Sync to LocalStorage & Cloud (Extracted from App.tsx) ---
  useEffect(() => {
    if (!isTracksLoaded) return;

    if (sunoTracks.length > 0) {
      localStorage.setItem('echoesuntohim_suno_json_data', JSON.stringify(sunoTracks));
    }

    if (user && isTracksLoaded) {
      const syncToCloud = async () => {
        try {
          const userRef = doc(db, 'users', user.uid, 'settings', 'sunoTracks');
          await setDoc(userRef, {
            tracks: sunoTracks,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Cloud sync error:", error);
        }
      };
      const timer = setTimeout(syncToCloud, 1000);
      return () => clearTimeout(timer);
    }
  }, [sunoTracks, user, isTracksLoaded]);

  return {
    sunoTracks,
    setSunoTracks,
    isTracksLoaded
  };
};
