import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ConversationDetail } from '../../hooks/useConversationDetail'
import type { ConversationStatus, Message, AiGeneration, OrderLineItem, OrderStatus } from '../../types/database'
import type { MessageSendOptions } from '../../hooks/useMessages'
import { useBrand } from '../../context/BrandContext'
import { ReplyComposer } from '../reply/ReplyComposer'
import { getAiGenerations } from '../../services/ai'
import {
  ChevronDownIcon,
  SparklesIcon,
} from '../icons'

function getOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'shipped':
    case 'delivered':
      return 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
    case 'processing':
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'cancelled':
    case 'refunded':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

interface MessageThreadProps {
  conversation: ConversationDetail | null
  messages: Message[]
  loading: boolean
  sending: boolean
  onSendMessage: (content: string, options?: MessageSendOptions) => Promise<void>
  onStatusChange?: (status: ConversationStatus) => Promise<void>
  mode?: 'customer' | 'agent'
  onModeChange?: (mode: 'customer' | 'agent') => void
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

function formatMsgTimestamp(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString()
  } catch {
    return ''
  }
}

type TabType = 'conversation' | 'activity'

export function MessageThread({
  conversation,
  messages,
  loading,
  sending,
  onSendMessage,
  onStatusChange,
  mode: propMode,
  onModeChange: propOnModeChange,
}: MessageThreadProps) {
  const navigate = useNavigate()
  const { selectedBrand } = useBrand()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabType>('conversation')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  // Segmented toggle mode: default is Agent
  const [localMode, setLocalMode] = useState<'customer' | 'agent'>('agent')
  const mode = propMode ?? localMode
  const handleModeChange = (m: 'customer' | 'agent') => {
    if (propOnModeChange) propOnModeChange(m)
    else setLocalMode(m)
  }

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<AiGeneration[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const fetchActivityLogs = async () => {
    if (!conversation) return
    setLogsLoading(true)
    try {
      const logs = await getAiGenerations(conversation.id)
      setActivityLogs(logs)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'activity' && conversation) {
      fetchActivityLogs()
    }
  }, [activeTab, conversation?.id])

  useEffect(() => {
    if (activeTab === 'conversation') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, sending, activeTab])

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

  const customerName = conversation.customers?.full_name || 'Customer'
  const brandName = conversation.brands?.name || selectedBrand?.name || 'AquaHome'
  const ticketCode = `#TC-${conversation.id.slice(0, 4).toUpperCase()}`

  const order = conversation.orders
  const orderItemsSummary = order?.items_json && Array.isArray(order.items_json)
    ? (order.items_json as OrderLineItem[])
        .map((item) => item.name || item.sku)
        .filter(Boolean)
        .join(', ')
    : ''

  const handleQuickClose = async () => {
    if (onStatusChange) {
      await onStatusChange(conversation.status === 'closed' ? 'open' : 'closed')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white min-w-0">
      {/* 1. Ticket Action Header Bar: ticket number & info on left, remaining controls on right, 12px gap, 12px 16px padding */}
      <div className="px-4 py-3 border-b border-[#eaecf0] bg-white flex items-center justify-between gap-3 min-w-0">
        {/* Left: Ticket number, customer name, brand name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono tracking-tight flex-shrink-0">
            {ticketCode}
          </span>
          <span className="text-slate-300">·</span>
          <button
            type="button"
            onClick={() => {
              if (conversation.customer_id) {
                navigate(`/customers?id=${conversation.customer_id}`)
              }
            }}
            className="text-xs font-semibold text-slate-800 hover:text-[#00a86b] hover:underline truncate text-left cursor-pointer transition-colors"
            title={`View customer details for ${customerName}`}
          >
            {customerName}
          </button>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 truncate flex-shrink-0">
            {brandName}
          </span>
        </div>

        {/* Right: Remaining controls (Customer/Agent toggle and Submit as Closed button) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Segmented Toggle (Customer | Agent) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              id="toggle-mode-customer"
              onClick={() => handleModeChange('customer')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                mode === 'customer'
                  ? 'bg-violet-700 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              id="toggle-mode-agent"
              onClick={() => handleModeChange('agent')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                mode === 'agent'
                  ? 'bg-[#00a86b] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent
            </button>
          </div>

          {/* Submit as Closed Button */}
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

      {/* 2. Compact Order Info Bar (visible at all breakpoints, wraps cleanly) */}
      {order && (
        <div className="px-4 py-2 bg-[#f8fafc] border-b border-[#eaecf0] text-xs flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Order:</span>
            <span className="font-mono font-bold text-slate-900">{order.order_number}</span>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase flex-shrink-0 ${getOrderStatusBadge(
              order.status
            )}`}
          >
            {order.status}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[11px] text-slate-400">Delivered:</span>
            <span className="font-medium text-slate-700">
              {order.delivery_date
                ? new Date(order.delivery_date).toLocaleDateString()
                : order.status === 'delivered'
                ? 'Delivered'
                : 'Not delivered'}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[11px] text-slate-400">Total:</span>
            <span className="font-mono font-semibold text-slate-900">
              {order.currency || 'USD'} {Number(order.total_amount).toFixed(2)}
            </span>
          </div>

          {orderItemsSummary && (
            <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
              <span className="text-[11px] text-slate-400 flex-shrink-0">Items:</span>
              <span className="text-slate-700 truncate font-medium" title={orderItemsSummary}>
                {orderItemsSummary}
              </span>
            </div>
          )}
        </div>
      )}

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
          onClick={() => setActiveTab('activity')}
          className={`py-3 transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'text-[#00a86b] font-semibold border-b-2 border-[#00a86b]'
              : 'hover:text-slate-800'
          }`}
        >
          Activity Logs
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'activity' ? (
        /* Activity Logs View from ai_generations table */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              AI Generation Audit History ({activityLogs.length})
            </h3>
          </div>

          {logsLoading && activityLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading activity logs…</div>
          ) : activityLogs.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-400">
              No AI reply generations recorded for this conversation yet.
            </div>
          ) : (
            activityLogs.map((log) => (
              <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.status === 'ok' || log.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.status === 'needs_review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatMsgTimestamp(log.created_at)}
                    </span>
                    {log.latency_ms && (
                      <span className="text-[10px] text-slate-400">
                        {log.latency_ms}ms
                      </span>
                    )}
                  </div>
                  {log.model && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {log.model}
                    </span>
                  )}
                </div>

                {/* Customer trigger message */}
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    Customer Message
                  </span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {log.customer_message}
                  </p>
                </div>

                {/* Retrieved Knowledge */}
                {log.retrieved_context && log.retrieved_context.length > 0 && (
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Retrieved Knowledge ({log.retrieved_context.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {log.retrieved_context.map((snip, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium"
                          title={snip.content}
                        >
                          {snip.title} ({snip.policy_type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Draft */}
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                    AI Response Draft
                  </span>
                  <p className="text-slate-800 bg-[#f4f7fb] p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {log.ai_response || '(No draft generated)'}
                  </p>
                </div>

                {/* Edited Response if different */}
                {log.edited_response && (
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-0.5">
                      Edited by Agent
                    </span>
                    <p className="text-slate-800 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-200 whitespace-pre-wrap">
                      {log.edited_response}
                    </p>
                  </div>
                )}

                {/* Final Response */}
                {log.final_response && (
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">
                      Final Sent Response
                    </span>
                    <p className="text-slate-800 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-200 whitespace-pre-wrap">
                      {log.final_response}
                    </p>
                  </div>
                )}

                {log.reason && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    Reason: {log.reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Message Stream */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white flex flex-col">
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
              No messages in this ticket yet. Send a message below.
            </div>
          ) : (
            messages.map((m, idx) => {
              const prevMessage = idx > 0 ? messages[idx - 1] : null
              const isCust = m.role === 'customer' || m.sender_type === 'customer'
              const isAgent = m.role === 'agent' || m.sender_type === 'agent'
              const prevIsCust = prevMessage && (prevMessage.role === 'customer' || prevMessage.sender_type === 'customer')
              const senderSwitched = prevMessage && isCust !== prevIsCust
              const marginClass = idx === 0 ? '' : senderSwitched ? 'mt-6' : 'mt-4'

              const initial = isAgent ? 'CX' : customerName.slice(0, 1).toUpperCase()

              return (
                <div key={m.id} className={marginClass}>
                  <div className={`flex items-start gap-2 ${isCust ? 'flex-row' : 'flex-row'}`}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5 shadow-2xs ${
                        isAgent ? 'bg-[#1b2133]' : 'bg-[#5b4f8c]'
                      }`}
                    >
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-semibold text-slate-900">
                          {isAgent ? 'Support Agent' : customerName}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {formatMessageTime(m.created_at)}
                        </span>
                        {m.source === 'ai_approved' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <SparklesIcon className="w-2.5 h-2.5" />
                            AI Approved
                          </span>
                        )}
                        {m.source === 'manual' && isAgent && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Manual
                          </span>
                        )}
                      </div>

                      <div
                        className={`px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                          isAgent
                            ? 'bg-[#f4f7fb] text-slate-800 border border-slate-200/80 rounded-tl-sm'
                            : 'bg-violet-50/50 text-slate-900 border border-violet-100 rounded-tl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* 4. Segmented Reply Composer */}
      {activeTab === 'conversation' && (
        <ReplyComposer
          mode={mode}
          onSwitchToAgent={() => handleModeChange('agent')}
          customerName={customerName}
          brandName={brandName}
          conversationId={conversation.id}
          brandId={conversation.brand_id}
          disabled={!conversation}
          sending={sending}
          onSend={onSendMessage}
        />
      )}
    </div>
  )
}
