import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are a professional songwriter and music producer. 
    Generate a song title and lyrics based on the following parameters:
    - Topic: 사랑
    - Target Audience: K-Pop
    - Sub-Genre: 발라드
    - Mood: 슬픔
    - Tempo: 느림
    - Lyrics Style: 서정적
    - Vocal Type: 여성 보컬
    - Main Instrument: 피아노

    Guidelines:
    1. Song Title: Generate a concise, poetic, and meaningful title that captures the essence of the topic.
       Format: [Korean Title]_[English Title] (e.g., "사라지는 아이들_Disappearing Children")
       CRITICAL: The title MUST follow the "한글제목_EnglishTitle" format exactly.
       If you generate a new title, ensure it follows this format.
    2. Lyrics: Generate full lyrics for a 3-6 minute long song. 
       Structure: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Outro].
       Ensure the Chorus is repeated fully.
       CRITICAL: You MUST insert a double line break (\n\n) between sections and a single line break (\n) between every single line of the lyrics. 
       The output MUST be formatted exactly as it should appear on a teleprompter or song sheet.
       The lyrics should be deeply emotional and professional.
    3. Suno AI Prompt: Generate a detailed prompt for Suno AI v3.5 (max 1000 characters) that describes the musical style, arrangement, and emotional delivery.

    Response Format (JSON):
    {
      "title": "KoreanTitle_EnglishTitle",
      "lyrics": "Full lyrics text with section headers",
      "sunoPrompt": "Detailed Suno AI prompt"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            lyrics: { type: Type.STRING },
            sunoPrompt: { type: Type.STRING }
          },
          required: ["title", "lyrics", "sunoPrompt"]
        }
      }
    });
    console.log("Response text:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
