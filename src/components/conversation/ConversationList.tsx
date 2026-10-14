import { useState } from 'react'
import type { ConversationListItem as ConversationItemType, StatusFilter } from '../../hooks/useConversations'
import { ConversationListItem } from './ConversationListItem'
import { SearchIcon, RefreshCwIcon } from '../icons'

interface ConversationListProps {
  conversations: ConversationItemType[]
  selectedId: string | null
  onSelect: (id: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (status: StatusFilter) => void
  loading: boolean
  error: string | null
  onRefresh: () => void
  brandName?: string
}

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  loading,
  error,
  onRefresh,
  brandName = 'Inbox',
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_email.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.latest_message_content && c.latest_message_content.toLowerCase().includes(q))
    )
  })

  return (
    <div className="w-80 md:w-88 bg-white border-r border-[#eaecf0] flex flex-col h-full flex-shrink-0 select-none">
      {/* Top Header Section with 16px padding and 16px vertical gap */}
      <div className="p-4 border-b border-[#eaecf0] flex flex-col gap-4 bg-white">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-slate-900">{brandName}</h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh tickets"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin text-[#00a86b]' : ''}`} />
          </button>
        </div>

        {/* Search bar: 36px height, icon at left 12px, padding-left 36px */}
        <div className="relative w-full">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets or customers..."
            className="w-full h-9 bg-[#f9fafb] text-xs text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-9 py-2 border border-[#e5e7eb] focus:bg-white focus:outline-none focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter tabs: flex row with 8px gap, wrap if needed, each chip padded 4px 12px with pill radius */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => onStatusFilterChange(tab.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#00a86b] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f6] bg-white">
        {loading && conversations.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-2 animate-pulse px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded w-28" />
                  <div className="h-3 bg-slate-100 rounded w-44" />
                  <div className="h-2.5 bg-slate-100 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs text-rose-700 font-semibold">Failed to load tickets</p>
            <p className="text-[11px] text-slate-500 max-w-[200px]">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          /* Empty state: centered, 24px padding, 8px gap between title and subtitle */
          <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
            <p className="text-xs font-semibold text-slate-800">
              {searchQuery ? 'No matching tickets' : 'No tickets found'}
            </p>
            <p className="text-[11px] text-slate-400">
              {statusFilter !== 'all'
                ? `No ${statusFilter} conversations.`
                : 'Customer inquiries will appear here.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
