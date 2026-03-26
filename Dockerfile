FROM node:20-slim

# Install system dependencies: ffmpeg + yt-dlp + python3
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && pip3 install yt-dlp --break-system-packages \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy frontend
COPY frontend/ ../frontend/

EXPOSE 3000

CMD ["node", "index.js"]
