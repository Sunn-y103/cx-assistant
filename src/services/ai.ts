/**
 * ai.ts
 * Client-side service that calls the Supabase Edge Function `generate-reply`.
 * The Edge Function handles LLM calls, brand authorization, policy retrieval,
 * guardrail enforcement, and audit logging server-side.
 */

import { supabase, isConfigured } from '../lib/supabase'
import type {
  AiGeneration,
  AiReplyLog,
  AiReplyRequest,
  AiReplyResponse,
} from '../types/database'
import { MOCK_POLICIES } from '../lib/mockData'

/** Request an AI-generated reply draft for a conversation. */
export async function generateReply(
  request: AiReplyRequest,
): Promise<AiReplyResponse> {
  if (!isConfigured) {
    // Grounded client-side fallback for demo mode without deployed Edge Functions
    const brandPolicies = MOCK_POLICIES.filter((p) => p.brand_id === request.brand_id && p.is_active)
    const policy = brandPolicies[0]
    const snippets = policy
      ? [
          {
            id: policy.id,
            title: policy.title,
            policy_type: policy.category,
            category: policy.category,
            brand: 'AquaHome',
            content: policy.content,
          },
        ]
      : []

    const draft = policy
      ? `Hi,\n\nThank you for reaching out to us. Regarding your inquiry, our policy on ${policy.title} states:\n\n${policy.content}\n\nPlease let us know if you need any further assistance!`
      : ''

    return {
      generation_id: 'mock-gen-' + Math.random().toString(36).slice(2, 9),
      draft,
      snippets,
      status: policy ? 'ok' : 'no_knowledge',
      reason: policy ? null : 'No relevant policy found for this question. Please review or reply manually.',
    }
  }

  try {
    // Edge function input: conversation ID only
    const { data, error } = await supabase.functions.invoke<AiReplyResponse>(
      'generate-reply',
      { body: { conversation_id: request.conversation_id } },
    )

    if (error) {
      console.warn('[ai.ts] Edge function invoke returned error:', error)
      throw error
    }
    if (!data) throw new Error('Empty response from generate-reply function')

    return data
  } catch (err) {
    console.error('[ai.ts] generateReply error:', err)
    throw err
  }
}

/**
 * Approve an AI generation and record the edited and final responses.
 */
export async function approveAiGeneration({
  generationId,
  editedResponse,
  finalResponse,
  finalMessageId,
  userId,
}: {
  generationId: string
  editedResponse?: string | null
  finalResponse: string
  finalMessageId?: string | null
  userId?: string | null
}): Promise<void> {
  if (!isConfigured || generationId.startsWith('mock-') || generationId.startsWith('fallback-')) {
    return
  }

  try {
    const { error } = await supabase
      .from('ai_generations')
      .update({
        status: 'approved',
        edited_response: editedResponse ?? null,
        final_response: finalResponse,
        final_message_id: finalMessageId ?? null,
        approved_by: userId ?? null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', generationId)

    if (error) console.warn('[ai.ts] Failed to update ai_generations approval:', error)
  } catch (err) {
    console.warn('[ai.ts] approveAiGeneration error:', err)
  }
}

/** Fetch the generations for a conversation from the ai_generations table. */
export async function getAiGenerations(conversationId: string): Promise<AiGeneration[]> {
  if (!isConfigured) return []

  try {
    const { data, error } = await supabase
      .from('ai_generations')
      .select('id, conversation_id, brand_id, customer_message, retrieved_context, ai_response, status, reason, model, latency_ms, edited_response, final_response, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return (data as AiGeneration[]) ?? []
  } catch (err) {
    console.warn('[ai.ts] getAiGenerations error:', err)
    return []
  }
}

/** Compatibility update for ai_reply_logs */
export async function updateAiReplyStatus(
  logId: string,
  status: AiReplyLog['status'],
): Promise<void> {
  if (!isConfigured || logId.startsWith('mock-') || logId.startsWith('fallback-')) {
    return
  }
  try {
    await supabase.from('ai_reply_logs').update({ status }).eq('id', logId)
  } catch (err) {
    console.warn('[ai.ts] updateAiReplyStatus error:', err)
  }
}
