# ReelWise

Turn short-form videos into structured knowledge cards.

Supports: TikTok, Instagram Reels, YouTube Shorts, LinkedIn (up to 2 min)

## Stack (100% free)
- **Transcription**: Groq Whisper API
- **AI Extraction**: Groq LLaMA 3.3 70B
- **Database**: Supabase (PostgreSQL)
- **Backend**: Node.js + Fastify
- **Frontend**: Single HTML file

## Setup

### 1. Get free API keys
- Groq: https://console.groq.com (free, no credit card)
- Supabase: https://supabase.com (free tier)

### 2. Create Supabase table
Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  category     TEXT,
  key_points   JSONB,
  summary      TEXT,
  transcript   TEXT,
  url          TEXT NOT NULL,
  platform     TEXT,
  thumbnail_url TEXT,
  uploader     TEXT,
  duration     INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Install system dependencies
Make sure you have [ffmpeg](https://ffmpeg.org/download.html) and [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed:

```bash
# Windows (via winget)
winget install yt-dlp
winget install ffmpeg

# Or via pip
pip install yt-dlp
```

### 4. Install & run backend

```bash
cd backend
cp .env.example .env
# Fill in your GROQ_API_KEY and SUPABASE credentials in .env

npm install
npm start
```

Open http://localhost:3000

## Project Structure
```
reelwise/
├── backend/
│   ├── index.js              # Fastify server
│   ├── routes/
│   │   ├── process.js        # POST /api/process
│   │   └── cards.js          # GET/DELETE /api/cards
│   ├── services/
│   │   ├── downloader.js     # yt-dlp audio extraction
│   │   ├── transcribe.js     # Groq Whisper
│   │   ├── extract.js        # Groq LLaMA insights
│   │   └── db.js             # Supabase
│   └── .env.example
└── frontend/
    └── index.html            # Full UI (no build step)
```
