import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
app.use(cors()); // Enable CORS for all origins
app.use(express.json({ limit: '100mb' }));

const OUTPUT_DIR = path.join(process.cwd(), 'renders');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// SRT 자막 파일 생성 헬퍼
function generateSRT(timedLyrics: any[]) {
  if (!timedLyrics || timedLyrics.length === 0) return '';
  
  return timedLyrics.map((item, index) => {
    // v1.12.5: 신규 규격(time, kor) 및 기존 규격(start, text) 모두 지원하도록 수정
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

app.post('/render-shorts', async (req, res) => {
  const { assets, settings } = req.body;
  const requestId = uuidv4();
  
  const audioPath = path.join(OUTPUT_DIR, `${requestId}_audio.mp3`);
  const imagePath = path.join(OUTPUT_DIR, `${requestId}_image.jpg`);
  const srtPath = path.join(OUTPUT_DIR, `${requestId}_subs.srt`);
  const videoPath = path.join(OUTPUT_DIR, `${requestId}_result.mp4`);

  try {
    console.log(`[${requestId}] Cloud Rendering Started...`);

    // 1. 에셋 다운로드
    const [audioRes, imageRes] = await Promise.all([
      axios.get(assets.audioUrl, { responseType: 'arraybuffer' }),
      axios.get(assets.imageUrl, { responseType: 'arraybuffer' })
    ]);

    fs.writeFileSync(audioPath, Buffer.from(audioRes.data));
    fs.writeFileSync(imagePath, Buffer.from(imageRes.data));

    // 2. 자막 파일 생성
    const srtContent = generateSRT(settings.timedLyrics);
    fs.writeFileSync(srtPath, srtContent);

    // 3. FFmpeg 복합 필터 구성 (자막 + 페이드)
    const duration = settings.duration || 30;
    const fadeIn = settings.fadeInDuration || 1.5;
    const fadeOut = settings.fadeOutDuration || 3;

    // v1.12.5: Windows 환경을 위한 FFmpeg 자막 경로 이스케이프 처리
    const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(':', '\\:');

    ffmpeg()
      .input(imagePath)
      .loop(duration)
      .input(audioPath)
      .videoFilters([
        `fade=t=in:st=0:d=${fadeIn}`,
        `fade=t=out:st=${duration - fadeOut}:d=${fadeOut}`,
        // 자막 필터 (이스케이프된 경로 사용)
        `subtitles='${escapedSrtPath}':force_style='FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0,Alignment=2'`
      ])
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioFilters([
        `afade=t=in:st=0:d=${fadeIn}`,
        `afade=t=out:st=${duration - fadeOut}:d=${fadeOut}`
      ])
      .size(settings.type === 'tiktok' || settings.type === 'shorts' ? '1080x1920' : '1920x1080')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-shortest',
        '-crf 18' // 고화질 설정
      ])
      .on('start', (cmd) => console.log('FFmpeg command:', cmd))
      .on('end', async () => {
        console.log(`[${requestId}] Rendering complete!`);
        
        // v1.12.5: 자동화를 위해 downloads 폴더에 영구 복사본 생성
        const finalFileName = `${settings.title || 'video'}_${settings.type || 'main'}_${Date.now()}.mp4`.replace(/\s+/g, '_');
        const persistentPath = path.join(DOWNLOADS_DIR, finalFileName);
        fs.copyFileSync(videoPath, persistentPath);
        console.log(`✅ Video saved permanently to: ${persistentPath}`);

        res.download(videoPath, finalFileName, () => {
           // 임시 작업 파일만 정리 (downloads 폴더의 파일은 보존)
           [audioPath, imagePath, srtPath, videoPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        });
      })
      .on('error', (err) => {
        console.error(`[${requestId}] FFmpeg error:`, err.message);
        res.status(500).json({ success: false, error: err.message });
      })
      .save(videoPath);

  } catch (error: any) {
    console.error(`[${requestId}] Server error:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Premium Render Server running on http://0.0.0.0:${PORT}`);
});
