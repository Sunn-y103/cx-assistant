import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/layout'
import { useBrand } from '../context/BrandContext'
import { supabase } from '../lib/supabase'
import type { Customer, Order, ConversationStatus, OrderLineItem, OrderStatus } from '../types/database'
import { SearchIcon, UserIcon } from '../components/icons'
import { MOCK_CONVERSATIONS, MOCK_DETAILS } from '../lib/mockData'

interface CustomerConversationSummary {
  id: string
  subject: string
  status: ConversationStatus
  last_message_at: string
}

interface EnrichedCustomer extends Customer {
  conversation_count: number
  orders: Order[]
  conversations: CustomerConversationSummary[]
}

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

function getConversationStatusBadge(status: ConversationStatus) {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'resolved':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'closed':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString()
  } catch {
    return '—'
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function CustomerDetailsPage() {
  const navigate = useNavigate()
  const { selectedBrand } = useBrand()
  const [searchParams] = useSearchParams()
  const paramCustomerId = searchParams.get('id')

  const [customers, setCustomers] = useState<EnrichedCustomer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomerData = useCallback(async () => {
    if (!selectedBrand?.id) {
      setCustomers([])
      setSelectedCustomerId(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch all customers for the currently selected brand
      const { data: custRows, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('brand_id', selectedBrand.id)
        .order('full_name', { ascending: true })

      if (custErr) throw custErr

      // 2. Fetch conversations for the selected brand
      const { data: convRows, error: convErr } = await supabase
        .from('conversations')
        .select('id, customer_id, subject, status, last_message_at')
        .eq('brand_id', selectedBrand.id)
        .order('last_message_at', { ascending: false })

      if (convErr) throw convErr

      // 3. Fetch orders for the selected brand
      const { data: orderRows, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('brand_id', selectedBrand.id)
        .order('ordered_at', { ascending: false })

      if (orderErr) throw orderErr

      // Group conversations by customer_id
      const convMap = new Map<string, CustomerConversationSummary[]>()
      for (const conv of convRows ?? []) {
        const cId = conv.customer_id as string
        const list = convMap.get(cId) ?? []
        list.push({
          id: conv.id as string,
          subject: (conv.subject as string) || 'Conversation',
          status: conv.status as ConversationStatus,
          last_message_at: conv.last_message_at as string,
        })
        convMap.set(cId, list)
      }

      // Group orders by customer_id
      const orderMap = new Map<string, Order[]>()
      for (const ord of orderRows ?? []) {
        const cId = ord.customer_id as string
        const list = orderMap.get(cId) ?? []
        list.push(ord as unknown as Order)
        orderMap.set(cId, list)
      }

      const enriched: EnrichedCustomer[] = (custRows ?? []).map((c) => {
        const custConvs = convMap.get(c.id) ?? []
        const custOrders = orderMap.get(c.id) ?? []
        return {
          ...(c as unknown as Customer),
          conversation_count: custConvs.length,
          orders: custOrders,
          conversations: custConvs,
        }
      })

      // If empty in DB, fallback to mock data if matching brand
      if (enriched.length === 0) {
        const mockConvs = MOCK_CONVERSATIONS[selectedBrand.id] || []
        const fallbackMap = new Map<string, EnrichedCustomer>()
        for (const mc of mockConvs) {
          const detail = MOCK_DETAILS[mc.id]
          if (detail?.customers) {
            const existing = fallbackMap.get(detail.customers.id)
            if (existing) {
              existing.conversation_count += 1
              existing.conversations.push({
                id: mc.id,
                subject: mc.subject,
                status: mc.status,
                last_message_at: mc.last_message_at,
              })
            } else {
              fallbackMap.set(detail.customers.id, {
                ...detail.customers,
                conversation_count: 1,
                orders: detail.orders ? [detail.orders] : [],
                conversations: [
                  {
                    id: mc.id,
                    subject: mc.subject,
                    status: mc.status,
                    last_message_at: mc.last_message_at,
                  },
                ],
              })
            }
          }
        }
        const fallbackList = Array.from(fallbackMap.values())
        setCustomers(fallbackList)
      } else {
        setCustomers(enriched)
      }
    } catch (err) {
      // Dev / offline fallback for demonstration
      const mockConvs = MOCK_CONVERSATIONS[selectedBrand.id] || []
      const fallbackMap = new Map<string, EnrichedCustomer>()
      for (const mc of mockConvs) {
        const detail = MOCK_DETAILS[mc.id]
        if (detail?.customers) {
          const existing = fallbackMap.get(detail.customers.id)
          if (existing) {
            existing.conversation_count += 1
            existing.conversations.push({
              id: mc.id,
              subject: mc.subject,
              status: mc.status,
              last_message_at: mc.last_message_at,
            })
          } else {
            fallbackMap.set(detail.customers.id, {
              ...detail.customers,
              conversation_count: 1,
              orders: detail.orders ? [detail.orders] : [],
              conversations: [
                {
                  id: mc.id,
                  subject: mc.subject,
                  status: mc.status,
                  last_message_at: mc.last_message_at,
                },
              ],
            })
          }
        }
      }
      const fallbackList = Array.from(fallbackMap.values())
      if (fallbackList.length > 0) {
        setCustomers(fallbackList)
      } else {
        setError((err as Error).message || 'Failed to load customer details')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedBrand?.id])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])

  // Sync active selected customer
  useEffect(() => {
    if (customers.length === 0) {
      setSelectedCustomerId(null)
      return
    }

    if (paramCustomerId && customers.some((c) => c.id === paramCustomerId)) {
      setSelectedCustomerId(paramCustomerId)
      return
    }

    setSelectedCustomerId((curr) => {
      if (curr && customers.some((c) => c.id === curr)) return curr
      return customers[0]?.id ?? null
    })
  }, [customers, paramCustomerId])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase()
    return customers.filter(
      (c) =>
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }, [customers, searchQuery])

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null
    return customers.find((c) => c.id === selectedCustomerId) ?? null
  }, [customers, selectedCustomerId])

  const brandName = selectedBrand?.name ?? 'Brand'

  return (
    <AppShell>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left column: Customers List (width 320px - 352px) */}
        <aside className="w-80 md:w-88 bg-white border-r border-[#eaecf0] flex flex-col h-full flex-shrink-0 select-none">
          {/* Header section: padding 16px, 12px gap */}
          <div className="p-4 border-b border-[#eaecf0] flex flex-col gap-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-slate-900">Customers</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {customers.length}
                </span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {brandName}
              </span>
            </div>

            {/* Search Box */}
            <div className="relative w-full">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full h-9 bg-[#f9fafb] text-xs text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-3 py-2 border border-[#eaecf0] focus:outline-none focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-4 flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-28" />
                      <div className="h-3 bg-slate-100 rounded w-44" />
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
                <p className="text-xs text-rose-700 font-semibold">Failed to load customers</p>
                <p className="text-[11px] text-slate-500 max-w-[200px]">{error}</p>
                <button
                  type="button"
                  onClick={fetchCustomerData}
                  className="mt-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No customers for this brand yet.
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No customers matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = c.id === selectedCustomerId
                const initials = c.full_name
                  ? c.full_name.slice(0, 2).toUpperCase()
                  : 'CU'

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#edeef2] border-l-3 border-[#00a86b]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1b2133] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {c.full_name || 'Unnamed Customer'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium flex-shrink-0">
                          {c.conversation_count} {c.conversation_count === 1 ? 'chat' : 'chats'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.email}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Right column: Customer Detail Panel */}
        <main className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto min-w-0">
          {loading && !selectedCustomer ? (
            <div className="p-8 flex flex-col gap-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-48" />
                  <div className="h-3.5 bg-slate-100 rounded w-64" />
                </div>
              </div>
              <div className="h-28 bg-slate-200 rounded-xl" />
              <div className="h-44 bg-slate-200 rounded-xl" />
            </div>
          ) : !selectedCustomer ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs mb-3">
                <UserIcon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No customer selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[320px]">
                {customers.length === 0
                  ? 'No customers for this brand yet.'
                  : 'Select a customer from the list on the left to view their profile, orders, and conversations.'}
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-5xl">
              {/* Profile Header Card */}
              <div className="bg-white border border-[#eaecf0] rounded-xl p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-full bg-[#1b2133] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                    {selectedCustomer.full_name
                      ? selectedCustomer.full_name.slice(0, 2).toUpperCase()
                      : 'CU'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                        {selectedCustomer.full_name || 'Customer'}
                      </h1>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {brandName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>{selectedCustomer.email}</span>
                      {selectedCustomer.phone && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{selectedCustomer.phone}</span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>Joined {formatDate(selectedCustomer.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Conversations
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {selectedCustomer.conversation_count}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Orders
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {selectedCustomer.orders.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="bg-white border border-[#eaecf0] rounded-xl p-5 shadow-2xs flex flex-col gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Internal Notes
                </h3>
                {selectedCustomer.notes ? (
                  <p className="text-xs text-slate-600 bg-[#f9fafb] border border-[#eaecf0] rounded-lg p-3.5 italic leading-relaxed">
                    {selectedCustomer.notes}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No internal notes for this customer.</p>
                )}
              </div>

              {/* Orders Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Orders ({selectedCustomer.orders.length})
                  </h3>
                </div>

                {selectedCustomer.orders.length === 0 ? (
                  <div className="bg-white border border-[#eaecf0] rounded-xl p-6 text-center text-xs text-slate-400 shadow-2xs">
                    No orders recorded for this customer.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedCustomer.orders.map((order) => {
                      const lineItems = (order.items_json as OrderLineItem[] | null) ?? []

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-[#eaecf0] rounded-xl p-4 shadow-2xs flex flex-col gap-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                {order.order_number}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getOrderStatusBadge(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500">Ordered {formatDate(order.ordered_at)}</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs font-bold font-mono text-slate-900">
                                {order.currency} {Number(order.total_amount).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>
                              <span className="text-slate-400 text-[11px] block">Delivery Date</span>
                              <span className="font-medium text-slate-800">
                                {order.delivery_date
                                  ? formatDate(order.delivery_date)
                                  : order.status === 'delivered'
                                  ? 'Delivered'
                                  : 'Not delivered'}
                              </span>
                            </div>
                            {order.notes && (
                              <div>
                                <span className="text-slate-400 text-[11px] block">Order Notes</span>
                                <span className="italic text-slate-700">{order.notes}</span>
                              </div>
                            )}
                          </div>

                          {lineItems.length > 0 && (
                            <div className="mt-1 pt-2.5 border-t border-slate-100">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                                Items ({lineItems.length})
                              </span>
                              <div className="divide-y divide-slate-100 bg-[#f9fafb] rounded-lg border border-[#eaecf0] overflow-hidden">
                                {lineItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2 flex items-center justify-between text-xs text-slate-700"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="font-medium text-slate-800 truncate">{item.name}</p>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        SKU: {item.sku}
                                      </span>
                                    </div>
                                    <div className="text-right flex-shrink-0 text-slate-600 font-mono text-[11px]">
                                      <span>Qty: {item.qty}</span>
                                      <span className="mx-1.5 text-slate-300">·</span>
                                      <span className="font-semibold text-slate-900">
                                        ${Number(item.unit_price).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Conversations Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Conversations ({selectedCustomer.conversations.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">Click to open ticket in Inbox</span>
                </div>

                {selectedCustomer.conversations.length === 0 ? (
                  <div className="bg-white border border-[#eaecf0] rounded-xl p-6 text-center text-xs text-slate-400 shadow-2xs">
                    No conversations recorded for this customer.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedCustomer.conversations.map((conv) => (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => navigate(`/inbox?id=${conv.id}`)}
                        className="bg-white hover:bg-slate-50 border border-[#eaecf0] hover:border-slate-300 rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-[#00a86b] transition-colors">
                              #TC-{conv.id.slice(0, 4).toUpperCase()}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getConversationStatusBadge(
                                conv.status
                              )}`}
                            >
                              {conv.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 truncate mt-1">
                            {conv.subject}
                          </p>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">
                            Last message: {formatDateTime(conv.last_message_at)}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 group-hover:text-[#00a86b] flex items-center gap-1 font-semibold flex-shrink-0 transition-colors">
                          <span>Open</span>
                          <span>→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AppShell>
  )
}
