import sys

with open('src/App.tsx', 'rb') as f:
    raw = f.read()
    
content = raw.decode('utf-8', errors='replace')

broken_str = '        parsed = JSON.parse(cle      const prompt = '

fixed_str = '''        parsed = JSON.parse(cleanedText);
      } catch (e) {
        console.error('Youtube JSON Parse Error:', text);
        throw new Error('AI ���� ������ �ùٸ��� �ʽ��ϴ�.');
      }
      
      setWorkflow(prev => ({
        ...prev,
        progress: { ...prev.progress, youtube: 100 },
        results: {
          ...prev.results,
          youtubeMetadata: parsed
        }
      }));
      addLog('? ��Ʃ�� ��Ÿ������ ������ �Ϸ�Ǿ����ϴ�.');
    } catch (error: any) {
      console.error('Youtube Metadata Error:', error);
      addLog(? ��Ʃ�� ��Ÿ������ ���� ����: );
      setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, youtube: 0 } }));
    }
  };

  const generateBlogPost = async () => {
    const currentApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!currentApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    addLog("���α� ������ ������ �����մϴ�...");
    setWorkflow(prev => ({ ...prev, progress: { ...prev.progress, blog: 10 } }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const model = aiEngine;

      const processedImages = workflow.results.images.filter((img: any) => img.url);

      const prompt = '''

content = content.replace(broken_str, fixed_str)

old_state = '''      blogSettings: {
        style: '���� �������� (������, ������, ����)',
        youtubeLink: ''
      },'''
      
new_state = '''      blogSettings: {
        style: '���� �������� (������, ������, ����)',
        youtubeLink: '',
        targets: { naver: true, tistory: false, google: false }
      },'''

content = content.replace(old_state, new_state)

with open('src/App.tsx', 'wb') as f:
    f.write(content.encode('utf-8'))

print('Fixed App.tsx successfully')
