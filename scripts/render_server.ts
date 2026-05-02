import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import cors from 'cors';

const execPromise = promisify(exec);
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.use('/downloads', express.static(path.join(process.cwd(), 'downloads')));
app.use('/renders', express.static(path.join(process.cwd(), 'renders')));

const OUTPUT_DIR = path.join(process.cwd(), 'renders');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// --- 1. 일반 영상 탭용 SRT 헬퍼 함수 ---
function generateSRT(timedLyrics: any) {
  if (!Array.isArray(timedLyrics) || timedLyrics.length === 0) return '';
  return timedLyrics.map((item: any, index: number) => {
    const startTime = item.time !== undefined ? item.time : item.start;
    const text = item.kor !== undefined ? item.kor : item.text;
    const start = formatTime(startTime);
    const end = formatTime(item.end || (startTime + 3));
    return `${index + 1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

function formatTime(seconds: number) {
  const date = new Date(0);
  date.setSeconds(seconds);
  const ms = Math.floor((seconds % 1) * 1000);
  return date.toISOString().substr(11, 8) + ',' + ms.toString().padStart(3, '0');
}

// --- 2. 묵상 탭 전용 ASS 헬퍼 함수 (디자인 분리 핵심 로직) ---
function generateASS(settings: any, durationInSeconds: number = 60) {
  const formatAssTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return date.toISOString().substr(11, 8).replace(/^00:/, '0:') + '.' + ms;
  };

  const verse = settings.koreanTitle || '';
  const content = settings.lyrics || '';
  const interpretation = settings.titleSettings?.interpretation || '';
  const timeline = settings.titleSettings?.timeline || { verseEnd: 35, interpretationStart: 35, interpretationEnd: 50, verseResume: 50 };

  const safeContent = content.replace(/\r?\n/g, '\\N');

  const t1 = formatAssTime(0);
  const t2 = formatAssTime(timeline.verseEnd || 35);
  const t3 = formatAssTime(timeline.interpretationStart || 35);
  const t4 = formatAssTime(timeline.interpretationEnd || 50);
  const t5 = formatAssTime(timeline.verseResume || 50);
  const tEnd = formatAssTime(durationInSeconds);

  const tContentStart = formatAssTime(6);

  let events = '';

  // 🚀 핵심: 투박한 테두리를 없애고, CSS처럼 부드럽게 퍼지는 그림자(Gaussian Blur 5px) 효과 적용
  const versePrefix = '{\\blur5}';
  const contentPrefix = '{\\blur5\\fad(1000,0)}';

  // --- 1. 말씀(Verse) 타이핑 효과 ---
  const verseChars = Array.from(verse);
  if (verseChars.length > 0) {
    const typingDuration = settings.titleSettings?.titleFade || Math.min(15, verseChars.length * 0.15);
    const timePerChar = typingDuration / verseChars.length;

    let currentText = '';
    let currentStartTime = 0;

    for (let i = 0; i < verseChars.length; i++) {
      currentText += verseChars[i];
      let startAssTime = formatAssTime(currentStartTime);
      let endAssTime = formatAssTime(currentStartTime + timePerChar);

      if (i === verseChars.length - 1) endAssTime = t2;

      let safeLine = currentText.replace(/\r?\n/g, '\\N');
      // versePrefix를 추가하여 부드러운 그림자 적용
      events += `Dialogue: 0,${startAssTime},${endAssTime},VerseStyle,,0,0,0,,${versePrefix}{\\i1}${safeLine}{\\i0}\n`;
      currentStartTime += timePerChar;
    }
  }

  // --- 2. 짧은 해석(Interpretation) 한 줄씩 페이드인 ---
  let interpAssText = versePrefix; // 여기도 그림자 적용
  const interpLines = interpretation.split(/\r?\n/).filter((line: string) => line.trim() !== '');

  interpLines.forEach((line: string, index: number) => {
    const startFade = index * 1500;
    const endFade = startFade + 1000;
    interpAssText += `{\\fs85\\alpha&HFF&\\t(${startFade},${endFade},\\alpha&H00&)}${line}`;
    if (index < interpLines.length - 1) interpAssText += '\\N';
  });

  if (interpLines.length > 0) {
    events += `Dialogue: 0,${t3},${t4},VerseStyle,,0,0,0,,${interpAssText}\n`;
  }

  // --- 3. 다시 말씀 전체 표시 (타이핑 없이 바로) ---
  const safeFullVerse = verse.replace(/\r?\n/g, '\\N');
  events += `Dialogue: 0,${t5},${tEnd},VerseStyle,,0,0,0,,${versePrefix}{\\i1}${safeFullVerse}{\\i0}\n`;

  // --- 4. 묵상 내용(Content) 6초 지점에서 페이드인 ---
  events += `Dialogue: 0,${tContentStart},${tEnd},ContentStyle,,0,0,0,,${contentPrefix}${safeContent}\n`;

  // 🚀 폰트 사이즈 조절 및 위치 여백(MarginV)을 미리보기와 동일하게 싱크
  // 🚀 폰트 크기 축소 (115->105, 75->70) 및 위치(MarginV)를 중앙으로 이동 (600, 420)
return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: VerseStyle,sans-serif,105,&H00FFFFFF,&H00000000,&H66000000,-1,-1,0,0,100,100,1,0,1,0,6,8,80,80,600,1
Style: ContentStyle,sans-serif,70,&H00FFFFFF,&H00000000,&H66000000,0,0,0,0,100,100,1,0,1,0,5,2,80,80,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.trim()}`;
}

app.post('/render-shorts', async (req, res) => {
  const { assets, settings } = req.body;
  const requestId = uuidv4();

  const audioPath = path.join(OUTPUT_DIR, `${requestId}_audio.mp3`);
  const imagePath = path.join(OUTPUT_DIR, `${requestId}_image.jpg`);
  const srtPath = path.join(OUTPUT_DIR, `${requestId}_subs.srt`);
  const videoPath = path.join(OUTPUT_DIR, `${requestId}_result.mp4`);

  try {
    console.log(`[${requestId}] Cloud Rendering Started...`);

    let audioBuffer: Buffer | null = null;
    let imageBuffer: Buffer;

    async function getAssetBuffer(url: string, type: 'audio' | 'image'): Promise<Buffer | null> {
      if (!url) {
        console.log(`[${requestId}] No URL provided for ${type}. Skipping.`);
        return null;
      }
      if (url.startsWith('data:')) {
        console.log(`[${requestId}] Processing Base64 ${type}...`);
        const base64Data = url.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }
      try {
        console.log(`[${requestId}] Downloading ${type}: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
      } catch (e: any) {
        console.error(`[${requestId}] ${type} Download Failed: ${url} - ${e.message}`);
        if (type === 'audio') return null;
        throw new Error(`${type} download failed: ${e.message}`);
      }
    }

    audioBuffer = await getAssetBuffer(assets.audioUrl, 'audio');
    imageBuffer = (await getAssetBuffer(assets.imageUrl, 'image'))!;

    if (audioBuffer) {
      fs.writeFileSync(audioPath, audioBuffer);
    } else {
      await execPromise(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 60 -c:a libmp3lame "${audioPath}"`);
    }
    fs.writeFileSync(imagePath, imageBuffer);

    // --- 3. 탭 분기 처리 ---
    const duration = settings.duration || 60;
    const fadeIn = settings.fadeInDuration || 1.5;
    const fadeOut = settings.fadeOutDuration || 3;

    // 🚀 1. 비주얼 필터 수정: 최고급 스케일링 + 깊은 비네팅(어두움) 적용
    const vFilters = [
      // flags=lanczos: 이미지를 늘릴 때 화질 손실을 최소화하는 최고급 알고리즘
      `scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos`, 
      `crop=1080:1920`,
      // PI/3.5: 미리보기처럼 테두리를 더 깊고 어둡게 눌러줍니다 (기존 0.5보다 강함)
      `vignette=angle=PI/3.5`, 
      // 색감은 살리면서 배경을 차분하게
      `eq=brightness=-0.08:contrast=1.05:saturation=1.1`, 
      `fade=t=in:st=0:d=${fadeIn}`,
      `fade=t=out:st=${duration - fadeOut}:d=${fadeOut}`
    ];

    if (settings.titleSettings) {
      console.log(`[${requestId}] 묵상 탭 레이아웃(ASS) 적용 중...`);
      const assContent = generateASS(settings, duration);
      const assPath = path.join(OUTPUT_DIR, `${requestId}_subs.ass`);
      fs.writeFileSync(assPath, assContent);

      const escapedAssPath = assPath.replace(/\\/g, '/').replace(':', '\\:');
      vFilters.push(`subtitles='${escapedAssPath}'`);

    } else {
      console.log(`[${requestId}] 기본 영상 탭 레이아웃(SRT) 적용 중...`);
      const srtContent = generateSRT(settings.timedLyrics);
      fs.writeFileSync(srtPath, srtContent);

      const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(':', '\\:');
      if (srtContent && srtContent.trim().length > 0) {
        vFilters.push(`subtitles='${escapedSrtPath}':force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2'`);
      }
    }

    const isVertical = settings.type?.toLowerCase().includes('tiktok') || settings.type?.toLowerCase().includes('shorts');
    
    ffmpeg()
      .input(imagePath)
      .loop(duration)
      .input(audioPath)
      .videoFilters(vFilters)
      .videoCodec('h264_nvenc') 
      .audioCodec('aac')
      .audioFilters([
        `afade=t=in:st=0:d=${fadeIn}`,
        `afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`
      ])
      .size(isVertical ? '1080x1920' : '1920x1080')
      // 🚀 2. 인코딩 옵션 수정: 구형 GPU 화질 저하 방지를 위한 비트레이트 폭격
      .outputOptions([
        '-pix_fmt yuv420p',
        '-shortest',
        '-preset slow',   // p7 대신 호환성 높은 slow 프리셋 사용
        '-profile:v high',
        '-b:v 20M',       // 가변 비트레이트(cq)를 끄고 20Mbps라는 엄청난 양의 데이터를 쏟아부어 깍두기 현상 원천 차단
        '-maxrate 25M',
        '-bufsize 40M'
      ])
      .on('stderr', (stderrLine) => {
        // console.log(`[FFmpeg]: ${stderrLine}`);
      })
    .on('end', async () => {
      // 🚀 플랜 A-2: 파일명 표준 (Naming Rule) 적용
      const kTitle = settings.koreanTitle || '제목없음';
      const eTitle = settings.englishTitle || 'Untitled';
      const vType = settings.type || 'shorts';
      const category = settings.category || (settings.koreanTitle?.includes('묵상') ? '묵상' : '영상');
      
      // 규칙: [분류] 한글제목_영어제목_타입.mp4
      const finalFileName = `[${category}] ${kTitle}_${eTitle}_${vType}.mp4`;
      
      // 🚀 플랜 A-1: 경로 고정 (C:\Users\sando\Desktop\ccmpro\downloads)
      // process.cwd()는 현재 프로젝트 폴더를 의미합니다.
      const downloadFolder = path.join(process.cwd(), 'downloads');
      const persistentPath = path.join(downloadFolder, finalFileName);
      
      // 폴더가 없으면 생성
      if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
      }

      try {
        // 렌더링된 결과물을 지정 폴더로 복사
        fs.copyFileSync(videoPath, persistentPath);
        console.log(`[Plan A] 로컬 자동 저장 완료: ${persistentPath}`);
      } catch (err) {
        console.error(`[Plan A] 저장 실패:`, err);
      }

      const downloadUrl = `http://localhost:5000/downloads/${encodeURIComponent(finalFileName)}`;
      res.json({ success: true, videoUrl: downloadUrl });

      // 임시 파일 삭제 (5초 후)
      setTimeout(() => {
        [audioPath, imagePath, srtPath, videoPath].forEach(p => {
          if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) { }
        });
      }, 5000);
    })
      .on('error', (err) => {
        console.error(`[FFmpeg Error]:`, err); // 에러 콘솔 출력 강화
        res.status(500).json({ success: false, error: err.message });
      })
      .save(videoPath);

  } catch (error: any) {
    console.error(`[${requestId}] CRITICAL Server error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Premium Render Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ === 새로운 분리형 자막(ASS) 서버가 정상적으로 켜졌습니다! ===`);
});