import type { ConversationDetail } from '../../hooks/useConversationDetail'
import type { ConversationStatus, OrderLineItem, OrderStatus } from '../../types/database'
import {
  UsersIcon,
  BookOpenIcon,
  ChatIcon,
  TicketIcon,
  ChevronDownIcon,
} from '../icons'

interface CustomerPanelProps {
  conversation: ConversationDetail | null
  loading: boolean
  onStatusChange: (status: ConversationStatus) => Promise<void>
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

export function CustomerPanel({
  conversation,
  loading,
  onStatusChange,
}: CustomerPanelProps) {
  const customer = conversation?.customers
  const order = conversation?.orders
  const lineItems = (order?.items_json as OrderLineItem[] | null) ?? []

  return (
    <div className="hidden lg:flex h-full flex-shrink-0 select-none">
      {/* Customer & Order Details Panel */}
      <aside className="w-72 xl:w-80 bg-white border-l border-[#eaecf0] flex flex-col h-full overflow-y-auto">
        {/* Section 1: Ticket Status (16px padding, 8px gap between heading and content) */}
        <div className="p-4 border-b border-[#eaecf0] flex flex-col gap-2">
          <h3 className="text-[11px] uppercase tracking-[0.06em] text-slate-400 font-bold">
            Ticket Status
          </h3>
          <div className="relative">
            <select
              value={conversation?.status ?? 'open'}
              disabled={!conversation}
              onChange={(e) => onStatusChange(e.target.value as ConversationStatus)}
              className="w-full h-9 bg-[#f9fafb] hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-[#e5e7eb] py-2 px-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] cursor-pointer appearance-none transition-colors shadow-2xs disabled:opacity-50"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDownIcon className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Section 2: Customer Profile (16px padding, 8px gap between heading and content) */}
        <div className="p-4 border-b border-[#eaecf0] flex flex-col gap-2">
          <h3 className="text-[11px] uppercase tracking-[0.06em] text-slate-400 font-bold">
            Customer Profile
          </h3>

          {loading && !customer ? (
            <div className="space-y-2 animate-pulse pt-1">
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-3 bg-slate-100 rounded w-40" />
            </div>
          ) : customer ? (
            <div className="flex flex-col gap-2 pt-1">
              {/* 12px gap between avatar and name/email */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#374151] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                  {customer.full_name ? customer.full_name.slice(0, 2).toUpperCase() : 'CU'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {customer.full_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate font-medium">
                    {customer.email}
                  </p>
                </div>
              </div>

              {/* 8px gap between rows of customer info */}
              {customer.phone && (
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.notes && (
                <div className="p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] text-xs text-slate-600">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block mb-1">
                    Internal Notes
                  </span>
                  <p className="italic leading-relaxed">{customer.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 pt-1">No customer selected.</p>
          )}
        </div>

        {/* Section 3: Order Details (16px padding, 8px gap between heading and content) */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h3 className="text-[11px] uppercase tracking-[0.06em] text-slate-400 font-bold">
            Order Details
          </h3>

          {order ? (
            <div className="bg-[#f9fafb] border border-[#eaecf0] rounded-xl p-3 flex flex-col gap-2">
              {/* 8px gap between order number and badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {order.order_number}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${getOrderStatusBadge(
                    order.status,
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              {/* 8px margin between order rows */}
              <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-[#eaecf0]">
                <span>Total Amount:</span>
                <span className="text-slate-900 font-bold font-mono">
                  ${Number(order.total_amount).toFixed(2)} {order.currency}
                </span>
              </div>

              {order.ordered_at && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Order Date:</span>
                  <span className="text-slate-700">
                    {new Date(order.ordered_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* 12px top margin before item list */}
              {lineItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#eaecf0] flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">
                    Purchased Items
                  </span>
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-700 truncate mr-2">
                        {item.qty}x {item.name}
                      </span>
                      <span className="text-slate-500 font-mono flex-shrink-0">
                        ${Number(item.unit_price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-[#f9fafb] border border-[#eaecf0] rounded-lg text-center text-xs text-slate-400">
              No order attached
            </div>
          )}
        </div>
      </aside>

      {/* Far-right icon rail: 12px padding, 8px gaps between icons, each icon in a 36px square hit target */}
      <div className="w-12 border-l border-[#eaecf0] bg-[#fafbfc] flex flex-col items-center p-3 gap-2 text-slate-400">
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title="Ticket Overview"
        >
          <TicketIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title="Knowledge Base Articles"
        >
          <BookOpenIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title="Chat History"
        >
          <ChatIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white hover:text-slate-700 transition-colors cursor-pointer shadow-2xs"
          title="Customer Profile"
        >
          <UsersIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
