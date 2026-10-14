import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Message, MessageMetadata } from '../types/database'
import { MOCK_MESSAGES } from '../lib/mockData'

/** Extra metadata callers can attach to a sent agent message. */
export interface MessageSendOptions {
  /** draft_type distinguishes how the message was composed */
  draft_type?: 'manual' | 'ai_accepted' | 'ai_edited'
  /** The ai_reply_logs.id that produced the draft, if any */
  ai_log_id?: string
  /** Whether the agent edited the AI draft before sending */
  was_edited?: boolean
  /** Mark as a simulated demo send (never a real customer delivery) */
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

      const extra: MessageMetadata = {
        ...(options.draft_type ? { draft_type: options.draft_type } : {}),
        ...(options.ai_log_id ? { ai_log_id: options.ai_log_id } : {}),
        ...(options.was_edited !== undefined ? { was_edited: options.was_edited } : {}),
        ...(options.is_demo_send ? { is_demo_send: true } : {}),
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { error: insertErr } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          brand_id: brandId,
          role: 'agent',
          author_id: user?.id ?? null,
          content,
          metadata_json: extra,
        })
        if (insertErr) throw insertErr

        // Keep last_message_at current so the conversation list sorts correctly
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId)

        await fetchMessages()
      } catch {
        // In offline/demo mode, append to local message list
        const newMsg: Message = {
          id: `local-${Date.now()}`,
          conversation_id: conversationId,
          brand_id: brandId,
          role: 'agent',
          author_id: null,
          content,
          metadata_json: extra,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, newMsg])
      } finally {
        submittingRef.current = false
        setSending(false)
      }
    },
    [conversationId, brandId, fetchMessages],
  )

  return { messages, loading, error, sending, sendMessage, refresh: fetchMessages }
}
