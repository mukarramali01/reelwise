import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export function clientForUser(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function getUserFromToken(token) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new Error('Unauthorized')
  return data.user
}

export async function saveCard(data, token) {
  const user = await getUserFromToken(token)
  const db = clientForUser(token)
  const { data: card, error } = await db
    .from('cards')
    .insert({ ...data, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(`DB save failed: ${error.message}`)
  return card
}

export async function getCards({ search, category, platform } = {}, token) {
  await getUserFromToken(token)
  const db = clientForUser(token)
  let query = db
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (platform) query = query.eq('platform', platform)
  if (search)   query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw new Error(`DB fetch failed: ${error.message}`)
  return data
}

export async function deleteCard(id, token) {
  await getUserFromToken(token)
  const db = clientForUser(token)
  const { error } = await db.from('cards').delete().eq('id', id)
  if (error) throw new Error(`DB delete failed: ${error.message}`)
}
