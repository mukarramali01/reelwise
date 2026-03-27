import { getCards, deleteCard, saveCard } from '../services/db.js'

export default async function cardsRoute(app) {
  app.post('/cards', async (request, reply) => {
    const token = (request.headers.authorization || '').replace('Bearer ', '').trim()
    if (!token) return reply.status(401).send({ success: false, error: 'Not logged in.' })
    try {
      const card = await saveCard(request.body, token)
      return reply.send({ success: true, card })
    } catch (err) {
      const status = err.message === 'Unauthorized' ? 401 : 500
      return reply.status(status).send({ success: false, error: err.message })
    }
  })

  app.get('/cards', async (request, reply) => {
    const token = (request.headers.authorization || '').replace('Bearer ', '').trim()
    if (!token) return reply.status(401).send({ success: false, error: 'Not logged in.' })
    try {
      const { search, category, platform } = request.query
      const cards = await getCards({ search, category, platform }, token)
      return reply.send({ success: true, cards })
    } catch (err) {
      const status = err.message === 'Unauthorized' ? 401 : 500
      return reply.status(status).send({ success: false, error: err.message })
    }
  })

  app.delete('/cards/:id', async (request, reply) => {
    const token = (request.headers.authorization || '').replace('Bearer ', '').trim()
    if (!token) return reply.status(401).send({ success: false, error: 'Not logged in.' })
    try {
      await deleteCard(request.params.id, token)
      return reply.send({ success: true })
    } catch (err) {
      const status = err.message === 'Unauthorized' ? 401 : 500
      return reply.status(status).send({ success: false, error: err.message })
    }
  })
}
