import sys

with open('src/App.tsx', 'rb') as f:
    raw = f.read()
    
content = raw.decode('utf-8', errors='replace')

broken_str = '        parsed = JSON.parse(cle      const prompt = '

fixed_str = '''        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Youtube JSON Parse Error:', text);
        throw new Error('AI 응답 형식이 올바르지 않습니다.');
      }
      
      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, youtube: 100 },
        results: {
          ...prev.results,
          youtubeMetadata: parsed
        }
      }));
      addLog('? 유튜브 메타데이터 생성이 완료되었습니다.');
    } catch (error: any) {
      console.error('Youtube Metadata Error:', error);
      addLog(? 유튜브 메타데이터 생성 실패: );
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 0 } }));
    }
  };

  const generateBlogPost = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    addLog("블로그 포스팅 생성을 시작합니다...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 10 } }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const processedImages = workflow.results.images.filter((img: any) => img.url);

      const prompt = '''

content = content.replace(broken_str, fixed_str)

old_state = '''      blogSettings: {
        style: '감성 에세이형 (서정적, 감각적, 여운)',
        youtubeLink: ''
      },'''
      
new_state = '''      blogSettings: {
        style: '감성 에세이형 (서정적, 감각적, 여운)',
        youtubeLink: '',
        targets: { naver: true, tistory: false, google: false }
      },'''

content = content.replace(old_state, new_state)

with open('src/App.tsx', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Fixed App.tsx successfully')
