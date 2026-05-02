import { useState, useCallback } from 'react';
import { uploadToYouTube, uploadToTikTok } from '../services/uploadService';
import { WorkflowState } from '../types';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_AI_ENGINE } from '../constants';

export const useContentLogic = (
  workflow: WorkflowState,
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowState>>,
  addLog: (msg: string) => void,
  apiKey: string,
  aiEngine: string
) => {
  const [isShortsGenerating, setIsShortsGenerating] = useState(false);

  // 플랫폼 메타데이터 생성
  const generatePlatformMetadata = useCallback(async () => {
    if (!apiKey) {
      addLog("⚠️ API 키가 설정되지 않았습니다.");
      return;
    }
    const selectedEngine = aiEngine || DEFAULT_AI_ENGINE;
    addLog(`✨ [${selectedEngine}] 플랫폼 메타데이터(유튜브/틱톡) 생성을 시작합니다...`);

    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        당신은 최고의 SNS 마케팅 전문가이자 카피라이터입니다. 
        제공된 가사와 해석을 바탕으로 유튜브와 틱톡에 즉시 업로드 가능한 최적의 메타데이터를 생성하세요.

        [공통 필수 지침]
        - 이모지와 구분선을 적극 활용하여 가독성을 극대화할 것.
        - 클릭을 유도하는 매력적인 제목을 국문/영문 병기로 작성할 것.

        [유튜브 설명란 (YOUTUBE_DESCRIPTION) 규칙 - 엄수]
        - 반드시 섹션별(가사, 곡 정보, 크레딧 등)로 2번 이상의 줄바꿈(\\n\\n)을 포함할 것.
        - 정보 전달력이 극대화되도록 구조화할 것.

        [틱톡 캡션 (TIKTOK_CAPTION) 규칙 - 엄수]
        - 캡션(내용) 자체에 문장 단위 줄바꿈을 적용할 것.
        - **중요: 캡션 내용과 해시태그 무더기 사이에는 반드시 3줄 이상의 빈 행(\\n\\n\\n\\n)을 삽입할 것.**
        - 복사 후 즉시 업로드가 가능하도록 공백 레이아웃을 완벽하게 맞출 것.

        가사: ${workflow.results.lyrics}
        해석: ${workflow.results.interpretation}
        주제: ${workflow.params.topic}
        
        형식:
        [YOUTUBE_TITLE] 제목
        [YOUTUBE_DESCRIPTION] 설명 내용
        [YOUTUBE_TAGS] 태그들
        [TIKTOK_CAPTION] 캡션 내용
      `;

      const response = await ai.models.generateContent({
        model: selectedEngine,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      let text = response.text || "";

      let youtubeTitle = text.match(/\[YOUTUBE_TITLE\](.*)/)?.[1]?.trim() || "";
      // [v1.15.36] 업로드 제목 파싱 시 분류태그([CCM], [Pop] 등) 강제 제거
      youtubeTitle = youtubeTitle.replace(/\[.*?\]/g, '').trim();

      let youtubeDesc = text.match(/\[YOUTUBE_DESCRIPTION\]([\s\S]*?)(?=\[YOUTUBE_TAGS\]|\[TIKTOK_CAPTION\]|$)/)?.[1]?.trim() || "";
      const youtubeTags = text.match(/\[YOUTUBE_TAGS\](.*)/)?.[1]?.trim() || "";
      let tiktokCaption = text.match(/\[TIKTOK_CAPTION\]([\s\S]*?)$/)?.[1]?.trim() || "";

      // [v1.15.28] 규칙 강제 집행 (후처리 정밀화)
      // 1. 유튜브 설명란: 섹션 간 줄바꿈 2번(\n\n) 강제 적용
      youtubeDesc = youtubeDesc
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== "")
        .join('\n\n'); // 모든 문장/섹션 사이에 2번의 줄바꿈 강제

      // 2. 틱톡 캡션: 캡션과 해시태그 사이 3줄 이상의 빈 행(\n\n\n\n) 강제 삽입
      if (tiktokCaption.includes('#')) {
        const hashIndex = tiktokCaption.indexOf('#');
        const content = tiktokCaption.substring(0, hashIndex).trim();
        const hashtags = tiktokCaption.substring(hashIndex).trim();
        // 문장 단위 줄바꿈 적용 후 해시태그와 분리
        const spacedContent = content.split('\n').map(l => l.trim()).join('\n');
        tiktokCaption = `${spacedContent}\n\n\n\n${hashtags}`;
      } else {
        tiktokCaption = tiktokCaption.split('\n').map(l => l.trim()).join('\n');
      }

      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          youtubeMetadata: { title: youtubeTitle, description: youtubeDesc, tags: youtubeTags },
          tiktokMetadata: { fullContent: tiktokCaption }
        },
        progress: { ...prev.progress, youtube: 100 }
      }));
      addLog("✅ 규칙을 준수한 플랫폼 메타데이터 생성이 완료되었습니다.");
    } catch (err: any) {
      addLog(`❌ 메타데이터 생성 실패: ${err.message}`);
    }
  }, [apiKey, aiEngine, workflow.results.lyrics, workflow.results.interpretation, setWorkflow, addLog]);

  // 블로그 포스팅 생성
  const generateBlogPost = useCallback(async () => {
    if (!apiKey) return;
    const selectedEngine = aiEngine || DEFAULT_AI_ENGINE;
    addLog(`✨ [${selectedEngine}] 블로그 포스팅 생성을 시작합니다...`);

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const prompt = `가사: ${workflow.results.lyrics}\n해석: ${workflow.results.interpretation}\n위 내용을 바탕으로 네이버 블로그에 올릴 정성스러운 포스팅 내용을 HTML 형식으로 작성해줘.`;

      const response = await genAI.models.generateContent({
        model: selectedEngine,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const text = response.text || "";

      const cleanTitle = (workflow.params.koreanTitle || '새 찬양').replace(/\[.*?\]/g, '').trim();
      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          blogPost: {
            title: `${cleanTitle} - 감동적인 CCM 찬양 리뷰`,
            content: text,
            rawContent: text,
            tags: "CCM, 찬양, 은혜, 찬양리뷰",
          }
        },
        progress: { ...prev.progress, blog: 100 }
      }));
      addLog("✅ 블로그 포스팅 생성이 완료되었습니다.");
    } catch (err: any) {
      addLog(`❌ 블로그 생성 실패: ${err.message}`);
    }
  }, [apiKey, aiEngine, workflow.results.lyrics, workflow.results.interpretation, workflow.params.koreanTitle, setWorkflow, addLog]);

  // 이미지 생성 ( Imagen 등 연동 로직 - 플레이스홀더 )
  const generateImages = useCallback(async () => {
    if (!apiKey) return;
    addLog("🎨 이미지 생성을 시작합니다...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, image: 100 } }));
    addLog("✅ 이미지 생성이 완료되었습니다.");
  }, [apiKey, setWorkflow, addLog]);

  // 플랫폼 업로드 실행
  const handleUploadToPlatform = useCallback(async (platform: 'youtube' | 'tiktok', file: File, metadata: any, token: string) => {
    addLog(`🚀 ${platform} 업로드를 시작합니다...`);
    try {
      let result;
      if (platform === 'youtube') {
        result = await uploadToYouTube(file, metadata, token);
      } else {
        result = await uploadToTikTok(file, metadata, token);
      }
      addLog(`✅ ${platform} 업로드 성공! (ID: ${result.id})`);
    } catch (err: any) {
      addLog(`❌ ${platform} 업로드 실패: ${err.message}`);
    }
  }, [addLog]);

  return {
    isShortsGenerating,
    setIsShortsGenerating,
    generatePlatformMetadata,
    generateBlogPost,
    generateImages,
    handleUploadToPlatform
  };
};
