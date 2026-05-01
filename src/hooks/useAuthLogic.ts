import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, syncUserProfile } from '../firebase';

export const useAuthLogic = (addLog: (msg: string) => void) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
        addLog(`👋 환영합니다, ${currentUser.displayName || '사용자'}님!`);
        await syncUserProfile(currentUser);
      } else {
        addLog("🔑 로그인이 필요합니다.");
      }
    });

    return () => unsubscribe();
  }, [addLog]);

  return {
    user,
    setUser,
    isAuthLoading
  };
};
