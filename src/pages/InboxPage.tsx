import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import { useConversations } from '../hooks/useConversations'
import type { StatusFilter } from '../hooks/useConversations'
import { useConversationDetail, prefetchConversationDetail } from '../hooks/useConversationDetail'
import { useMessages, prefetchConversationMessages } from '../hooks/useMessages'
import type { MessageSendOptions } from '../hooks/useMessages'
import { AppShell } from '../components/layout'
import { ConversationList, MessageThread } from '../components/conversation'
import { supabase } from '../lib/supabase'

export default function InboxPage() {
  const { brands, selectedBrand, setSelectedBrand } = useBrand()
  const [searchParams] = useSearchParams()
  const queryConversationId = searchParams.get('id')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(queryConversationId)
  const [mode, setMode] = useState<'customer' | 'agent'>('agent')

  const handlePrefetch = (id: string) => {
    prefetchConversationDetail(id)
    prefetchConversationMessages(id)
  }

  useEffect(() => {
    if (queryConversationId) {
      setSelectedConversationId(queryConversationId)
    }
  }, [queryConversationId])

  // 1. Fetch conversations for the selected brand
  const {
    items: conversations,
    loading: convLoading,
    error: convError,
    refresh: refreshConversations,
  } = useConversations(selectedBrand?.id ?? null, statusFilter, refreshKey)

  // Derive active selection: if selected ID is in list, use it; else fallback to first conversation of selected brand
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

  // 4. Create New Test Conversation
  const handleCreateTestConversation = async (
    brandId: string,
    customerName: string,
    firstMessage: string,
  ) => {
    // 1. Find or create a customer for this brand
    const emailPrefix = customerName.toLowerCase().replace(/[^a-z0-9]/g, '.')
    const email = `${emailPrefix || 'customer'}.${Date.now().toString().slice(-4)}@example.com`

    let customerId: string | null = null
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          brand_id: brandId,
          full_name: customerName,
          email,
        })
        .select('id')
        .single()

      if (custErr) throw custErr
      customerId = newCust.id
    }

    // 2. Find a delivered order for this brand if available
    const { data: attachedOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('brand_id', brandId)
      .limit(1)
      .maybeSingle()

    // 3. Create the conversation
    const subject = firstMessage.length > 45 ? `${firstMessage.slice(0, 45)}…` : firstMessage
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        brand_id: brandId,
        customer_id: customerId,
        order_id: attachedOrder?.id ?? null,
        subject,
        status: 'open',
        channel: 'chat',
      })
      .select('id')
      .single()

    if (convErr) throw convErr

    // 4. Insert the first message as a customer message
    const { error: msgErr } = await supabase.from('messages').insert({
      conversation_id: newConv.id,
      brand_id: brandId,
      role: 'customer',
      sender_type: 'customer',
      source: 'customer',
      content: firstMessage,
    })

    if (msgErr) throw msgErr

    // 5. If chosen brand is different from currently selected brand, switch it
    if (selectedBrand?.id !== brandId) {
      const targetBrand = brands.find((b) => b.id === brandId)
      if (targetBrand) setSelectedBrand(targetBrand)
    }

    // 6. Select the newly created conversation, set mode to Agent, and refresh
    setSelectedConversationId(newConv.id)
    setMode('agent')
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
          onPrefetch={handlePrefetch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          loading={convLoading}
          error={convError}
          onRetry={refreshConversations}
          brandName={selectedBrand?.name ?? 'Inbox'}
          onCreateTestConversation={handleCreateTestConversation}
        />

        {/* Center column: Active Message Thread */}
        <MessageThread
          conversation={conversationDetail}
          messages={messages}
          loading={messagesLoading || detailLoading}
          sending={sending}
          onSendMessage={handleSendMessage}
          onStatusChange={handleStatusChange}
          mode={mode}
          onModeChange={setMode}
        />
      </div>
    </AppShell>
  )
}
