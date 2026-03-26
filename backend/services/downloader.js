import YTDlpWrapModule from 'yt-dlp-wrap'
import { v4 as uuidv4 } from 'uuid'
import { join } from 'path'
import { tmpdir } from 'os'
import { existsSync } from 'fs'

const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule
const ytDlp = new YTDlpWrap()

const PLATFORM_MAP = {
  'tiktok.com':    'TikTok',
  'instagram.com': 'Instagram',
  'youtube.com':   'YouTube',
  'youtu.be':      'YouTube',
  'linkedin.com':  'LinkedIn',
}

export function detectPlatform(url) {
  for (const [domain, name] of Object.entries(PLATFORM_MAP)) {
    if (url.includes(domain)) return name
  }
  return 'Web'
}

export async function downloadAudio(url) {
  // Get video metadata first
  let info
  try {
    info = await ytDlp.getVideoInfo(url)
  } catch (e) {
    throw new Error(`Could not fetch video info. Make sure the URL is public and valid. (${e.message})`)
  }

  const duration = info.duration || 0
  if (duration > 120) {
    throw new Error(`Video is ${Math.round(duration)}s long. Maximum allowed is 2 minutes (120s).`)
  }

  const id = uuidv4()
  // yt-dlp appends the extension itself, output template without extension
  const outputTemplate = join(tmpdir(), `reelwise_${id}.%(ext)s`)
  const expectedMp3 = join(tmpdir(), `reelwise_${id}.mp3`)

  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

  await ytDlp.execPromise([
    url,
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '5',
    '--ffmpeg-location', ffmpegPath,
    '--output', outputTemplate,
    '--no-playlist',
    '--quiet',
  ])

  if (!existsSync(expectedMp3)) {
    throw new Error('Audio extraction failed — output file not found.')
  }

  return {
    path: expectedMp3,
    title: info.title || 'Untitled',
    thumbnail: info.thumbnail || null,
    platform: detectPlatform(url),
    duration,
    uploader: info.uploader || info.channel || null,
    uploader_url: info.uploader_url || info.channel_url || null,
    description: info.description || null,
  }
}
