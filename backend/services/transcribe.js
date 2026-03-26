import Groq from 'groq-sdk'
import { createReadStream } from 'fs'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function transcribe(audioPath) {
  const transcription = await groq.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: 'whisper-large-v3-turbo',
    response_format: 'text',
  })
  // Groq returns the text directly for response_format: 'text'
  return typeof transcription === 'string' ? transcription : transcription.text
}
