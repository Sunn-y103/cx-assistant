/**
 * ReplyComposer.tsx
 * Phase 6 — Human-in-the-loop AI reply workflow.
 *
 * State machine:
 *   idle         → agent types freely or clicks "Generate AI Reply"
 *   generating   → edge function / fallback in flight
 *   reviewing    → AI draft returned; agent reads it, inspects policy sources
 *   editing      → agent clicked "Edit Draft"; textarea is now live
 *   confirming   → agent clicked "Approve & Simulate Send"; confirmation banner shown
 *   sent         → message saved; transient success banner, then resets to idle
 *
 * Rules enforced:
 *  - Brand + conversation must be set before generation or sending.
 *  - Duplicate submissions are blocked by a boolean ref (submittingRef).
 *  - "Simulate Send" label is always visible; it never implies real delivery.
 *  - AI log status (accepted / rejected / sent) is updated server-side.
 *  - metadata_json on the saved message carries draft_type, ai_log_id, was_edited, is_demo_send.
 */

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  EditIcon,
} from '../icons'
import { generateReply, updateAiReplyStatus } from '../../services/ai'
import type { AiReplyResponse } from '../../types/database'
import type { MessageSendOptions } from '../../hooks/useMessages'

// ── Types ────────────────────────────────────────────────────────────────────

type ComposerState =
  | 'idle'
  | 'generating'
  | 'reviewing'
  | 'editing'
  | 'confirming'
  | 'sent'

interface ReplyComposerProps {
  onSend: (content: string, options?: MessageSendOptions) => Promise<void>
  disabled?: boolean
  sending?: boolean
  placeholder?: string
  brandName?: string
  channel?: string
  conversationId?: string | null
  brandId?: string | null
}

// ── Helper ───────────────────────────────────────────────────────────────────

