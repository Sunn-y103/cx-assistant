/**
 * ReplyComposer.tsx
 * Human-in-the-loop AI reply composer adhering to Part 1 specifications:
 * - Segmented Customer vs Agent behavior
 * - Customer mode: tinted background, "Sending as Customer: <name> (<brand>)", "Send as Customer" button,
 *   no AI controls, and "Message sent. Switch to Agent to reply." hint.
 * - Agent mode: "Replying as Agent (<brand>)", "Latest customer message" card, Generate Reply, editable draft,
 *   Regenerate, Approve & Send, separate manual Send, and "Knowledge used" panel with snippet details.
 * - Guardrail banners for needs_review or no_knowledge.
 * - Footer: "Messages stay inside this app. No WhatsApp or email is sent."
 */

import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import {
  SparklesIcon,
  RefreshCwIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../icons'
import { generateReply } from '../../services/ai'
import type { AiReplyResponse, AiGenerationSnippet } from '../../types/database'
import type { MessageSendOptions } from '../../hooks/useMessages'

interface ReplyComposerProps {
  mode: 'customer' | 'agent'
  onSwitchToAgent: () => void
  customerName: string
  brandName: string
  conversationId: string | null
  brandId: string | null
  disabled?: boolean
  sending?: boolean
  onSend: (content: string, options?: MessageSendOptions) => Promise<void>
}

export function ReplyComposer({
  mode,
  onSwitchToAgent,
  customerName = 'Customer',
  brandName = 'AquaHome',
  conversationId,
  disabled = false,
  sending = false,
  onSend,
}: ReplyComposerProps) {
  // Mode-specific input states
  const [customerText, setCustomerText] = useState('')
  const [customerSentHint, setCustomerSentHint] = useState(false)

  const [agentText, setAgentText] = useState('')
  const [aiDraft, setAiDraft] = useState<AiReplyResponse | null>(null)
  const [editableDraft, setEditableDraft] = useState('')
  const [originalDraft, setOriginalDraft] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [knowledgePanelOpen, setKnowledgePanelOpen] = useState(true)

  // Guard against duplicate sends
  const isSubmittingRef = useRef(false)

  // Reset hints and drafts when conversation changes
  useEffect(() => {
    setCustomerSentHint(false)
    setAiDraft(null)
    setEditableDraft('')
    setOriginalDraft('')
    setGenerationError(null)
  }, [conversationId])

  // ── Customer Mode Handlers ──────────────────────────────────────────────────
  const handleCustomerSend = async () => {
    if (!customerText.trim() || sending || isSubmittingRef.current || !conversationId) return
    isSubmittingRef.current = true
    try {
      await onSend(customerText.trim(), {
        sender_type: 'customer',
        role: 'customer',
        source: 'customer',
      })
      setCustomerText('')
      setCustomerSentHint(true)
    } finally {
      isSubmittingRef.current = false
    }
  }

  // ── Agent Mode Handlers ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!conversationId || isGenerating || sending) return
    setIsGenerating(true)
    setGenerationError(null)

    try {
      const response = await generateReply({ conversation_id: conversationId })
      setAiDraft(response)
      setEditableDraft(response.draft)
      setOriginalDraft(response.draft)
    } catch (err) {
      console.error('[ReplyComposer] Generation failed:', err)
      setGenerationError((err as Error).message || 'AI Reply generation failed or timed out. Please retry.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveAndSend = async () => {
    if (!aiDraft || !editableDraft.trim() || sending || isSubmittingRef.current) return
    isSubmittingRef.current = true
    try {
      const wasEdited = editableDraft !== originalDraft
      await onSend(editableDraft.trim(), {
        sender_type: 'agent',
        role: 'agent',
        source: 'ai_approved',
        generation_id: aiDraft.generation_id,
        edited_response: wasEdited ? editableDraft.trim() : null,
      })
      setAiDraft(null)
      setEditableDraft('')
      setOriginalDraft('')
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleManualSend = async () => {
    const textToSend = aiDraft ? editableDraft : agentText
    if (!textToSend.trim() || sending || isSubmittingRef.current) return
    isSubmittingRef.current = true
    try {
      await onSend(textToSend.trim(), {
        sender_type: 'agent',
        role: 'agent',
        source: 'manual',
      })
      setAgentText('')
      setAiDraft(null)
      setEditableDraft('')
    } finally {
      isSubmittingRef.current = false
    }
  }

  const handleDiscardDraft = () => {
    setAiDraft(null)
    setEditableDraft('')
    setOriginalDraft('')
    setGenerationError(null)
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CUSTOMER MODE RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === 'customer') {
    return (
      <div className="border-t border-[#e2e8f0] bg-[#f8f9ff] p-4 flex flex-col gap-3">
        {/* Inline hint after sending */}
        {customerSentHint && (
          <div className="flex items-center justify-between bg-violet-100/80 border border-violet-200 text-violet-900 px-3.5 py-2.5 rounded-lg text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-violet-700 flex-shrink-0" />
              <span>Message sent. Switch to Agent to reply.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomerSentHint(false)
                onSwitchToAgent()
              }}
              className="px-3 py-1 bg-violet-700 hover:bg-violet-800 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              Switch to Agent
            </button>
          </div>
        )}

        {/* Header label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
            <span className="text-xs font-bold text-violet-950">
              Sending as Customer: {customerName} ({brandName})
            </span>
          </div>
          <span className="text-[11px] text-violet-700/80 font-medium">Customer simulation</span>
        </div>

        {/* Textarea */}
        <textarea
          rows={3}
          value={customerText}
          onChange={(e) => setCustomerText(e.target.value)}
          placeholder={`Type as customer ${customerName}…`}
          disabled={disabled || sending}
          className="w-full p-3 bg-white border border-violet-200 focus:border-violet-500 rounded-lg text-xs sm:text-sm text-slate-900 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder-slate-400"
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleCustomerSend()
            }
          }}
        />

        {/* Action button & neutral note */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            Messages stay inside this app. No WhatsApp or email is sent.
          </p>
          <button
            type="button"
            onClick={handleCustomerSend}
            disabled={!customerText.trim() || sending || disabled}
            className="h-9 px-4 inline-flex items-center gap-1.5 bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Sending…</span>
              </>
            ) : (
              <span>Send as Customer</span>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // AGENT MODE RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  const hasAiDraft = Boolean(aiDraft)
  const isNoKnowledge = aiDraft?.status === 'no_knowledge'
  const isNeedsReview = aiDraft?.status === 'needs_review'
  const snippets: AiGenerationSnippet[] = aiDraft?.snippets || []

  return (
    <div className="border-t border-[#eaecf0] bg-white p-4 flex flex-col gap-3">
      {/* 1. Composer Header: Replying as Agent (<brand>) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00a86b]" />
          <span className="text-xs font-bold text-slate-900">
            Replying as Agent ({brandName})
          </span>
        </div>

        {/* Generate / Discard actions */}
        <div className="flex items-center gap-2">
          {hasAiDraft && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded cursor-pointer"
            >
              Discard Draft
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || sending || disabled || !conversationId}
            className="h-8 px-3 inline-flex items-center gap-1.5 bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#065f46] text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <SparklesIcon className={`w-3.5 h-3.5 text-[#00a86b] ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Reply…' : hasAiDraft ? 'Regenerate' : 'Generate Reply'}</span>
          </button>
        </div>
      </div>

      {/* 3. Error Banner with Retry */}
      {generationError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-start gap-2">
            <span className="font-bold">Error:</span>
            <span>{generationError}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex-shrink-0 cursor-pointer shadow-2xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Guardrail Banners: needs_review or no_knowledge */}
      {isNoKnowledge && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
          <span className="text-amber-600 font-bold">Notice:</span>
          <span>
            {aiDraft?.reason || 'No relevant policy found for this question. Please review or reply manually.'}
          </span>
        </div>
      )}

      {isNeedsReview && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
          <span className="text-amber-700 font-bold">Policy Warning:</span>
          <span className="font-medium">
            {aiDraft?.reason || 'Customer is outside the refund window. Verify policy rules before replying.'}
          </span>
        </div>
      )}

      {/* 5. "Knowledge used" Panel */}
      {snippets.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setKnowledgePanelOpen(!knowledgePanelOpen)}
            className="w-full px-3 py-2 bg-slate-100/80 hover:bg-slate-200/60 flex items-center justify-between text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-[#00a86b]" />
              Knowledge used ({snippets.length})
            </span>
            {knowledgePanelOpen ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
          </button>

          {knowledgePanelOpen && (
            <div className="p-3 flex flex-col gap-2 bg-white">
              {snippets.map((snip, idx) => (
                <div key={idx} className="p-2.5 rounded border border-slate-200/80 bg-[#fbfcfd] flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">{snip.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">
                      {snip.policy_type} · {snip.brand || brandName}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap">
                    {snip.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Editable Draft or Manual Composer */}
      {hasAiDraft ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            Editable AI Draft:
          </label>
          <textarea
            rows={5}
            value={editableDraft}
            onChange={(e) => setEditableDraft(e.target.value)}
            disabled={sending || disabled}
            className="w-full p-3 bg-white border border-[#00a86b]/40 focus:border-[#00a86b] rounded-lg text-xs sm:text-sm text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#00a86b] font-sans"
            placeholder="Edit draft before sending…"
          />
        </div>
      ) : (
        <textarea
          rows={3}
          value={agentText}
          onChange={(e) => setAgentText(e.target.value)}
          disabled={sending || disabled || isGenerating}
          placeholder={`Type a manual reply to ${customerName}…`}
          className="w-full p-3 bg-white border border-[#e5e7eb] focus:border-[#00a86b] rounded-lg text-xs sm:text-sm text-slate-900 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#00a86b] placeholder-slate-400"
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleManualSend()
            }
          }}
        />
      )}

      {/* 7. Footer: Buttons & Neutral Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-slate-500">
          Messages stay inside this app. No WhatsApp or email is sent.
        </p>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasAiDraft ? (
            <>
              {/* Separate manual send button */}
              <button
                type="button"
                onClick={handleManualSend}
                disabled={!editableDraft.trim() || sending}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Manual Send
              </button>

              {/* Approve & Send button */}
              <button
                type="button"
                onClick={handleApproveAndSend}
                disabled={!editableDraft.trim() || sending}
                className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#00a86b] hover:bg-[#00915c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Approve & Send</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleManualSend}
              disabled={!agentText.trim() || sending || isGenerating}
              className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#1b2133] hover:bg-[#111624] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending…</span>
                </>
              ) : (
                <span>Send</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
