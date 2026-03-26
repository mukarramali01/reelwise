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
    const { url } = request.body
    let audioPath = null

    try {
      // Step 1: Download audio from video URL
      app.log.info(`[1/3] Downloading audio: ${url}`)
      const videoInfo = await downloadAudio(url)
      audioPath = videoInfo.path

      // Step 2: Transcribe with Groq Whisper
      app.log.info('[2/3] Transcribing audio...')
      const transcript = await transcribe(audioPath)

      if (!transcript || transcript.trim().length < 10) {
        throw new Error('Could not extract any speech from this video.')
      }

      // Step 3: Extract key insights with Groq LLaMA
      app.log.info('[3/3] Extracting insights...')
      const insights = await extractInsights(transcript, videoInfo.title, videoInfo.description)

      // Step 4: Save to Supabase
      const card = await saveCard({
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
      })

      return reply.send({ success: true, card })
    } catch (err) {
      app.log.error(err.message)
      return reply.status(400).send({ success: false, error: err.message })
    } finally {
      if (audioPath) await unlink(audioPath).catch(() => {})
    }
  })
}
