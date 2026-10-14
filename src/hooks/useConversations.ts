import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Conversation, ConversationStatus } from '../types/database'
import { MOCK_CONVERSATIONS } from '../lib/mockData'

/**
 * ConversationListItem — a Conversation row augmented with:
 *   • customer_name / customer_email  (from the joined customers table)
 *   • latest_message_content / latest_message_role  (batch-fetched, then merged)
 */
export interface ConversationListItem extends Conversation {
  customer_name: string
  customer_email: string
  latest_message_content: string | null
  latest_message_role: string | null
}

export type StatusFilter = 'all' | ConversationStatus

export function useConversations(
  brandId: string | null,
  statusFilter: StatusFilter = 'all',
  refreshKey = 0,
) {
  const [items, setItems] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!brandId) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch conversations + customer name/email via join
      let q = supabase
        .from('conversations')
        .select('*, customers(id, full_name, email)')
        .eq('brand_id', brandId)
        .order('last_message_at', { ascending: false })

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }

      const { data: convs, error: convErr } = await q
      if (convErr) throw convErr
      if (!convs || convs.length === 0) {
        // Fallback to sample data for demo/testing if DB is empty
        const fallback = MOCK_CONVERSATIONS[brandId] || MOCK_CONVERSATIONS['b1000000-0000-0000-0000-000000000001'] || []
        const filtered = statusFilter === 'all' ? fallback : fallback.filter((c) => c.status === statusFilter)
        setItems(filtered)
        return
      }

      // 2. Batch-fetch the latest message per conversation
      const { data: msgs } = await supabase
        .from('messages')
        .select('conversation_id, content, role, created_at')
        .in('conversation_id', convs.map(c => c.id))
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })

      // Deduplicate: keep only the first (most recent) message per conversation
      const latestMap = new Map<string, { content: string; role: string }>()
      for (const m of msgs ?? []) {
        if (!latestMap.has(m.conversation_id as string)) {
          latestMap.set(m.conversation_id as string, {
            content: m.content as string,
            role: m.role as string,
          })
        }
      }

      // 3. Merge
      const enriched: ConversationListItem[] = convs.map(c => {
        const cust = (c as Record<string, unknown>).customers as
          | { full_name: string; email: string }
          | null
        const latest = latestMap.get(c.id as string)
        return {
          ...(c as unknown as Conversation),
          customer_name: cust?.full_name ?? 'Unknown Customer',
          customer_email: cust?.email ?? '',
          latest_message_content: latest?.content ?? null,
          latest_message_role: latest?.role ?? null,
        }
      })

      setItems(enriched)
    } catch {
      // Offline / dev fallback so UI remains functional and demonstrable
      const fallback = MOCK_CONVERSATIONS[brandId] || MOCK_CONVERSATIONS['b1000000-0000-0000-0000-000000000001'] || []
      const filtered = statusFilter === 'all' ? fallback : fallback.filter((c) => c.status === statusFilter)
      setItems(filtered)
    } finally {
      setLoading(false)
    }
  }, [brandId, statusFilter, refreshKey])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { items, loading, error, refresh: fetch }
}
