import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Conversation, ConversationStatus, Customer, Order } from '../types/database'
import { MOCK_DETAILS } from '../lib/mockData'

export interface ConversationDetail extends Conversation {
  customers: Customer
  orders: Order | null
}

export function useConversationDetail(conversationId: string | null) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!conversationId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('conversations')
        .select('*, customers(*), orders(*)')
        .eq('id', conversationId)
        .single()

      if (err) throw err
      setDetail(data as unknown as ConversationDetail)
    } catch {
      // Offline fallback
      const fallback = MOCK_DETAILS[conversationId] || MOCK_DETAILS['d1000001-0000-0000-0000-000000000001'] || null
      setDetail(fallback)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetch()
  }, [fetch])

  const updateStatus = useCallback(
    async (status: ConversationStatus) => {
      if (!conversationId) return
      try {
        const { error: err } = await supabase
          .from('conversations')
          .update({ status })
          .eq('id', conversationId)
        if (err) throw err
      } catch {
        // Update local mock detail if offline
        setDetail((curr) => (curr ? { ...curr, status } : null))
      }
      await fetch()
    },
    [conversationId, fetch],
  )

  return { detail, loading, error, refresh: fetch, updateStatus }
}
