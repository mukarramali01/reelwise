import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import processRoute from './routes/process.js'
import cardsRoute from './routes/cards.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = Fastify({ logger: true })

await app.register(cors, { origin: '*' })

await app.register(staticFiles, {
  root: join(__dirname, '../frontend'),
  prefix: '/',
})

await app.register(processRoute, { prefix: '/api' })
await app.register(cardsRoute, { prefix: '/api' })

app.get('/api/health', async () => ({ status: 'ok' }))

const port = process.env.PORT || 3000
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) { app.log.error(err); process.exit(1) }
  console.log(`ReelWise running at http://localhost:${port}`)
})
