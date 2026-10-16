import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Message, MessageMetadata, MessageRole } from '../types/database'
import { MOCK_MESSAGES } from '../lib/mockData'
import { approveAiGeneration } from '../services/ai'

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

export function useMessages(conversationId: string | null, brandId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  // Ref-level guard: prevents duplicate concurrent submissions
  const submittingRef = useRef(false)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !brandId) {
      setMessages([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (err) throw err
      if (!data || data.length === 0) {
        const fallback = MOCK_MESSAGES[conversationId] || []
        setMessages(fallback)
        return
      }
      setMessages(data as Message[])
    } catch {
      // Offline fallback
      const fallback = MOCK_MESSAGES[conversationId] || []
      setMessages(fallback)
    } finally {
      setLoading(false)
    }
  }, [conversationId, brandId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const sendMessage = useCallback(
    async (content: string, options: MessageSendOptions = {}) => {
      if (!conversationId || !brandId) return
      // Hard guard: reject if a send is already in flight
      if (submittingRef.current) return
      submittingRef.current = true
      setSending(true)
      setError(null)

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

      // 1. Optimistic Update: Add message immediately to the UI thread
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
      setMessages((prev) => [...prev, optimisticMsg])

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
          .select()
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

        // Replace optimistic message with actual persisted record
        if (insertedMsg) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? (insertedMsg as Message) : m)))
        }
      } catch (err) {
        console.error('[useMessages] sendMessage failed:', err)
        // Keep optimistic message in demo/offline mode
      } finally {
        submittingRef.current = false
        setSending(false)
      }
    },
    [conversationId, brandId],
  )

  return { messages, loading, error, sending, sendMessage, refresh: fetchMessages }
}
