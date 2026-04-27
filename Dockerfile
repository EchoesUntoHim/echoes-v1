# 1. 빌드 단계 (Node.js 및 Typescript 환경)
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# 2. 실행 단계
FROM node:20-slim
WORKDIR /app

# 핵심: FFmpeg 설치 (영상 합성 필수 도구)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# 패키지 정보 및 코드 복사
COPY --from=builder /app /app

# 포트 설정 (Cloud Run 기본 포트)
EXPOSE 8080

# 서버 실행 (tsx를 사용하여 실시간으로 TypeScript 서버 구동)
CMD ["npx", "tsx", "scripts/render_server.ts"]
