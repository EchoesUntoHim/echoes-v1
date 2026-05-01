import { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { WorkflowState, Step } from '../types';
import lyricsPrompts from '../prompts/Lyrics.txt?raw';

/**
 * Parses a raw prompt text file, removing comments (#) and extracting a specific section by [SECTION_NAME].
 */
const parsePromptSection = (content: string, sectionName: string): string => {
  const lines = content.split('\n');
  let inSection = false;
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === `[${sectionName}]`) {
      inSection = true;
      continue;
    }
    if (inSection && trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
      break;
    }
    if (inSection && !trimmedLine.startsWith('#') && trimmedLine !== '') {
      resultLines.push(line);
    }
  }
  return resultLines.join('\n');
};

interface LyricsLogicProps {
  apiKey: string;
  aiEngine: string;
  workflow: WorkflowState;
  setWorkflow: React.Dispatch<React.SetStateAction<WorkflowState>>;
  addLog: (msg: string) => void;
  setSunoTracks: React.Dispatch<React.SetStateAction<any[]>>;
  setShortsHighlights: (highlights: any[]) => void;
  setVideoLyrics: (lyrics: string) => void;
  setEnglishVideoLyrics: (lyrics: string) => void;
  shortsCount: number;
}

export const useLyricsLogic = ({
  apiKey,
  aiEngine,
  workflow,
  setWorkflow,
  addLog,
  setSunoTracks,
  setShortsHighlights,
  setVideoLyrics,
  setEnglishVideoLyrics,
  shortsCount
}: LyricsLogicProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // --- Logic 1: generateLyrics (Extracted from App.tsx) ---
  const generateLyrics = async () => {
    if (!apiKey) return;
    setIsGenerating(true);
    const selectedModel = aiEngine || 'gemini-1.5-flash';
    addLog(`✨ [${selectedModel}] AI 가사 생성을 시작합니다...`);

    try {
      const isCCM = workflow.params.target === 'CCM';
      const ccmPersona = parsePromptSection(lyricsPrompts, 'CCM_PERSONA');
      const popPersona = parsePromptSection(lyricsPrompts, 'POP_PERSONA');
      const reformedMeditationPersona = parsePromptSection(lyricsPrompts, 'REFORMED_MEDITATION_PERSONA');
      const generalRules = parsePromptSection(lyricsPrompts, 'General Formatting Rules - APPLY TO ALL PERSONAS');

      const prompt = `
        [SYSTEM ROLE]
        ${workflow.params.lyricsStyle === '묵상형 (QT)' ? reformedMeditationPersona : (isCCM ? ccmPersona : popPersona)}

        [CONTEXT]
        - Title: ${workflow.params.title}
        - Theme/Topic: ${workflow.params.topic || 'Inspiration, Grace, Love'}
        - Genre: ${workflow.params.target} (${workflow.params.subGenre})
        - Mood: ${workflow.params.mood}
        - Tempo: ${workflow.params.tempo}
        - Style: ${workflow.params.lyricsStyle}

        [FORMATTING RULES - CRITICAL]
        ${generalRules}
        
        - **STRICT LANGUAGE SEPARATION**: 
          - The 'lyrics' field MUST contain ONLY Korean text. No English words or translations.
          - The 'englishLyrics' field MUST contain ONLY English text. No Korean words.
          
        [OUTPUT INSTRUCTIONS]
        Generate:
        1. 3 sets of Title ideas (titles array)
        2. Full Lyrics in Korean (lyrics field)
        3. Full English Translation (englishLyrics field)
        4. Brief Theological/Emotional Interpretation (interpretation field)
        5. Optimized prompt for Suno AI (sunoPrompt field)

        Response MUST be in valid JSON.
      `;

      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              lyrics: { type: Type.STRING, description: "Pure Korean lyrics only" },
              englishLyrics: { type: Type.STRING, description: "Pure English lyrics only" },
              interpretation: { type: Type.STRING },
              sunoPrompt: { type: Type.STRING }
            },
            required: ["titles", "lyrics", "englishLyrics", "interpretation", "sunoPrompt"]
          }
        }
      });

      const result = JSON.parse(response.response.text());

      setWorkflow(prev => ({
        ...prev,
        params: {
          ...prev.params,
          koreanTitle: result.titles[0] || prev.params.koreanTitle,
          englishTitle: result.titles[1] || prev.params.englishTitle,
        },
        results: {
          ...prev.results,
          lyrics: result.lyrics,
          englishLyrics: result.englishLyrics,
          interpretation: result.interpretation,
          sunoPrompt: result.sunoPrompt,
          title: result.titles[0]
        },
        progress: { ...prev.progress, lyrics: 100 }
      }));

      addLog("✅ 가사 생성이 완료되었습니다.");

      // Add to history
      const newTrackId = crypto.randomUUID();
      setSunoTracks(prev => [
        {
          id: newTrackId,
          title: result.titles[0],
          lyrics: result.lyrics,
          englishLyrics: result.englishLyrics,
          created_at: new Date().toISOString(),
          status: 'complete'
        },
        ...prev
      ]);

    } catch (error) {
      console.error("Lyrics generation error:", error);
      addLog(`❌ 가사 생성 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Logic 2: translateLyrics (Extracted from App.tsx) ---
  const translateLyrics = async (textToTranslate: string) => {
    if (!textToTranslate || !apiKey) return;

    setIsTranslating(true);
    const selectedModel = aiEngine || 'gemini-1.5-flash';

    try {
      const isEnglish = workflow.params.isEnglishSong;
      addLog(`🔄 [${selectedModel}] ${isEnglish ? '한글' : '영어'} 가사 자동 번역 시작...`);

      const lines = textToTranslate.split('\n');
      const cleanLines = lines.map(l => l.replace(/^\[\d{2}:\d{2}\]\s*/, '').trim());
      const timestamps = lines.map(l => {
        const m = l.match(/^\[\d{2}:\d{2}\]\s*/);
        return m ? m[0] : '';
      });

      const prompt = isEnglish
        ? `Translate the following English lyrics to Korean line-by-line. 
      [STRICT RULE] Output ONLY pure Korean for the lyric lines. 
      [IMPORTANT] KEEP all section headers like [Verse 1], [Chorus], etc., exactly as they are.
      Keep the line count EXACTLY the same (${cleanLines.length} lines).
      
      Lyrics:
      ${cleanLines.join('\n')}`
        : `Translate the following Korean lyrics to English line-by-line. 
      [STRICT RULE] Output ONLY pure English for the lyric lines.
      [IMPORTANT] KEEP all section headers like [Verse 1], [Chorus], etc., exactly as they are.
      Keep the line count EXACTLY the same (${cleanLines.length} lines).
      
      Lyrics:
      ${cleanLines.join('\n')}`;

      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: selectedModel });
      const response = await model.generateContent(prompt);

      const translatedContent = response.response.text() || "";
      const translatedLines = translatedContent.split('\n');

      const restored = lines.map((_, i) => {
        const timestamp = timestamps[i];
        const translation = translatedLines[i] || "";
        const cleanTranslation = translation.replace(/^\[\d{2}:\d{2}\]\s*/, '').trim();
        return timestamp + cleanTranslation;
      });

      const finalTranslated = restored.join('\n');

      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          englishLyrics: finalTranslated
        }
      }));

      addLog(`✅ [${selectedModel}] ${isEnglish ? '한글' : '영어'} 가사 자동 번역 완료`);
    } catch (error) {
      console.error("Auto-translation error:", error);
      addLog(`❌ 번역 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // --- Logic 3: analyzeAudioComprehensively (Extracted from App.tsx) ---
  const analyzeAudioComprehensively = async (file: File, options?: { skipSync?: boolean, referenceLyrics?: string }) => {
    if (!apiKey) return;

    addLog(`🔍 [${aiEngine}] 엔진을 사용하여 음원 분석을 시작합니다...`);
    if (!options?.skipSync) {
      setWorkflow(prev => ({
        ...prev,
        results: { ...prev.results, lyrics: "음원 파일을 분석하고 있습니다...", englishLyrics: "Analyzing audio track..." },
        progress: { ...prev.progress, audioAnalysis: 10 }
      }));
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: aiEngine || 'gemini-1.5-flash' });

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const audioBase64 = await base64Promise;

      let safeMimeType = (file.type || 'audio/wav').split(';')[0];
      if (safeMimeType.includes('s16le') || safeMimeType.includes('wav')) safeMimeType = 'audio/wav';
      else if (safeMimeType.includes('mpeg') || safeMimeType.includes('mp3')) safeMimeType = 'audio/mpeg';

      const prompt = `
        이 오디오 파일을 분석하여 전체 가사를 한국어와 영어로 추출해줘. 
        ${options?.referenceLyrics ? `\n[참고 가사 (원본)]: \n${options.referenceLyrics}\n\n위 가사 내용을 바탕으로 오디오의 실제 소리를 듣고 정확한 타임스탬프를 매겨줘.` : ''}
        
        [지시사항]
        1. 곡의 구조 파악 및 타임스탬프 정리.
        2. [STRICT LANGUAGE SEPARATION]: 'lyrics' 필드에는 오직 한국어, 'englishLyrics'에는 오직 영어.
        3. 모든 줄에 [00:00] 형식의 타임스탬프 필수.
        4. 긴 간주 구간 처리 (빈 줄 타임스탬프).
        5. 반드시 JSON 형식으로 답변.
      `;

      const response = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: safeMimeType, data: audioBase64 } }
            ]
          }
        ],
        generationConfig: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.response.text());

      if (!options?.skipSync) {
        setWorkflow(prev => ({
          ...prev,
          params: { ...prev.params, isEnglishSong: !!result.isEnglish },
          results: {
            ...prev.results,
            lyrics: result.lyrics,
            englishLyrics: result.englishLyrics,
            isEnglish: !!result.isEnglish,
            timedLyrics: result.timedLyrics || [],
            audioAnalysis: {
              bpm: result.bpm,
              key: result.key,
              energy: result.energy,
              mood: result.mood || "Energetic"
            }
          },
          progress: { ...prev.progress, audioAnalysis: 100 }
        }));

        if (result.lyrics) setVideoLyrics(result.lyrics);
        if (result.englishLyrics) setEnglishVideoLyrics(result.englishLyrics);
      }

      addLog(`✅ 음원 분석 완료`);
      return result;

    } catch (error: any) {
      console.error("Audio Analysis Error:", error);
      addLog(`❌ 음원 분석 실패: ${error.message}`);
    }
  };

  const generatePromptOnly = async () => {
    if (!apiKey || !workflow.results.lyrics) return;
    setIsGenerating(true);
    addLog(`🔄 음악 생성 프롬프트만 재생성 중...`);

    try {
      const prompt = `
        You are a professional music producer. Generate ONLY a detailed prompt for a music generation AI based on:
        - Topic: ${workflow.params.topic}
        - Genre: ${workflow.params.subGenre}
        - Mood: ${workflow.params.mood}
        - Main Instrument: ${workflow.params.instrument}
        - Lyrics: ${workflow.results.lyrics}
      `;

      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: aiEngine || 'gemini-1.5-flash' });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { sunoPrompt: { type: Type.STRING } },
            required: ["sunoPrompt"]
          }
        }
      });

      const result = JSON.parse(response.response.text());
      setWorkflow(prev => ({
        ...prev,
        results: { ...prev.results, sunoPrompt: result.sunoPrompt }
      }));
      addLog(`✅ 프롬프트 재생성 완료`);
    } catch (error) {
      addLog(`❌ 프롬프트 재생성 실패`);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateTitles = async () => {
    if (!apiKey || !workflow.results.lyrics) return;
    setIsGenerating(true);
    addLog("✨ 제목만 새롭게 5개 재생성 중...");

    try {
      const prompt = `Generate 5 creative titles for these lyrics: ${workflow.results.lyrics}. Theme: ${workflow.params.topic}`;
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.getGenerativeModel({ model: aiEngine || 'gemini-1.5-flash' });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { titles: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["titles"]
          }
        }
      });

      const result = JSON.parse(response.response.text());
      setWorkflow(prev => ({
        ...prev,
        results: { ...prev.results, suggestedTitles: result.titles }
      }));
      addLog(`✅ 제목 재생성 완료`);
    } catch (error) {
      addLog(`❌ 제목 재생성 실패`);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateLyrics,
    translateLyrics,
    analyzeAudioComprehensively,
    generatePromptOnly,
    regenerateTitles,
    isGenerating,
    isTranslating
  };
};
