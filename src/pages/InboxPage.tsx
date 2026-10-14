import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { useConversations } from '../hooks/useConversations'
import type { StatusFilter } from '../hooks/useConversations'
import { useConversationDetail } from '../hooks/useConversationDetail'
import { useMessages } from '../hooks/useMessages'
import type { MessageSendOptions } from '../hooks/useMessages'
import { AppShell } from '../components/layout'
import { ConversationList, MessageThread, CustomerPanel } from '../components/conversation'

export default function InboxPage() {
  const { selectedBrand } = useBrand()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  // 1. Fetch conversations for the selected brand
  const {
    items: conversations,
    loading: convLoading,
    error: convError,
    refresh: refreshConversations,
  } = useConversations(selectedBrand?.id ?? null, statusFilter, refreshKey)

  // Derive active selection: if selected ID is in list, use it; else fallback to first conversation
  const activeConversationId =
    selectedConversationId && conversations.some((c) => c.id === selectedConversationId)
      ? selectedConversationId
      : conversations[0]?.id ?? null

  // 2. Fetch conversation details & order info
  const {
    detail: conversationDetail,
    loading: detailLoading,
    updateStatus,
  } = useConversationDetail(activeConversationId)

  // 3. Fetch messages & message sending logic
  const {
    messages,
    loading: messagesLoading,
    sending,
    sendMessage,
  } = useMessages(activeConversationId, selectedBrand?.id ?? null)

  const handleSendMessage = async (content: string, options?: MessageSendOptions) => {
    await sendMessage(content, options)
    // Bump refreshKey so conversation list updates snippet & timestamp
    setRefreshKey((k) => k + 1)
  }

  const handleStatusChange = async (status: Parameters<typeof updateStatus>[0]) => {
    await updateStatus(status)
    setRefreshKey((k) => k + 1)
  }

  return (
    <AppShell>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left column: Conversation List */}
        <ConversationList
          conversations={conversations}
          selectedId={activeConversationId}
          onSelect={(id) => setSelectedConversationId(id)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          loading={convLoading}
          error={convError}
          onRefresh={() => {
            refreshConversations()
            setRefreshKey((k) => k + 1)
          }}
          brandName={selectedBrand?.name ?? 'Inbox'}
        />

        {/* Center column: Active Message Thread */}
        <MessageThread
          conversation={conversationDetail}
          messages={messages}
          loading={messagesLoading || detailLoading}
          sending={sending}
          onSendMessage={handleSendMessage}
          onStatusChange={handleStatusChange}
        />

        {/* Right column: Customer & Order Details Panel */}
        <CustomerPanel
          conversation={conversationDetail}
          loading={detailLoading}
          onStatusChange={handleStatusChange}
        />
      </div>
    </AppShell>
  )
}
