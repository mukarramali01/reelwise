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

function isYouTube(url) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function isInstagram(url) {
  return url.includes('instagram.com')
}

function extraArgs(url) {
  if (isYouTube(url)) {
    return ['--extractor-args', 'youtube:player_client=ios,web', '--no-check-certificates']
  }
  if (isInstagram(url)) {
    return ['--extractor-args', 'instagram:api=graphql', '--no-check-certificates']
  }
  return []
}

function friendlyError(raw, url = '') {
  const msg = raw || ''
  const isIG = url.includes('instagram.com')
  const isYT = isYouTube(url)

  if (isIG && (msg.includes('login') || msg.includes('rate-limit') || msg.includes('not available')))
    return 'Instagram requires authentication to download reels on a server. Try a YouTube Short or TikTok link instead.'
  if (isYT && (msg.includes('Sign in') || msg.includes('bot') || msg.includes('429') || msg.includes('Too Many Requests')))
    return 'YouTube is temporarily blocking this server. Please try again in a few minutes.'
  if (msg.includes('Private video') || msg.includes('private'))
    return 'This video is private. Please use a public video URL.'
  if (msg.includes('login') || msg.includes('Sign in') || msg.includes('authentication'))
    return 'This video requires login to access. Please use a public video URL.'
  if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate-limit'))
    return 'The server is being rate-limited. Please try again in a few minutes.'
  if (msg.includes('404') || msg.includes('Not Found'))
    return 'Video not found. Check that the URL is correct.'
  if (msg.includes('not available') || msg.includes('unavailable'))
    return 'This video is unavailable or has been removed.'
  return 'Could not download this video. Make sure the URL is public and valid.'
}

export async function downloadAudio(url) {
  const extra = extraArgs(url)

  // Get video metadata
  let info
  try {
    const infoJson = await ytDlp.execPromise([
      url,
      '--dump-json',
      '--no-playlist',
      ...extra,
    ])
    info = JSON.parse(infoJson)
  } catch (e) {
    throw new Error(friendlyError(e.message, url))
  }

  const duration = info.duration || 0
  if (duration > 120) {
    throw new Error(`Video is ${Math.round(duration)}s long. Maximum allowed is 2 minutes (120s).`)
  }

  const id = uuidv4()
  const outputTemplate = join(tmpdir(), `reelwise_${id}.%(ext)s`)
  const expectedMp3    = join(tmpdir(), `reelwise_${id}.mp3`)
  const ffmpegPath     = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg'

  try {
    await ytDlp.execPromise([
      url,
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--ffmpeg-location', ffmpegPath,
      '--output', outputTemplate,
      '--no-playlist',
      '--quiet',
      ...extra,
    ])
  } catch (e) {
    throw new Error(friendlyError(e.message, url))
  }

  if (!existsSync(expectedMp3)) {
    throw new Error('Audio extraction failed — output file not found.')
  }

  return {
    path:         expectedMp3,
    title:        info.title || 'Untitled',
    thumbnail:    info.thumbnail || null,
    platform:     detectPlatform(url),
    duration,
    uploader:     info.uploader || info.channel || null,
    uploader_url: info.uploader_url || info.channel_url || null,
    description:  info.description || null,
  }
}
