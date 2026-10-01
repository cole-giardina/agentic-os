export type Task = {
  id: string
  user_id: string
  title: string
  notes: string | null
  due_date: string | null
  priority: number
  status: 'open' | 'done'
  source: 'user' | 'agent'
  created_at: string
  completed_at: string | null
}
