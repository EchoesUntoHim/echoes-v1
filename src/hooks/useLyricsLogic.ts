import React, { useState, useCallback } from 'react';
import { WorkflowState, Step, createDefaultSettings } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_AI_ENGINE, AI_ENGINES, VOCAL_OPTIONS } from '../constants';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

export const useLyricsLogic = ({
  apiKey,
  aiEngine,
  setAiEngine,
  workflow,
  setWorkflow,
  addLog,
  setSunoTracks,
  setVideoLyrics,
  setEnglishVideoLyrics,
  shortsCount,
  lyricsPrompts,
  user,
  setShortsHighlights
}: any) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>(AI_ENGINES);

  // Helper to get a human-friendly description for selected instrument(s)
  const getInstrumentDescription = (instrument: string): string => {
    const map: Record<string, string> = {
      piano: '피아노 선율',
      guitar: '기타 리프',
      violin: '바이올린 선율',
      drums: '드럼 비트',
      // Add more mappings as needed
    };
    const key = (instrument || '').toLowerCase().trim();
    // Simple mapping check, or return descriptive string
    if (map[key]) return map[key];
    if (instrument && instrument.trim()) return `선택된 악기: ${instrument}`;
    return '선택된 악기 없음';
  };


  const parsePromptSection = (content: string, sectionName: string) => {
    const regex = new RegExp(`\\[${sectionName}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : '';
  };

  const generateLyrics = useCallback(async () => {
    if (!apiKey) {
      addLog("⚠️ 오류: API 키가 설정되지 않았습니다.");
      return;
    }
    if (!workflow.params.topic && !workflow.params.userInput) {
      addLog("⚠️ 오류: 주제(Topic) 또는 사용자 입력 내용을 작성해주세요.");
      return;
    }

    addLog(`✨ [${workflow.params.target}] 가사 생성 엔진 가동... (엔진: ${aiEngine})`);
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // v1.14.1 Strict Persona & Rules
      const isCCM = workflow.params.target === 'CCM';
      const isHymn = isCCM && workflow.params.subGenre === '전통찬송가';

      const ccmPersona = parsePromptSection(lyricsPrompts, 'CCM_PERSONA');
      const popPersona = parsePromptSection(lyricsPrompts, 'POP_PERSONA');
      const reformedMeditationPersona = parsePromptSection(lyricsPrompts, 'REFORMED_MEDITATION_PERSONA');
      const hymnRules = isHymn ? parsePromptSection(lyricsPrompts, 'HYMN_STYLE_GUIDELINES') : '';

      const prompt = `
        [SYSTEM ROLE]
        ${workflow.params.lyricsStyle === '묵상형 (QT)' ? reformedMeditationPersona : (isCCM ? ccmPersona : popPersona)}
        
        [STRUCTURE GUIDELINES]
        ${hymnRules}
        
        [FORMATTING GUIDELINES]
        - SECTION TAGS: Include section headers in square brackets (e.g., [Verse 1], [Chorus]) on their own lines.
        - 1:1 LINE SYNC: Every line in Korean must have an exactly corresponding line in English. Line counts MUST match perfectly.
        - NATURAL FLOW: Write naturally. NEVER break a word in the middle. Always break lines at semantic or word boundaries.
        - SONG VOLUME (3-4 MIN): Generate a substantial volume of lyrics for a 3-4 minute song.
        - NO SLASHES: Use ACTUAL newlines (\n) for every line. NEVER use slashes (/) for line breaks.
        
        [TASK]
        Generate a song title and lyrics based on:
        ${workflow.params.userInput ? `[CRITICAL USER INPUT: ${workflow.params.userInput}]` : ''}
        - Topic: ${workflow.params.topic}
        - Target: ${workflow.params.target}
        - Genre: ${workflow.params.subGenre}
        - Mood: ${workflow.params.mood}
        - Style: ${workflow.params.lyricsStyle}

        [TITLE FORMAT - MANDATORY]
        [분류]한글_영어 (예: [CCM]나의 기도_My Prayer)
        Always generate unique and diverse titles using metaphors.
        
        [INTERPRETATION - MANDATORY]
        The "interpretation" field must be at least 400 characters long. 
        DO NOT simply list or repeat the user's selected instruments or mood. 
        Instead, provide a deep, professional analysis of how the music and lyrics synergize to create a spiritual or emotional atmosphere.

        Response Format (JSON):
        {
          "titles": ["[CCM]나의 기도_My Prayer", "Other 4 unique options"],
          "lyrics": "[Verse 1]\n...",
          "englishLyrics": "[Verse 1]\n...",
          "interpretation": "Detailed 400+ character professional analysis...",
          "sunoPrompt": "..."
        }
      `;

      const response = await ai.models.generateContent({
        model: aiEngine,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              lyrics: { type: Type.STRING },
              englishLyrics: { type: Type.STRING },
              interpretation: { type: Type.STRING },
              sunoPrompt: { type: Type.STRING }
            },
            required: ["titles", "lyrics", "englishLyrics", "interpretation", "sunoPrompt"]
          }
        }
      });

      const responseText = response.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      const titles = (result.titles || []).map((t: string) => t.replace(/\[.*?\]/g, '').trim());
      const finalTitle = titles[0] || 'Untitled';
      const [kTitle, eTitle] = finalTitle.includes('_') ? finalTitle.split('_') : [finalTitle, ''];

      const formatLyrics = (text: string) => {
        if (!text) return '';
        // [v1.15.28] 강력한 클리닝: 가사 본문에 포함된 메타데이터(제목 등) 제거
        const metadataRegex = /^(Title:|\[CCM\]|\[Pop\]|\[분류\]|번역:|영문 가사:)/i;

        return text.split('\n')
          .filter(line => line.trim() !== '' && !metadataRegex.test(line.trim()))
          .map(line => line.trim().startsWith('[') ? `\n${line}` : line)
          .join('\n')
          .trim();
      };



      const sanitizeSunoPrompt = (text: string) => {
        if (!text) return '';
        let t = String(text).trim();
        // Remove common code-fence wrappers if they appear.
        t = t.replace(/^```[a-zA-Z]*\s*/g, '').replace(/```$/g, '').trim();
        return t;
      };

      const enforceSunoPromptLength = (text: string) => {
        const t = sanitizeSunoPrompt(text);
        const len = t.length;
        if (len > 999) {
          return t.slice(0, 999).trim();
        }
        if (len < 300) {
          addLog(`⚠️ Suno 프롬프트 글자수 부족: ${len}자 (요청: 300~999자).`);
        }
        return t;
      };

      const newTrackId = Date.now().toString();
      const formattedKoreanLyrics = formatLyrics(result.lyrics);
      const formattedEnglishLyrics = formatLyrics(result.englishLyrics);
      const formattedSunoPrompt = enforceSunoPromptLength(result.sunoPrompt);
      setWorkflow((prev: any) => ({
        ...prev,
        params: {
          ...prev.params,
          title: finalTitle,
          koreanTitle: (kTitle || '').replace(/\[.*?\]/g, '').trim(),
          englishTitle: eTitle || ''
        },
        progress: { ...prev.progress, lyrics: 100 },
        results: {
          ...prev.results,
          trackId: newTrackId,
          title: finalTitle,
          suggestedTitles: result.titles,
          lyrics: formattedKoreanLyrics,
          englishLyrics: formattedEnglishLyrics,
          interpretation: result.interpretation,
          sunoPrompt: formattedSunoPrompt
        }
      }));

      setSunoTracks((prev: any) => [{
        id: newTrackId,
        title: finalTitle,
        lyrics: formattedKoreanLyrics,
        englishLyrics: formattedEnglishLyrics,
        interpretation: result.interpretation,
        suggestedTitles: result.titles,
        userInput: workflow.params.userInput || workflow.params.topic || '',
        sunoPrompt: formattedSunoPrompt,
        created_at: new Date().toISOString()
      }, ...prev]);

      // [v1.15.34] Save to Cloud DB (Firestore) - Static Import used for stability
      if (user) {
        try {

          const finalWorkflowParams = {
            topic: String(workflow.params.topic || ""),
            target: String(workflow.params.target || ""),
            subGenre: String(workflow.params.subGenre || workflow.params.genre || ""),
            mood: String(workflow.params.mood || ""),
            tempo: String(workflow.params.tempo || ""),
            lyricsStyle: String(workflow.params.lyricsStyle || ""),
            vocal: String(workflow.params.vocal || ""),
            instrument: String(workflow.params.instrument || ""),
            isEnglishSong: !!workflow.params.isEnglishSong,
            userInput: String(workflow.params.userInput || "")
          };

          const safeData = {
            userId: user.uid || "",
            title: String(finalTitle || ""),
            koreanLyrics: String(formattedKoreanLyrics || ""),
            englishLyrics: String(formattedEnglishLyrics || ""),
            interpretation: String(result.interpretation || ""),
            prompt: String(workflow.params.userInput || workflow.params.topic || ""),
            sunoPrompt: String(formattedSunoPrompt || ""),
            suggestedTitles: titles.slice(0, 5),
            workflowParams: finalWorkflowParams,
            createdAt: serverTimestamp()
          };

          console.log("DEBUG: Saving to Firestore (generated_lyrics):", safeData);

          await addDoc(collection(db, 'generated_lyrics'), safeData);
          addLog("☁️ 클라우드 DB에 가사 정보가 안전하게 저장되었습니다.");
        } catch (dbError: any) {
          console.error("Firestore Save Error Details:", dbError);
          addLog(`⚠️ DB 저장 실패: ${dbError.message}`);
        }
      }

      addLog(`✅ 가사 생성 완료: ${finalTitle}`);
    } catch (error: any) {
      addLog(`❌ 오류: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, aiEngine, workflow.params, addLog, setWorkflow, setSunoTracks, user]);

  const translateLyrics = useCallback(async (koreanLyrics: string) => {
    if (!apiKey || !koreanLyrics) return;
    setIsTranslating(true);
    addLog("🌐 가사 번역 최적화 중...");
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        당신은 최고의 음악 번역가이자 시인입니다. 
        제공된 한글 가사를 바탕으로, 원래의 감성과 타임스탬프를 100% 유지하며 자연스럽고 감동적인 영어 가사로 번역하세요.

        [주의사항 - 반드시 지킬 것]
        1. **응답에는 오직 영어 가사 데이터만 포함하세요.**
        2. "Title:", "[CCM]", "Verse:", "Chorus:" 와 같은 메타데이터나 제목 정보는 절대로 가사 제일 위에 넣지 마세요.
        3. 한글 가사에 [00:10] 같은 타임스탬프가 있다면 영어 가사에도 동일한 위치에 그대로 유지하세요.
        4. 번역문 외에 어떠한 설명이나 인사말도 하지 마세요.

        [번역할 한글 가사]
        ${koreanLyrics}
      `;

      const response = await ai.models.generateContent({
        model: aiEngine || DEFAULT_AI_ENGINE,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      let translated = response.text;

      // [v1.15.28] 강력한 클리닝 로직
      translated = translated
        .replace(/^Title:.*?\n/gi, '')
        .replace(/^\[CCM\].*?\n/gi, '')
        .replace(/^(번역|영문 가사):.*?\n/gi, '')
        .trim();

      setWorkflow(prev => ({
        ...prev,
        results: {
          ...prev.results,
          englishLyrics: translated
        }
      }));
      setEnglishVideoLyrics(translated);
      addLog("✅ 영어 가사 번역 및 클리닝 완료!");
    } catch (error: any) { addLog(`❌ 번역 실패: ${error.message}`); }
    finally { setIsTranslating(false); }
  }, [apiKey, aiEngine, addLog, setWorkflow, setEnglishVideoLyrics]);


  const analyzeAudioComprehensively = useCallback(async (file: File, options?: { skipSync?: boolean, referenceLyrics?: string }) => {
    if (!apiKey) return;

    addLog(`🔍 [${aiEngine}] 엔진을 사용하여 음원 분석을 시작합니다...`);
    if (!options?.skipSync) {
      setWorkflow((prev: any) => ({
        ...prev,
        results: { ...prev.results, lyrics: "음원 파일을 분석하고 있습니다...", englishLyrics: "Analyzing audio track..." },
        progress: { ...prev.progress, audioAnalysis: 10 }
      }));
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

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
        이 오디오 파일을 정밀 분석하여 전체 가사를 추출하고 타임스탬프를 매겨줘.
        
        [SYSTEM] 당신은 전문 음악 프로듀서이자 영상 편집자입니다.
        
        [🚨 초강력 필수 지침 - 반드시 지킬 것 🚨]
        1. 타임스탬프 강제: 모든 가사 줄 앞에는 예외 없이 [MM:SS] 형식의 타임스탬프를 붙이세요.
        2. [구조 태그] 독립 행 구성: [Verse], [Chorus], [Bridge] 등의 태그는 반드시 **앞뒤로 한 줄씩 비우고(Double Newline)** 독립된 줄에 배치하세요. 절대 가사와 같은 줄에 쓰지 마세요.
        3. 정밀 공백 스탬프(1초 지침): 가사가 없는 구간이 1초 이상 지속되면, 해당 시점의 타임스탬프와 함께 **아무 내용도 없는 빈 줄**을 반드시 생성하세요. 이는 자막을 지우는 핵심 신호입니다.
           (예시 - 이 구조를 100% 따를 것):
           [02:20] 노래 가사 줄
           
           [02:25] [Chorus]
           
           [02:25] 코러스 시작 가사
           [02:41] 
           [02:43] [Bridge]
        4. 세로 대조 확인(Interleaved): 'interleavedReview' 필드에는 확인이 편하도록 **[MM:SS] 한글가사 \n [MM:SS] 영어가사** 순서로 한 줄씩 번갈아가며 모든 가사를 배치하세요.
        5. 줄 수 일치: 'lyrics'와 'englishLyrics'의 모든 타임스탬프와 줄 수는 100% 일치해야 합니다.
        
        ${(options?.referenceLyrics && options.referenceLyrics.trim().length > 0) ? `
        [사용자 원본 가사 기반 분석]
        아래 원본 가사의 텍스트를 절대 변형하지 말고, 오디오 타이밍에 맞춰 타임스탬프와 구조 태그만 추가하세요.
        ${options.referenceLyrics}
        ` : `
        [가사 직접 추출]
        오디오를 듣고 가사를 정확히 추출하세요.
        `}
        
        [HIGHLIGHT INSTRUCTION]
        - 반드시 제공된 오디오 파일의 **실제 총 재생 시간(Total Duration)을 먼저 정확하게 파악**하세요.
        - 음원의 가사와 분위기를 분석하여 가장 임팩트 있는 구간(코러스/사비, 브릿지 등)을 ${shortsCount}개 찾아내세요.
        - 🚨 치명적 주의사항: 하이라이트 시작 시간(start)은 **절대 실제 노래 총 길이를 초과해서는 안 됩니다.** (예: 노래가 4분(240초)인데 start를 300초로 설정하는 환각 오류 엄벌)
        - 숏츠 길이(30~49초)를 고려하여, \`start + duration\` 값이 노래의 총 길이를 넘지 않도록 안전하게 계산하세요.
        - 기계적인 30초 분할(0-30, 30-60) 절대 금지. 의미 있는 마디(Phrase) 기준으로 자르세요.

        [OUTPUT FORMAT STRICT JSON]
        {
          "isEnglish": boolean,
          "lyrics": "[00:00] [Intro]\\n[00:15] [Verse 1] 가사...\\n[00:30] \\n[00:32] 가사...",
          "englishLyrics": "[00:00] [Intro]\\n[00:15] [Verse 1] Lyrics...\\n[00:30] \\n[00:32] Lyrics...",
          "interleavedReview": "[00:15] 가사\\n[00:15] Lyrics\\n[00:30] (Blank)\\n[00:32] 가사\\n[00:32] Lyrics",
          "timedLyrics": [],
          "bpm": number,
          "key": "string",
          "energy": number,
          "mood": "string",
          "highlights": [
            { "start": 45, "duration": 35, "reason": "..." }
          ]
        }
      `;

      const response = await ai.models.generateContent({
        model: aiEngine || DEFAULT_AI_ENGINE,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: safeMimeType, data: audioBase64 } }
            ]
          }
        ],
        config: { responseMimeType: "application/json" }
      });

      const responseText = response.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

      if (!options?.skipSync) {
        // 1. [실시간 전파] 전역 workflow 상태 업데이트
        setWorkflow((prev: any) => ({
          ...prev,
          params: {
            ...prev.params,
            isEnglishSong: !!result.isEnglish,
            lyrics: result.lyrics,
            englishLyrics: result.englishLyrics
          },
          results: {
            ...prev.results,
            lyrics: result.lyrics,
            englishLyrics: result.englishLyrics,
            isEnglish: !!result.isEnglish,
            interleavedReview: result.interleavedReview,
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

        // 2. [숏츠 하이라이트] 추출된 하이라이트 상태 저장
        if (result.highlights && Array.isArray(result.highlights)) {
          const validHighlights = result.highlights.slice(0, shortsCount);
          setShortsHighlights(validHighlights);
          localStorage.setItem('echoesuntohim_shortsHighlights', JSON.stringify(validHighlights));
          addLog(`✅ 오디오 분석 완료: ${validHighlights.length}개의 하이라이트 구간(30~49초)이 자동 추출되었습니다.`);
          if (result.interleavedReview) {
            addLog(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔎 [가사 대조 확인 - 세로 배열 모드]\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${result.interleavedReview}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          }
        } else {
          const defaultHighlights = Array.from({ length: shortsCount }).map(() => ({ start: 0, duration: 30 }));
          setShortsHighlights(defaultHighlights);
        }

        // 3. [데이터 역류] 히스토리 리스트 업데이트
        const currentTitle = workflow.params.title || workflow.params.koreanTitle;
        setSunoTracks((prev: any[]) => {
          const exists = prev.some(t => t.title === currentTitle || t.id === workflow.results.trackId);
          if (exists) {
            return prev.map(t => (t.title === currentTitle || t.id === workflow.results.trackId) ? {
              ...t,
              lyrics: result.lyrics,
              englishLyrics: result.englishLyrics,
              lyricsWithTimestamps: result.timedLyrics || [],
              audioAnalysis: result
            } : t);
          }
          return prev;
        });

        // 4. [영상 렌더링용] 자막 상태 업데이트
        if (result.lyrics) setVideoLyrics(result.lyrics);
        if (result.englishLyrics) setEnglishVideoLyrics(result.englishLyrics);

        // 5. [클라우드 저장] Firestore 동기화
        if (user) {
          try {
            const docId = workflow.results.trackId || currentTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
            const trackRef = doc(collection(db, 'sunoTracks'), docId);
            await setDoc(trackRef, {
              lyrics: result.lyrics,
              englishLyrics: result.englishLyrics,
              lyricsWithTimestamps: result.timedLyrics || [],
              updatedAt: serverTimestamp()
            }, { merge: true });
            addLog("☁️ 분석된 데이터가 클라우드 DB에 동기화되었습니다.");
          } catch (e) { }
        }
      }

      return result;

    } catch (error: any) {
      console.error("Audio Analysis Error:", error);
      addLog(`❌ 음원 분석 실패: ${error.message}`);
    }
  }, [apiKey, aiEngine, addLog, setWorkflow, setVideoLyrics, setEnglishVideoLyrics, shortsCount, setShortsHighlights]);

  const generatePromptOnly = useCallback(async () => {
    if (!apiKey || !workflow.results.lyrics) return;
    setIsGenerating(true);
    addLog(`🔄 음악 생성 프롬프트만 재생성 중...`);

    try {
      const prompt = `
        You are a professional music producer. Generate ONLY a detailed prompt for a music generation AI based on:
        - Topic: ${workflow.params.topic}
        - Genre: ${workflow.params.subGenre}
        - Mood: ${workflow.params.mood}
        - Lyrics: ${workflow.results.lyrics}
      `;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: aiEngine || DEFAULT_AI_ENGINE,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { sunoPrompt: { type: Type.STRING } },
            required: ["sunoPrompt"]
          }
        }
      });

      const responseText = response.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      setWorkflow((prev: any) => ({
        ...prev,
        results: { ...prev.results, sunoPrompt: result.sunoPrompt }
      }));
      addLog(`✅ 프롬프트 재생성 완료`);
    } catch (error) {
      addLog(`❌ 프롬프트 재생성 실패`);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, aiEngine, workflow.params, workflow.results.lyrics, addLog, setWorkflow]);

  const regenerateTitles = useCallback(async () => {
    if (!apiKey || !workflow.results.lyrics) return;
    setIsGenerating(true);
    addLog("✨ 제목만 새롭게 5개 재생성 중...");

    try {
      const prompt = `Generate 5 creative titles for these lyrics: ${workflow.results.lyrics}. Theme: ${workflow.params.topic}`;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: aiEngine || DEFAULT_AI_ENGINE,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { titles: { type: Type.ARRAY, items: { type: Type.STRING } } },
            required: ["titles"]
          }
        }
      });

      const responseText = response.text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      setWorkflow((prev: any) => ({
        ...prev,
        results: { ...prev.results, suggestedTitles: result.titles }
      }));
      addLog(`✅ 제목 재생성 완료`);
    } catch (error) {
      addLog(`❌ 제목 재생성 실패`);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, aiEngine, workflow.params.topic, workflow.results.lyrics, addLog, setWorkflow]);

  const instrumentDescription = getInstrumentDescription(workflow.params.instrument);

  return {
    generateLyrics,
    translateLyrics,
    analyzeAudioComprehensively,
    generatePromptOnly,
    regenerateTitles,
    isGenerating,
    isTranslating,
    availableModels,
    fetchAvailableModels: async () => { /* v1.14.1 logic */ },
    instrumentDescription
  };
};
