import { downloadAudio } from '../services/downloader.js'
import { transcribe } from '../services/transcribe.js'
import { extractInsights } from '../services/extract.js'
import { saveCard } from '../services/db.js'
import { unlink } from 'fs/promises'

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
      app.log.info(`[1/3] Downloading audio: ${url}`)
      const videoInfo = await downloadAudio(url)
      audioPath = videoInfo.path

      app.log.info('[2/3] Transcribing audio...')
      const transcript = await transcribe(audioPath)

      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Could not extract any speech from this video.')
      }

      app.log.info('[3/3] Extracting insights...')
      const insights = await extractInsights(transcript, videoInfo.title, videoInfo.description)

      const cardData = {
        title:         insights.title,
        category:      insights.category,
        key_points:    insights.key_points,
        summary:       insights.summary,
        transcript,
        url,
        platform:      videoInfo.platform,
        thumbnail_url: videoInfo.thumbnail,
        uploader:      videoInfo.uploader,
        uploader_url:  videoInfo.uploader_url,
        duration:      Math.round(videoInfo.duration),
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
