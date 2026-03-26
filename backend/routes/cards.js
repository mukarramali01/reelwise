import { getCards, deleteCard } from '../services/db.js'

export default async function cardsRoute(app) {
  app.get('/cards', async (request, reply) => {
    try {
      const { search, category, platform } = request.query
      const cards = await getCards({ search, category, platform })
      return reply.send({ success: true, cards })
    } catch (err) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  app.delete('/cards/:id', async (request, reply) => {
    try {
      await deleteCard(request.params.id)
      return reply.send({ success: true })
    } catch (err) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })
}
