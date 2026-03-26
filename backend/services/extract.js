import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CATEGORIES = [
  'Career', 'Finance', 'Health', 'Fitness', 'Education',
  'Technology', 'Business', 'Lifestyle', 'Food', 'Travel',
  'Entertainment', 'Other',
]

export async function extractInsights(transcript, title, description) {
  const clean = s => (s || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim()

  const cleanTranscript  = clean(transcript)
  const cleanTitle       = clean(title)
  const cleanDescription = clean(description)

  const descSection = cleanDescription
    ? `\nVideo description (may contain ingredients, links, steps, or extra detail):\n"${cleanDescription}"`
    : ''

  const prompt = `You are a knowledge extraction assistant. Your job is to turn a short-form video into a detailed, self-contained knowledge card — so the user NEVER needs to rewatch the video.

Video title: "${cleanTitle}"${descSection}
Transcript: "${cleanTranscript}"

Rules:
- Extract EVERYTHING useful: all steps, quantities, names, tools, tips, warnings, links, prices, commands, ingredients — whatever is in the content
- If it is a tutorial or how-to: write out every step in order, with enough detail to follow without watching
- If it is a recipe: include every ingredient with quantities AND every step in order
- If it is advice or tips: extract each tip fully, not as a vague one-liner
- If the description contains extra detail (ingredients, steps, links), include it
- key_points must be an array of strings — each string is a complete, detailed point (not a vague summary)
- Aim for 5–10 points depending on content richness; never truncate real steps to hit a number
- summary must be 2–3 sentences covering the full value of the content
- Do NOT be vague. "Add seasoning" is bad. "Add 1 tsp salt, 1/2 tsp black pepper, and 1 tbsp olive oil" is good.

Respond with valid JSON only — no markdown, no code blocks, no extra text.
{
  "title": "clear descriptive title for this knowledge card (max 12 words)",
  "category": "one of: ${CATEGORIES.join(', ')}",
  "summary": "2-3 sentence summary covering the full value of this content",
  "key_points": ["detailed point 1", "detailed point 2", "..."]
}`

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1024,
  })

  const raw = response.choices[0].message.content.trim()

  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('AI returned invalid JSON. Please try again.')
  }
}
