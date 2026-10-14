import { useEffect, useRef, useState } from 'react'
import type { ConversationDetail } from '../../hooks/useConversationDetail'
import type { ConversationStatus, Message } from '../../types/database'
import type { MessageSendOptions } from '../../hooks/useMessages'
import { useBrand } from '../../context/BrandContext'
import { ReplyComposer } from '../reply/ReplyComposer'
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  MoreHorizontalIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '../icons'

interface MessageThreadProps {
  conversation: ConversationDetail | null
  messages: Message[]
  loading: boolean
  sending: boolean
  onSendMessage: (content: string, options?: MessageSendOptions) => Promise<void>
  onStatusChange?: (status: ConversationStatus) => Promise<void>
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatThreadDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
  } catch {
    return 'Recent'
  }
}

type TabType = 'conversation' | 'task' | 'activity' | 'notes'

export function MessageThread({
  conversation,
  messages,
  loading,
  sending,
  onSendMessage,
  onStatusChange,
}: MessageThreadProps) {
  const { selectedBrand } = useBrand()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('conversation')
  const [starred, setStarred] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white gap-3 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#f8fafc] border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
          <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800">Select a ticket to review</h3>
        <p className="text-xs text-slate-500 max-w-[360px] leading-relaxed">
          Pick a conversation from the left to view customer inquiries and send AI-assisted replies.
        </p>
      </div>
    )
  }

  const customerName = conversation.customers?.full_name ?? 'Customer'
  const ticketCode = `#TC-${conversation.id.slice(0, 4).toUpperCase()}`

  const handleQuickClose = async () => {
    if (onStatusChange) {
      await onStatusChange(conversation.status === 'closed' ? 'open' : 'closed')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white min-w-0">
      {/* 1. Ticket Action Header Bar: 16px horizontal, 12px vertical padding */}
      <div className="px-4 py-3 border-b border-[#eaecf0] bg-white flex items-center justify-between gap-3">
        {/* Left: Back & Pagination Chevrons & Ticket Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="h-9 px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Ticket List</span>
          </button>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Chevrons < > */}
          <div className="flex items-center text-slate-400 gap-1">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Ticket ID & Subject */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono tracking-tight flex-shrink-0">
              {ticketCode}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
              {conversation.subject || 'Customer Inquiry'}
            </span>
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 cursor-pointer flex-shrink-0"
              title="Favorite ticket"
            >
              <StarIcon className={`w-4 h-4 ${starred ? 'text-amber-500 fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right: More & Action Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <MoreHorizontalIcon className="w-4 h-4" />
          </button>

          {/* Action Button: min 36px height, 8px 12px padding */}
          <div className="relative">
            <button
              type="button"
              onClick={handleQuickClose}
              className="h-9 px-3.5 py-2 inline-flex items-center gap-2 bg-[#00a86b] hover:bg-[#00915c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <span>{conversation.status === 'closed' ? 'Reopen Ticket' : 'Submit as Closed'}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  setStatusMenuOpen(!statusMenuOpen)
                }}
                className="pl-1 border-l border-emerald-600 hover:text-emerald-100"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </span>
            </button>

            {statusMenuOpen && onStatusChange && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-1 text-xs">
                {(['open', 'pending', 'resolved', 'closed'] as ConversationStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onStatusChange(st)
                      setStatusMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 capitalize hover:bg-slate-50 rounded text-slate-700 cursor-pointer font-medium"
                  >
                    Mark as {st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-6 px-4 border-b border-[#eaecf0] bg-white text-xs font-medium text-slate-500">
        <button
          type="button"
          onClick={() => setActiveTab('conversation')}
          className={`py-3 transition-colors cursor-pointer relative ${
            activeTab === 'conversation'
              ? 'text-[#00a86b] font-semibold border-b-2 border-[#00a86b]'
              : 'hover:text-slate-800'
          }`}
        >
          Conversation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task')}
          className={`py-3 transition-colors cursor-pointer ${
            activeTab === 'task'
              ? 'text-[#00a86b] font-semibold border-b-2 border-[#00a86b]'
              : 'hover:text-slate-800'
          }`}
        >
          Task
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`py-3 transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'text-[#00a86b] font-semibold border-b-2 border-[#00a86b]'
              : 'hover:text-slate-800'
          }`}
        >
          Activity Logs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`py-3 transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'text-[#00a86b] font-semibold border-b-2 border-[#00a86b]'
              : 'hover:text-slate-800'
          }`}
        >
          Notes
        </button>
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white flex flex-col">
        {/* Date Separator with 16px vertical margin */}
        {messages.length > 0 && (
          <div className="flex items-center justify-center my-4">
            <span className="text-[11px] text-slate-400 font-medium bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
              {formatThreadDate(messages[0].created_at)}
            </span>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00a86b] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No messages in this ticket yet. Draft a reply below.
          </div>
        ) : (
          messages.map((m, idx) => {
            const prevMessage = idx > 0 ? messages[idx - 1] : null
            const senderSwitched = prevMessage && prevMessage.role !== m.role
            // Space between consecutive messages: 16px (24px when sender switches)
            const marginClass = idx === 0 ? '' : senderSwitched ? 'mt-6' : 'mt-4'

            const isAgent = m.role === 'agent'
            const isBot = m.role === 'bot'
            const initial = isAgent ? 'CX' : isBot ? 'AI' : customerName.slice(0, 1).toUpperCase()

            return (
              <div key={m.id} className={marginClass}>
                {/* 8px gap between avatar and bubble/content */}
                <div className="flex items-start gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5 shadow-2xs ${
                      isAgent
                        ? 'bg-[#1b2133]'
                        : isBot
                        ? 'bg-[#00a86b]'
                        : 'bg-[#5b4f8c]'
                    }`}
                  >
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-semibold text-slate-900">
                        {isAgent ? 'Support Agent' : isBot ? 'CX Assistant' : customerName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400 text-[11px]">{formatMessageTime(m.created_at)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#00a86b] font-medium bg-[#ecfdf5] px-1.5 py-0.5 rounded border border-[#a7f3d0]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b]" />
                        <span className="capitalize">{conversation.channel}</span>
                      </span>
                    </div>

                    {/* Message Bubble: 12px 16px padding inside bubbles */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isAgent
                          ? 'bg-[#f4f7fb] text-slate-800 border border-slate-200/80 rounded-tl-sm'
                          : isBot
                          ? 'bg-[#ecfdf5] text-slate-800 border border-[#a7f3d0] rounded-tl-sm'
                          : 'bg-[#f9fafb] text-slate-800 border border-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Sub-bubble badges */}
                    {isBot && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <SparklesIcon className="w-3 h-3 text-[#00a86b]" />
                        <span>Generated using verified brand policies</span>
                      </div>
                    )}
                    {isAgent && (() => {
                      const meta = m.metadata_json as Record<string, unknown> | null
                      const isDemo = meta?.is_demo_send === true
                      const draftType = meta?.draft_type as string | undefined
                      const wasEdited = meta?.was_edited === true
                      return (
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {isDemo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" /></svg>
                              Simulate Send — not delivered to customer
                            </span>
                          )}
                          {draftType === 'ai_accepted' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <SparklesIcon className="w-2.5 h-2.5" />
                              AI draft — approved as-is
                            </span>
                          )}
                          {draftType === 'ai_edited' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                              <SparklesIcon className="w-2.5 h-2.5" />
                              {wasEdited ? 'AI draft — edited before send' : 'AI draft — approved'}
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 4. AI-Assisted Composer */}
      <ReplyComposer
        onSend={onSendMessage}
        sending={sending}
        disabled={!conversation}
        channel={conversation.channel}
        conversationId={conversation.id}
        brandId={conversation.brand_id}
        brandName={selectedBrand?.name || 'Support'}
      />
    </div>
  )
}
