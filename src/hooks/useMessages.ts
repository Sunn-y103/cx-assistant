import { useCallback, useRef, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Message, MessageMetadata, MessageRole } from '../types/database'
import { MOCK_MESSAGES } from '../lib/mockData'
import { approveAiGeneration } from '../services/ai'
import { queryClient } from '../App'

/** Options when sending a message */
export interface MessageSendOptions {
  sender_type?: 'customer' | 'agent'
  role?: MessageRole
  source?: 'customer' | 'ai_approved' | 'manual'
  generation_id?: string
  edited_response?: string | null
  draft_type?: 'manual' | 'ai_accepted' | 'ai_edited'
  ai_log_id?: string
  was_edited?: boolean
  is_demo_send?: boolean
}

const MESSAGES_COLUMNS =
  'id, conversation_id, brand_id, role, sender_type, source, author_id, content, metadata_json, created_at'

export async function fetchMessagesFn(conversationId: string): Promise<Message[]> {
  try {
    const { data, error: err } = await supabase
      .from('messages')
      .select(MESSAGES_COLUMNS)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (err) throw err
    if (!data || data.length === 0) {
      return MOCK_MESSAGES[conversationId] || []
    }
    return data as Message[]
  } catch {
    return MOCK_MESSAGES[conversationId] || []
  }
}

export function prefetchConversationMessages(conversationId: string) {
  if (!conversationId) return
  queryClient.prefetchQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessagesFn(conversationId),
    staleTime: 1000 * 60 * 3,
  })
}

export function useMessages(conversationId: string | null, brandId: string | null) {
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // Ref-level guard: prevents duplicate concurrent submissions
  const submittingRef = useRef(false)

  const {
    data: messages = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => (conversationId ? fetchMessagesFn(conversationId) : Promise.resolve([])),
    enabled: Boolean(conversationId && brandId),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
  })

  const sendMessage = useCallback(
    async (content: string, options: MessageSendOptions = {}) => {
      if (!conversationId || !brandId) return
      // Hard guard: reject if a send is already in flight
      if (submittingRef.current) return
      submittingRef.current = true
      setSending(true)
      setSendError(null)

      const senderType = options.sender_type ?? (options.role === 'customer' ? 'customer' : 'agent')
      const role: MessageRole = options.role ?? (senderType === 'customer' ? 'customer' : 'agent')
      const source = options.source ?? (senderType === 'customer' ? 'customer' : 'manual')

      const extra: MessageMetadata = {
        ...(options.draft_type ? { draft_type: options.draft_type } : {}),
        ...(options.generation_id ? { generation_id: options.generation_id } : {}),
        ...(options.ai_log_id ? { ai_log_id: options.ai_log_id } : {}),
        ...(options.was_edited !== undefined ? { was_edited: options.was_edited } : {}),
        ...(options.is_demo_send ? { is_demo_send: true } : {}),
      }

      // 1. Optimistic Update: Add message immediately to the UI thread via React Query cache
      const tempId = `optimistic-${Date.now()}`
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversationId,
        brand_id: brandId,
        role,
        sender_type: senderType,
        source,
        author_id: null,
        content,
        metadata_json: extra,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Message[]>(['messages', conversationId], (prev) => [
        ...(prev || []),
        optimisticMsg,
      ])

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data: insertedMsg, error: insertErr } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            brand_id: brandId,
            role,
            sender_type: senderType,
            source,
            author_id: senderType === 'agent' ? user?.id ?? null : null,
            content,
            metadata_json: extra,
          })
          .select(MESSAGES_COLUMNS)
          .single()

        if (insertErr) throw insertErr

        // 2. If this was an approved AI generation, log it in ai_generations
        if (options.generation_id && source === 'ai_approved') {
          await approveAiGeneration({
            generationId: options.generation_id,
            editedResponse: options.edited_response,
            finalResponse: content,
            finalMessageId: insertedMsg?.id,
            userId: user?.id,
          })
        }

        // 3. Keep last_message_at current so the conversation list sorts correctly
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)

        // Replace optimistic message with actual persisted record in cache
        if (insertedMsg) {
          queryClient.setQueryData<Message[]>(['messages', conversationId], (prev) =>
            (prev || []).map((m) => (m.id === tempId ? (insertedMsg as Message) : m)),
          )
        }
      } catch (err) {
        console.error('[useMessages] sendMessage failed:', err)
        setSendError((err as Error).message || 'Failed to send')
      } finally {
        submittingRef.current = false
        setSending(false)
      }
    },
    [conversationId, brandId],
  )

  return {
    messages,
    loading,
    error: sendError || (queryError ? (queryError as Error).message : null),
    sending,
    sendMessage,
    refresh: refetch,
  }
}
