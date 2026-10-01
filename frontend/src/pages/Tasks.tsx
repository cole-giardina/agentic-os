import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import type { Task } from '../lib/types'

type Filter = 'open' | 'done' | 'all'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadTasks() {
    setLoading(true)
    setError(null)
    try {
      const qs = filter === 'all' ? '' : `?status=${filter}`
      const res = await apiFetch(`/tasks${qs}`)
      if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`)
      setTasks(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          due_date: newDueDate || null,
        }),
      })
      if (!res.ok) throw new Error(`Failed to create task (${res.status})`)
      setNewTitle('')
      setNewDueDate('')
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(task: Task) {
    const nextStatus = task.status === 'open' ? 'done' : 'open'
    setError(null)
    try {
      const res = await apiFetch(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error(`Failed to update task (${res.status})`)
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  async function deleteTask(task: Task) {
    setError(null)
    try {
      const res = await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Failed to delete task (${res.status})`)
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Tasks</h1>

      <form onSubmit={addTask} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !newTitle.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2 text-sm">
        {(['open', 'done', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 ${
              filter === f ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-gray-200">
        {loading && <li className="py-3 text-sm text-gray-400">Loading...</li>}
        {!loading && tasks.length === 0 && (
          <li className="py-3 text-sm text-gray-400">No tasks here.</li>
        )}
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={task.status === 'done'}
              onChange={() => toggleStatus(task)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={task.status === 'done' ? 'text-gray-400 line-through' : ''}>
                  {task.title}
                </span>
                {task.source === 'agent' && (
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                    agent
                  </span>
                )}
              </div>
              {task.due_date && (
                <span className="text-xs text-gray-400">Due {task.due_date}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => deleteTask(task)}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
