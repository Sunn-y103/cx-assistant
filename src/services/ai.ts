/**
 * ai.ts
 * Client-side service that calls the Supabase Edge Function `generate-reply`.
 * The Edge Function handles LLM calls, brand authorization, policy retrieval,
 * and audit logging server-side.
 */

import { supabase, isConfigured } from '../lib/supabase'
import type { AiReplyLog, AiReplyRequest, AiReplyResponse } from '../types/database'
import { MOCK_POLICIES } from '../lib/mockData'

/** Request an AI-generated reply draft for a conversation. */
export async function generateReply(
  request: AiReplyRequest,
): Promise<AiReplyResponse> {
  if (!isConfigured) {
    // Grounded client-side fallback for development/demo mode without deployed Edge Functions
    const brandPolicies = MOCK_POLICIES.filter((p) => p.brand_id === request.brand_id && p.is_active)
    const policy = brandPolicies[0]
    const sources = policy ? [policy.title] : ['General Brand Guidelines']
    const draft = policy
      ? `Hi,\n\nThank you for reaching out to us. Regarding your inquiry, our policy on ${policy.title} states:\n\n${policy.content}\n\nPlease let us know if you need any further assistance!`
      : 'Hi,\n\nThank you for contacting support. We have received your inquiry and our team is currently looking into your request. We will follow up with you shortly.'

    return {
      log_id: 'mock-log-' + Math.random().toString(36).slice(2, 9),
      draft,
      model: 'grounded-demo-fallback',
      sources,
      requires_human_verification: false,
      verification_reason: null,
      confidence_score: 0.9,
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke<AiReplyResponse>(
      'generate-reply',
      { body: request },
    )

    if (error) {
      console.warn('[ai.ts] Edge function invoke returned error, checking response:', error)
      throw error
    }
    if (!data) throw new Error('Empty response from generate-reply function')

    return data
  } catch (err) {
    console.error('[ai.ts] generateReply error:', err)
    // If Edge function is not deployed yet on this remote Supabase project, provide safe fallback
    const brandPolicies = MOCK_POLICIES.filter((p) => p.brand_id === request.brand_id && p.is_active)
    const policy = brandPolicies[0]
    const sources = policy ? [policy.title] : ['General Brand Guidelines']

    return {
      log_id: 'fallback-log-' + Math.random().toString(36).slice(2, 9),
      draft: policy
        ? `Hi,\n\nThank you for contacting us. According to our ${policy.title}:\n\n${policy.content}\n\nPlease let us know if you have any additional questions!`
        : 'Hi,\n\nThank you for contacting our customer support team. We have received your inquiry and an agent is currently reviewing your account details.',
      model: 'local-fallback (Edge Function not deployed)',
      sources,
      requires_human_verification: true,
      verification_reason: `Edge function call failed: ${(err as Error).message}. Verify edge function deployment and OpenRouter secret.`,
      confidence_score: 0.7,
    }
  }
}

/**
 * Update the status of an AI reply log (e.g. agent accepts or rejects a draft).
 * Called after the agent acts on the generated draft.
 */
export async function updateAiReplyStatus(
  logId: string,
  status: AiReplyLog['status'],
): Promise<void> {
  if (!isConfigured || logId.startsWith('mock-') || logId.startsWith('fallback-')) {
    return
  }

  try {
    const { error } = await supabase
      .from('ai_reply_logs')
      .update({ status })
      .eq('id', logId)

    if (error) console.warn('[ai.ts] Failed to update ai_reply_logs status:', error)
  } catch (err) {
    console.warn('[ai.ts] updateAiReplyStatus error:', err)
  }
}

/** Fetch the AI reply log history for a conversation. */
export async function getAiReplyLogs(conversationId: string): Promise<AiReplyLog[]> {
  if (!isConfigured) return []

  try {
    const { data, error } = await supabase
      .from('ai_reply_logs')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  } catch (err) {
    console.warn('[ai.ts] getAiReplyLogs error:', err)
    return []
  }
}
