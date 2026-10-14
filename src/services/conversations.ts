/**
 * conversations.ts
 * Service layer for Conversation and Message records.
 * All queries are scoped to the caller's accessible brands via RLS.
 */

import { supabase } from '../lib/supabase'
import type { Conversation, ConversationWithDetails, Message } from '../types/database'

// ── Conversations ─────────────────────────────────────────────

/** Fetch all conversations for a specific brand, newest first. */
export async function getConversations(brandId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('brand_id', brandId)
    .order('last_message_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Fetch a single conversation with joined customer, order, and assignee. */
export async function getConversationWithDetails(
  id: string,
): Promise<ConversationWithDetails | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      customers (*),
      orders (*),
      profiles (id, full_name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ConversationWithDetails | null
}

/** Update the status or assigned agent of a conversation. */
export async function updateConversation(
  id: string,
  patch: Partial<Pick<Conversation, 'status' | 'assigned_to'>>,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update(patch)
    .eq('id', id)

  if (error) throw error
}

// ── Messages ──────────────────────────────────────────────────

/** Fetch all messages for a conversation, chronological order. */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Send an agent message to a conversation. */
export async function sendAgentMessage(
  conversationId: string,
  brandId: string,
  content: string,
  authorId: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      brand_id:        brandId,
      role:            'agent',
      author_id:       authorId,
      content,
    })
    .select()
    .single()

  if (error) throw error
  return data as Message
}
