import { Link, useLocation } from 'react-router-dom'
import { useBrand } from '../../context/BrandContext'
import {
  SearchIcon,
  InboxIcon,
  TicketIcon,
  BookOpenIcon,
  UsersIcon,
  ChatIcon,
  ChevronDownIcon,
  RefreshCwIcon,
} from '../icons'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps) {
  const { brands, selectedBrand, setSelectedBrand, loading, error, refresh } = useBrand()
  const location = useLocation()

  const isInbox = location.pathname.startsWith('/inbox') || location.pathname === '/'
  const isKnowledgeBase = location.pathname.startsWith('/knowledge-base')

  // Derive initial avatar abbreviation
  const initials = selectedBrand?.name
    ? selectedBrand.name.slice(0, 3).toUpperCase()
    : 'DS'

  return (
    <aside
      className={`w-60 bg-[#fafbfc] border-r border-[#eaecf0] flex flex-col h-full select-none flex-shrink-0 overflow-y-auto box-border ${className}`}
    >
      {/* 1. Header Profile / Active Brand */}
      <div className="px-4 pt-4 pb-3 border-b border-[#eaecf0]">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#1b2133] text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
              {initials}
            </div>
            {/* Emerald active status dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00a86b] border-2 border-white" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="font-semibold text-xs text-slate-900 truncate block">
              {selectedBrand?.name ?? 'Datastraw CX'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              Agent Admin
            </span>
          </div>
        </div>

        {/* Brand Selector Dropdown */}
        <div className="mt-3">
          {loading ? (
            <div className="h-9 w-full bg-slate-200 rounded-lg animate-pulse" />
          ) : error ? (
            <div className="flex items-center justify-between text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              <span className="truncate">Failed to load</span>
              <button
                onClick={refresh}
                className="text-[11px] text-red-700 hover:text-red-900 underline font-semibold flex-shrink-0 cursor-pointer"
              >
                <RefreshCwIcon className="w-3 h-3 inline" />
              </button>
            </div>
          ) : brands.length === 0 ? (
            <div className="text-[11px] text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200 mb-3">
              No brands found
            </div>
          ) : (
            <div className="relative">
              <select
                aria-label="Select active brand"
                value={selectedBrand?.id ?? ''}
                onChange={(e) => {
                  const b = brands.find((brand) => brand.id === e.target.value)
                  if (b) setSelectedBrand(b)
                }}
                className="w-full h-9 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-medium rounded-lg border border-slate-200 py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-[#00a86b] focus:border-[#00a86b] appearance-none cursor-pointer transition-colors shadow-2xs"
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id} className="text-slate-800 text-xs">
                    {brand.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Search Box with ⌘ K shortcut badge */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            placeholder="Search"
            className="w-full h-9 bg-white border border-[#e5e7eb] rounded-lg pl-9 pr-12 text-xs text-slate-700 placeholder-slate-400 shadow-2xs focus:outline-none cursor-pointer"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <kbd className="text-[10px] font-sans text-slate-400 font-medium">⌘</kbd>
            <kbd className="text-[10px] font-sans text-slate-400 font-medium">K</kbd>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation List */}
      <nav className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto min-h-0">
        <Link
          to="/inbox"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
            isInbox
              ? 'bg-[#edeef2] text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }`}
        >
          <InboxIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="flex-1">Inbox</span>
        </Link>

        <Link
          to="/inbox"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium transition-colors"
        >
          <TicketIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="flex-1">Tickets</span>
        </Link>

        <Link
          to="/knowledge-base"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
            isKnowledgeBase
              ? 'bg-[#edeef2] text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }`}
        >
          <BookOpenIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="flex-1">Knowledge Base</span>
        </Link>

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 font-medium cursor-pointer transition-colors">
          <UsersIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="flex-1">Customers</span>
        </div>

        {/* Section: Conversation */}
        <div className="pt-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-slate-400 font-bold px-3 pb-2">
            Conversation
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="truncate flex-1">Voice Support</span>
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <ChatIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate flex-1">Live Chat</span>
              <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded flex-shrink-0">
                0
              </span>
            </div>
          </div>
        </div>

        {/* Section: Pinned Tickets */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-[11px] uppercase tracking-[0.06em] text-slate-400 font-bold">
              Pinned Tickets
            </span>
            <span className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">
              Unpin All
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#00a86b] flex-shrink-0" />
              <span className="truncate font-mono text-[11px]">#TC-192 refund delay</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#00a86b] flex-shrink-0" />
              <span className="truncate font-mono text-[11px]">#TC-191 payment issue</span>
            </div>
          </div>
        </div>
      </nav>

      {/* 4. Footer: Powered by & Collapse */}
      <div className="mt-auto px-4 py-3 border-t border-[#eaecf0] bg-white flex items-center justify-between text-xs text-slate-400">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
            Powered by
          </span>
          <span className="font-bold text-slate-800 text-xs tracking-tight">
            datastraw cx
          </span>
        </div>
        <div className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Collapse sidebar">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </div>
      </div>
    </aside>
  )
}
