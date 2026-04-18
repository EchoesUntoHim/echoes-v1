import re
import os

path = r'src\App.tsx'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# New code for both functions
new_code = r'''
  const generateYoutubeMetadata = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    addLog("유튜브 업로드용 메타데이터(제목, 설명, 태그) 생성을 시작합니다...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 10 } }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const prompt = `
        당신은 100만 명의 구독자와 팔로워를 보유한 최정상급 유튜버이자 쇼츠 전문가입니다.
        다음 곡 정보를 바탕으로 유튜브 업로드에 최적화된 메타데이터를 생성해주세요.
        
        [곡 정보]
        - 음악 종류: ${workflow.params.target}
        - 한글 제목: ${workflow.params.koreanTitle || workflow.results.title}
        - 주제: ${workflow.params.topic}
        - 분위기: ${workflow.params.mood}
        - 가사 일부: ${workflow.results.lyrics?.substring(0, 200)}...
        ${workflow.params.songInterpretation ? `- **사용자 곡 해석 (최우선 반영)**: ${workflow.params.songInterpretation}` : ''}
        
        Response Format (JSON):
        {
          "title": "클릭을 유발하는 제목",
          "description": "상세 설명",
          "tags": "태그1, 태그2, 태그3"
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 50 } }));

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              tags: { type: Type.STRING }
            },
            required: ['title', 'description', 'tags']
          },
          temperature: 0.8,
          maxOutputTokens: 2048,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      let parsed;
      try {
        const cleanedText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Youtube JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, youtube: 100 },
        results: {
          ...prev.results,
          youtubeMetadata: {
            title: parsed.title,
            description: parsed.description,
            tags: parsed.tags
          }
        }
      }));

      addLog('✅ 유튜브 메타데이터 생성이 완료되었습니다.');
    } catch (error: any) {
      console.error('Youtube Generation Error:', error);
      addLog(`❌ 유튜브 메타데이터 생성 실패: ${error.message}`);
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 0 } }));
    }
  };

  const generateBlogPost = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    addLog(`📝 [${aiEngine}] 엔진을 사용하여 네이버/구글 블로그 포스팅 생성을 시작합니다...`);
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 10 } }));

    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const processedImages = workflow.results.images.map(img => ({
        label: img.label,
        url: img.url
      }));

      const naverPersona = `
        당신은 상위 0.1%의 네이버 파워 블로거입니다. 
        [말투]: 친근하고 다정하며, 이모지를 적절하게 사용하여 독자와 소통하는 느낌을 줍니다. 개인적인 경험과 감동을 강조하며, '위로'와 '공감'에 초점을 맞춥니다.
        [최적화]: 네이버 블로그 검색 엔진(C-Rank, D.I.A.)에 최적화된 서술 방식을 사용하세요.
      `;

      const googlePersona = `
        당신은 구글 검색 상위 노출 전문 SEO 마케터이자 음악 평론가입니다.
        [말투]: 정보 지향적이며 객관적이고 권위 있는 어조를 사용합니다. 논리적인 구조(H1, H2, H3 태그 사용)를 중시하며, 전문적인 분석을 제공합니다.
        [최적화]: 구글의 E-E-A-T 가이드라인을 준수하며 핵심 키워드를 전략적으로 배치하여 검색 결과 상위 노출을 유도하세요.
      `;

      const prompt = `
        [SYSTEM ROLE]
        당신은 네이버와 구글 각각의 플랫폼 성격에 맞는 최적화된 블로그 포스팅을 생성하는 전문가입니다.
        하나의 곡 정보를 바탕으로 두 가지 버전의 포스팅을 생성하세요.

        [곡 정보]
        - 제목: ${workflow.params.koreanTitle || workflow.results.title}
        - 주제: ${workflow.params.topic}
        - 분위기: ${workflow.params.mood}
        - 가사: ${workflow.results.lyrics}
        ${workflow.results.englishLyrics ? `- 영어 가사: ${workflow.results.englishLyrics}` : ''}
        - 타겟 고객층: ${workflow.blogSettings?.targetAudience || '모든 음악 애호가'}
        - 글의 관점: ${workflow.blogSettings?.blogPerspective || '소개자 관점'}
        ${workflow.params.songInterpretation ? `- **사용자 추가 해석 (최우선 반영)**: ${workflow.params.songInterpretation}` : ''}
        
        [유튜브 정보]
        - 링크: ${workflow.blogSettings?.youtubeLink || '없음'}
        - 하단 문구: ${workflow.blogSettings?.youtubeFooterText || ''}
        
        [포스팅 1: 네이버 블로그 스타일]
        ${naverPersona}
        - 제목: 클릭을 유발하는 감성적이고 호기심을 자극하는 제목
        - 본문: HTML 태그 사용, 친근한 문체, 풍부한 이모지, {{IMAGE:라벨명}} 삽입, 정보(Table) 및 인용구(Blockquote) 활용.
        - 태그: 네이버 인기 태그 중심 (#CCM추천 #감성노래 등)

        [포스팅 2: 구글 블로그 스타일]
        ${googlePersona}
        - 제목: 검색 의도를 반영한 명확하고 전문적인 제목
        - 본문: 체계적인 구조 (<h1>, <h2> 사용), 심층적인 분석, 불필요한 이모지 절제, {{IMAGE:라벨명}} 삽입, 전문적인 정보(Table) 활용.
        - 태그: 구글 검색 키워드 중심 (Long-tail keywords)

        [생성할 이미지 목록]
        ${processedImages.map(img => `- 라벨: ${img.label}`).join('\\n') || '이미지 없음'}

        반드시 모든 이미지 라벨을 본문에 {{IMAGE:라벨명}} 형식으로 포함시키세요.

        Response Format (JSON):
        {
          "naver": {
            "title": "네이버용 제목",
            "content": "네이버용 HTML 본문",
            "tags": "네이버용 태그"
          },
          "google": {
            "title": "구글용 제목",
            "content": "구글용 HTML 본문",
            "tags": "구글용 태그"
          },
          "imageTexts": {
            "이미지라벨": "이미지 위에 들어갈 문구"
          }
        }
      `;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 50 } }));

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              naver: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ['title', 'content', 'tags']
              },
              google: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  tags: { type: Type.STRING }
                },
                required: ['title', 'content', 'tags']
              },
              imageTexts: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
            },
            required: ['naver', 'google', 'imageTexts']
          },
          temperature: 0.8,
          maxOutputTokens: 16384,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      let parsed;
      try {
        const cleanedText = text.replace(/^```json\\n?/, '').replace(/\\n?```$/, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Blog JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.');
      }
      
      let currentImageTexts = { ...(workflow.blogSettings?.imageTexts || {}) };
      if (parsed.imageTexts) {
        currentImageTexts = {
          ...parsed.imageTexts,
          ...currentImageTexts
        };
        setWorkflow(prev => ({
          ...prev,
          blogSettings: {
            ...prev.blogSettings,
            imageTexts: currentImageTexts
          }
        }));
      }

      const processContent = async (rawContent) => {
        let finalContent = rawContent;
        const finalProcessedImages = await Promise.all(workflow.results.images.map(async (img) => {
          const text = currentImageTexts[img.label] || workflow.results.title || '제목 없음';
          const processedUrl = await processImageForBlog(img.url, text);
          return { ...img, blogUrl: processedUrl };
        }));

        for (const img of finalProcessedImages) {
          const placeholder = `{{IMAGE:${img.label}}}`;
          const imgTag = `<img src="${img.blogUrl}" alt="${img.label}" style="max-width: 100%; border-radius: 12px; margin: 25px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">`;
          if (typeof finalContent === 'string') {
            if (finalContent.includes(placeholder)) {
              finalContent = finalContent.split(placeholder).join(imgTag);
            } else {
              finalContent += `\\n<div style="text-align: center; margin-top: 30px;">${imgTag}</div>\\n`;
            }
          }
        }
        return finalContent;
      };

      const naverContent = await processContent(parsed.naver.content);
      const googleContent = await processContent(parsed.google.content);

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, blog: 100 },
        results: {
          ...prev.results,
          naverBlogPost: {
            title: parsed.naver.title,
            content: naverContent,
            rawContent: parsed.naver.content,
            tags: parsed.naver.tags
          },
          googleBlogPost: {
            title: parsed.google.title,
            content: googleContent,
            rawContent: parsed.google.content,
            tags: parsed.google.tags
          },
          blogPost: {
            title: parsed.naver.title,
            content: naverContent,
            rawContent: parsed.naver.content,
            tags: parsed.naver.tags
          }
        }
      }));

      if (user) {
        try {
          await addDoc(collection(db, 'blogPosts'), {
            uid: user.uid,
            platform: 'naver',
            title: parsed.naver.title,
            content: naverContent,
            tags: parsed.naver.tags,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            trackId: workflow.results.trackId || null
          });
          await addDoc(collection(db, 'blogPosts'), {
            uid: user.uid,
            platform: 'google',
            title: parsed.google.title,
            content: googleContent,
            tags: parsed.google.tags,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            trackId: workflow.results.trackId || null
          });
          addLog('☁️ 블로그 포스팅이 클라우드에 저장되었습니다.');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'blogPosts');
        }
      }
      
      addLog('✅ 네이버/구글 블로그 포스팅 생성이 완료되었습니다.');
    } catch (error: any) {
      console.error('Blog Generation Error:', error);
      addLog(`❌ 블로그 포스팅 생성 실패: ${error.message}`);
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 0 } }));
    }
  };
'''

# Use simple search for the headers
start_tag = 'const generateYoutubeMetadata = async () => {'
end_tag = 'const generateLyrics = async () => {'

start_idx = content.find(start_tag)
end_idx = content.find(end_tag)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_code + '\n\n' + content[end_idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS')
else:
    print(f'FAILED: start={start_idx}, end={end_idx}')
