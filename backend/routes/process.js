import { downloadAudio, detectPlatform } from '../services/downloader.js'
import { getYouTubeData } from '../services/youtube.js'
import { transcribe } from '../services/transcribe.js'
import { extractInsights } from '../services/extract.js'
import { saveCard } from '../services/db.js'
import { unlink } from 'fs/promises'

function isYouTube(url) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

export default async function processRoute(app) {
  app.post('/process', {
    schema: {
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', minLength: 10 },
        },
      },
    },
  }, async (request, reply) => {
    const token = (request.headers.authorization || '').replace('Bearer ', '').trim()
    const { url } = request.body
    let audioPath = null

    try {
      let transcript, videoMeta

      if (isYouTube(url)) {
        // YouTube: try captions API first, fall back to yt-dlp + Whisper
        app.log.info(`[YouTube] Fetching transcript: ${url}`)
        let usedCaptions = false
        try {
          const ytData = await getYouTubeData(url)
          transcript = ytData.transcript
          videoMeta  = {
            title:        ytData.title,
            thumbnail:    ytData.thumbnail,
            platform:     'YouTube',
            uploader:     ytData.uploader,
            uploader_url: ytData.uploader_url,
            duration:     0,
            description:  null,
          }
          usedCaptions = true
        } catch (captionErr) {
          if (!captionErr.message.includes('No captions')) throw captionErr
          app.log.info('[YouTube] No captions, falling back to audio download...')
        }

        if (!usedCaptions) {
          const videoInfo = await downloadAudio(url)
          audioPath = videoInfo.path
          transcript = await transcribe(audioPath)
          videoMeta  = { ...videoInfo, platform: 'YouTube' }
        }
      } else {
        // Other platforms: download audio + transcribe
        app.log.info(`[1/3] Downloading audio: ${url}`)
        const videoInfo = await downloadAudio(url)
        audioPath = videoInfo.path

        app.log.info('[2/3] Transcribing audio...')
        transcript = await transcribe(audioPath)
        videoMeta  = videoInfo
      }

      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Could not extract any speech from this video.')
      }

      app.log.info('[3/3] Extracting insights...')
      const insights = await extractInsights(transcript, videoMeta.title, videoMeta.description)

      const cardData = {
        title:         insights.title,
        category:      insights.category,
        key_points:    insights.key_points,
        summary:       insights.summary,
        transcript,
        url,
        platform:      videoMeta.platform,
        thumbnail_url: videoMeta.thumbnail,
        uploader:      videoMeta.uploader,
        uploader_url:  videoMeta.uploader_url,
        duration:      Math.round(videoMeta.duration || 0),
      }

      if (token) {
        try {
          const card = await saveCard(cardData, token)
          return reply.send({ success: true, card, saved: true })
        } catch (saveErr) {
          if (saveErr.message === 'Unauthorized') {
            return reply.send({ success: true, card: cardData, saved: false })
          }
          throw saveErr
        }
      }

      return reply.send({ success: true, card: cardData, saved: false })
    } catch (err) {
      app.log.error(err.message)
      return reply.status(400).send({ success: false, error: err.message })
    } finally {
      if (audioPath) await unlink(audioPath).catch(() => {})
    }
  })
}
