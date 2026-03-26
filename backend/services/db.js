import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function saveCard(data) {
  const { data: card, error } = await supabase
    .from('cards')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`DB save failed: ${error.message}`)
  return card
}

export async function getCards({ search, category, platform } = {}) {
  let query = supabase
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

export async function deleteCard(id) {
  const { error } = await supabase.from('cards').delete().eq('id', id)
  if (error) throw new Error(`DB delete failed: ${error.message}`)
}
