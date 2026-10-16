import { Link, useLocation } from 'react-router-dom'
import { useBrand } from '../../context/BrandContext'
import {
  InboxIcon,
  UserIcon,
  BookOpenIcon,
  ChevronDownIcon,
} from '../icons'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps) {
  const { brands, selectedBrand, setSelectedBrand, loading, error, refresh } = useBrand()
  const location = useLocation()

  const isInbox = location.pathname.startsWith('/inbox') || location.pathname === '/'
  const isCustomerDetails = location.pathname.startsWith('/customers')
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
                type="button"
                onClick={refresh}
                className="text-[11px] text-red-700 hover:text-red-900 underline font-semibold flex-shrink-0 cursor-pointer"
              >
                Try again
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

      {/* 2. Main Navigation List */}
      <nav className="flex-1 px-4 py-3 flex flex-col gap-1 overflow-y-auto min-h-0">
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
          to="/customers"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
            isCustomerDetails
              ? 'bg-[#edeef2] text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
          }`}
        >
          <UserIcon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="flex-1">Customer Details</span>
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
      </nav>

      {/* 3. Footer: Favicon logo & Powered by */}
      <div className="mt-auto px-4 py-3 border-t border-[#eaecf0] bg-white flex items-center gap-2">
        <img
          src="/favicon.svg"
          alt="Logo"
          className="w-6 h-6 rounded flex-shrink-0"
        />
        <span className="text-[11px] text-slate-400 font-medium tracking-tight">
          Powered by
        </span>
      </div>
    </aside>
  )
}
