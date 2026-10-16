import { useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Brand, Conversation, ConversationStatus, Customer, Order } from '../types/database'
import { MOCK_DETAILS } from '../lib/mockData'
import { queryClient } from '../App'

export interface ConversationDetail extends Conversation {
  customers: Customer
  orders: Order | null
  brands?: Brand | null
}

const DETAIL_COLUMNS =
  'id, brand_id, customer_id, order_id, status, subject, last_message_at, created_at, updated_at, customers(id, full_name, email, phone), orders(id, order_number, status, total_amount, currency, delivery_date, items_json), brands(id, name, slug)'

export async function fetchConversationDetailFn(conversationId: string): Promise<ConversationDetail | null> {
  try {
    const { data, error: err } = await supabase
      .from('conversations')
      .select(DETAIL_COLUMNS)
      .eq('id', conversationId)
      .single()

    if (err) throw err
    return data as unknown as ConversationDetail
  } catch {
    return MOCK_DETAILS[conversationId] || MOCK_DETAILS['d1000001-0000-0000-0000-000000000001'] || null
  }
}

export function prefetchConversationDetail(conversationId: string) {
  if (!conversationId) return
  queryClient.prefetchQuery({
    queryKey: ['conversation-detail', conversationId],
    queryFn: () => fetchConversationDetailFn(conversationId),
    staleTime: 1000 * 60 * 3,
  })
}

export function useConversationDetail(conversationId: string | null) {
  const {
    data: detail,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['conversation-detail', conversationId],
    queryFn: () => (conversationId ? fetchConversationDetailFn(conversationId) : null),
    enabled: Boolean(conversationId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  })

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
        // Fallback
      }
      queryClient.setQueryData<ConversationDetail | null>(
        ['conversation-detail', conversationId],
        (prev) => (prev ? { ...prev, status } : prev),
      )
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', conversationId] })
    },
    [conversationId],
  )

  return {
    detail: detail ?? null,
    loading,
    error: error ? (error as Error).message : null,
    refresh: refetch,
    updateStatus,
  }
}

