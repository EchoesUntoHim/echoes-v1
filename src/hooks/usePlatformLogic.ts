import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, signInForYouTube } from '../firebase';
import { User } from 'firebase/auth';

export const usePlatformLogic = (user: User | null, addLog: (msg: string) => void) => {
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(null);
  const [bloggerAccessToken, setBloggerAccessToken] = useState<string | null>(null);
  const [tiktokAccessToken, setTiktokAccessToken] = useState<string | null>(() => localStorage.getItem('tiktok_access_token'));
  
  const [platforms, setPlatforms] = useState(() => {
    const saved = localStorage.getItem('echoesuntohim_platforms');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed === 'object' ? parsed : {
        youtube: 'disconnected',
        tiktok: 'disconnected',
        naver: 'disconnected',
        tistory: 'disconnected',
        google: 'disconnected'
      };
    } catch (e) {
      return {
        youtube: 'disconnected',
        tiktok: 'disconnected',
        naver: 'disconnected',
        tistory: 'disconnected',
        google: 'disconnected'
      };
    }
  });

  const [isPlatformLoginModalOpen, setIsPlatformLoginModalOpen] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);

  // 플랫폼 키 및 토큰 동기화 로직
  useEffect(() => {
    // 팝업창으로 열린 경우: 독립적으로 토큰 교환을 수행하고 창을 닫음
    if (window.opener && window.opener !== window) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && state) {
        const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
        const keys = savedKeys ? JSON.parse(savedKeys) : null;
        const targetKeys = keys ? keys[state] : null;

        if (targetKeys && targetKeys.clientId) {
          const bodyParams = new URLSearchParams();
          bodyParams.append('code', code);
          bodyParams.append('client_id', targetKeys.clientId);
          if (targetKeys.clientSecret) bodyParams.append('client_secret', targetKeys.clientSecret);
          bodyParams.append('redirect_uri', window.location.origin);
          bodyParams.append('grant_type', 'authorization_code');

          fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams,
          }).then(res => res.json()).then(data => {
            if (data.access_token) {
              localStorage.setItem(`oauth_token_${state}`, data.access_token);
            }
            window.close();
          }).catch(() => window.close());
        } else {
          window.close();
        }
        return;
      }
    }

    if (!user) return;
    const syncPlatformData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid, 'settings', 'platforms');
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.tokens) {
            if (data.tokens.youtube) setYoutubeAccessToken(data.tokens.youtube);
            if (data.tokens.google) setBloggerAccessToken(data.tokens.google);
            if (data.tokens.tiktok) {
              setTiktokAccessToken(data.tokens.tiktok);
              localStorage.setItem('tiktok_access_token', data.tokens.tiktok);
            }
          }
        }
      } catch (err) {
        console.error("Platform data sync error:", err);
      }
    };
    syncPlatformData();

    // 메인 창 새로고침 시 토큰 복구
    const pendingGoogleToken = localStorage.getItem('oauth_token_google');
    if (pendingGoogleToken) {
      setBloggerAccessToken(pendingGoogleToken);
      localStorage.removeItem('oauth_token_google');
    }
    const pendingYoutubeToken = localStorage.getItem('oauth_token_youtube');
    if (pendingYoutubeToken) {
      setYoutubeAccessToken(pendingYoutubeToken);
      localStorage.removeItem('oauth_token_youtube');
    }
  }, [user]);

  // 토큰 변경 시 클라우드 저장
  useEffect(() => {
    if (!user || (!youtubeAccessToken && !tiktokAccessToken)) return;
    const saveTokens = async () => {
      const userRef = doc(db, 'users', user.uid, 'settings', 'platforms');
      await setDoc(userRef, {
        tokens: {
          youtube: youtubeAccessToken,
          google: bloggerAccessToken,
          tiktok: tiktokAccessToken
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
    };
    const timer = setTimeout(saveTokens, 2000);
    return () => clearTimeout(timer);
  }, [youtubeAccessToken, bloggerAccessToken, tiktokAccessToken, user]);

  useEffect(() => {
    setPlatforms(prev => ({
      ...prev,
      youtube: youtubeAccessToken ? 'connected' : 'disconnected',
      google: bloggerAccessToken ? 'connected' : 'disconnected',
      tiktok: tiktokAccessToken ? 'connected' : 'disconnected'
    }));
  }, [youtubeAccessToken, bloggerAccessToken, tiktokAccessToken]);

  useEffect(() => {
    localStorage.setItem('echoesuntohim_platforms', JSON.stringify(platforms));
  }, [platforms]);

  const togglePlatform = (key: string) => {
    setPendingPlatform(key);
    setIsPlatformLoginModalOpen(true);
  };

  const handlePlatformLoginConfirm = async () => {
    if (!pendingPlatform) return;

    const key = pendingPlatform;
    if (platforms[key] === 'connected') {
      // 연동 해제
      if (key === 'youtube') setYoutubeAccessToken(null);
      else if (key === 'google') setBloggerAccessToken(null);
      else if (key === 'tiktok') {
        setTiktokAccessToken(null);
        localStorage.removeItem('tiktok_access_token');
      }
      addLog(`🔌 [${key}] 연동이 해제되었습니다.`);
    } else {
      // 실제 연동 프로세스
      try {
        if (key === 'youtube' || key === 'google') {
          addLog("🔑 구글 연동을 시작합니다...");
          const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
          const keys = savedKeys ? JSON.parse(savedKeys) : null;
          const targetKeys = key === 'youtube' ? keys?.youtube : keys?.google;

          if (targetKeys && targetKeys.clientId) {
            const redirectUri = window.location.origin;
            const scope = encodeURIComponent('openid https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${targetKeys.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=select_account&access_type=offline&state=${key}`;
            window.open(authUrl, 'google-auth', 'width=500,height=600');
          } else {
            const result = await signInForYouTube();
            if (result.accessToken) {
              if (key === 'youtube') setYoutubeAccessToken(result.accessToken);
              else setBloggerAccessToken(result.accessToken);
            }
          }
          addLog("✅ 연동 성공!");
        } else if (key === 'tiktok') {
          const savedKeys = localStorage.getItem('echoesuntohim_platform_keys');
          const keys = savedKeys ? JSON.parse(savedKeys) : null;
          if (!keys || !keys.clientKey) {
            addLog("🔑 틱톡 연동 설정이 먼저 필요합니다.");
            setIsPlatformLoginModalOpen(false);
            return;
          }
          const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${keys.clientKey}&scope=video.upload,video.publish&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin)}`;
          window.open(authUrl, '_blank');
        }
      } catch (err: any) {
        addLog(`❌ 연동 실패: ${err.message}`);
      }
    }
    setIsPlatformLoginModalOpen(false);
    setPendingPlatform(null);
  };

  return {
    platforms,
    youtubeAccessToken,
    setYoutubeAccessToken,
    bloggerAccessToken,
    setBloggerAccessToken,
    tiktokAccessToken,
    setTiktokAccessToken,
    isPlatformLoginModalOpen,
    setIsPlatformLoginModalOpen,
    pendingPlatform,
    setPendingPlatform,
    togglePlatform,
    handlePlatformLoginConfirm
  };
};
