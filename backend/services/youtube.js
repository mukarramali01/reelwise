const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false'
const CLIENT_VERSION = '20.10.38'
const USER_AGENT = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`

export function extractVideoId(url) {
  const m =
    url.match(/shorts\/([a-zA-Z0-9_-]{11})/) ||
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

async function fetchCaptionTracks(videoId) {
  const res = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: CLIENT_VERSION } },
      videoId,
    }),
  })
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`)
  const data = await res.json()
  return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []
}

async function fetchTranscriptXml(trackUrl) {
  const res = await fetch(trackUrl, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error('Failed to fetch caption track')
  return res.text()
}

function parseXml(xml) {
  const texts = []
  const re = /<text[^>]*>([^<]*)<\/text>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const t = m[1]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
      .trim()
    if (t) texts.push(t)
  }
  return texts.join(' ')
}

export async function getYouTubeData(url) {
  const videoId = extractVideoId(url)
  if (!videoId) throw new Error('Could not extract YouTube video ID from URL.')

  const tracks = await fetchCaptionTracks(videoId)
  if (!tracks.length) throw new Error('No captions available for this video. Try a video with subtitles enabled.')

  // Prefer English, fall back to first available
  const track = tracks.find(t => t.languageCode === 'en') || tracks[0]
  const xml = await fetchTranscriptXml(track.baseUrl)
  const transcript = parseXml(xml)

  if (!transcript || transcript.length < 10) {
    throw new Error('No captions available for this video. Try a video with subtitles enabled.')
  }

  // Metadata via oEmbed
  let title = `YouTube Short ${videoId}`, thumbnail = null, uploader = null
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    if (r.ok) {
      const meta = await r.json()
      title     = meta.title        || title
      thumbnail = meta.thumbnail_url || null
      uploader  = meta.author_name   || null
    }
  } catch {}

  return { transcript, title, thumbnail, uploader, uploader_url: `https://www.youtube.com/watch?v=${videoId}` }
}
