import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// 설정 로드
const apiKey = process.env.VITE_GEMINI_API_KEY || "";
// [v1.15.37] 엔진 하드코딩 금지: 환경 변수 우선, 기본값은 최신 모델로 설정
const aiEngine = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";

if (!apiKey) {
  console.error("❌ VITE_GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.");
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey });

async function runPipeline(topic: string, isCCM: boolean = true) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(process.cwd(), "outputs", timestamp);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`🚀 [${timestamp}] '${topic}' 주제로 자동화 파이프라인을 시작합니다...`);

  try {
    // 1. 가사 및 기본 정보 생성
    console.log("📝 1단계: 가사 및 곡 해석 생성 중...");
    const lyricsPrompt = `
      주제: ${topic}
      타겟: ${isCCM ? "CCM (Christian Contemporary Music)" : "대중음악"}
      
      [OUTPUT INSTRUCTIONS]
      1. 제목: '한글제목_EnglishTitle' 형식 (3가지 제안)
      2. 한국어 가사: [Verse], [Chorus] 구분 및 줄바꿈 포함
      3. 영어 번역 가사: 한국어와 동일한 구조
      4. 곡 해석: 한국어로 정성스럽게 작성
      5. Suno AI 프롬프트: 상세한 음악 스타일 기술 (500-1000자)
      
      반드시 valid JSON으로 답변해줘.
      { "titles": [], "lyrics": "", "englishLyrics": "", "interpretation": "", "sunoPrompt": "" }
    `;

    const lyricsRes = await (genAI as any).models.generateContent({
      model: aiEngine,
      contents: [{ role: "user", parts: [{ text: lyricsPrompt }] }],
      config: { responseMimeType: "application/json" }
    });
    const lyricsData = JSON.parse(lyricsRes.response.text());

    fs.writeFileSync(path.join(outputDir, "lyrics.json"), JSON.stringify(lyricsData, null, 2));
    console.log("✅ 가사 생성 완료!");

    // 2. 플랫폼 메타데이터 생성 (유튜브/틱톡)
    console.log("📺 2단계: 플랫폼 메타데이터 생성 중...");
    const platformPrompt = `
      다음 가사와 해석을 바탕으로 유튜브 제목, 설명, 태그와 틱톡 캡션을 생성해줘.
      가사: ${lyricsData.lyrics}
      해석: ${lyricsData.interpretation}
      
      형식:
      [YOUTUBE_TITLE] ...
      [YOUTUBE_DESCRIPTION] ...
      [YOUTUBE_TAGS] ...
      [TIKTOK_CAPTION] ...
    `;

    const platformRes = await (genAI as any).models.generateContent({
      model: aiEngine,
      contents: [{ role: "user", parts: [{ text: platformPrompt }] }]
    });
    const platformText = platformRes.response.text();
    fs.writeFileSync(path.join(outputDir, "platform_metadata.txt"), platformText);
    console.log("✅ 플랫폼 메타데이터 생성 완료!");

    // 3. 블로그 포스팅 생성
    console.log("✍️ 3단계: 블로그 포스팅 생성 중...");
    const blogPrompt = `
      가사: ${lyricsData.lyrics}
      해석: ${lyricsData.interpretation}
      위 내용을 바탕으로 네이버 블로그용 정성스러운 포스팅(HTML)을 작성해줘.
    `;

    const blogRes = await (genAI as any).models.generateContent({
      model: aiEngine,
      contents: [{ role: "user", parts: [{ text: blogPrompt }] }]
    });
    const blogText = blogRes.response.text();
    fs.writeFileSync(path.join(outputDir, "blog_post.html"), blogText);
    console.log("✅ 블로그 포스팅 생성 완료!");

    console.log(`\n✨ 모든 작업이 완료되었습니다!`);
    console.log(`📁 결과물 위치: ${outputDir}`);

  } catch (error) {
    console.error("❌ 파이프라인 실행 중 오류 발생:", error);
  }
}

// 매개변수 처리
const args = process.argv.slice(2);
const inputTopic = args[0] || "주님의 은혜와 평강";
const targetArg = args[1] === "pop" ? false : true;

runPipeline(inputTopic, targetArg);