function ConfidenceDots({ score }: { score?: number }) {
  const pct = Math.round((score ?? 0) * 100)
  const color =
    pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
      <span className="font-medium">{pct}% conf.</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`w-1.5 h-1.5 rounded-full ${n <= Math.ceil((score ?? 0) * 5) ? color : 'bg-slate-200'}`}
          />
        ))}
      </span>
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReplyComposer({
  onSend,
  disabled = false,
  sending = false,
  placeholder = 'Type your response…',
  brandName = 'Support',
  channel = 'Chat',
  conversationId = null,
  brandId = null,
}: ReplyComposerProps) {
  // State machine
  const [composerState, setComposerState] = useState<ComposerState>('idle')

  // Free-compose textarea (idle / manual mode)
  const [manualContent, setManualContent] = useState('')

  // AI draft returned from edge function / fallback
  const [aiDraft, setAiDraft] = useState<AiReplyResponse | null>(null)

  // Editable copy of the AI draft (editing state)
  const [editedDraft, setEditedDraft] = useState('')
  const [originalDraft, setOriginalDraft] = useState('')

  // Error banners
  const [sendError, setSendError] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  // More-options dropdown (idle state)
  const [showMenu, setShowMenu] = useState(false)

  // Duplicate-send guard
  const submittingRef = useRef(false)

  // ── Derived ──────────────────────────────────────────────────────────────

  const canGenerate = Boolean(conversationId && brandId && !disabled)
  const isGenerating = composerState === 'generating'
  const isReviewing = composerState === 'reviewing'
  const isEditing = composerState === 'editing'
  const isConfirming = composerState === 'confirming'
  const isSent = composerState === 'sent'

  const wasEdited = isEditing && editedDraft !== originalDraft

  // ── AI Generation ─────────────────────────────────────────────────────────

  const handleGenerate = async (action: 'suggest' | 'regenerate' = 'suggest') => {
    if (!canGenerate || isGenerating) return

    // Verify brand/conversation are set
    if (!conversationId || !brandId) {
      setAiError('No conversation or brand selected. Please select a conversation first.')
      return
    }

    setComposerState('generating')
    setAiError(null)
    setAiDraft(null)

    try {
      const response = await generateReply({
        conversation_id: conversationId,
        brand_id: brandId,
        action,
      })
      setAiDraft(response)
      setOriginalDraft(response.draft)
      setEditedDraft(response.draft)
      setComposerState('reviewing')
    } catch (err) {
      setAiError((err as Error).message || 'Failed to generate AI reply. Please try again.')
      setComposerState('idle')
    }
  }

  // ── Draft lifecycle ────────────────────────────────────────────────────────

  const handleStartEditing = () => {
    if (!aiDraft) return
    setEditedDraft(aiDraft.draft)
    setOriginalDraft(aiDraft.draft)
    setComposerState('editing')
  }

  const handleApprove = () => {
    if (!aiDraft) return
    // Move to confirmation step
    setComposerState('confirming')
  }

  const handleCancelConfirm = () => {
    setComposerState(isEditing ? 'editing' : 'reviewing')
  }

  const handleDiscard = async () => {
    if (aiDraft?.log_id) {
      await updateAiReplyStatus(aiDraft.log_id, 'rejected').catch(() => {})
    }
    setAiDraft(null)
    setEditedDraft('')
    setOriginalDraft('')
    setComposerState('idle')
    setAiError(null)
  }

  // ── Simulate Send (confirmation step) ────────────────────────────────────

  const handleSimulateSend = async () => {
    if (!aiDraft) return
    if (submittingRef.current) return // hard duplicate guard
    submittingRef.current = true

    const content = isEditing ? editedDraft.trim() : aiDraft.draft.trim()
    if (!content) {
      submittingRef.current = false
      return
    }

    setSendError(null)

    const draftType: MessageSendOptions['draft_type'] = wasEdited ? 'ai_edited' : 'ai_accepted'
    const options: MessageSendOptions = {
      draft_type: draftType,
      ai_log_id: aiDraft.log_id,
      was_edited: wasEdited,
      is_demo_send: true,
    }

    try {
      // Record acceptance in audit log first (non-blocking failure allowed)
      await updateAiReplyStatus(aiDraft.log_id, 'accepted').catch(() => {})
      // Save message to Supabase (or local fallback)
      await onSend(content, options)
      // Transient success
      setComposerState('sent')
      // Reset after 2.5 s
      setTimeout(() => {
        setAiDraft(null)
        setEditedDraft('')
        setOriginalDraft('')
        setComposerState('idle')
      }, 2500)
    } catch (e) {
      setSendError((e as Error).message || 'Failed to save message. Please try again.')
      setComposerState('confirming')
    } finally {
      submittingRef.current = false
    }
  }

  // ── Manual send (idle mode) ───────────────────────────────────────────────

  const handleManualSend = async () => {
    const trimmed = manualContent.trim()
    if (!trimmed || sending || disabled) return
    if (submittingRef.current) return
    submittingRef.current = true

    setSendError(null)
    try {
      await onSend(trimmed, { draft_type: 'manual', is_demo_send: true })
      setManualContent('')
    } catch (e) {
      setSendError((e as Error).message || 'Failed to send message')
    } finally {
      submittingRef.current = false
    }
  }

  const handleManualKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleManualSend()
    }
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleApprove()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border-t border-[#eaecf0] flex flex-col select-none">

      {/* ── Toolbar row ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3 text-xs text-slate-600">
        {/* Left: channel / from selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] px-2.5 py-1.5 rounded-lg shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]" />
            <span className="font-semibold text-slate-700 capitalize text-[11px]">Via {channel}</span>
            <ChevronDownIcon className="w-3 h-3 text-slate-400" />
          </div>
          <div className="h-8 flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] px-2.5 py-1.5 rounded-lg shadow-2xs">
            <span className="text-slate-400 font-normal text-[11px]">From</span>
            <span className="font-semibold text-slate-700 truncate max-w-[120px] text-[11px]">{brandName} Support</span>
            <ChevronDownIcon className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Right: Generate AI Reply — only in idle mode */}
        {composerState === 'idle' && canGenerate && (
          <button
            type="button"
            id="generate-ai-reply-btn"
            onClick={() => handleGenerate('suggest')}
            disabled={disabled}
            className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-white border border-[#bae0fd] hover:bg-[#f0f9ff] text-[#0369a1] shadow-2xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            title="Generate an AI reply grounded in brand policies"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-[#0284c7]" />
            Generate AI Reply
          </button>
        )}

        {/* Generating spinner in toolbar */}
        {isGenerating && (
          <span className="h-8 px-3 rounded-lg text-[11px] font-semibold text-[#0369a1] border border-[#bae0fd] bg-[#f0f9ff] flex items-center gap-1.5 flex-shrink-0">
            <RefreshCwIcon className="w-3.5 h-3.5 animate-spin text-[#0284c7]" />
            Generating reply…
          </span>
        )}
      </div>

      {/* ── Error banners ────────────────────────────────────────────────── */}
      {(sendError || aiError) && (
        <div className="mx-4 mb-2">
          {sendError && (
            <div className="flex items-start justify-between text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-lg gap-2">
              <div className="flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-medium leading-relaxed">{sendError}</span>
              </div>
              <button onClick={() => setSendError(null)} className="text-rose-500 hover:text-rose-800 font-bold flex-shrink-0 mt-0.5 cursor-pointer">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {aiError && (
            <div className={`flex items-start justify-between text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg gap-2 ${sendError ? 'mt-2' : ''}`}>
              <div className="flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span className="font-medium leading-relaxed">{aiError}</span>
              </div>
              <button onClick={() => setAiError(null)} className="text-amber-700 hover:text-amber-900 font-bold flex-shrink-0 mt-0.5 cursor-pointer">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Sent success banner ──────────────────────────────────────────── */}
      {isSent && (
        <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-emerald-700 bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-2.5 rounded-lg">
          <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">Demo reply saved successfully.</span>
          <span className="text-emerald-600 font-normal">No real message was delivered to the customer.</span>
        </div>
      )}

      {/* ── AI Draft panel (reviewing / editing / confirming) ────────────── */}
      {(isReviewing || isEditing || isConfirming) && aiDraft && (
        <div className="mx-4 mb-3">
          <div className="bg-[#f8faff] border border-[#c7deff] rounded-xl overflow-hidden shadow-sm">

            {/* Panel header */}
            <div className="px-3.5 py-2.5 border-b border-[#d8eaff] bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8]">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {isEditing ? 'Editing AI Draft' : 'AI Suggested Reply'}
                </span>
                {aiDraft.model && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    {aiDraft.model}
                  </span>
                )}
                <ConfidenceDots score={aiDraft.confidence_score} />
              </div>

              {/* Policy sources */}
              {aiDraft.sources && aiDraft.sources.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Policy basis:</span>
                  {aiDraft.sources.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-[#bae0fd] text-[#0369a1] max-w-[180px] truncate"
                      title={src}
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Verification warning */}
            {aiDraft.requires_human_verification && (
              <div className="px-3.5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2 text-xs text-amber-800">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856C18.337 19 19 18.213 19 17.5L12.5 4C11.863 2.667 10.137 2.667 9.5 4L3 17.5c0 .713.663 1.5 2.062 1.5z" />
                </svg>
                <div>
                  <span className="font-bold">Human Verification Required — </span>
                  <span className="leading-relaxed">
                    {aiDraft.verification_reason || 'This draft may contain information that requires agent review. Do not promise exceptions without verifying.'}
                  </span>
                </div>
              </div>
            )}

            {/* Draft content — display (reviewing / confirming) or editable (editing) */}
            <div className="p-3.5">
              {isEditing ? (
                <textarea
                  id="ai-draft-edit-textarea"
                  rows={6}
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  className="w-full p-3 bg-white border border-[#c7deff] focus:border-[#3b82f6] rounded-lg text-xs sm:text-sm text-slate-900 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-sans"
                  placeholder="Edit the AI draft…"
                />
              ) : (
                <div className="p-3 bg-white border border-[#ddeeff] rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {aiDraft.draft}
                </div>
              )}

              {/* Edited indicator */}
              {isEditing && wasEdited && (
                <p className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                  <EditIcon className="w-3 h-3" />
                  Draft has been edited from the AI original
                </p>
              )}
            </div>

            {/* ── Confirm step banner ── */}
            {isConfirming && (
              <div className="px-3.5 py-3 bg-[#f0f9ff] border-t border-[#bae0fd] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-slate-700">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-slate-800">Ready to simulate send?</p>
                    <p className="text-slate-500 mt-0.5 leading-relaxed">
                      This will save the reply as a demo message.{' '}
                      <span className="font-medium text-amber-700">No real message will be delivered to the customer.</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelConfirm}
                    className="h-8 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-lg cursor-pointer transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    id="simulate-send-btn"
                    onClick={handleSimulateSend}
                    disabled={sending}
                    className="h-8 px-4 text-xs font-semibold text-white bg-[#1d6fbe] hover:bg-[#1558a0] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {sending ? (
                      <>
                        <RefreshCwIcon className="w-3 h-3 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-3.5 h-3.5" />
                        Simulate Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Action bar (reviewing / editing) ── */}
            {(isReviewing || isEditing) && (
              <div className="px-3.5 py-2.5 border-t border-[#d8eaff] bg-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Approve → confirm */}
                  <button
                    type="button"
                    id="approve-ai-draft-btn"
                    onClick={handleApprove}
                    disabled={isEditing && !editedDraft.trim()}
                    className="h-8 px-3.5 text-xs font-semibold text-white bg-[#1d6fbe] hover:bg-[#1558a0] rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    {isEditing ? 'Approve Edited Draft' : 'Approve Draft'}
                  </button>

                  {/* Edit (only in reviewing) */}
                  {isReviewing && (
                    <button
                      type="button"
                      id="edit-ai-draft-btn"
                      onClick={handleStartEditing}
                      className="h-8 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      Edit Draft
                    </button>
                  )}

                  {/* Regenerate */}
                  <button
                    type="button"
                    id="regenerate-ai-draft-btn"
                    disabled={isGenerating}
                    onClick={() => handleGenerate('regenerate')}
                    className="h-8 px-3 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCwIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-[#0284c7]' : ''}`} />
                    Regenerate
                  </button>
                </div>

                {/* Discard */}
                <button
                  type="button"
                  id="discard-ai-draft-btn"
                  onClick={handleDiscard}
                  className="h-8 px-3 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  Discard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Manual compose box (idle only) ──────────────────────────────── */}
      {composerState === 'idle' && (
        <div className="px-4 pb-4">
          <div className="relative rounded-xl border border-slate-200 bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
            {/* Badge row */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] text-[10px] font-semibold">
                <SparklesIcon className="w-3 h-3 text-[#00a86b]" />
                AI CX Assistant Ready
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Ctrl+Enter to send</span>
            </div>

            <textarea
              id="manual-compose-textarea"
              rows={4}
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              onKeyDown={handleManualKeyDown}
              disabled={disabled || sending}
              placeholder={placeholder}
              className="w-full px-3.5 py-2 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-400 leading-relaxed resize-none focus:outline-none disabled:opacity-50"
            />

            {/* Bottom action bar */}
            <div className="flex items-center justify-between px-3.5 pb-3 pt-1 border-t border-slate-100">
              {/* Quick utilities */}
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Bold"
                >
                  <span className="font-serif font-bold text-xs">B</span>
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Attach"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Add macro"
                >
                  <span className="text-sm font-semibold">+</span>
                </button>
              </div>

              {/* Send split button */}
              <div className="relative">
                <div className="inline-flex rounded-lg shadow-xs overflow-hidden">
                  <button
                    type="button"
                    id="manual-send-btn"
                    onClick={handleManualSend}
                    disabled={disabled || sending || !manualContent.trim()}
                    className="h-8 inline-flex items-center gap-1.5 px-4 bg-[#111827] hover:bg-[#1f2937] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-l-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <RefreshCwIcon className="w-3 h-3 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Simulate Send'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className="h-8 px-2 bg-[#111827] hover:bg-[#1f2937] text-slate-300 border-l border-slate-700 rounded-r-lg cursor-pointer flex items-center justify-center"
                    title="More options"
                  >
                    {showMenu ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                  </button>
                </div>

                {showMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2 text-xs flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-[0.06em] font-bold text-slate-400 px-3 py-1">
                      Draft Utility
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(manualContent).catch(() => {})
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer font-medium"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualContent('')
                        setShowMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-rose-600 cursor-pointer font-medium"
                    >
                      Discard Draft
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Demo send notice — always visible below the composer */}
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            ⚠ Simulate Send saves a demo message only — no real message is delivered to the customer.
          </p>
        </div>
      )}

      {/* ── Generating state placeholder ─────────────────────────────────── */}
      {isGenerating && (
        <div className="mx-4 mb-4 p-4 bg-[#f8faff] border border-[#c7deff] rounded-xl flex items-center justify-center gap-3 text-xs text-[#0369a1]">
          <RefreshCwIcon className="w-5 h-5 animate-spin text-[#0284c7]" />
          <div>
            <p className="font-semibold">Generating AI reply…</p>
            <p className="text-slate-400 mt-0.5">Retrieving brand policies and composing a grounded draft.</p>
          </div>
        </div>
      )}
    </div>
  )
}
