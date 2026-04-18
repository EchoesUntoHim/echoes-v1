const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Find where generateBlogPost starts
const startIndex = content.indexOf('const generateBlogPost = async () => {');
if (startIndex === -1) throw new Error("Could not find generateBlogPost");

// Find where generateLyrics starts (the next function)
const endIndex = content.indexOf('const generateLyrics = async () => {', startIndex);
if (endIndex === -1) throw new Error("Could not find generateLyrics");

// Replace the entire generateBlogPost block
const newFunction = `const generateBlogPost = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    
    const targets = workflow.blogSettings?.targets || { naver: true, tistory: false, google: false };
    const activeTargets = Object.entries(targets).filter(([_, isActive]) => isActive).map(([key]) => key);
    
    if (activeTargets.length === 0) {
      addLog('❌ 선택된 블로그 플랫폼이 없습니다.');
      return;
    }

    addLog(\`블로그 포스팅 생성을 시작합니다... (\${activeTargets.join(', ')})\`);
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 10 } }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;
      const processedImages = workflow.results.images.filter(img => img.url);

      const naverPersona = \`
        [포스팅: 네이버 블로그]
        네이버 블로그 독자(20~40대)를 타겟으로 감성적이고 트렌디하게 작성하세요.
        이모지와 구분선을 적극 활용하고, 부드러운 구어체('~해요', '~입니다')를 사용하세요.
      \`;

      const tistoryPersona = \`
        [포스팅: 티스토리]
        IT/전문 지식에 관심이 많은 독자(20~30대)를 타겟으로 정보성과 감성을 균형있게 섞어 작성하세요.
        마크다운 스타일의 깔끔한 구조, 전문적인 용어와 함께 약간의 감성을 더한 문체('~합니다', '~다')를 사용하세요.
      \`;

      const googlePersona = \`
        [포스팅: 구글 블로그(SEO)]
        검색 엔진 최적화(SEO)를 고려하여 명확한 H1~H3 구조와 핵심 요약을 제공하세요.
        객관적이고 신뢰감 있는 문체로 음악적 기법과 가사를 심도 있게 분석하세요.
      \`;

      const prompt = \`
        [SYSTEM ROLE]
        당신은 체류 시간을 극대화하는 블로그 콘텐츠 전문가이자 HTML 디자이너입니다.
        아래 정보와 각 플랫폼별 가이드에 맞춰 시각적으로 화려하고 매력적인 HTML 포스팅을 생성하세요.

        [곡 정보]
        - 제목: \${workflow.params.koreanTitle || workflow.results.title}
        - 주제: \${workflow.params.topic}
        - 분위기: \${workflow.params.mood}
        - 가사: \${workflow.results.lyrics}
        \${workflow.results.englishLyrics ? \`- 영어 가사: \${workflow.results.englishLyrics}\` : ''}
        - 타겟 고객: \${workflow.blogSettings?.targetAudience || '모든 음악 애호가'}
        
        [유튜브 정보]
        - 링크: \${workflow.blogSettings?.youtubeLink || '없음'}
        
        [HTML 스타일 가이드]
        1. 챕터 헤더: <h2 style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px; border-radius: 12px; margin: 32px 0 16px;">🎵 제목</h2>
        2. 인용구: <blockquote style="border-left: 5px solid #00FFA3; background: #0B0E14; padding: 20px; border-radius: 8px;">내용</blockquote>
        
        [요청 플랫폼]
        \${targets.naver ? naverPersona : ''}
        \${targets.tistory ? tistoryPersona : ''}
        \${targets.google ? googlePersona : ''}

        [이미지 배치]
        \${processedImages.map(img => \`- 라벨: \${img.label}\`).join('\\n') || '이미지 없음'}
        본문 적절한 위치에 {{IMAGE:라벨명}} 형식으로 반드시 모든 이미지를 포함하세요.

        Response Format (JSON):
        {
          \${targets.naver ? '"naver": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          \${targets.tistory ? '"tistory": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          \${targets.google ? '"google": { "title": "...", "content": "HTML 내용", "tags": "태그" },' : ''}
          "imageTexts": {
            "이미지라벨": "이미지 위에 들어갈 문구"
          }
        }
      \`;

      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 50 } }));

      // Build JSON Schema dynamically based on targets
      const propertiesSchema = {
        imageTexts: { type: 'OBJECT', additionalProperties: { type: 'STRING' } }
      };
      
      const requiredFields = ['imageTexts'];
      
      const blogSchema = {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          content: { type: 'STRING' },
          tags: { type: 'STRING' }
        },
        required: ['title', 'content', 'tags']
      };

      if (targets.naver) { propertiesSchema.naver = blogSchema; requiredFields.push('naver'); }
      if (targets.tistory) { propertiesSchema.tistory = blogSchema; requiredFields.push('tistory'); }
      if (targets.google) { propertiesSchema.google = blogSchema; requiredFields.push('google'); }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: propertiesSchema,
            required: requiredFields
          },
          temperature: 0.8,
          maxOutputTokens: 8192,
        }
      });

      const text = response.text;
      if (!text) throw new Error('응답이 비어있습니다.');

      let parsed;
      try {
        const cleanedText = text.replace(/^\`\`\`json\\n?/, '').replace(/\\n?\`\`\`$/, '').trim();
        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Blog JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }
      
      let currentImageTexts = { ...(workflow.blogSettings?.imageTexts || {}) };
      if (parsed.imageTexts) {
        currentImageTexts = { ...parsed.imageTexts, ...currentImageTexts };
        setWorkflow(prev => ({
          ...prev,
          blogSettings: {
            ...prev.blogSettings,
            imageTexts: currentImageTexts
          }
        }));
      }

      const processContent = async (rawContent) => {
        if (!rawContent) return '';
        let finalContent = rawContent;
        const finalProcessedImages = await Promise.all(workflow.results.images.map(async (img) => {
          const text = currentImageTexts[img.label] || workflow.results.title || '제목 없음';
          const processedUrl = await processImageForBlog(img.url, text);
          return { ...img, blogUrl: processedUrl };
        }));

        for (const img of finalProcessedImages) {
          const placeholder = \`{{IMAGE:\${img.label}}}\`;
          const imgTag = \`<img src="\${img.blogUrl}" alt="\${img.label}" style="max-width: 100%; border-radius: 12px; margin: 25px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">\`;
          if (typeof finalContent === 'string') {
            if (finalContent.includes(placeholder)) {
              finalContent = finalContent.split(placeholder).join(imgTag);
            } else {
              finalContent += \`\\n<div style="text-align: center; margin-top: 30px;">\${imgTag}</div>\\n\`;
            }
          }
        }
        return finalContent;
      };

      const resultsToUpdate = {};
      
      if (targets.naver && parsed.naver) {
        resultsToUpdate.naverBlogPost = {
          title: parsed.naver.title,
          content: await processContent(parsed.naver.content),
          rawContent: parsed.naver.content,
          tags: parsed.naver.tags
        };
      }
      
      if (targets.tistory && parsed.tistory) {
        resultsToUpdate.tistoryBlogPost = {
          title: parsed.tistory.title,
          content: await processContent(parsed.tistory.content),
          rawContent: parsed.tistory.content,
          tags: parsed.tistory.tags
        };
      }
      
      if (targets.google && parsed.google) {
        resultsToUpdate.googleBlogPost = {
          title: parsed.google.title,
          content: await processContent(parsed.google.content),
          rawContent: parsed.google.content,
          tags: parsed.google.tags
        };
      }
      
      // Fallback for general blogPost reference
      if (targets.naver && parsed.naver) resultsToUpdate.blogPost = resultsToUpdate.naverBlogPost;
      else if (targets.tistory && parsed.tistory) resultsToUpdate.blogPost = resultsToUpdate.tistoryBlogPost;
      else if (targets.google && parsed.google) resultsToUpdate.blogPost = resultsToUpdate.googleBlogPost;

      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, blog: 100 },
        results: {
          ...prev.results,
          ...resultsToUpdate
        }
      }));

      if (user) {
        try {
          if (targets.naver && parsed.naver) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'naver', title: parsed.naver.title, content: resultsToUpdate.naverBlogPost.content, tags: parsed.naver.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          if (targets.tistory && parsed.tistory) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'tistory', title: parsed.tistory.title, content: resultsToUpdate.tistoryBlogPost.content, tags: parsed.tistory.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          if (targets.google && parsed.google) {
            await addDoc(collection(db, 'blogPosts'), {
              uid: user.uid, platform: 'google', title: parsed.google.title, content: resultsToUpdate.googleBlogPost.content, tags: parsed.google.tags, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), trackId: workflow.results.trackId || null
            });
          }
          addLog('✅ 블로그 포스팅이 저장되었습니다.');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'blogPosts');
        }
      }
      
      addLog('✅ 블로그 포스팅 생성이 완료되었습니다.');
    } catch (error) {
      console.error('Blog Generation Error:', error);
      addLog('❌ 블로그 포스팅 생성 실패: ' + (error.message || String(error)));
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 0 } }));
    }
  };

  `;

content = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Successfully updated generateBlogPost!');
