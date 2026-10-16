import { useState } from 'react'
import type { ConversationListItem as ConversationItemType, StatusFilter } from '../../hooks/useConversations'
import { ConversationListItem } from './ConversationListItem'
import { SearchIcon, RefreshCwIcon, PlusIcon, XIcon } from '../icons'
import { useBrand } from '../../context/BrandContext'

interface ConversationListProps {
  conversations: ConversationItemType[]
  selectedId: string | null
  onSelect: (id: string) => void
  onPrefetch?: (id: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (status: StatusFilter) => void
  loading: boolean
  error: string | null
  onRetry?: () => void
  brandName?: string
  onCreateTestConversation?: (brandId: string, customerName: string, firstMessage: string) => Promise<void>
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
  onPrefetch,
  statusFilter,
  onStatusFilterChange,
  loading,
  error,
  onRetry,
  brandName = 'Inbox',
  onCreateTestConversation,
}: ConversationListProps) {
  const { brands, selectedBrand } = useBrand()
  const [searchQuery, setSearchQuery] = useState('')

  // New test conversation modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalBrandId, setModalBrandId] = useState(selectedBrand?.id || '')
  const [modalCustomerName, setModalCustomerName] = useState('Alice Demo')
  const [modalMessage, setModalMessage] = useState('My order was delivered but the bottle is broken. What can I do?')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleOpenModal = () => {
    setModalBrandId(selectedBrand?.id || brands[0]?.id || '')
    setModalCustomerName('Alice Demo')
    setModalMessage('My order was delivered but the bottle is broken. What can I do?')
    setCreateError(null)
    setModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCreateTestConversation) return
    if (!modalCustomerName.trim() || !modalMessage.trim() || !modalBrandId) {
      setCreateError('Please complete all required fields.')
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      await onCreateTestConversation(modalBrandId, modalCustomerName.trim(), modalMessage.trim())
      setModalOpen(false)
    } catch (err) {
      setCreateError((err as Error).message || 'Failed to create test conversation')
    } finally {
      setCreating(false)
    }
  }

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
      <div className="p-4 border-b border-[#eaecf0] flex flex-col gap-3 bg-white">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-slate-900">{brandName}</h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {conversations.length}
            </span>
          </div>
        </div>

        {/* "New test conversation" button in inbox header */}
        <button
          type="button"
          onClick={handleOpenModal}
          id="new-test-conversation-btn"
          className="w-full h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-[#1b2133] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>New test conversation</span>
        </button>

        {/* Search bar */}
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

        {/* Status filter tabs */}
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
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                Try again
              </button>
            )}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
            <p className="text-xs font-semibold text-slate-800">
              {searchQuery ? 'No matching tickets' : 'No tickets found'}
            </p>
            <p className="text-[11px] text-slate-400">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'Click "New test conversation" to start a fresh customer inquiry.'}
            </p>
          </div>
        ) : (
          filteredConversations.map((item) => (
            <ConversationListItem
              key={item.id}
              conversation={item}
              isSelected={item.id === selectedId}
              onSelect={onSelect}
              onPrefetch={onPrefetch}
            />
          ))
        )}
      </div>

      {/* New Test Conversation Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">New Test Conversation</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 flex flex-col gap-4 text-xs">
              {createError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {createError}
                </div>
              )}

              {/* Brand selection */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">Brand</label>
                <select
                  value={modalBrandId}
                  onChange={(e) => setModalBrandId(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a86b]"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">Customer Name</label>
                <input
                  type="text"
                  value={modalCustomerName}
                  onChange={(e) => setModalCustomerName(e.target.value)}
                  placeholder="e.g. Alice Demo"
                  className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a86b]"
                  required
                />
              </div>

              {/* First customer message */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">First Customer Message</label>
                <textarea
                  rows={4}
                  value={modalMessage}
                  onChange={(e) => setModalMessage(e.target.value)}
                  placeholder="Enter initial customer query…"
                  className="p-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a86b] resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#00a86b] hover:bg-[#00915c] text-white font-semibold rounded-lg shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {creating && <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creating ? 'Creating…' : 'Start Conversation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
