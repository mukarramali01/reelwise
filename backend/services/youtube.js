import { YoutubeTranscript } from 'youtube-transcript'

export function extractVideoId(url) {
  const m =
    url.match(/shorts\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export async function getYouTubeData(url) {
  const videoId = extractVideoId(url)
  if (!videoId) throw new Error('Could not extract YouTube video ID from URL.')

  // Fetch transcript (captions) — uses YouTube's timedtext API, not blocked
  const items = await YoutubeTranscript.fetchTranscript(videoId)
  const transcript = items.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()

  if (!transcript || transcript.length < 10) {
    throw new Error('No captions available for this video. Try a video with subtitles enabled.')
  }

  // Fetch basic metadata via oEmbed (also public, not blocked)
  let title = `YouTube Short ${videoId}`
  let thumbnail = null
  let uploader = null
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    if (r.ok) {
      const meta = await r.json()
      title     = meta.title     || title
      thumbnail = meta.thumbnail_url || null
      uploader  = meta.author_name   || null
    }
  } catch {}

  return { transcript, title, thumbnail, uploader, uploader_url: `https://www.youtube.com/watch?v=${videoId}` }
}
